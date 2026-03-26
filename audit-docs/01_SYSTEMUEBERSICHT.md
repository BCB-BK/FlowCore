# 01 — Systemübersicht & Architektur

## 1.1 Produktbeschreibung

**FlowCore** ist ein Enterprise-Wiki-System, entwickelt für den Bildungscampus Backnang. Es dient der strukturierten Verwaltung von Prozessdokumentationen, Richtlinien, Rollenprofilen und Systemdokumentationen mit folgenden Kernfunktionen:

- Hierarchische Prozess-IDs und Baumstruktur
- Versionierung mit Review- und Genehmigungsworkflow
- 10 spezialisierte Seitenvorlagen
- Rollenbasierte Zugriffskontrolle (RBAC)
- Microsoft Entra ID SSO (ehemals Azure AD)
- Microsoft Teams Integration als Tab-App
- KI-gestützter Wissensassistent (RAG-basiert)
- SharePoint-Integration (Quellsysteme & Speicher)
- Volltextsuche mit Analyse und Vorschlägen
- Rich-Text-Editor (Tiptap/ProseMirror)

## 1.2 Technischer Stack

| Komponente | Technologie | Version |
|:-----------|:------------|:--------|
| **Laufzeitumgebung** | Node.js | via NixOS |
| **Sprache** | TypeScript | ~5.9 |
| **Backend-Framework** | Express | 5.x |
| **Frontend-Framework** | React | 19.x |
| **Build-Tool (Frontend)** | Vite | 7.x |
| **Build-Tool (Backend)** | esbuild | — |
| **Datenbank** | PostgreSQL | 16+ |
| **ORM** | Drizzle ORM | — |
| **Paketmanager** | pnpm | Workspace-Monorepo |
| **API-Spezifikation** | OpenAPI 3.1 | — |
| **Code-Generierung** | Orval | — |
| **Authentifizierung** | @azure/msal-node | — |
| **Rich-Text-Editor** | Tiptap | — |
| **UI-Komponenten** | Radix UI / Shadcn UI | — |
| **Styling** | Tailwind CSS | 4.x |
| **Icons** | Lucide React | — |
| **Routing (Frontend)** | Wouter | — |
| **Server State** | TanStack Query | — |
| **Animationen** | Framer Motion | — |
| **Logging** | Pino | — |
| **E2E-Tests** | Playwright | — |

## 1.3 Monorepo-Struktur

```
workspace/
├── artifacts/                  # Deploybare Anwendungen
│   ├── api-server/             # Express 5 API-Server (Backend)
│   ├── wiki-frontend/          # React + Vite (Hauptanwendung)
│   └── mockup-sandbox/         # Vite (UI-Prototyping, nur Entwicklung)
│
├── lib/                        # Gemeinsame Bibliotheken
│   ├── api-spec/               # OpenAPI 3.1 Spezifikation + Codegen
│   ├── api-client-react/       # Generierte TanStack Query Hooks
│   ├── api-zod/                # Generierte Zod-Validierungsschemas
│   ├── db/                     # Drizzle ORM Schema + DB-Verbindung
│   ├── shared/                 # Gemeinsame Typen, Konstanten, Provider
│   └── integrations-*/         # Integrationsspezifische Logik (OpenAI)
│
├── docs/                       # Projektdokumentation (ADRs, Architektur)
├── e2e/                        # Playwright End-to-End Tests
├── scripts/                    # Utility- und Wartungsskripte
└── attached_assets/            # Statische Assets (Bilder, Dokumente)
```

## 1.4 Paketübersicht

### Anwendungen (artifacts/)

| Paket | Zweck |
|:------|:------|
| `@workspace/api-server` | Express 5 Backend: Auth, RBAC, Content-Management, KI, Konnektoren |
| `@workspace/wiki-frontend` | React 19 Frontend: Editor, Navigation, Dashboards, Teams-Integration |
| `@workspace/mockup-sandbox` | Entwicklungsumgebung für UI-Komponenten-Tests |

### Bibliotheken (lib/)

| Paket | Zweck |
|:------|:------|
| `@workspace/api-spec` | OpenAPI 3.1 "Source of Truth" — generiert Client-Hooks und Zod-Schemas |
| `@workspace/api-client-react` | Generierte React-Hooks (TanStack Query) für API-Zugriff |
| `@workspace/api-zod` | Generierte Zod-Schemas für Backend-Validierung |
| `@workspace/db` | PostgreSQL-Verbindung und Drizzle ORM Schema-Definitionen |
| `@workspace/shared` | Seitentyp-Registry, gemeinsame Typen und Konstanten |
| `@workspace/integrations-openai-ai-server` | Server-seitiger OpenAI SDK Wrapper (Batching, Retries) |
| `@workspace/integrations-openai-ai-react` | Frontend-Hooks für KI-Funktionen (Spracheingabe, Audio) |

## 1.5 Architekturmuster

- **OpenAPI-First:** Die API-Spezifikation (`openapi.yaml`) ist die zentrale Wahrheit. Client-Hooks und Validierungsschemas werden daraus generiert.
- **Registry-Driven Templates:** Seitenvorlagen werden in einer zentralen Registry definiert (`lib/shared/src/page-types/registry.ts`) und steuern Frontend-Rendering und Backend-Validierung.
- **Immutable Revisions:** Inhaltsänderungen erzeugen stets neue Revisionen — bestehende werden nie überschrieben.
- **Hierarchische Berechtigungen:** RBAC unterstützt globale Rollen, bereichsbezogene Rollen und seitenspezifische Berechtigungen mit Vererbung.
- **SSE-Streaming:** KI-Antworten werden per Server-Sent Events in Echtzeit gestreamt.
