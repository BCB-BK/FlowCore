# Konfiguration & Umgebungsvariablen – FlowCore

## Übersicht

Alle Konfigurationswerte werden beim Start via Zod-Schema validiert (`artifacts/api-server/src/lib/config.ts`). Die Anwendung bricht sofort ab, wenn Pflichtfelder fehlen – keine stillen Fallbacks.

## Vollständige Variablenliste

### Pflichtfelder (Produktion)

| Variable | Beschreibung | Beispiel |
|---|---|---|
| `PORT` | Server-Port | `8080` |
| `NODE_ENV` | Umgebung | `production` |
| `DATABASE_URL` | PostgreSQL-Verbindungszeichenfolge | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Session-Schlüssel (mind. 32 Zeichen, kryptographisch zufällig) | — |
| `ENTRA_CLIENT_ID` | Azure AD App-Registrierung Client-ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `ENTRA_CLIENT_SECRET` | Azure AD App-Registrierung Client-Secret | — |
| `ENTRA_TENANT_ID` | Azure AD Tenant-ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `ENTRA_REDIRECT_URI` | OAuth-Callback-URL | `https://flowcore.bildungscampus-backnang.de/api/auth/callback` |

### Optionale Felder

| Variable | Beschreibung | Standard |
|---|---|---|
| `LOG_LEVEL` | Logging-Stufe (`trace`/`debug`/`info`/`warn`/`error`) | `info` |
| `TEAMS_APP_ID` | Microsoft Teams App-ID für Deep Links | — |
| `VITE_TEAMS_APP_ID` | Teams App-ID für das Frontend (zur Build-Zeit eingebettet) | — |
| `OPENAI_API_KEY` | OpenAI API-Schlüssel für KI-Assistent | — |
| `AUTH_DEV_MODE` | Entwicklungsmodus (deaktiviert Entra-Prüfung, wählt automatisch ersten aktiven Principal als Benutzer); nur mit `NODE_ENV=development` zulässig — in allen anderen Umgebungen bricht der Server beim Start ab. **Standard: `true` wenn `NODE_ENV=development`, sonst `false`** | `true` (dev) |
| `APP_PUBLIC_URL` | Öffentliche Basis-URL der App (CORS-Origin, Quell-URLs für Copilot/Graph, Teams-Deep-Links) | Produktions-Fallback |
| `ENTRA_REQUIRED_GROUP_ID` | Login auf Mitglieder dieser Entra-Gruppe beschränken | — (alle Tenant-Benutzer) |
| `ENTRA_SCOPES` | Delegierte Graph-Berechtigungen, die beim Anmelden angefordert werden (kommagetrennt). `Sites.Read.All` ist nötig, damit benutzerbezogene SharePoint-Funktionen (Quellverweise, Dateiimport) auf Graph zugreifen können. Nur reduzieren, wenn der Mandant die Berechtigung nicht erteilt hat — sonst schlägt die Anmeldung mit einer Zustimmungsaufforderung fehl. | `openid,profile,email,User.Read,Sites.Read.All` |
| `GRAPH_EXTERNAL_CONNECTION_ID` | ID der Graph-External-Connection (Copilot-Index) | `flowcorewiki` |
| `GRAPH_EXTERNAL_CONNECTION_NAME` | Anzeigename der Graph-Connection | `FlowCore Wiki` |
| `GRAPH_EXTERNAL_CONNECTION_DESCRIPTION` | Beschreibung der Graph-Connection | — |

### Betriebsparameter (Limits & Timeouts)

Alle Werte haben sichere Defaults und sind nur bei Bedarf zu übersteuern:

| Variable | Beschreibung | Standard |
|---|---|---|
| `RATE_LIMIT_AUTH_MAX` / `RATE_LIMIT_AUTH_WINDOW_MIN` | Rate-Limit für Auth-Endpunkte | 30 Anfragen / 15 min |
| `RATE_LIMIT_API_MAX` / `RATE_LIMIT_API_WINDOW_SEC` | Rate-Limit für API-Endpunkte | 200 Anfragen / 60 s |
| `SESSION_MAX_AGE_HOURS` | Session-Lebensdauer | `8` |
| `GROUP_CHECK_TTL_MIN` | Cache-Dauer der Entra-Gruppenprüfung | `15` |
| `JSON_BODY_LIMIT` | Maximale JSON-Body-Größe | `2mb` |
| `MAX_UPLOAD_MB` | Maximale Upload-Dateigröße (Medien) | `50` |
| `COPILOT_PROJECTION_CACHE_TTL_SEC` | Cache-Dauer der Copilot-Suchprojektionen | `300` |

### KI-Modelle

| Variable | Beschreibung | Standard |
|---|---|---|
| `AI_DEFAULT_MODEL` | Text-Modell des FlowCore-Assistenten (Default, in den KI-Einstellungen übersteuerbar) | `gpt-5.2` |
| `AI_IMAGE_MODEL` | Bildgenerierung | `gpt-image-1` |
| `AI_AUDIO_MODEL` | Audiogenerierung | `gpt-audio` |
| `AI_TRANSCRIBE_MODEL` | Transkription | `gpt-4o-mini-transcribe` |

### Credential-Nutzung durch SharePoint-Speicheranbieter

Die Variablen `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID` und `ENTRA_CLIENT_SECRET` werden doppelt genutzt:

1. **Benutzeranmeldung (SSO)**: OIDC-Login-Flow über Entra ID
2. **SharePoint-Zugriff (App-to-App)**: Client-Credentials-Flow für Datei-Upload (Medienablage) und automatische Backups

SharePoint-Speicheranbieter, die in der Konnektoren-Verwaltung angelegt wurden, können eigene Credentials in ihrer Konfiguration hinterlegen. Sind diese leer, werden automatisch die obigen Env-Vars als Fallback verwendet.

## Konfigurationsdatei

Das Schema befindet sich in `artifacts/api-server/src/lib/config.ts`:

```typescript
import { appConfig } from "./lib/config";
// appConfig.port, appConfig.nodeEnv, appConfig.databaseUrl
// appConfig.entraClientId, appConfig.entraTenantId, etc.
```

## Geheimnisverwaltung

- **Entwicklung**: Replit Secrets-Tab (verschlüsselt gespeichert)
- **Produktion**: Replit Deployment-Umgebungsvariablen
- **Keine `.env`-Dateien im Repository** – alle Geheimnisse über Replit-Secrets-Management

## Health-Check

`GET /api/healthz` gibt zurück:
- `{ status: "ok", database: "connected" }` – alle Systeme betriebsbereit
- `{ status: "degraded", database: "disconnected" }` – Datenbank nicht erreichbar
- HTTP 503 bei kritischen Systemfehlern

## Neue Konfigurationswerte hinzufügen

1. Wert im Zod-Schema in `artifacts/api-server/src/lib/config.ts` ergänzen
2. Als Pflicht (`.min(1)`) oder optional (`.optional()`) mit Standardwert markieren
3. In dieser Datei dokumentieren
4. Health-Endpunkt aktualisieren, falls kritische Abhängigkeit
