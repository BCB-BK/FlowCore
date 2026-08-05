# Architektur – FlowCore (Bildungscampus Backnang)

## Übersicht

FlowCore ist ein Enterprise-Wiki für Prozess- und Qualitätsmanagement, entwickelt als pnpm-Monorepo mit TypeScript, React+Vite Frontend, Express 5 API-Server, PostgreSQL mit Drizzle ORM und Microsoft 365-Integration.

**Produktions-URL**: `https://flowcore.bildungscampus-backnang.de`

---

## Repository-Struktur

```
workspace/
├── artifacts/
│   ├── api-server/          # Express 5 API-Backend (Hauptdienst)
│   └── mockup-sandbox/      # Vite-Entwicklungsserver für UI-Prototyping
├── artifacts/wiki-frontend/ # React+Vite SPA (Frontend)
├── lib/
│   ├── api-spec/            # OpenAPI 3.1 Spezifikation + Orval-Codegen
│   ├── api-client-react/    # Generierte React-Query-Hooks
│   ├── api-zod/             # Generierte Zod-Validierungsschemas
│   ├── db/                  # Drizzle ORM Schema + PostgreSQL-Verbindung
│   ├── shared/              # Gemeinsame Typen und Provider-Interfaces
│   └── ui/                  # Wiederverwendbare UI-Komponenten (shadcn/ui)
├── scripts/                 # Automatisierungsskripte und Qualitätsprüfungen
├── docs/                    # Projektdokumentation
├── pnpm-workspace.yaml      # Workspace-Konfiguration
└── tsconfig.base.json       # Gemeinsame TypeScript-Optionen
```

---

## Technologie-Stack

| Schicht | Technologie | Version |
|---|---|---|
| Frontend-Framework | React + Vite | React 18, Vite 7 |
| Backend-Framework | Express 5 | 5.x |
| Sprache | TypeScript | 5.x |
| Datenbank | PostgreSQL + Drizzle ORM | PostgreSQL 15+ |
| Authentifizierung | Microsoft Entra ID (OIDC/PKCE) | — |
| Teams-Integration | Microsoft Teams JS SDK | v2 |
| Graph-API | @microsoft/microsoft-graph-client | 3.x |
| Block-Editor | TipTap (ProseMirror) | 2.x |
| BPMN-Diagramme | bpmn-js (Camunda) | — |
| Logging | pino + pino-http | — |
| Paketmanager | pnpm (Workspace) | 10.x |

---

## Systemarchitektur

```
Browser / Microsoft Teams
        │
        ▼
   React+Vite SPA (Frontend)
        │  REST-API / React Query
        ▼
   Express 5 API-Server
        │
   ┌────┴────────────────────────────┐
   │                                 │
   ▼                                 ▼
PostgreSQL (Drizzle ORM)    Microsoft Graph API
                                     │
                             ┌───────┴──────────┐
                             ▼                  ▼
                      SharePoint          Microsoft Entra ID
                    (Medienablage,        (Authentifizierung,
                      Backup)              Benutzerdaten)
```

---

## API-Server (`artifacts/api-server`)

### Einstiegspunkte
- `src/index.ts` – Liest `PORT`, startet Express
- `src/app.ts` – Middlewares (pino-http, CORS, Security-Header, Session, Rate Limiting)
- `src/routes/index.ts` – Registriert alle Route-Module

### Route-Module

| Modul | Pfad | Funktion |
|---|---|---|
| `health.ts` | `GET /api/healthz` | Systemzustand (DB, Dienste) |
| `auth.ts` | `/api/auth/*` | Entra-SSO-Login, Logout, Session |
| `content.ts` | `/api/content/*` | Seitenbaum, Revisionen, Relationen |
| `media.ts` | `/api/media/*` | Datei-Upload/-Download, Medienbibliothek |
| `search.ts` | `GET /api/search` | Volltextsuche (pg_trgm) |
| `principals.ts` | `/api/principals/*` | Benutzerverwaltung, RBAC |
| `glossary.ts` | `/api/glossary/*` | Glossareinträge |
| `tags.ts` | `/api/tags/*` | Tag-Verwaltung |
| `templates.ts` | `/api/templates/*` | Seitenvorlagen |
| `admin.ts` | `/api/admin/*` | Systemeinstellungen, Backup |
| `connectors.ts` | `/api/connectors/*` | Speicheranbieter, Quellsysteme |
| `notifications.ts` | `/api/notifications/*` | In-App-Benachrichtigungen |
| `ai.ts` | `/api/ai/*` | KI-Assistent (FlowCore-Assistent) |
| `graph.ts` | `/api/graph/*` | Microsoft Graph (Personen, Gruppen) |
| `working-copies.ts` | `/api/content/working-copies/*` | Arbeitsentwürfe |

### Dienste (Services)

