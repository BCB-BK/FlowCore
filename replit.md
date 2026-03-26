# Workspace – FlowCore (Bildungscampus Backnang)

## Overview

pnpm workspace monorepo for FlowCore, a process-based knowledge management system. Uses TypeScript, Express 5 API server, React+Vite frontend, PostgreSQL with Drizzle ORM, and OpenAPI-first code generation.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **E2E testing**: Playwright
- **Logging**: pino + pino-http (structured JSON logs)

## Structure

```text
workspace/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express 5 API server
│   ├── wiki-frontend/      # React+Vite frontend (Knowledge Hub)
│   └── mockup-sandbox/     # Vite dev server for UI prototyping
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── shared/             # Shared types & provider abstractions
├── scripts/                # Utility scripts (@workspace/scripts)
│   └── src/                # no-hardcode-check, docs-check, etc.
├── e2e/                    # Playwright E2E tests
│   └── tests/              # Test specs
├── docs/                   # Project documentation
│   ├── adr/                # Architecture Decision Records
│   ├── templates/          # Report templates
│   └── reports/            # Cluster reports and audits
├── pnpm-workspace.yaml     # pnpm workspace config
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
├── CHANGELOG.md            # Project changelog
└── package.json            # Root package with quality gate scripts
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build`
- `pnpm run typecheck` — runs `tsc --build` using project references
- `pnpm run lint` — Prettier format check
- `pnpm run lint:fix` — auto-format with Prettier
- `pnpm run no-hardcode-check` — scan for hardcoded secrets/URIs
- `pnpm run docs:check` — verify required documentation exists
- `pnpm run test` — unit tests (placeholder)
- `pnpm run e2e` — Playwright E2E tests

## Quality Gates (run before every delivery)

```bash
pnpm run typecheck
pnpm run lint
pnpm run no-hardcode-check
pnpm run docs:check
cd e2e && npx playwright test
```

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with structured logging, config validation, content management, auth/RBAC, and audit events.

