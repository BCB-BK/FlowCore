# Administrationshandbuch – Bildungscampus Wiki

## Überblick

Dieses Handbuch beschreibt die Systemadministration des Bildungscampus Wiki, einschließlich Konfiguration, Benutzerverwaltung, Sicherheit und Wartung.

## Systemarchitektur

- **Frontend**: React + Vite (SPA, wird über Reverse-Proxy bereitgestellt)
- **Backend**: Express 5 API-Server (Node.js)
- **Datenbank**: PostgreSQL mit Drizzle ORM
- **Authentifizierung**: Microsoft Entra ID (SSO via OIDC/PKCE)
- **Teams-Integration**: Microsoft Teams JS SDK v2

## Umgebungsvariablen

| Variable | Beschreibung | Pflicht |
|---|---|---|
| `DATABASE_URL` | PostgreSQL-Verbindungszeichenfolge | Ja |
| `SESSION_SECRET` | Starkes Session-Secret (mind. 32 Zeichen) | Ja (Produktion) |
| `ENTRA_CLIENT_ID` | Azure AD App-Registrierung Client-ID | Ja (Produktion) |
| `ENTRA_CLIENT_SECRET` | Azure AD App-Registrierung Secret | Ja (Produktion) |
| `ENTRA_TENANT_ID` | Azure AD Tenant-ID | Ja (Produktion) |
| `ENTRA_REDIRECT_URI` | OAuth Callback-URL | Ja (Produktion) |
| `TEAMS_APP_ID` | Teams App-ID für Deep Links | Optional |
| `AUTH_DEV_MODE` | `true` aktiviert Entwicklungsmodus | Nur Entwicklung |
| `LOG_LEVEL` | Logging-Stufe (trace/debug/info/warn/error) | Optional (default: info) |
| `NODE_ENV` | Umgebung (development/production/test) | Ja |

## Benutzerverwaltung

### Rollen

| Rolle | Beschreibung |
|---|---|
| `system_admin` | Vollzugriff auf alle Funktionen und Einstellungen |
| `process_manager` | Verwaltung von Prozessen, Qualitäts-Dashboard, Berichterstellung |
| `editor` | Erstellen und Bearbeiten von Inhalten, Tags, Glossareinträgen |
| `reviewer` | Überprüfung und Freigabe von Revisionen |
| `approver` | Finale Genehmigung von Revisionen |
| `viewer` | Leserechte auf alle veröffentlichten Inhalte |
| `external_viewer` | Eingeschränkter Lesezugriff |

### Berechtigungen

Das System verwendet 13+ feingranulare Berechtigungen:
- `read_page`, `create_page`, `edit_page`, `delete_page`
- `publish_page`, `archive_page`
- `create_revision`, `approve_revision`
- `manage_tags`, `manage_glossary`
- `manage_permissions`, `manage_connectors`
- `view_quality_dashboard`, `manage_ai_settings`

### Rollenzuweisung

Rollen werden über die Principals-API zugewiesen:
```
POST /api/principals/:id/roles
{ "role": "editor", "scope": null }
```

## Sicherheit

### HTTP-Sicherheitsheader
- `X-Content-Type-Options: nosniff`
- `X-DNS-Prefetch-Control: off`
- `Strict-Transport-Security` (Produktion)
- `Content-Security-Policy` mit Teams-Embedding-Unterstützung
- `Referrer-Policy: strict-origin-when-cross-origin`

### Rate Limiting
- Auth-Endpunkte: 30 Anfragen / 15 Minuten pro IP
- API-Endpunkte: 200 Anfragen / Minute pro IP
- Antwort bei Überschreitung: HTTP 429 mit `Retry-After`-Header

### Session-Verwaltung
- HttpOnly-Cookies (kein JavaScript-Zugriff)
- `SameSite=None; Secure` in Produktion (Teams-Iframe-Kompatibilität)
- 8-Stunden-Session-Timeout
- Serverseitige Session-Speicherung

### Datenschutz
- Alle SQL-Abfragen sind parametrisiert (kein SQL-Injection-Risiko)
- Keine Geheimnisse oder Token in Logs
- Audit-Trail für alle sicherheitsrelevanten Aktionen
- CSRF-Schutz via OAuth-State-Parameter

## Datenbank-Verwaltung

### Schema-Updates
```bash
pnpm --filter @workspace/db run push-force
```

### Backup
Siehe [Backup- und Wiederherstellungsverfahren](./12-BACKUP-RESTORE.md)

## Monitoring

### Health-Check
```
GET /api/healthz
```

### Log-Analyse
Logs werden im JSON-Format (pino) ausgegeben und enthalten:
- Korrelations-IDs für Request-Tracing
- Audit-Events für sicherheitsrelevante Aktionen
- Fehler mit Stack-Traces

### Wichtige Audit-Events
| Event-Typ | Aktion | Beschreibung |
|---|---|---|
| `auth` | `login` | Benutzeranmeldung |
| `auth` | `logout` | Benutzerabmeldung |
| `content` | `create` | Inhalt erstellt |
| `content` | `update` | Inhalt geändert |
| `content` | `delete` | Inhalt gelöscht |
| `revision` | `submit_review` | Revision zur Prüfung eingereicht |
| `revision` | `approve` | Revision genehmigt |
| `revision` | `publish` | Revision veröffentlicht |
