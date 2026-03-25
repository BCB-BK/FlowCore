# Tech Log

Operational and technical notes, incidents, and decisions recorded chronologically.

## 2026-03-25 – Cluster 1 Setup

- **Repo audit completed**: Express 5 + Drizzle ORM + OpenAPI codegen stack confirmed as foundation
- **Config validation**: Zod-based config schema added with fail-fast behavior
- **Audit table**: `audit_events` table created in PostgreSQL via Drizzle
- **Correlation IDs**: Added via middleware, propagated through pino-http
- **Quality gates**: lint, typecheck, test, e2e, no-hardcode-check, docs:check scripts added
- **Playwright**: E2E test infrastructure installed with base tests
- **Documentation**: ADR structure, changelog, tech log, and playbook established
