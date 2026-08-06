# CLAUDE.md — FlowCore

@CLAUDE-STANDARD.md

> OneCampus-Kernvertrag v2.0 (oben eingebunden) gilt vollständig. Ergänzend: `AGENTS.md`
> (R1–R8, SSOT-Tabelle R7 — bleibt maßgeblich für Repo-Spezifika). Bereichsregeln:
> `.claude/rules/` · Verfahren: Skills `critical-task`/`deploy`/`migration` · Review:
> `architecture-reviewer`/`security-reviewer`. Bei Widerspruch gilt die strengere Regel.

## Tool-Steckbrief

- **Tool:** FlowCore — prozessbasiertes Wissensmanagement/Enterprise Wiki des
  Bildungscampus Backnang (Content-Nodes, Publikationsworkflow, RBAC, MS-365-Konnektoren).
- **Stack:** TypeScript/ESM, pnpm-Workspace-Monorepo, Node 24 (nvm), Express 5 (esbuild →
  `dist/index.mjs`), React 19 + Vite (SPA → `artifacts/wiki-frontend/dist/public`).
- **Systemkarte/Architektur:** `docs/01-ARCHITECTURE.md` (+ `replit.md` als Ausgangsaufnahme).

## Tier B — was das KONKRET heißt

Agent arbeitet **frei auf DEV** (`dev`-Branch): committen, pushen, der Webhook deployt
automatisch, keine Rückfrage nötig. **PROD nur über Merge `dev` → `master` nach
ausdrücklicher Freigabe** mit vollständiger Änderungsliste (Skill `deploy`). Nie ungefragt
auf `master` pushen — **jeder `master`-Push deployt PROD automatisch.**

## Umgebungen & Branches (DEKLARIERT — nie ableiten)

| Umgebung | Branch | URL | Port | DB | Secrets | Deploy-Trigger |
|---|---|---|---|---|---|---|
| PROD | `master` | https://flowcore.onecampusgroup.de | 5002 | `flowcore_prod` | `/var/www/flowcore-prod/.env` | Push auf `master` → Webhook 9003 |
| DEV | `dev` | https://dev-flowcore.onecampusgroup.de | 5003 | `flowcore_dev` | `/var/www/flowcore-dev/.env` | Push auf `dev` → Webhook 9004 |

Server: `31.70.109.255` (Register: `/opt/onecampus/server-register.md`). **Achtung:** der
Default-Branch heißt `master`, nicht `main`. Genau **eine** PM2-Instanz je Umgebung
(In-Process-Scheduler). Schema-Sync: `pnpm --filter db push` — Wirkung vorher prüfen
(löscht undeklarierte Tabellen). DB-Regel: PROD → DEV-Refresh, nie umgekehrt.

## Definition of Done — Repo-Befehle

```bash
pnpm typecheck
pnpm lint
pnpm test                                   # Unit-Tests (Stand 08/2026: 72)
pnpm --filter @workspace/scripts run task-completion-audit
pnpm --filter @workspace/scripts run senior-self-review
```

Bei API-Spec-Änderung: Orval-Codegen (`AGENTS.md` R5). CI: GitHub Actions (zwei Jobs) muss grün sein.
Abschlussstatus: `BESTANDEN` · `NICHT BESTANDEN` · `BLOCKIERT VOR START` ·
`BLOCKIERT DURCH SCOPE-FREMDEN FEHLER`.

## SSOT & Hotspots

SSOT-Tabelle: **`AGENTS.md` R7** (Registry, Layout-Configs, `config.ts` für Env-Vars,
`lib/db/src/schema/`, `openapi.yaml`, RBAC-Middleware, Audit-Event-Codes).
Hotspots (ein Bearbeiter zur Zeit): `lib/shared/src/page-types/registry.ts`,
`artifacts/wiki-frontend/src/components/layouts/layout-engine/configs.ts`.

## Session-Learnings (destilliert)

- 06.08.2026: Migration von Replit abgeschlossen (Audit: `toolumzug/docs/04+06`); **Cutover
  offen** — bis dahin sind Scheduler (Backup/SharePoint-Sync) auf beiden Instanzen bewusst AUS.
- `ENTRA_*` sind in Produktion Pflicht (Start bricht sonst ab); `ENTRA_REQUIRED_GROUP_ID` ist
  gesetzt — ohne Gruppenmitgliedschaft kein Zugriff.
