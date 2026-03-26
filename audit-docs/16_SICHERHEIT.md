# 16 — Sicherheitskonzept

## 16.1 Übersicht

Das Sicherheitskonzept von FlowCore umfasst mehrere Schutzebenen:

1. **Authentifizierung** — Microsoft Entra ID SSO
2. **Autorisierung** — Mehrstufiges RBAC-System
3. **Transportverschlüsselung** — HTTPS/TLS
4. **Session-Sicherheit** — Sichere Cookie-Konfiguration
5. **Rate-Limiting** — Schutz vor Brute-Force-Angriffen
6. **Eingabevalidierung** — Zod-Schema-Validierung
7. **Audit-Logging** — Lückenlose Protokollierung
8. **Datenschutz** — Minimale Datenhaltung

## 16.2 Authentifizierung

### Microsoft Entra ID SSO

- **Protokoll:** OAuth 2.0 Authorization Code Flow / On-Behalf-Of Flow
- **Provider:** Microsoft Entra ID (Azure AD)
- **CSRF-Schutz:** `state`-Parameter bei OAuth-Login
- **Token-Verwaltung:** Server-seitig via MSAL — keine Token im Frontend gespeichert

### Session-Sicherheit

| Maßnahme | Konfiguration |
|:---------|:-------------|
| **httpOnly** | `true` — JavaScript kann nicht auf Cookies zugreifen |
| **secure** | `true` (Produktion) — nur über HTTPS übertragen |
| **sameSite** | `"none"` (Produktion) — Cross-Origin für Teams-Einbettung |
| **Lebensdauer** | 8 Stunden — automatische Abmeldung |

### Entwicklungsmodus

- Aktivierung nur über explizite Umgebungsvariable `AUTH_DEV_MODE=true`
- Muss in Produktionsumgebungen deaktiviert sein
- Verwendet `X-Dev-Principal-Id` Header statt echter Anmeldung

## 16.3 Autorisierung

### Mehrstufiges RBAC

1. **Globale Rollen:** Systemweite Berechtigungen (7 vordefinierte Rollen)
2. **Bereichsbezogene Rollen:** Eingeschränkt auf bestimmte Knotenbereiche
3. **Seitenberechtigungen:** Granulare Berechtigungen auf Einzelseiten
4. **Vererbung:** Berechtigungen werden entlang der Knotenhierarchie vererbt

### Durchsetzung

- **Backend:** `requirePermission`-Middleware auf jedem geschützten Endpunkt
- **Frontend:** Bedingte UI-Darstellung basierend auf Berechtigungsarray
- **Prinzip:** Backend ist die einzige Wahrheitsquelle — Frontend-Prüfungen dienen nur der UX

### Berechtigung nach Prinzip der geringsten Rechte

| Rolle | Berechtigungen |
|:------|:---------------|
| **Betrachter** | Nur 4 Berechtigungen (Lesen + 3 Ansichten) |
| **Editor** | Erstellen, Bearbeiten, Einreichen |
| **System-Admin** | Alle 19 Berechtigungen |

## 16.4 Transportverschlüsselung

- **HTTPS:** Alle Kommunikation verschlüsselt via TLS
- **mTLS-Proxy:** Replit-Umgebung verwendet mTLS-Proxy
- **Sichere Cookies:** Nur über HTTPS übertragen (Produktion)

## 16.5 Rate-Limiting

### Geschützte Endpunkte

| Endpunkt | Schutz |
|:---------|:-------|
| `/api/auth/login` | `authRateLimit` |
| `/api/auth/callback` | `authRateLimit` |
| `/api/teams/sso` | `authRateLimit` |

Rate-Limiting schützt vor:
- Brute-Force-Angriffen auf den Login
- Übermäßige OAuth-Callback-Anfragen
- Teams-SSO-Missbrauch

## 16.6 Eingabevalidierung

### Zod-Schema-Validierung