| Dienst | Datei | Funktion |
|---|---|---|
| Auth | `auth.service.ts` | Entra-OIDC, Session-Management |
| SharePoint Storage | `sharepoint-storage.service.ts` | Datei-Upload/Download via Graph API |
| Storage | `storage.service.ts` | Provider-Abstraktion, Cache |
| Backup | `backup.service.ts` | Geplante und manuelle Backups |
| SharePoint | `sharepoint.service.ts` | Graph-API-Token, Drive-Operationen |
| AI | `ai.service.ts` | KI-Assistent, Feldvorschläge |
| Notification | `notification.service.ts` | In-App-Benachrichtigungen |
| Review | `review.service.ts` | Review-Zyklen, Wiedervorlagen |

---

## Frontend (`artifacts/wiki-frontend`)

### Seitenstruktur

| Seite | Route | Funktion |
|---|---|---|
| Hub | `/` | Startseite, Quicklinks, Aktivitäten |
| NodeDetail | `/node/:id` | Seitenansicht |
| WorkingCopyEditorPage | `/nodes/:id/edit` | Arbeitskopie bearbeiten |
| WorkingCopyReviewPage | `/nodes/:id/review` | Arbeitskopie prüfen/genehmigen |
| SearchPage | `/search` | Volltextsuche |
| GlossaryPage | `/glossary`, `/glossary/:slug` | Glossar (mit Direktanker per Slug) |
| QualityDashboard | `/dashboard` | Qualitäts-Dashboard |
| MyWorkPage | `/my-work` | Meine Aufgaben (eigene Arbeitskopien, Reviews) |
| ReviewInboxPage | `/review-inbox` | Review-Posteingang |
| SettingsPage | `/settings` | Systemeinstellungen |
| ConnectorsPage | `/connectors` | Konnektoren-Verwaltung |
| AISettingsPage | `/ai-settings` | KI-Konfiguration |
| BrokenLinksPage | `/broken-links` | Defekte Verlinkungen |
| DocsPage | `/docs` | In-App-Dokumentationsbetrachter |
| TeamsTabConfig | `/teams/tab-config` | Microsoft Teams Tab-Konfiguration |

### Editor-Komponenten

| Komponente | Funktion |
|---|---|
| `BlockEditor.tsx` | TipTap-Block-Editor (Rich Text) |
| `BpmnEditor.tsx` | BPMN 2.0 Diagramm-Editor (bpmn-js) |
| `MediaLibraryDialog.tsx` | Medien-Bibliothek mit Upload |
| `SharePointMediaBrowser.tsx` | SharePoint-Dateiauswahl |
| `SlashCommandMenu.tsx` | Slash-Befehlsmenü (`/`) |

---

## Datenstrom

```
OpenAPI-Spezifikation (lib/api-spec/openapi.yaml)
    │
    ├──► Orval Codegen ──► React-Query-Hooks (lib/api-client-react)
    │                  ──► Zod-Schemas (lib/api-zod)
    │
    ▼
Express 5 API-Server
    │
    ├── Routen validieren mit @workspace/api-zod
    ├── Strukturiertes Logging via pino + pino-http
    ├── Datenbankzugriff via @workspace/db (Drizzle + PostgreSQL)
    └── Externe Dienste: Microsoft Graph, Azure AD Token-Endpunkt
```

---

## Sicherheitsarchitektur

### Authentifizierung
- Microsoft Entra ID (Azure AD) via OIDC/PKCE
- Nur Benutzer aus dem konfigurierten Tenant erhalten Zugang
- Sessions: HttpOnly-Cookies, `SameSite=None; Secure`, 8h Timeout
- App-to-App: Client-Credentials-Flow für SharePoint-Zugriff

### Autorisierung (RBAC)
- 7 Rollen: `system_admin`, `process_manager`, `editor`, `reviewer`, `approver`, `viewer`, `external_viewer`
- 13+ feingranulare Berechtigungen pro Endpunkt
- Middleware `requirePermission()` schützt alle schreibenden und administrativen Endpunkte

### HTTP-Sicherheitsheader
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (Produktion)
- `Content-Security-Policy` (Teams-Iframe-kompatibel)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-DNS-Prefetch-Control: off`

### Rate Limiting
- Auth-Endpunkte: 30 Anfragen / 15 Minuten pro IP
- API-Endpunkte: 200 Anfragen / Minute pro IP

---

## Deployment

| Parameter | Wert |
|---|---|
| Plattform | Replit (Autoscale Deployment) |
| Produktions-URL | `https://flowcore.bildungscampus-backnang.de` |
| Deployment-Typ | Autoscale (stateless) |
| Build | esbuild (API-Server), Vite (Frontend) |
| Laufzeit | Node.js 24 |

---

## Infrastrukturkomponenten (Provider-Abstraktion)

Alle externen Dienste sind hinter stabilen TypeScript-Interfaces abstrahiert (ADR-007):

| Provider | Interface | Aktive Implementierung |
|---|---|---|
| Auth / Identity | `IAuthProvider` | Microsoft Entra ID (OIDC) |
| Storage / Medien | `IStorageProvider` | SharePoint (Microsoft Graph) |
| Suche | `ISearchProvider` | PostgreSQL Volltext (pg_trgm) |
| KI / Retrieval | `IAIProvider` | OpenAI-kompatible API |
| Konnektoren | `IConnectorProvider` | Microsoft Graph |
| Benachrichtigungen | `INotificationProvider` | In-App (Datenbank) |
