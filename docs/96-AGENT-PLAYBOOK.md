# Agent Playbook – FlowCore

This playbook governs all development work on this project. Every task must follow these rules.

## Core Principles

1. **Search first** — before creating any file, check if a similar structure already exists.
2. **Extend, don't replace** — build on existing architecture unless there's a documented reason to change.
3. **Fail fast** — no silent fallbacks, no runtime defaults for critical config.
4. **No hardcodings** — configurable values must come from config/env.
5. **Root-cause fixes** — no workarounds; fix the actual problem.
6. **Clean up as you go** — if you touch a file, fix tech debt in that area.

## Pre-Implementation Checklist

Before writing any code:

- [ ] Read the relevant ADR(s) for the area you're working in
- [ ] Check existing files in the target directory
- [ ] Verify the OpenAPI spec covers required endpoints
- [ ] Identify shared types that should go in `lib/`
- [ ] Check if similar functionality exists elsewhere in the codebase

## Sprache im Code und in der Dokumentation

Festgelegt am 06.08.2026 im Nachgang zum technischen Audit (Befund C9). Der
Bestand war gemischt: 226 deutsche und 452 englische Kommentarzeilen.

- **Bezeichner** (Variablen, Funktionen, Typen, Tabellen- und Spaltennamen):
  Englisch. Das bleibt unveraendert.
- **Kommentare im Code**: Deutsch. Sie erklaeren fachliche Zusammenhaenge fuer
  ein deutschsprachiges Team; die sicherheitsrelevanten Stellen sind bereits so
  kommentiert.
- **Betreiber- und Fachdokumentation** (`docs/`, Server-Register): Deutsch.
- **Commit-Nachrichten**: Deutsch.

Bestehende englische Kommentare werden **nicht** flaechendeckend uebersetzt --
das erzeugt nur Rauschen im Verlauf. Sie werden angeglichen, wenn die Stelle
ohnehin angefasst wird ("Clean up as you go").

## Implementation Rules

### No Hardcoded Values
- All configurable values must come from environment variables or config
- Use the config validation schema (`artifacts/api-server/src/lib/config.ts`)
- Database connection strings, API keys, feature flags — all via config

### No Silent Fallbacks
- If a required config value is missing, throw an error
- If an API call fails, return a proper error response
- If a database query fails, log and propagate the error

### Code Quality
- Use `req.log` for request-scoped logging (pino-http)
- Use `logger` singleton only for non-request code
- Never use `console.log` in server code
- All new routes must validate input with Zod schemas
- All new DB tables must have Drizzle schema + insert schema + types

### Testing
- Every new feature needs at least one integration test
- UI changes need Playwright E2E evidence
- Negative cases (unauthorized, invalid input) must be tested

## Quality Gates

Before completing any task, run these in order:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run e2e
pnpm run no-hardcode-check
pnpm run docs:check
```

All must pass before delivery.

## Delivery Checklist

Every completed cluster/task must include:

- [ ] All quality gates pass
- [ ] Changed files listed
- [ ] Existing structures checked and documented
- [ ] ADRs updated if architecture changed
- [ ] CHANGELOG.md updated
- [ ] replit.md updated if structure changed
- [ ] Open issues and risks documented

## Delivery Report Format

Use the template at `docs/templates/CLUSTER-REPORT-TEMPLATE.md`.

## Documentation Rules

- Documentation lives in `docs/` as Markdown
- ADRs go in `docs/adr/` with sequential numbering
- No shadow documentation in random files
- Update docs in the same commit as the code change
