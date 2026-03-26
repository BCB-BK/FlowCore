# 03 — Authentifizierung & SSO

## 3.1 Übersicht

FlowCore verwendet **Microsoft Entra ID** (ehemals Azure Active Directory) als zentralen Identitätsprovider. Es werden zwei Authentifizierungsflows unterstützt:

1. **Standalone Web-Flow** — OAuth 2.0 Authorization Code Flow
2. **Microsoft Teams SSO** — On-Behalf-Of (OBO) Flow

Zusätzlich existiert ein **Entwicklungsmodus** für lokale Entwicklung ohne Entra-Anbindung.

## 3.2 Entra ID Konfiguration

| Parameter | Beschreibung |
|:----------|:-------------|
| `ENTRA_TENANT_ID` | Azure AD Mandanten-ID |
| `ENTRA_CLIENT_ID` | Anwendungs-ID (Client-ID) |
| `ENTRA_CLIENT_SECRET` | Client-Secret (als Umgebungsgeheimnis) |
| `ENTRA_REDIRECT_URI` | Callback-URL nach Anmeldung |

**Client-ID:** `218a8391-173e-4e4a-b722-cdeed93f82cb`  
**Tenant-ID:** `e2bcd5c2-8503-4dbc-ae9a-7c681d3a29cb`

## 3.3 Standalone Web-Flow (Authorization Code)

```
Benutzer → Frontend → /api/auth/login → Microsoft Entra ID Login
                                              ↓
Microsoft Entra ID → /api/auth/callback (mit Code)
                                              ↓
Backend tauscht Code gegen Token → Principal Upsert → Session
```

### Ablauf im Detail:

1. **Initiierung:** Frontend ruft `GET /api/auth/login` auf.
2. **Umleitung:** Backend generiert per `@azure/msal-node` eine Microsoft-Login-URL mit einem CSRF-`state`-Parameter, der in der Session gespeichert wird.
3. **Callback:** Nach erfolgreicher Anmeldung leitet Microsoft zu `/api/auth/callback` mit einem Authorization-Code um.
4. **Token-Austausch:** Backend validiert den `state`-Parameter und tauscht den Code über MSAL gegen Access-Token und ID-Token.
5. **Principal-Upsert:** Aus den ID-Token-Claims werden `oid` (External-ID), `displayName` und `email` extrahiert. Die Funktion `upsertPrincipal` erstellt oder aktualisiert den lokalen Benutzerdatensatz in der `principals`-Tabelle.
6. **Session-Erstellung:** Benutzerdaten und Graph-Access-Token werden in der Express-Session gespeichert.

## 3.4 Microsoft Teams SSO (On-Behalf-Of)

```
Teams Tab → microsoftTeams.getAuthToken() → Client-Token
                                                   ↓
POST /api/teams/sso (Client-Token) → OBO-Flow → Graph-Token
                                                   ↓
Principal Upsert → Session → Antwort an Tab
```

### Ablauf im Detail:

1. **Client-Token:** Der in Teams eingebettete Tab ruft über das Teams SDK `microsoftTeams.authentication.getAuthToken()` auf.
2. **Token-Übermittlung:** Das Client-Token wird an `POST /api/teams/sso` gesendet.
3. **OBO-Flow:** Das Backend nutzt MSALs `acquireTokenOnBehalfOf`, um das Client-Token gegen ein Server-seitiges Access-Token mit Graph-Berechtigungen zu tauschen.
4. **Session-Erstellung:** Wie beim Web-Flow wird ein Principal-Upsert durchgeführt und eine Express-Session erstellt.

## 3.5 Session-Management

| Eigenschaft | Wert |
|:------------|:-----|
| **Speicherung** | `express-session` Middleware |
| **Cookie httpOnly** | `true` |
| **Cookie secure** | `true` (Produktion) |
| **Cookie sameSite** | `"none"` (Produktion) |
| **Max. Lebensdauer** | 8 Stunden |

### Session-Inhalt:

| Feld | Beschreibung |
|:-----|:-------------|
| `user.principalId` | Interne Principal-ID |
| `user.externalId` | Entra ID Object-ID |
| `user.displayName` | Anzeigename |
| `user.email` | E-Mail-Adresse |
| `graphAccessToken` | Microsoft Graph Access-Token für Stellvertretungsaufrufe |
| `oauthState` | Temporärer CSRF-Schutz während Login |

## 3.6 Entwicklungsmodus

| Umgebungsvariable | Wert |
|:-------------------|:-----|
| `AUTH_DEV_MODE` | `true` |

Im Entwicklungsmodus:

- Die `requireAuth`-Middleware überspringt Session-Prüfungen
- Stattdessen wird der Header `X-Dev-Principal-Id` ausgewertet
- Die bereitgestellte UUID muss einem gültigen Eintrag in der `principals`-Tabelle entsprechen
- `/auth/login` und `/auth/callback` sind deaktiviert bzw. zeigen Hinweise an
- **Entwickler-Admin:** Tobias Wenninger (`c911a9df-b47c-4539-9d26-c106825968b6`)

## 3.7 Auth-Middleware

### requireAuth

- **Datei:** `artifacts/api-server/src/middlewares/require-auth.ts`
- **Funktion:** Primärer Zugangsschutz für geschützte Routen
- **Dev-Modus:** Validiert `X-Dev-Principal-Id` Header
- **Produktion:** Prüft `req.session.user`
- **Ergebnis:** Setzt `req.user` mit `AuthUser`-Objekt

### requirePermission

- **Datei:** `artifacts/api-server/src/middlewares/require-permission.ts`
- **Funktion:** Aufbauend auf `requireAuth` — prüft spezifische RBAC-Berechtigung
- **Parameter:** `permission` (WikiPermission) und optional `nodeId`-Resolver
- **Logik:** Verwendet `rbac.service.ts` zur Berechnung effektiver Berechtigungen

### authRateLimit

- **Datei:** `artifacts/api-server/src/middlewares/rate-limit.ts`
- **Funktion:** Rate-Limiting für Auth-Endpunkte
- **Anwendung:** `/auth/login`, `/auth/callback`, `/teams/sso`

## 3.8 Auth-Endpunkte

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/api/auth/config` | Öffentliche Auth-Konfiguration | Keiner |
| GET | `/api/auth/login` | Initiiert OAuth2-Login | `authRateLimit` |
| GET | `/api/auth/callback` | OAuth2-Callback-Handler | `authRateLimit` |
| GET | `/api/auth/me` | Aktuelles Benutzerprofil, Rollen, Berechtigungen | `requireAuth` |
| POST | `/api/auth/logout` | Session-Zerstörung und Audit-Event | `requireAuth` |
| POST | `/api/teams/sso` | Teams-SSO-Token-Austausch | `authRateLimit` |
| GET | `/api/teams/context` | Teams-spezifische Konfiguration | Keiner |

## 3.9 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `artifacts/api-server/src/services/auth.service.ts` | Kernlogik für Login, Callback, OBO |
| `artifacts/api-server/src/routes/auth.ts` | Auth-Routen-Definition |
| `artifacts/api-server/src/routes/teams.ts` | Teams-SSO-Route |
| `artifacts/api-server/src/middlewares/require-auth.ts` | Auth-Middleware |
| `artifacts/wiki-frontend/src/components/teams/TeamsProvider.tsx` | Frontend Teams-Integration |
| `artifacts/wiki-frontend/src/lib/teams.ts` | Teams-SDK-Wrapper |
