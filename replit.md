# FlowCore (Bildungscampus Backnang)

## Overview

FlowCore is a process-based knowledge management system designed as a pnpm workspace monorepo. Its primary goal is to centralize and streamline organizational knowledge, processes, and documentation through features like AI assistance, comprehensive content management, and robust integration capabilities. The project aims to enhance knowledge sharing, improve operational efficiency, and support informed decision-making by providing an enterprise wiki with full-text search, version control, role-based access, and connectors to external systems like SharePoint.

## User Preferences

I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `docs/`.
Do not make changes to the file `CHANGELOG.md`.

## System Architecture

FlowCore is built as a pnpm workspace monorepo using TypeScript 5.9.

**UI/UX Decisions:**
The frontend, `wiki-frontend`, is a React 19 application utilizing Vite, TailwindCSS 4, and shadcn/ui for a responsive design. Key UI components include a global AI assistant chat, a Tiptap-based rich text editor supporting various content blocks (e.g., callout, file, video, embed, diagram with professional metadata), and specialized layouts for 18 distinct page types (e.g., Process Overview, Procedure). It supports drag-and-drop media uploads and integrates with Microsoft Teams for contextual sharing.

**Technical Implementations:**
- **API Server (`api-server`):** An Express 5 server providing a RESTful API with structured logging (pino), configuration validation (Zod), security features (headers, rate limiting), and correlation ID middleware. Authentication uses Microsoft Entra ID OIDC, and authorization is managed via a 7-role to 17-permission RBAC matrix with page-level permissions.
- **Database:** PostgreSQL with Drizzle ORM and Zod for schema validation. The schema includes content nodes (with dual IDs and `tsvector` search index), revisions, relations, tags, glossary terms, search analytics, media assets, audit events, principals, AI settings, and connector configurations.
- **API Specification and Codegen:** OpenAPI 3.1 defines the API, and Orval generates client-side code, including React Query hooks and Zod schemas.
- **Monorepo Structure:** Organized into `artifacts/` (deployables), `lib/` (shared libraries), `scripts/` (utilities), and `e2e/` (Playwright tests).
- **Core Features:**
    - **Content Management:** CRUD operations for content nodes, revisions, relations, templates, and links, employing a dual ID system (`immutable_id` + `display_code`).
    - **Search:** Full-text search with suggestions and analytics.
    - **AI Assistant:** Orchestration services for knowledge Q&A and page writing assistance via SSE streaming, with usage logging.
    - **Workflow:** Review workflows (submit/approve/reject), revision events, diffing, and watchers.
    - **Publikationsmodell (Working Copies / Arbeitskopie):** Strict publication model where published/live pages are read-only. All content changes must go through the working copy lifecycle: Draft → Submitted → In Review → Approved → Published. State transitions: draft↔submitted (submit/return), submitted→in_review (first reviewer edit), in_review→changes_requested (return), in_review/submitted→approved_for_publish (approve), approved_for_publish→published (publish). Terminal states: cancelled, published. One active WC per node (advisory lock). Publish creates a new content_revision and updates publishedRevisionId. Direct revision creation and direct revision publishing routes are blocked (409) — all content must flow through the WC approval workflow. Restore creates a new working copy (not a bare revision) so restored content also goes through review/approval. All endpoints have node-scoped RBAC authorization. Event audit trail tracked in `working_copy_events`. Frontend: NodeDetail shows read-only published content with WC status banner and action buttons; dedicated editor route `/nodes/:id/edit` (WorkingCopyEditorPage) with local state management, 2s debounced autosave, manual save, and submit dialog. MyWork page queries WC-based drafts/reviews from `content_working_copies` table.
    - **Connectors:** Management of source systems and storage providers (e.g., SharePoint), including sync scheduling, validation, and asset origin tracking.
    - **Backup:** Orchestrates `pg_dump`, manifest generation, SharePoint upload, and retention policies.
    - **Quality Dashboard:** Provides insights into page quality, duplicate detection, and maintenance hints.
    - **Page Types:** A registry of 18 page types, each with defined metadata fields, sections, and content quality calculation.
    - **Consistency Check:** Automated system consistency verification (schema drift, config, docs, backup/release status) accessible via Admin Settings → Konsistenz.
    - **Release Management:** Full release lifecycle tracking (in_progress → audit_pending → audit_passed → sync_pending → released) with transition validation, accessible via Admin Settings → Releases.
    - **Source of Truth:** Documented model (docs/15-SOURCE-OF-TRUTH.md) defining authoritative sources per artifact type (code, schema, API spec, config, content, docs, templates).

## External Dependencies

- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **API Framework:** Express 5
- **Frontend Framework:** React 19
- **Build Tool:** Vite
- **Styling:** TailwindCSS 4, shadcn/ui
- **Validation:** Zod
- **API Codegen:** Orval
- **E2E Testing:** Playwright
- **Logging:** pino
- **Authentication/Identity:** Microsoft Entra ID (OIDC)
- **External Services Integration:** Microsoft Graph API (for SharePoint)
- **AI Services:** OpenAI