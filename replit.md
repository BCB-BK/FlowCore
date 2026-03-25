# Workspace – Enterprise Wiki (Bildungscampus Backnang)

## Overview

pnpm workspace monorepo for a process-based Enterprise Wiki system. Uses TypeScript, Express 5 API server, React+Vite frontend, PostgreSQL with Drizzle ORM, and OpenAPI-first code generation.

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
│   └── db/                 # Drizzle ORM schema + DB connection
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
- App: `src/app.ts` — correlation ID middleware, pinoHttp, CORS, routes at `/api`
- Config: `src/lib/config.ts` — Zod schema for PORT, NODE_ENV, DATABASE_URL, LOG_LEVEL, AUTH_DEV_MODE, Entra ID config
- Logger: `src/lib/logger.ts` — pino with redaction
- Audit: `src/lib/audit.ts` — persistent audit event logging
- Middlewares: `src/middlewares/correlation-id.ts` — request correlation IDs
- Middlewares: `src/middlewares/require-auth.ts` — authentication gate (dev mode + Entra SSO)
- Middlewares: `src/middlewares/require-permission.ts` — RBAC permission gate
- Routes: `src/routes/health.ts` — `GET /api/healthz` with DB connectivity check
- Routes: `src/routes/auth.ts` — login, callback, me, logout, dev-users (5 endpoints)
- Routes: `src/routes/principals.ts` — principal CRUD, role mgmt, page perms, ownership (12 endpoints)
- Routes: `src/routes/content.ts` — Content CRUD, revisions, relations, templates (17 endpoints, all auth-guarded)
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
- Pages: Hub (landing), NodeDetail (view/manage nodes), SearchPage (real-time search)
- Components: AppLayout (header+sidebar+content), WikiSidebar (lazy-load tree), NodeBreadcrumbs, CreateNodeDialog, TreeNode
- Entry: `src/main.tsx` → `src/App.tsx`
- Config: `vite.config.ts` — reads PORT env, proxies `/api` to api-server at port 8080

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `src/index.ts` — Pool + Drizzle instance
- `src/schema/enums.ts` — PostgreSQL enums (node_status, change_type, relation_type, principal_type, wiki_role, wiki_permission, etc.)
- `src/schema/content-templates.ts` — 10 page type definitions
- `src/schema/content-nodes.ts` — Stable content objects with dual IDs
- `src/schema/content-revisions.ts` — Immutable content snapshots + lifecycle events
- `src/schema/content-aliases.ts` — Display code history
- `src/schema/content-relations.ts` — Typed graph edges
- `src/schema/content-tags.ts` — Tags + junction table
- `src/schema/media-assets.ts` — File attachments
- `src/schema/audit-events.ts` — Audit trail
- `src/schema/principals.ts` — Principals, role assignments, page permissions, node ownership
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

Utility scripts: `no-hardcode-check`, `docs-check`.

## Documentation

All project documentation lives in `docs/`. See `docs/00-INDEX.md` for the full index.

- Architecture: `docs/01-ARCHITECTURE.md`
- Data Model: `docs/02-DATA-MODEL.md`
- Config/Env: `docs/05-CONFIG-ENV.md`
- Logging/Audit: `docs/06-LOGGING-AUDIT.md`
- Agent Playbook: `docs/96-AGENT-PLAYBOOK.md`
- ADRs: `docs/adr/` (ADR-001 Current State, ADR-002 Dual ID, ADR-003 Revision/Version)
- Reports: `docs/reports/`
