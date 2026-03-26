# FlowCore (Bildungscampus Backnang)

## Overview

FlowCore is a process-based knowledge management system implemented as a pnpm workspace monorepo. It aims to provide a comprehensive solution for managing organizational knowledge, processes, and documentation with advanced features like AI assistance, robust content management, and integration capabilities.

The project's vision is to enhance knowledge sharing, improve process efficiency, and facilitate informed decision-making within organizations. Key capabilities include a rich enterprise wiki, full-text search, version control, role-based access control, and connectors to external systems like SharePoint.

## User Preferences

I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `docs/`.
Do not make changes to the file `CHANGELOG.md`.

## System Architecture

FlowCore utilizes a monorepo structure managed by pnpm workspaces, built with TypeScript 5.9.

**UI/UX Decisions:**
The frontend, `wiki-frontend`, is a React 19 application built with Vite, styled using TailwindCSS 4 and shadcn/ui. It features a responsive design with a global assistant chat panel, a rich text editor (Tiptap-based) supporting various content blocks (e.g., callout, file, video, embed, diagram), and specialized layouts for different page types (e.g., Process Overview, Procedure, Policy). The editor supports professional metadata for media and diagram blocks, drag-and-drop media upload, and contextual subpage creation. The system also integrates with Microsoft Teams for context detection and sharing.

**Technical Implementations:**
- **API Server (`api-server`):** An Express 5 server providing a RESTful API. It includes structured logging (pino), configuration validation (Zod), security headers, rate limiting, and correlation ID middleware. Authentication is handled via Microsoft Entra ID OIDC with a development mode. Authorization is managed through a 7-role to 17-permission RBAC matrix, supporting page-level permissions and ownership.
- **Database:** PostgreSQL with Drizzle ORM, utilizing Zod for schema validation. The database schema includes enums, content nodes (with dual IDs and tsvector search index), revisions, aliases, relations, tags, glossary terms, search analytics, media assets, audit events, principals, AI settings, and backup configurations.
- **API Specification and Codegen:** An OpenAPI 3.1 specification is used for API definition, with Orval generating client-side code, including React Query hooks and Zod schemas.
- **Monorepo Structure:** The workspace is organized into `artifacts/` for deployable applications (API server, frontend), `lib/` for shared libraries (API spec, client, DB, shared types), `scripts/` for utilities, and `e2e/` for Playwright tests.
- **TypeScript Configuration:** All packages extend a base `tsconfig.base.json` with `composite: true`, and the root `tsconfig.json` manages project references for efficient type-checking and declaration emission.
- **Core Features:**
    - **Content Management:** CRUD operations for content nodes, revisions, relations, templates, backlinks, and forward-links. Dual ID system (`immutable_id` + `display_code`).
    - **Search:** Full-text search (FTS with `tsvector`), suggestions, and analytics.
    - **AI Assistant:** AI orchestration services for knowledge Q&A (SSE streaming), page writing assistance (SSE streaming), and usage logging.
    - **Workflow:** Review workflow (submit/approve/reject), revision events, diff, and watchers.
    - **Connectors:** Source system CRUD, storage provider management (SharePoint), and sync scheduling.
    - **Backup:** Orchestration for `pg_dump`, manifest generation, SharePoint upload, retention rules, and restore.
    - **Quality Dashboard:** Overview, page quality analysis, duplicate detection, maintenance hints, and personal work items.
    - **Page Types:** A comprehensive registry of 18 page types with metadata fields, sections, icons, colors, categories, and allowed child types, supporting content quality calculation.

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
- **Logging:** pino, pino-http
- **Authentication/Identity:** Microsoft Entra ID (OIDC)
- **External Services Integration:** Microsoft Graph API (for SharePoint integration)
- **AI Services:** OpenAI (for AI assistant capabilities)