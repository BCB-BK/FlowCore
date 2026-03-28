# FlowCore (Bildungscampus Backnang)

## Overview

FlowCore is a process-based knowledge management system aiming to centralize and streamline organizational knowledge, processes, and documentation. It functions as an enterprise wiki, offering features like AI assistance, comprehensive content management, robust integration capabilities, full-text search, version control, and role-based access. The project's vision is to enhance knowledge sharing, improve operational efficiency, and support informed decision-making within organizations.

## User Preferences

I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `docs/`.
Do not make changes to the file `CHANGELOG.md`.

## System Architecture

FlowCore is built as a pnpm workspace monorepo using TypeScript.

**UI/UX Decisions:**
The frontend (`wiki-frontend`) is a React application built with Vite, TailwindCSS, and shadcn/ui. It features a global AI assistant chat, a Tiptap-based rich text editor supporting various content blocks and drag-and-drop media uploads, and 18 distinct page types with specialized layouts. A content-first layout system uses `displayProfile` to control layout behavior, and a unified `PageHeader` ensures consistency. The editor includes a categorized block picker, drag-and-drop reordering, and a content completeness bar.

**Technical Implementations:**
- **API Server (`api-server`):** An Express server providing a RESTful API with structured logging, Zod for configuration validation, and security features. Authentication uses Microsoft Entra ID OIDC, and authorization is handled via a 7-role to 17-permission RBAC matrix with page-level permissions.
- **Database:** PostgreSQL with Drizzle ORM and Zod for schema validation. The schema includes content nodes (with `tsvector` search index), revisions, relations, tags, glossary terms, search analytics, media assets, audit events, and connector configurations.
- **API Specification and Codegen:** OpenAPI 3.1 defines the API, with Orval generating client-side code, including React Query hooks and Zod schemas.
- **Monorepo Structure:** Organized into `artifacts/`, `lib/`, `scripts/`, and `e2e/`. Shared UI components live in `lib/ui` (`@workspace/ui`) and are consumed by both `wiki-frontend` and `mockup-sandbox` via `@workspace/ui/component-name` imports. Only `toaster.tsx` remains local to `wiki-frontend` (depends on app-specific `use-toast` hook).
- **Core Features:**
    - **Content Management:** CRUD operations for content nodes, revisions, relations, templates, and links, using a dual ID system. Navigation includes hierarchy-aware breadcrumbs and a professionalized relation sidebar.
    - **Search:** Full-text search with suggestions and analytics.
    - **AI Assistant:** Orchestration services for knowledge Q&A and page writing assistance via SSE streaming, including field-level AI assistance with diff preview and configurable prompts.
    - **Workflow:** Review workflows (submit/approve/reject), revision events, diffing, and watchers.
    - **Publikationsmodell (Working Copies):** A strict publication model where published pages are read-only. All content changes follow a `Draft → Submitted → In Review → Approved → Published` lifecycle, enforced by the API. Restore operations also go through this workflow.
    - **Connectors:** Management of source systems and storage providers (e.g., SharePoint) with sync scheduling and asset origin tracking.
    - **Backup:** Orchestrates `pg_dump`, manifest generation, SharePoint upload, and retention policies, with a dry-run restore endpoint.
    - **Quality Dashboard:** Provides insights into page quality, duplicate detection, maintenance hints, a Review/Working Copy Dashboard, and an Ownership Monitor.
    - **Page Types:** A registry of 18 page types, each with defined metadata fields, sections, guided mode steps, field governance, publication rules, content quality validation, and display profiles. Validation is enforced during submission and publication.
    - **Smart Page Creation Flow:** `CreateNodeDialog` supports context-sensitive type selection, recommended child types, and pre-populated editor blocks.
    - **Ausfüllhilfen (Field Help):** `FieldHelp` interface for guiding users with `fillHelp`, `example`, `badExample`, and `guidingQuestions`.
    - **Compound Field Editors:** Structured sub-field editors for complex sections like SIPOC, Q&A, Glossary, Checklists, RACI, and Competency Areas, storing data as JSON-serialized strings.
    - **Publish Validation:** `validateForPublication()` includes pseudo-content detection and `CompletenessIndicator` shows publish readiness.
    - **Consistency Check:** Automated system consistency verification via Admin Settings.
    - **Release Management:** Full release lifecycle tracking with transition validation via Admin Settings.
    - **Audit Trail & Evidence:** Complete audit trail for all critical working copy lifecycle events, accessible via Admin API endpoints with query/filter/pagination/export functionality.
    - **Notifications & Watchers:** In-app and MS Teams notifications for various events (e.g., `working_copy_submitted`, `review_overdue`), determined by roles. A scheduled job checks `nextReviewDate` for overdue reviews.

**Structured QM Components:**
Seven structured QM components are available: RACIMatrix, SIPOCTable, SwimlaneDiagram, KPITable, RisksControlsTable, InterfacesSystemsTable, and ProcessStepsTable. These components support both edit and view modes and are integrated into various page layouts.

**Page Type Specialization:**
Key page types like `procedure_instruction`, `core_process_overview`, `role_profile`, `FAQ`, `Glossar`, and `Checklist` are specialized with predefined sections, fields, and structured editors to align with specific organizational needs and QM standards.

## External Dependencies

- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **API Framework:** Express
- **Frontend Framework:** React
- **Build Tool:** Vite
- **Styling:** TailwindCSS, shadcn/ui
- **Validation:** Zod
- **API Codegen:** Orval
- **E2E Testing:** Playwright
- **Logging:** pino
- **Authentication/Identity:** Microsoft Entra ID (OIDC), API Bearer Tokens (SHA-256 hashed)
- **External Services Integration:** Microsoft Graph API (for SharePoint, Teams notifications)
- **AI Services:** OpenAI