- Entry: `src/index.ts` — uses validated config (Zod), seeds dev principals on startup
- App: `src/app.ts` — security headers, rate limiting, correlation ID middleware, pinoHttp, CORS, 2MB body limit, routes at `/api`
- Config: `src/lib/config.ts` — Zod schema for PORT, NODE_ENV, DATABASE_URL, LOG_LEVEL, AUTH_DEV_MODE, Entra ID config
- Logger: `src/lib/logger.ts` — pino with redaction
- Audit: `src/lib/audit.ts` — persistent audit event logging
- Middlewares: `src/middlewares/security-headers.ts` — CSP, HSTS, X-Content-Type-Options, frame-ancestors for Teams
- Middlewares: `src/middlewares/rate-limit.ts` — In-memory rate limiter (auth: 30/15min, API: 200/min)
- Middlewares: `src/middlewares/correlation-id.ts` — request correlation IDs
- Middlewares: `src/middlewares/require-auth.ts` — authentication gate (dev mode + Entra SSO)
- Middlewares: `src/middlewares/require-permission.ts` — RBAC permission gate
- Routes: `src/routes/health.ts` — `GET /api/healthz` with DB connectivity check
- Routes: `src/routes/auth.ts` — login, callback, me, logout, dev-users (5 endpoints)
- Routes: `src/routes/principals.ts` — principal CRUD, role mgmt, page perms, ownership (12 endpoints)
- Routes: `src/routes/content.ts` — Content CRUD, revisions, relations, templates, backlinks, forward-links, broken-links (20 endpoints, all auth-guarded)
- Routes: `src/routes/media.ts` — Media upload, list, get, delete, file serving, usage tracking (7 endpoints)
- Routes: `src/routes/search.ts` — Full-text search (FTS with tsvector), suggestions, analytics, click-through tracking (4 endpoints)
- Routes: `src/routes/tags.ts` — Tag CRUD + node tag assignment/removal (6 endpoints)
- Routes: `src/routes/glossary.ts` — Glossary term CRUD, manual linking/unlinking to nodes, by-node lookup (8 endpoints)
- Routes: `src/routes/review.ts` — Review workflow (submit/approve/reject), revision events, diff, watchers (10 endpoints, all auth+permission-guarded)
- Routes: `src/routes/connectors.ts` — Source system CRUD, storage provider CRUD, SharePoint browsing (sites/drives/items), sync trigger, sync status dashboard (14 endpoints)
- Routes: `src/routes/source-refs.ts` — Source reference CRUD per node, freshness check, per-node permission-guarded (4 endpoints)
- Routes: `src/routes/ai.ts` — AI assistant settings CRUD, knowledge Q&A (SSE streaming), page writing assistant (SSE streaming), usage stats (4 endpoints)
- Routes: `src/routes/admin.ts` — System info endpoint (auth-guarded, returns version/env/DB/auth/integrations status)
- Routes: `src/routes/quality.ts` — Quality dashboard overview, page quality list (filterable), duplicates analysis, maintenance hints, personal work items, search insights (6 endpoints)
- Services: `src/services/ai.service.ts` — AI orchestration: settings management, wiki content retrieval (FTS), prompt construction, OpenAI streaming, source citations, usage logging
- Services: `src/services/storage.service.ts` — LocalStorageProvider + DB-backed default provider resolution + SharePoint provider selection
- Services: `src/services/sharepoint.service.ts` — SharePoint Graph API integration (sites, drives, items browsing) with dev-mode mock data
- Services: `src/services/sharepoint-storage.service.ts` — SharePointStorageProvider implementing IStorageProvider (upload/download via Graph API)
- Services: `src/services/sync-scheduler.service.ts` — Background sync scheduler (polls every 60s, honors syncEnabled + syncIntervalMinutes per source system)
- Services: `src/services/identity.service.ts` — Dual ID system (immutable_id + display_code)
- Services: `src/services/revision.service.ts` — Revision/version lifecycle
- Services: `src/services/graph.service.ts` — Graph relations with cycle detection
- Services: `src/services/auth.service.ts` — Microsoft Entra ID OIDC + dev mode with 5 dev users
- Services: `src/services/graph-client.service.ts` — Microsoft Graph API wrapper with caching + dev mock
- Services: `src/services/principal.service.ts` — Principal upsert, search, role assignment
- Services: `src/services/rbac.service.ts` — 7-role→13-permission matrix, page-level permissions, ownership

### `artifacts/wiki-frontend` (`@workspace/wiki-frontend`)

React+Vite frontend for the Enterprise Wiki Knowledge Hub.

- Framework: React 19 + Vite + TailwindCSS 4 + shadcn/ui
- Routing: Wouter (lightweight client-side router)
- Data fetching: React Query via `@workspace/api-client-react`
- Auth: Dev-mode header injection (`X-Dev-Principal-Id`) via `lib/api.ts`
- Pages: Hub (landing), NodeDetail (view/manage nodes with tabs: Inhalt/Metadaten/Versionen/Unterseiten), SearchPage (server-side FTS with facets), GlossaryPage (A-Z term management), BrokenLinksPage (broken relations + orphaned nodes), SettingsPage (/settings — unified admin settings with 5 tabs: Allgemein/Verbindungen/KI-Assistent/Seitentemplates/Konnektoren), AISettingsPage (admin KI-Assistent configuration + usage stats), QualityDashboard (/dashboard — KPI tiles, page quality list, maintenance hints, duplicate analysis), MyWorkPage (/my-work — personal cockpit with pending reviews/approvals/drafts)
- AI Components: GlobalAssistant (floating chat panel with SSE streaming, source citations), PageAssistant (writing aid panel: reformulate, summarize, expand, shorten, grammar, gap analysis)
- Components: AppLayout (header+sidebar+content), WikiSidebar (lazy-load tree), NodeBreadcrumbs, CreateNodeDialog (multi-step), TreeNode, PeoplePicker, PageTypeIcon
- Editor: BlockEditor (Tiptap-based rich text editor with 12+ block types, slash commands, edit/preview toggle, autosave to localStorage, draft recovery)
- Editor Extensions: Callout, FileBlock, VideoBlock, EmbedBlock, DiagramBlock (custom Tiptap node views)
- Editor UI: EditorToolbar (formatting), SlashCommandMenu (block insertion), MediaLibraryDialog (upload/browse)
- Metadata: MetadataPanel, MetadataFieldRenderer, CompletenessIndicator
- Versioning: StatusBadge, WatchButton, VersionHistoryPanel, ReviewWorkflowPanel, RevisionDiffView, RestoreDialog
- Tags: TagManager (inline tag assignment with create/assign/remove)
- Content: RelatedContentSidebar (backlinks + forward-links to current node)
- Content: GlossaryTermsPanel (linked glossary terms on node detail)
- Layouts: PageLayout (dispatcher), ProcessOverviewLayout, ProcedureLayout, PolicyLayout, RoleProfileLayout, GenericSectionLayout
- Teams: TeamsProvider (context detection), ShareToTeams (share/copy/open), TeamsTabConfig (channel tab setup)
- Teams context: `src/lib/teams.ts` (detection, deep links), `src/hooks/useTeamsContext.ts` (React hook)
- Teams manifest: `public/teams-manifest/manifest.json` (personal + configurable tabs)
- Entry: `src/main.tsx` → `src/App.tsx`
- Config: `vite.config.ts` — reads PORT env, proxies `/api` to api-server at port 8080