- **Generiert:** Aus OpenAPI 3.1 Spezifikation via Orval
- **Anwendung:** Alle eingehenden Request-Bodies werden validiert
- **Typsicherheit:** TypeScript + Zod gewährleisten Konsistenz

### Schutz gegen:

| Angriff | Maßnahme |
|:--------|:---------|
| SQL-Injection | Drizzle ORM (parametrisierte Queries) |
| XSS | React-Escaping, Content-Security-Policy |
| CSRF | OAuth state-Parameter, sameSite-Cookies |
| Pfad-Traversierung | Validierte Dateinamen bei Medien-Upload |

## 16.7 Audit-Logging

### Protokollierte Ereignisse

| Ereignis | Beschreibung |
|:---------|:-------------|
| **Anmeldung** | Erfolgreiche und fehlgeschlagene Login-Versuche |
| **Abmeldung** | Session-Zerstörung |
| **Rollenzuweisung** | Erteilung und Entzug von Rollen |
| **Berechtigungsänderung** | Änderungen an Seitenberechtigungen |
| **Inhaltsänderung** | Erstellen, Bearbeiten, Löschen von Seiten |
| **Veröffentlichung** | Genehmigung und Veröffentlichung von Revisionen |
| **Konfigurationsänderung** | Änderungen an Systemeinstellungen |

### Speicherung

```
audit_events
├── action (Aktionstyp)
├── actor_id (Ausführender Benutzer)
├── resource_type (Betroffener Typ)
├── resource_id (Betroffene ID)
├── metadata (Zusätzlicher Kontext, JSONB)
└── created_at (Zeitstempel)
```

### Zugriff

- **Berechtigung:** `view_audit_log`
- **Berechtigte Rollen:** System-Admin, Compliance-Manager, Prüfer, Genehmiger

## 16.8 Datenschutz

### Minimale Datenhaltung

| Gespeicherte Daten | Zweck |
|:-------------------|:------|
| `display_name` | Anzeige im System |
| `email` | Benachrichtigungen, Identifikation |
| `external_id` (OID) | Verknüpfung mit Entra ID |
| `upn` | User Principal Name |

### Keine Speicherung von:

- Passwörtern (Authentication via Entra ID)
- Tokens im Frontend (nur server-seitige Session)
- Persönlichen Dokumenten (nur verknüpfte Referenzen)

### Soft-Delete

- Gelöschte Inhalte werden nicht physisch entfernt (`is_deleted = true`)
- Ermöglicht Wiederherstellung und Audit-Nachvollziehbarkeit
- Gelöschte Daten sind über die normale API nicht zugänglich

## 16.9 Secrets-Management

| Geheimnis | Speicherort |
|:----------|:------------|
| `ENTRA_CLIENT_SECRET` | Umgebungsgeheimnis (verschlüsselt) |
| `SESSION_SECRET` | Umgebungsgeheimnis (verschlüsselt) |
| `DATABASE_URL` | Umgebungsvariable |

Geheimnisse werden:
- Nie im Code gespeichert
- Über Umgebungsgeheimisse verwaltet
- Beim Start via Zod validiert
- Nie in Logs oder API-Antworten exponiert

## 16.10 Konnektorkonfiguration

Sensible Konnektordaten (z.B. SharePoint Connection-Config) werden:
- In der Datenbank als JSONB gespeichert
- Bei der API-Ausgabe redaktiert (`GET /connectors/source-systems` redaktiert Secrets)
- Nur für Benutzer mit `manage_settings` sichtbar

## 16.11 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `artifacts/api-server/src/middlewares/require-auth.ts` | Authentifizierungs-Middleware |
| `artifacts/api-server/src/middlewares/require-permission.ts` | Autorisierungs-Middleware |
| `artifacts/api-server/src/middlewares/rate-limit.ts` | Rate-Limiting |
| `artifacts/api-server/src/services/rbac.service.ts` | RBAC-Kernlogik |
| `artifacts/api-server/src/lib/config.ts` | Umgebungs-Validierung |
| `lib/db/src/schema/audit-events.ts` | Audit-Schema |
