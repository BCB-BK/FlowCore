# Architecture Map – FlowCore (Bildungscampus Backnang)

## Overview

pnpm monorepo using TypeScript, Express 5 API server, PostgreSQL with Drizzle ORM, and OpenAPI-first code generation.

## Repository Structure

```
workspace/
├── artifacts/
│   ├── api-server/          # Express 5 API (main backend)
│   └── mockup-sandbox/      # Vite dev server for UI prototyping
├── lib/
│   ├── api-spec/            # OpenAPI 3.1 spec + Orval codegen config
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod validation schemas
│   └── db/                  # Drizzle ORM schema + PostgreSQL connection
├── scripts/                 # Utility scripts (@workspace/scripts)
├── docs/                    # Project documentation (this directory)
├── package.json             # Root: typescript, prettier
├── pnpm-workspace.yaml      # Workspace config, catalog pins, overrides
├── tsconfig.base.json       # Shared TS options (composite, bundler, es2022)
└── tsconfig.json            # Root solution file (lib references only)
```

## Data Flow

```
OpenAPI Spec (lib/api-spec/openapi.yaml)
    │
    ├──► Orval codegen ──► React Query hooks (lib/api-client-react)
    │                  ──► Zod schemas (lib/api-zod)
    │
    ▼
Express 5 API Server (artifacts/api-server)
    │
    ├── Routes (/api/*) use @workspace/api-zod for validation
    ├── Structured logging via pino + pino-http
    └── Database access via @workspace/db (Drizzle + PostgreSQL)
```

## Key Modules

### API Server (`artifacts/api-server`)
- **Entry**: `src/index.ts` — reads `PORT`, starts Express
- **App**: `src/app.ts` — mounts pinoHttp, CORS, JSON parser, routes at `/api`
- **Logger**: `src/lib/logger.ts` — pino with redaction (auth headers, cookies)
- **Routes**: `src/routes/index.ts` → `src/routes/health.ts` (`GET /api/healthz`)
- **Build**: esbuild bundle (`build.mjs`) with pino plugin

### Database (`lib/db`)
- **Connection**: `src/index.ts` — pg Pool + Drizzle instance
- **Schema**: `src/schema/index.ts` — currently empty (no tables defined)
- **Migrations**: via `drizzle-kit push` (dev) / Replit deployment (prod)

### API Spec (`lib/api-spec`)
- **Spec**: `openapi.yaml` — single source of truth for API contracts
- **Codegen**: `orval.config.ts` — generates into api-client-react and api-zod

### Generated Libraries
- **api-client-react**: React Query hooks + custom fetch
- **api-zod**: Zod schemas for request/response validation

## Build & TypeScript Strategy

- **Root `tsc --build`**: builds composite libs (db, api-zod, api-client-react)
- **Artifacts**: typechecked with `tsc --noEmit` (leaf packages)
- **JS bundling**: esbuild (api-server), Vite (frontend artifacts)
- **Codegen**: `pnpm --filter @workspace/api-spec run codegen`

## Existing Infrastructure

| Component           | Status    | Notes                                    |
|---------------------|-----------|------------------------------------------|
| Express 5 server    | Ready     | Mounted at /api, pinoHttp logging        |
| PostgreSQL + Drizzle| Ready     | Pool configured, empty schema            |
| pino logging        | Ready     | JSON logs, redaction, pino-pretty in dev |
| pinoHttp middleware  | Ready     | Request-scoped logging with req.id       |
| OpenAPI codegen     | Ready     | Orval generates hooks + Zod schemas      |
| Health endpoint     | Ready     | GET /api/healthz                         |
| CORS                | Ready     | Enabled                                  |
| Mockup sandbox      | Ready     | Vite dev server for UI prototyping       |

## Reusable Components for Wiki

- pino logging stack (extend with audit events)
- Drizzle ORM + PostgreSQL (add wiki schema)
- OpenAPI → codegen pipeline (extend spec for wiki endpoints)
- Express middleware chain (add auth, permissions)
- esbuild production bundling

## Technical Debt / Altlasten

1. **Empty DB schema** — no tables defined yet; needs wiki domain model
2. **No test infrastructure** — no test runner, no E2E, no unit tests
3. **No lint configuration** — no ESLint or similar
4. **No config validation** — PORT check exists but no centralized schema
5. **No audit trail** — logging exists but no persistent audit events
6. **Health endpoint minimal** — only returns `{ status: "ok" }`, no DB check
7. **No environment documentation** — no .env.example or config docs
8. **cookie-parser imported but unused** — in package.json but not in app.ts