### `lib/shared` (`@workspace/shared`)

Shared types, provider abstractions, and page type registry.

- `src/providers/` — Provider interfaces (IAuthProvider, IStorageProvider, etc.) and ProviderResult<T>
- `src/page-types/registry.ts` — Comprehensive registry of all 11 page types (incl. glossary) with metadata fields, sections, icons, colors, categories, allowedChildTypes
- `src/page-types/index.ts` — Exports: PAGE_TYPE_REGISTRY, calculateCompleteness, getAllowedChildTypes, METADATA_GROUP_LABELS, types

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `src/index.ts` — Pool + Drizzle instance
- `src/schema/enums.ts` — PostgreSQL enums (node_status, change_type, relation_type, principal_type, wiki_role, wiki_permission, etc.)
- `src/schema/content-templates.ts` — 10 page type definitions
- `src/schema/content-nodes.ts` — Stable content objects with dual IDs, tsvector search index
- `src/schema/content-revisions.ts` — Immutable content snapshots + lifecycle events
- `src/schema/content-aliases.ts` — Display code history
- `src/schema/content-relations.ts` — Typed graph edges
- `src/schema/content-tags.ts` — Tags + junction table
- `src/schema/glossary.ts` — Glossary terms with synonyms, abbreviation, nodeId link
- `src/schema/search-analytics.ts` — Search query analytics tracking + click-through tracking
- `src/schema/media-assets.ts` — File attachments
- `src/schema/audit-events.ts` — Audit trail
- `src/schema/principals.ts` — Principals, role assignments, page permissions, node ownership
- `src/schema/ai-settings.ts` — AI settings (global config) + AI usage logs (metadata-only: action, model, latency, errors)
- `src/seed.ts` — Example seed data
- Push: `pnpm --filter @workspace/db run push`
- Seed: `npx -p tsx tsx lib/db/src/seed.ts`

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec and Orval codegen config.
- Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `e2e` (`@workspace/e2e`)

Playwright E2E tests.
- Run: `cd e2e && npx playwright test`
- Config: `e2e/playwright.config.ts`

### `scripts` (`@workspace/scripts`)

Utility scripts: `no-hardcode-check`, `docs-check`, `migrate-pilot` (pilot content migration).

## Documentation

All project documentation lives in `docs/`. See `docs/00-INDEX.md` for the full index.

- Architecture: `docs/01-ARCHITECTURE.md`
- Data Model: `docs/02-DATA-MODEL.md`
- Config/Env: `docs/05-CONFIG-ENV.md`
- Logging/Audit: `docs/06-LOGGING-AUDIT.md`
- Agent Playbook: `docs/96-AGENT-PLAYBOOK.md`
- ADRs: `docs/adr/` (ADR-001 Current State, ADR-002 Dual ID, ADR-003 Revision/Version)
- Reports: `docs/reports/`
