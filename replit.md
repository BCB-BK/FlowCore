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
The frontend, `wiki-frontend`, is a React 19 application utilizing Vite, TailwindCSS 4, and shadcn/ui for a responsive design. Key UI components include a global AI assistant chat, a Tiptap-based rich text editor supporting various content blocks (e.g., callout, file, video, embed, diagram, gallery with professional metadata), and specialized layouts for 18 distinct page types (e.g., Process Overview, Procedure). It supports drag-and-drop media uploads and integrates with Microsoft Teams for contextual sharing. The editor features a categorized block type picker (Plus-Flow), drag-and-drop block reordering with visual drop indicator, a content completeness bar with section suggestions, and enterprise-grade media blocks including gallery support.

**Technical Implementations:**
- **API Server (`api-server`):** An Express 5 server providing a RESTful API with structured logging (pino), configuration validation (Zod), security features (headers, rate limiting), and correlation ID middleware. Authentication uses Microsoft Entra ID OIDC, and authorization is managed via a 7-role to 17-permission RBAC matrix with page-level permissions.
- **Database:** PostgreSQL with Drizzle ORM and Zod for schema validation. The schema includes content nodes (with dual IDs and `tsvector` search index), revisions, relations, tags, glossary terms, search analytics, media assets, audit events, principals, AI settings, and connector configurations.
- **API Specification and Codegen:** OpenAPI 3.1 defines the API, and Orval generates client-side code, including React Query hooks and Zod schemas.
- **Monorepo Structure:** Organized into `artifacts/` (deployables), `lib/` (shared libraries), `scripts/` (utilities), and `e2e/` (Playwright tests).
- **Core Features:**
    - **Content Management:** CRUD operations for content nodes, revisions, relations, templates, and links, employing a dual ID system (`immutable_id` + `display_code`). Navigation features include hierarchy-aware breadcrumbs (with L1/L2/... depth indicators and deep-path collapsing), professionalized relation sidebar (Parent/Children/Siblings/cross-references grouped by category with German labels), and overview pages with grouped child slots (by template type with per-group "+" buttons and numbered ordering).
    - **Search:** Full-text search with suggestions and analytics.
    - **AI Assistant:** Orchestration services for knowledge Q&A and page writing assistance via SSE streaming, with usage logging.
    - **Workflow:** Review workflows (submit/approve/reject), revision events, diffing, and watchers.
    - **Publikationsmodell (Working Copies / Arbeitskopie):** Strict publication model where published/live pages are read-only. All content changes must go through the working copy lifecycle: Draft → Submitted → In Review → Approved → Published. State transitions: draft↔submitted (submit/return), submitted→in_review (first reviewer edit), in_review→changes_requested (return), in_review/submitted→approved_for_publish (approve), approved_for_publish→published (publish). Terminal states: cancelled, published. One active WC per node (advisory lock). Publish creates a new content_revision and updates publishedRevisionId. Direct revision creation and direct revision publishing routes are blocked (409) — all content must flow through the WC approval workflow. Restore creates a new working copy (not a bare revision) so restored content also goes through review/approval. All endpoints have node-scoped RBAC authorization. Event audit trail tracked in `working_copy_events`. Frontend: NodeDetail shows read-only published content with WC status banner and action buttons; dedicated editor route `/nodes/:id/edit` (WorkingCopyEditorPage) with local state management, 2s debounced autosave, manual save, and submit dialog. MyWork page queries WC-based drafts/reviews from `content_working_copies` table.
    - **Connectors:** Management of source systems and storage providers (e.g., SharePoint), including sync scheduling, validation, and asset origin tracking.
    - **Backup:** Orchestrates `pg_dump`, manifest generation, SharePoint upload, and retention policies. Configurable backup scope: DB dump, system config, templates, connectors (sans secrets), media-asset index, and audit metadata. Dry-run restore endpoint for pre-restore feasibility checks. Restore with RBAC-protected security dialog, manifest preview, and confirmation step.
    - **Quality Dashboard:** Provides insights into page quality, duplicate detection, and maintenance hints. Includes a Review/Working Copy Dashboard (system-wide view of all active working copies, filterable by status/template/age), an Ownership Monitor (pages without owner/reviewer/approver, escalation alerts, gap analysis), and search insights.
    - **Page Types:** A registry of 18 page types (Single Source of Truth in `lib/shared/src/page-types/registry.ts`), each with defined metadata fields, sections, guided mode steps, field governance (required/recommended/conditional), publication rules with minimum sections/metadata, and content quality validation. Includes `validateForPublication()`, `validateForDraft()`, `getGuidedSections()`, `getPublicationReadiness()`, `getFieldsByRequirement()`, and `getSectionsByRequirement()` functions with German error messages. Validation is enforced in the submit-for-review (WorkingCopyEditorPage) and publish (WorkingCopyActions) workflows, blocking submission/publication when requirements are not met. A readiness panel with guided editing order is shown in the editor.
    - **Consistency Check:** Automated system consistency verification (schema drift, config, docs, backup/release status) accessible via Admin Settings → Konsistenz.
    - **Release Management:** Full release lifecycle tracking (in_progress → audit_pending → audit_passed → sync_pending → released) with transition validation, accessible via Admin Settings → Releases.
    - **Audit Trail & Evidence:** Complete audit trail for all critical working copy lifecycle events (created, updated, submitted, commented, returned, approved, published, cancelled, unlocked, restored, amended_by_reviewer). Admin API endpoints (`GET /admin/audit-events`, `/admin/audit-events/filters`, `/admin/audit-events/export`) with query/filter/pagination/export (JSON/CSV). Personal data (actorId, ipAddress, comments) is redacted for users without `manage_settings` permission. AuditTrailTab in Settings page for admin viewing. VersionHistoryPanel shows validFrom dates and return/rejection status. Export includes rights check for personal data.
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
- **External Services Integration:** Microsoft Graph API (for SharePoint, Teams notifications)
- **AI Services:** OpenAI

## Notifications & Watchers

- **Notification Service** (`api-server/src/services/notification.service.ts`): Creates in-app notifications (stored in `notifications` table) and sends MS Teams chat messages via Graph API to relevant recipients.
- **Recipients** are determined per event by role: page watchers, node owners, deputies, reviewers, approvers, and process managers (for submissions and escalations).
- **Event types**: `working_copy_submitted`, `working_copy_approved`, `working_copy_returned`, `working_copy_published`, `review_overdue`, `review_overdue_escalation`, `page_updated`.
- **Review Cycle Checker** (`api-server/src/services/review-cycle.service.ts`): Scheduled hourly job that checks `nextReviewDate` on published revisions. Sends overdue notifications to owners/deputies; escalates to process managers after 14 days.
- **Notification Routes** (`/api/notifications`): GET list, GET unread-count, PATCH mark-read, PATCH mark-all-read.
- **Frontend**: `NotificationBell` component in AppHeader with unread count badge and popover dropdown showing recent notifications with mark-read actions.