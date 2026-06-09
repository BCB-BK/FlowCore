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
| `OPENAI_API_KEY` | OpenAI API-Schlüssel für KI-Assistent | — |
| `AUTH_DEV_MODE` | Entwicklungsmodus (deaktiviert Entra-Prüfung) | `false` |

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
