# Configuration & Environment

## Overview

All configuration is validated at startup using Zod schemas. The application fails fast if required values are missing — no silent fallbacks or dummy defaults.

## Configuration Categories

| Category      | Prefix/Key       | Required | Description                          |
|---------------|------------------|----------|--------------------------------------|
| App           | `PORT`           | Yes      | Server port                          |
| App           | `NODE_ENV`       | No       | Environment mode (defaults to "development" for local dev; must be set explicitly in production) |
| Database      | `DATABASE_URL`   | Yes      | PostgreSQL connection string         |
| Auth (future) | `AZURE_*`        | No       | Microsoft Entra ID SSO credentials   |
| Graph (future)| `GRAPH_*`        | No       | Microsoft Graph API configuration    |
| AI (future)   | `OPENAI_*`       | No       | ChatGPT API credentials              |
| Logging       | `LOG_LEVEL`      | No       | pino log level (default: info)       |

## Config Validation

The config schema is defined in `artifacts/api-server/src/lib/config.ts`. It uses Zod for type-safe validation at startup.

```typescript
import { appConfig } from "./lib/config";
// appConfig.port, appConfig.nodeEnv, appConfig.databaseUrl
```

## Environment Files

- **Development**: Environment variables are managed by Replit (Secrets tab)
- **Production**: Set via Replit deployment environment
- **No `.env` files committed** — all secrets managed through Replit's secret management

## Adding New Config Values

1. Add the value to the Zod schema in `artifacts/api-server/src/lib/config.ts`
2. Mark it as required (`.min(1)`) or optional (`.optional()`) with a default
3. Document it in this file
4. Update the health endpoint if it's a critical dependency

## Health Check

`GET /api/healthz` returns:
- `{ status: "ok", database: "connected" }` — all systems operational
- `{ status: "degraded", database: "disconnected" }` — database unreachable
- HTTP 503 if critical systems are down
