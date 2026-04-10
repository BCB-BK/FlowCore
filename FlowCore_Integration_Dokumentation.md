# FlowCore: Technische Integrationsdokumentation

## Microsoft Entra SSO, Teams-Integration & Rollenbasierte Zugriffskontrolle (RBAC)

**Version:** 1.0  
**Stand:** April 2026  
**Projekt:** FlowCore -- Bildungscampus Backnang  
**Stack:** React + Vite (Frontend), Express 5 (Backend), PostgreSQL + Drizzle ORM, pnpm-Monorepo

---

## Inhaltsverzeichnis

1. [Architektur-Überblick](#1-architektur-überblick)
2. [Microsoft Entra ID (Azure AD) -- Single Sign-On](#2-microsoft-entra-id-azure-ad----single-sign-on)
3. [Microsoft Teams Integration](#3-microsoft-teams-integration)
4. [Rollenbasierte Zugriffskontrolle (RBAC)](#4-rollenbasierte-zugriffskontrolle-rbac)
5. [Datenbank-Schema (Principals & Berechtigungen)](#5-datenbank-schema-principals--berechtigungen)
6. [Einstellungsseite & Connector-Monitoring](#6-einstellungsseite--connector-monitoring)
7. [Sicherheitsaspekte](#7-sicherheitsaspekte)
8. [Konfigurationsreferenz (Environment Variables)](#8-konfigurationsreferenz-environment-variables)
9. [Dateistruktur-Referenz](#9-dateistruktur-referenz)
10. [Implementierungsleitfaden für neue Projekte](#10-implementierungsleitfaden-für-neue-projekte)

---

## 1. Architektur-Überblick

```
+--------------------------+         +---------------------+
|  Microsoft Teams Client  |         |  Web-Browser        |
|  (Tab-App / Personal)   |         |  (Standalone)       |
+-----------+--------------+         +----------+----------+
            |                                    |
            | Teams JS SDK                       | Standard HTTP
            | SSO-Token                          | OAuth2 Redirect
            |                                    |
+-----------v------------------------------------v----------+
|                     React + Vite Frontend                 |
|                                                           |
|  TeamsProvider -> SSO Silent Auth                          |
|  LoginPage    -> OAuth2 Authorization Code Flow           |
|  useAuth()    -> /api/auth/me (Session-basiert)           |
+----------------------------+------------------------------+
                             |
                             | REST API (Express 5)
                             |
+----------------------------v------------------------------+
|                     API Server (Express 5)                |
|                                                           |
|  Middlewares:                                             |
|    requireAuth     -> Session / Bearer Token / Dev-Header |
|    requirePermission -> RBAC-Prüfung pro Route            |
|                                                           |
|  Services:                                                |
|    auth.service    -> MSAL Node (Auth Code + OBO Flow)    |
|    rbac.service    -> Rollen-/Berechtigungsauflösung      |
|    graph-client    -> MS Graph API (User/Group-Lookup)    |
|    principal       -> Benutzer-Upsert / Rollen-Zuweisung  |
+----------------------------+------------------------------+
                             |
                             | Drizzle ORM
                             |
+----------------------------v------------------------------+
|                     PostgreSQL                            |
|                                                           |
|  principals, role_assignments, page_permissions,          |
|  node_ownership, deputy_delegations, sod_config,          |
|  audit_events, sessions                                   |
+-----------------------------------------------------------+
```

---

## 2. Microsoft Entra ID (Azure AD) -- Single Sign-On

### 2.1 Voraussetzungen in Entra ID

1. **App-Registrierung** im Azure Portal:
   - Typ: Vertrauliche Anwendung (Confidential Client)
   - Redirect-URI: `https://<APP_DOMAIN>/api/auth/callback`
   - API-Berechtigungen: `openid`, `profile`, `email`, `User.Read`
   - Optional: `GroupMember.Read.All` (fuer Gruppenpruefung)

2. **Client Secret** erstellen und als `ENTRA_CLIENT_SECRET` hinterlegen

3. **Optional: Sicherheitsgruppe** anlegen und deren Object-ID als `ENTRA_REQUIRED_GROUP_ID` konfigurieren (nur Gruppenmitglieder erhalten Zugang)

### 2.2 Backend: MSAL-Konfiguration

**Datei:** `artifacts/api-server/src/services/auth.service.ts`

```typescript
import { ConfidentialClientApplication } from "@azure/msal-node";

const ENTRA_SCOPES = ["openid", "profile", "email", "User.Read"];

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: appConfig.entraClientId,
    authority: `https://login.microsoftonline.com/${appConfig.entraTenantId}`,
    clientSecret: appConfig.entraClientSecret,
  },
});
```

**Exported Functions:**

| Funktion | Zweck |
|----------|-------|
| `isAuthConfigured()` | Prueft ob Client-ID, Secret und Tenant-ID gesetzt sind |
| `getAuthUrl(state)` | Generiert Microsoft-Login-URL (Authorization Code Flow) |
| `exchangeCodeForToken(code)` | Tauscht Authorization Code gegen Token + Userdaten |
| `exchangeTeamsSsoToken(ssoToken)` | OBO-Flow: Teams-Token -> Graph-Token |
| `getAppAccessToken()` | Client Credentials Flow fuer Server-zu-Server-Aufrufe |

### 2.3 Login-Flow (Web-Browser)

**Datei:** `artifacts/api-server/src/routes/auth.ts`

#### Schritt 1: Login initiieren (`GET /api/auth/login`)
```
1. Generiere UUID-Nonce
2. Signiere State-Parameter (HMAC-SHA256 mit SESSION_SECRET)
   Format: {nonce}.{timestamp_base36}.{signature}
3. Generiere MSAL Auth-URL mit State
4. Sende URL an Frontend -> Browser-Redirect
```

#### Schritt 2: Callback verarbeiten (`GET /api/auth/callback`)
```
1. Validiere State-Parameter (Signatur + Max-Alter 10 Minuten)
2. Tausche Authorization Code gegen Token (MSAL acquireTokenByCode)
3. Pruefe Tenant-ID-Uebereinstimmung
4. Optional: Pruefe Entra-Gruppenmitgliedschaft via Graph API
5. Upsert Principal in DB (externalId = Entra Object-ID)
6. Erstlogin: Weise automatisch "viewer"-Rolle zu
7. Erstelle Express-Session mit User-Daten
8. Speichere Graph Access Token in Session
9. Redirect -> Startseite
```

#### Schritt 3: Session prüfen (`GET /api/auth/me`)
```
1. requireAuth-Middleware prueft Session
2. Lade Rollen des Principals
3. Berechne effektive Berechtigungen (RBAC)
4. Lade SoD-Konfiguration (Vier-Augen-Prinzip)
5. Sende User + Rollen + Berechtigungen + SoD-Regeln
```

### 2.4 Frontend: Login-Seite

**Datei:** `artifacts/wiki-frontend/src/pages/LoginPage.tsx`

```
1. Fetch /api/auth/login -> Erhalte loginUrl
2. window.location.href = loginUrl
3. Nach Callback: /api/auth/me liefert User-Daten
4. useAuth()-Hook macht diese global verfuegbar
```

### 2.5 Session-Management

- **Library:** `express-session` mit `connect-pg-simple` (PostgreSQL-Store)
- **Session-Inhalt:**
  ```typescript
  req.session.user = {
    principalId: string,   // Interne UUID
    externalId: string,    // Entra Object-ID (oid)
    displayName: string,   // Anzeigename
    email: string          // E-Mail
  };
  req.session.graphAccessToken = string; // MS Graph Token
  ```
- **Sicherheit:** `SESSION_SECRET` muss in Produktion ein starker, einzigartiger Wert sein

### 2.6 Entwicklermodus (Dev Mode)

Wenn `AUTH_DEV_MODE=true` (Standard in Entwicklung):
- SSO/Entra wird komplett umgangen
- Authentifizierung erfolgt über Header: `X-Dev-Principal-Id: <UUID>`
- `/api/auth/login` gibt Info statt Login-URL zurueck
- Teams SSO (`/api/teams/sso`) gibt 400 zurueck

---

## 3. Microsoft Teams Integration

### 3.1 Ziel der Integration

FlowCore laesst sich **nahtlos als Tab in Microsoft Teams-Kanaelen** einbetten -- nicht nur als einfacher Website-Link, sondern als vollstaendige Teams-App mit:

- Automatischem Silent SSO (kein separater Login noetig)
- Teams-Theme-Unterstuetzung (Light, Dark, High Contrast)
- Deep-Linking zu einzelnen Wiki-Seiten
- Konfigurierbaren Tabs (Channel/Chat-Kontext)
- Share-to-Teams-Funktionalitaet
- Chat-Benachrichtigungen

### 3.2 Teams App Manifest

**Datei:** `artifacts/wiki-frontend/public/teams-manifest/manifest.json`

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.17/MicrosoftTeams.schema.json",
  "manifestVersion": "1.17",
  "id": "{{TEAMS_APP_ID}}",
  "name": { "short": "FlowCore" },

  "staticTabs": [
    { "entityId": "wiki-home",      "name": "FlowCore",        "scopes": ["personal"] },
    { "entityId": "wiki-my-work",   "name": "Meine Aufgaben",  "scopes": ["personal"] },
    { "entityId": "wiki-search",    "name": "Suche",           "scopes": ["personal"] },
    { "entityId": "wiki-dashboard", "name": "Dashboard",       "scopes": ["personal"] }
  ],

  "configurableTabs": [{
    "configurationUrl": "{{APP_BASE_URL}}/teams/tab-config?context=teams&theme={theme}",
    "scopes": ["team", "groupChat"],
    "context": ["channelTab", "privateChatTab", "meetingChatTab"]
  }],

  "permissions": ["identity", "messageTeamMembers"],

  "webApplicationInfo": {
    "id": "{{ENTRA_CLIENT_ID}}",
    "resource": "api://{{APP_DOMAIN}}/{{ENTRA_CLIENT_ID}}"
  },

  "authorization": {
    "permissions": {
      "resourceSpecific": [
        { "name": "TeamSettings.Read.Group", "type": "Application" }
      ]
    }
  }
}
```

**Wichtig: Platzhalter im Manifest**

| Platzhalter | Beschreibung |
|-------------|-------------|
| `{{TEAMS_APP_ID}}` | UUID der Teams-App-Registrierung |
| `{{APP_BASE_URL}}` | Vollstaendige Basis-URL (z.B. `https://flowcore.bildungscampus-backnang.de`) |
| `{{APP_DOMAIN}}` | Domain ohne Protokoll |
| `{{ENTRA_CLIENT_ID}}` | Azure AD App Client-ID |

Diese muessen vor dem Upload ins Teams Admin Center ersetzt werden.

### 3.3 Static Tabs vs. Configurable Tabs

**Static Tabs (Personal Scope):**
- Fest definierte Ansichten (Home, Aufgaben, Suche, Dashboard)
- Erscheinen im persoenlichen App-Bereich des Nutzers
- URL-Schema: `{{APP_BASE_URL}}/<path>?context=teams&theme={theme}`

**Configurable Tabs (Team/Chat Scope):**
- Admins/Nutzer koennen Tabs in Kanaelen/Chats hinzufuegen
- Konfigurationsseite erlaubt Auswahl der Ansicht:
  - Wiki-Startseite
  - Suche
  - Qualitaets-Dashboard
  - Bestimmte Wiki-Seite (via Node-UUID)
- Implementation: `TeamsTabConfig.tsx`

### 3.4 Teams SSO -- Silent Authentication (On-Behalf-Of Flow)

**Frontend-Ablauf:**

**Datei:** `artifacts/wiki-frontend/src/lib/teams.ts` + `TeamsProvider.tsx`

```
1. TeamsProvider (React Context Provider) startet beim App-Laden
2. microsoftTeams.app.initialize()  -> SDK initialisieren
3. microsoftTeams.app.notifyAppLoaded() + notifySuccess()
4. microsoftTeams.app.getContext() -> Theme, Locale, Entity-IDs
5. microsoftTeams.authentication.getAuthToken() -> SSO Bootstrap-Token
6. POST /api/teams/sso { ssoToken } -> Backend-Authentifizierung
7. queryClient.invalidateQueries(["auth/me"]) -> UI aktualisieren
8. Falls subEntityId vorhanden -> Automatisch zu Deep-Link navigieren
```

**Backend-Ablauf:**

**Datei:** `artifacts/api-server/src/routes/teams.ts`

```
POST /api/teams/sso:

1. Pruefe: Nicht im Dev-Mode, Entra konfiguriert, Token vorhanden
2. OBO-Flow: exchangeTeamsSsoToken(ssoToken)
   -> MSAL acquireTokenOnBehalfOf({ oboAssertion: ssoToken })
   -> Graph Access Token + ID-Token-Claims (oid, name, email, tid)
3. Tenant-ID-Validierung (muss mit ENTRA_TENANT_ID uebereinstimmen)
4. Optional: Gruppenmitgliedschaft pruefen (ENTRA_REQUIRED_GROUP_ID)
5. Principal in DB anlegen/aktualisieren (upsertPrincipal)
6. Erstlogin: Automatisch "viewer"-Rolle zuweisen
7. Session erstellen + Graph-Token speichern
8. Audit-Event loggen
9. Response: { principalId, displayName, email, roles, permissions }
```

### 3.5 OBO-Flow: Entra App-Registrierung (zusaetzlich)

Fuer den On-Behalf-Of-Flow muss in der Entra App-Registrierung konfiguriert sein:

1. **API verfuegbar machen:**
   - Application ID URI: `api://<APP_DOMAIN>/<CLIENT_ID>`
   - Scope: `access_as_user`

2. **Autorisierte Client-Anwendungen:**
   - Teams Desktop/Mobile: `1fec8e78-bce4-4aaf-ab1b-5451cc387264`
   - Teams Web: `5e3ce6c0-2b1f-4285-8d4b-75ee78787346`

### 3.6 Deep-Linking

**Datei:** `artifacts/wiki-frontend/src/lib/teams.ts`

```typescript
// Deep-Link zu einer Wiki-Seite generieren:
function buildPageDeepLink(appId, nodeId, pageTitle): string {
  // Ergebnis: https://teams.microsoft.com/l/entity/{appId}/wiki-home
  //           ?context={"subEntityId":"node/{nodeId}","subEntityLabel":"..."}
}

// Deep-Link zu einer Suchanfrage:
function buildSearchDeepLink(appId, query): string
```

**Navigation bei Deep-Link-Oeffnung:**
```typescript
// In TeamsProvider: Wenn subEntityId vorhanden
function navigateToSubEntity(subEntityId) {
  const targetPath = `${basePath}/${subEntityId}`;
  window.history.replaceState(null, "", targetPath);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
```

### 3.7 Theme-Synchronisation

Der `TeamsProvider` synchronisiert das Teams-Theme mit der App:

```typescript
// Theme-Klassen setzen
document.documentElement.classList.remove("dark", "high-contrast");
if (teamsCtx.theme === "dark" || teamsCtx.theme === "contrast") {
  document.documentElement.classList.add("dark");
}
if (teamsCtx.theme === "contrast") {
  document.documentElement.classList.add("high-contrast");
}
```

Unterstuetzte Themes: `default` (Light), `dark`, `contrast` (High Contrast)

### 3.8 Share-to-Teams

**Datei:** `artifacts/wiki-frontend/src/components/teams/ShareToTeams.tsx`

Bietet ein Dropdown mit:
1. **Link kopieren** -- Kopiert Teams Deep-Link (in Teams) oder Web-URL (im Browser)
2. **In Teams teilen** -- Oeffnet Teams Share-Dialog:
   ```
   https://teams.microsoft.com/share?msgText=<label>&href=<deepLink>
   ```
3. **Im Browser oeffnen** -- Nur innerhalb von Teams sichtbar, oeffnet die Web-Version

### 3.9 Teams Context API

**Datei:** `artifacts/wiki-frontend/src/hooks/useTeamsContext.ts`

Stellt folgenden Context bereit (via React Context):

```typescript
interface TeamsContext {
  inTeams: boolean;        // Laeuft die App in Teams?
  initialized: boolean;    // SDK fertig initialisiert?
  theme: "default" | "dark" | "contrast";
  locale: string;          // z.B. "de-DE"
  entityId?: string;       // Static Tab Entity-ID
  subEntityId?: string;    // Deep-Link Ziel
  channelId?: string;
  teamId?: string;
  chatId?: string;
  userObjectId?: string;   // Entra Object-ID des Users
  userPrincipalName?: string;
  tid?: string;            // Tenant-ID
}
```

### 3.10 Chat-Benachrichtigungen (FlowCore-Kommunikationskonto)

FlowCore kann Chat-Nachrichten ueber ein dediziertes Dienstkonto senden (z.B. bei Freigabeprozessen). Die Konfiguration erfolgt ueber die Einstellungsseite:

- **UPN des Absenderkontos** (z.B. `flowcore@bildungscampus-backnang.de`)
- **Verbindungstest** prueft Graph-API-Erreichbarkeit und Chat-Berechtigung
- **API-Endpunkte:**
  - `GET /api/admin/flowcore-account` -- Aktuelles Konto abrufen
  - `PUT /api/admin/flowcore-account` -- Konto aendern
  - `POST /api/admin/flowcore-account/test` -- Verbindung testen

---

## 4. Rollenbasierte Zugriffskontrolle (RBAC)

### 4.1 Rollen-Hierarchie

**Datei:** `artifacts/api-server/src/services/rbac.service.ts`

| Rolle | Beschreibung | Prioritaet |
|-------|-------------|------------|
| `system_admin` | Vollzugriff auf alle Funktionen | 1 (hoechste) |
| `compliance_manager` | Audit, Templates, Backups einsehen | 2 |
| `process_manager` | Inhalte verwalten, freigeben, Berechtigungen steuern | 3 |
| `approver` | Inhalte pruefen und freigeben (Publish) | 4 |
| `reviewer` | Inhalte pruefen (Review) | 5 |
| `editor` | Inhalte erstellen und bearbeiten | 6 |
| `viewer` | Nur Lesezugriff | 7 (niedrigste) |

### 4.2 Berechtigungs-Matrix

Jede Rolle hat eine feste Menge an Berechtigungen:

| Berechtigung | Admin | Compliance | Prozess-Mgr | Approver | Reviewer | Editor | Viewer |
|-------------|:-----:|:----------:|:-----------:|:--------:|:--------:|:------:|:------:|
| `read_page` | X | X | X | X | X | X | X |
| `create_page` | X | | X | | | X | |
| `edit_content` | X | | X | | | X | |
| `edit_structure` | X | | X | | | | |
| `manage_relations` | X | | X | | | X | |
| `submit_for_review` | X | | X | | | X | |
| `review_page` | X | | X | X | X | | |
| `approve_page` | X | | X | X | | | |
| `archive_page` | X | | X | | | | |
| `manage_permissions` | X | | X | | | | |
| `manage_templates` | X | X | X | | | | |
| `manage_settings` | X | | | | | | |
| `manage_workflows` | X | | X | | | | |
| `view_audit_log` | X | X | | X | X | | |
| `manage_connectors` | X | | | | | | |
| `manage_backup` | X | | | | | | |
| `view_dashboard` | X | X | X | X | X | X | |
| `view_tasks` | X | X | X | X | X | X | |
| `create_working_copy` | X | | | | | X | |
| `edit_working_copy` | X | | | | | X | |
| `submit_working_copy` | X | | | | | X | |
| `review_working_copy` | X | | X | | X | | |
| `publish_working_copy` | X | | | X | | | |
| `cancel_working_copy` | X | | | | | X | |
| `force_unlock_working_copy` | X | | | | | | |

### 4.3 Scope-Typen

Rollen koennen mit verschiedenen Scopes zugewiesen werden:

| Scope-Format | Beschreibung |
|-------------|-------------|
| `global` | Gilt fuer das gesamte System |
| `node:<uuid>` | Gilt fuer einen bestimmten Inhaltsknoten und dessen Kinder |
| `code:<display_code>` | Gilt fuer Knoten mit bestimmtem Anzeigecode-Praefix |

### 4.4 Berechtigungsaufloesung

**Datei:** `artifacts/api-server/src/services/rbac.service.ts` -- `getEffectivePermissions(principalId)`

```
1. Lade alle aktiven role_assignments des Principals
   (nicht abgelaufen, is_active = true)
2. Fuer jeden Scope:
   - "global" -> Alle Rollen-Berechtigungen direkt anwenden
   - "node:<id>" -> Pruefe ob aktueller Knoten in der Hierarchie liegt
   - "code:<prefix>" -> Pruefe ob Display-Code mit Praefix beginnt
3. Lade direkte page_permissions fuer den Knoten
   - Eigene Berechtigungen des Knotens
   - Vererbte Berechtigungen von Elternknoten (is_inherited = true)
4. Pruefe aktive Stellvertretungen (deputy_delegations):
   - Falls aktiv und im Zeitraum: Berechtigungen des Vertretenen uebernehmen
5. Vereinige alle gesammelten Berechtigungen (Set-Union)
```

### 4.5 Vier-Augen-Prinzip (Separation of Duties)

**Datei:** `artifacts/api-server/src/services/rbac.service.ts` -- `checkSeparationOfDuties()`

```typescript
// Prueft: Hat derselbe Benutzer sowohl eingereicht ALS AUCH freigegeben?
// Regel: Der Freigeber darf nicht der Einreicher sein
// Konfigurierbar via sod_config-Tabelle
// Wird bei /approve und /publish enforced
// Bei Verletzung: HTTP 403 + Audit-Event "sod_violation_blocked"
```

### 4.6 Inhalts-Besitzstruktur (Node Ownership)

Jeder Inhaltsknoten kann folgende verantwortliche Personen haben:

| Rolle | Feld | Beschreibung |
|-------|------|-------------|
| Besitzer | `ownerId` | Hauptverantwortlicher fuer den Inhalt |
| Stellvertreter | `deputyId` | Vertritt den Besitzer |
| Pruefer | `reviewerId` | Prueft Aenderungen |
| Freigeber | `approverId` | Gibt Aenderungen final frei |

### 4.7 Stellvertretung (Deputization)

```
deputy_delegations-Tabelle:
- principalId:  Wer wird vertreten?
- deputyId:     Wer ist der Stellvertreter?
- scope:        Fuer welchen Bereich?
- startsAt:     Ab wann gueltig?
- endsAt:       Bis wann gueltig? (NULL = unbegrenzt)
- isActive:     Aktiv/Inaktiv
- reason:       Begruendung (z.B. "Urlaub")
```

### 4.8 API-Middleware: Berechtigungsprüfung

**Datei:** `artifacts/api-server/src/middlewares/require-permission.ts`

```typescript
// Einfache Berechtigung (optional mit Node-Kontext):
router.patch("/nodes/:id",
  requireAuth,
  requirePermission("edit_content", (req) => req.params.id),
  handler
);

// Mindestens eine der Berechtigungen:
router.get("/admin/audit",
  requireAuth,
  requireAnyPermission("view_audit_log", "manage_settings"),
  handler
);
```

### 4.9 Frontend: Berechtigungsprüfung

**Datei:** `artifacts/wiki-frontend/src/hooks/use-auth.ts`

```typescript
// Im Frontend:
const { currentUser } = useAuth();

// Berechtigung pruefen:
if (currentUser?.permissions?.includes("create_page")) {
  // Button anzeigen
}

// SoD-Regeln pruefen:
if (currentUser?.sodRules?.four_eyes_review) {
  // Vier-Augen-Prinzip aktiv -> Submitter != Approver
}
```

### 4.10 Authentifizierungs-Middleware

**Datei:** `artifacts/api-server/src/middlewares/require-auth.ts`

Prueft in dieser Reihenfolge:

1. **Bearer Token** (API-Token): Validiert gegen `api_tokens`-Tabelle
2. **Dev-Mode Header** (`X-Dev-Principal-Id`): Nur wenn `AUTH_DEV_MODE=true`
3. **Session** (`req.session.user`): Standard-Web-Authentifizierung

```typescript
export function requireAuth(req, res, next) {
  // 1. Bearer Token?
  if (req.headers.authorization?.startsWith("Bearer ")) {
    validateApiToken(token) -> resolveAndSetPrincipal()
    return;
  }
  // 2. Dev-Mode?
  if (appConfig.authDevMode) {
    const devPrincipalId = req.headers["x-dev-principal-id"];
    resolveAndSetPrincipal(devPrincipalId)
    return;
  }
  // 3. Session?
  if (req.session?.user) {
    req.user = req.session.user;
    next();
    return;
  }
  // 401 Unauthorized
}
```

---

## 5. Datenbank-Schema (Principals & Berechtigungen)

**Datei:** `lib/db/src/schema/principals.ts`

### 5.1 principals (Benutzer/Gruppen)

```sql
CREATE TABLE principals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_type  TEXT NOT NULL,           -- 'user' | 'group'
  external_provider TEXT NOT NULL DEFAULT 'entra',
  external_id     TEXT NOT NULL,           -- Entra Object-ID (oid)
  display_name    TEXT NOT NULL,
  email           TEXT,
  upn             TEXT,                    -- User Principal Name
  status          TEXT NOT NULL DEFAULT 'active',
  last_sync_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(external_provider, external_id)
);
```

### 5.2 role_assignments (Rollenzuweisungen)

```sql
CREATE TABLE role_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id  UUID NOT NULL REFERENCES principals(id),
  role          TEXT NOT NULL,   -- WikiRole enum
  scope         TEXT NOT NULL DEFAULT 'global',
  granted_by    UUID REFERENCES principals(id),
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,    -- NULL = unbegrenzt
  is_active     BOOLEAN NOT NULL DEFAULT true
);
```

### 5.3 page_permissions (Seitenberechtigungen)

```sql
CREATE TABLE page_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id       UUID NOT NULL REFERENCES content_nodes(id) ON DELETE CASCADE,
  principal_id  UUID NOT NULL REFERENCES principals(id),
  permission    TEXT NOT NULL,   -- WikiPermission enum
  is_inherited  BOOLEAN NOT NULL DEFAULT false,
  granted_by    UUID REFERENCES principals(id),
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.4 node_ownership (Inhaltsverantwortung)

```sql
CREATE TABLE node_ownership (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id     UUID NOT NULL REFERENCES content_nodes(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES principals(id),
  deputy_id   UUID REFERENCES principals(id),
  reviewer_id UUID REFERENCES principals(id),
  approver_id UUID REFERENCES principals(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.5 deputy_delegations (Stellvertretungen)

```sql
CREATE TABLE deputy_delegations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id  UUID NOT NULL REFERENCES principals(id),
  deputy_id     UUID NOT NULL REFERENCES principals(id),
  scope         TEXT NOT NULL DEFAULT 'global',
  reason        TEXT,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES principals(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.6 sod_config (Vier-Augen-Prinzip)

```sql
CREATE TABLE sod_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key    TEXT NOT NULL UNIQUE,
  description TEXT,
  is_enabled  BOOLEAN NOT NULL DEFAULT true,
  updated_by  UUID REFERENCES principals(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 6. Einstellungsseite & Connector-Monitoring

### 6.1 Übersicht der Einstellungs-Tabs

**Datei:** `artifacts/wiki-frontend/src/pages/SettingsPage.tsx`

| Tab | Berechtigung | Inhalt |
|-----|-------------|--------|
| Allgemein | `manage_settings` | Version, Umgebung, Betriebszeit, DB-Status |
| Benutzer & Rollen | `manage_permissions` | Benutzerverwaltung, Rollenzuweisung |
| Verbindungen | `manage_settings` | Entra, Teams, OpenAI, FlowCore-Konto Status |
| KI-Assistent | `manage_settings` | OpenAI-Konfiguration |
| Seitentemplates | `manage_templates` | Template-Verwaltung |
| Connectors | `manage_connectors` | Quellsystem-Synchronisation |
| Backups | `manage_backup` | Datenbank-Backups |
| Audit-Trail | `view_audit_log` | Ereignisprotokoll |
| Workflows | `manage_workflows` | Freigabe-Workflows |
| Konsistenz | `manage_settings` | Datenkonsistenz-Pruefungen |
| Releases | `manage_settings` | Release-Notizen |

### 6.2 Verbindungen-Tab: Connector-Status

Zeigt den Status von drei Hauptintegrationen:

#### Microsoft Entra ID
```
- Status:    "Konfiguriert" (gruen) / "Ausstehend" (grau)
- Tenant-ID: Angezeigt oder "Nicht konfiguriert"
- Client-ID: Angezeigt (teilmaskiert) oder "Nicht konfiguriert"
- Modus:     "Entwicklung" / "Produktion"
```

#### Microsoft Teams
```
- Status: "Konfiguriert" / "Ausstehend"
- App-ID: Angezeigt oder "Nicht gesetzt"
```

#### FlowCore-Kommunikationskonto
```
- Status:          "Konfiguriert" / "Nicht konfiguriert"
- UPN/E-Mail:      Editierbar
- Speichern-Button: Konto-UPN aendern
- Test-Button:      Prueft Graph-API-Erreichbarkeit
- Testergebnis:     Gruen/Rot mit Meldung
```

### 6.3 Quellsystem-Connectors

**Datei:** `artifacts/wiki-frontend/src/pages/ConnectorsPage.tsx`

Fuer jeden Connector (z.B. SharePoint):
- **Status:** Aktiv/Inaktiv
- **Letzte Synchronisation:** Zeitstempel
- **Sync-Fehler:** Falls vorhanden, werden Details angezeigt
- **Aktionen:**
  - "Pruefen" (Validierung): `POST /api/admin/source-systems/:id/validate`
    - Prueft Verbindungskonfiguration
    - Prueft SharePoint-Zugriff (Site-ID, Drive-ID)
    - Prueft Graph-API-Token
  - "Synchronisieren": `POST /api/admin/source-systems/:id/sync`
  - Sync-Intervall konfigurieren

### 6.4 Health-Endpunkt

**Datei:** `artifacts/api-server/src/routes/health.ts`

```
GET /healthz

Response 200: { status: "ok", db: "connected" }
Response 503: { status: "error", db: "disconnected" }
```

### 6.5 System-Info-Endpunkt

```
GET /api/admin/system-info

Response: {
  version: "0.4",
  environment: "development" | "production",
  uptime: 123456,
  database: { connected: true, pool: { ... } },
  auth: {
    devMode: false,
    entraConfigured: true,
    entraTenantId: "...",
    entraClientId: "...-masked"
  },
  integrations: {
    openai: { configured: true, baseUrl: "..." },
    teams: { configured: true, appId: "..." }
  }
}
```

---

## 7. Sicherheitsaspekte

### 7.1 CSRF-Schutz (OAuth State)

```typescript
// State-Parameter ist signiert mit HMAC-SHA256
// Format: {nonce}.{timestamp_base36}.{signature}
// Max. Gueltigkeit: 10 Minuten
function signOAuthState(nonce): string {
  const sig = createHmac("sha256", SESSION_SECRET)
    .update(`${nonce}.${ts}`)
    .digest("base64url");
  return `${nonce}.${ts}.${sig}`;
}
```

### 7.2 Rate Limiting

```typescript
// Authentifizierungs-Endpunkte sind rate-limited:
// /api/auth/login, /api/auth/callback, /api/teams/sso
// -> authRateLimit Middleware
```

### 7.3 Tenant-Isolation

```typescript
// Jeder Login prueft die Tenant-ID:
if (tokenResult.tenantId !== appConfig.entraTenantId) {
  // 403 Forbidden -- kein Zugang fuer fremde Tenants
}
```

### 7.4 Gruppenzugriffskontrolle

```typescript
// Optional: Nur Mitglieder einer bestimmten Entra-Gruppe
if (appConfig.entraRequiredGroupId) {
  const isMember = await checkGroupMembership(
    accessToken, externalId, requiredGroupId
  );
  if (!isMember) {
    // 403 -- "Sie gehoeren nicht zum Team BildungsCampus"
    // Audit-Event wird geschrieben
  }
}
```

### 7.5 Audit-Trail

Alle sicherheitsrelevanten Ereignisse werden in `audit_events` protokolliert:

| Event-Type | Action | Beschreibung |
|-----------|--------|-------------|
| `auth` | `login` | Erfolgreicher Login (Web oder Teams SSO) |
| `auth` | `logout` | Benutzer-Abmeldung |
| `auth` | `login_rejected_group` | Zugriff verweigert (Gruppe) |
| `auth` | `auto_role_assigned` | Erstmalige Rollenzuweisung (viewer) |
| `sod` | `sod_violation_blocked` | Vier-Augen-Prinzip verletzt |

Gespeicherte Daten pro Event:
- Zeitstempel, Event-Type, Action
- Actor-ID (wer), Resource-Type, Resource-ID (was)
- Details (JSON: Provider, Tenant-ID, Gruende etc.)
- IP-Adresse

### 7.6 Token-Fallback-Strategie (Graph Client)

```
1. Session-Token verwenden (User-Kontext)
2. Falls abgelaufen: App-Token (Client Credentials) als Fallback
3. Falls beides fehlschlaegt: Operation abbrechen
```

---

## 8. Konfigurationsreferenz (Environment Variables)

**Datei:** `artifacts/api-server/src/lib/config.ts`

| Variable | Pflicht | Standard | Beschreibung |
|----------|---------|----------|-------------|
| `PORT` | Ja | - | Server-Port |
| `NODE_ENV` | Nein | `development` | `development` / `production` / `test` |
| `DATABASE_URL` | Ja | - | PostgreSQL Connection String |
| `LOG_LEVEL` | Nein | `info` | `trace`/`debug`/`info`/`warn`/`error`/`fatal` |
| `ENTRA_CLIENT_ID` | Ja (Prod) | `""` | Azure AD App Client-ID |
| `ENTRA_CLIENT_SECRET` | Ja (Prod) | `""` | Azure AD App Client-Secret |
| `ENTRA_TENANT_ID` | Ja (Prod) | `""` | Azure AD Tenant-ID |
| `ENTRA_REDIRECT_URI` | Ja (Prod) | `""` | OAuth Callback-URL |
| `SESSION_SECRET` | Ja (Prod) | `dev-session-...` | Session-Verschluesselung |
| `AUTH_DEV_MODE` | Nein | `true` in dev | Dev-Authentifizierung aktivieren |
| `TEAMS_APP_ID` | Nein | `""` | Teams App UUID |
| `ENTRA_REQUIRED_GROUP_ID` | Nein | `""` | Entra Security Group Object-ID |

**Validierung:** Alle Variablen werden beim Start via Zod-Schema validiert. In Produktion wird erzwungen, dass `SESSION_SECRET` nicht der Standardwert ist.

---

## 9. Dateistruktur-Referenz

### Backend (API Server)

```
artifacts/api-server/src/
  lib/
    config.ts                    # Zod-validierte Env-Variablen
    logger.ts                    # Pino Logger
  middlewares/
    require-auth.ts              # Authentifizierungs-Middleware
    require-permission.ts        # Autorisierungs-Middleware
    rate-limit.ts                # Rate Limiting
  routes/
    auth.ts                      # Login, Callback, /me, Logout
    teams.ts                     # Teams SSO, Context-Endpunkt
    admin.ts                     # System-Info, Settings, Audit
    connectors.ts                # Quellsystem-Verwaltung
    health.ts                    # /healthz Endpoint
  services/
    auth.service.ts              # MSAL Client (Auth Code + OBO + Client Creds)
    rbac.service.ts              # Rollen, Berechtigungen, SoD (~978 Zeilen)
    principal.service.ts         # Benutzer-Upsert, Rollenzuweisung
    graph-client.service.ts      # MS Graph API (Users, Groups, Photos)
    api-token.service.ts         # Bearer-Token-Validierung
```

### Frontend (Wiki)

```
artifacts/wiki-frontend/src/
  components/
    teams/
      TeamsProvider.tsx           # React Context fuer Teams-Umgebung
      ShareToTeams.tsx            # Teilen-in-Teams-Dropdown
  hooks/
    useTeamsContext.ts            # Teams Context Hook
    use-auth.ts                  # Authentifizierungs-Hook
  lib/
    teams.ts                     # Teams SDK Wrapper (SSO, Deep-Links, Tab-Config)
  pages/
    LoginPage.tsx                # Web-Login via Entra
    TeamsTabConfig.tsx            # Konfigurierbare Tab-Seite
    SettingsPage.tsx              # Admin-Einstellungen (Verbindungen etc.)
    ConnectorsPage.tsx            # Quellsystem-Connectors
  public/
    teams-manifest/
      manifest.json              # Teams App-Manifest (Template)
      color.png                  # App-Icon (farbig, 192x192)
      outline.png                # App-Icon (Umriss, 32x32)
```

### Datenbank (Shared Library)

```
lib/db/src/schema/
  principals.ts                  # principals, role_assignments,
                                 # page_permissions, node_ownership,
                                 # deputy_delegations, sod_config
  enums.ts                       # principalTypeEnum, wikiRoleEnum,
                                 # wikiPermissionEnum etc.
```

### npm-Pakete (package.json)

```
Backend:
  @azure/msal-node              # MSAL fuer Node.js
  @microsoft/microsoft-graph-client  # Graph API Client
  express-session               # Session Management
  connect-pg-simple             # PostgreSQL Session Store

Frontend:
  @microsoft/teams-js           # Teams JavaScript SDK
```

---

## 10. Implementierungsleitfaden fuer neue Projekte

### Schritt 1: Entra App-Registrierung

1. Azure Portal -> App-Registrierungen -> Neue Registrierung
2. Name: `<App-Name>`
3. Unterstuetzte Kontotypen: "Nur Konten in diesem Organisationsverzeichnis"
4. Redirect-URI: Web -> `https://<domain>/api/auth/callback`
5. Zertifikate & Geheimnisse -> Neues Clientgeheimnis erstellen
6. API-Berechtigungen: `User.Read`, `openid`, `profile`, `email` hinzufuegen
7. Fuer Teams SSO: API verfuegbar machen:
   - URI: `api://<domain>/<client-id>`
   - Scope: `access_as_user`
   - Autorisierte Clients: Teams Desktop + Web IDs hinzufuegen

### Schritt 2: Backend aufsetzen

1. `@azure/msal-node` und `@microsoft/microsoft-graph-client` installieren
2. Config-Schema mit Zod erstellen (siehe Abschnitt 8)
3. `auth.service.ts` implementieren (MSAL Client Singleton)
4. `require-auth.ts` Middleware implementieren (Session + Bearer + Dev-Mode)
5. Auth-Routen implementieren (`/login`, `/callback`, `/me`, `/logout`)
6. `express-session` mit `connect-pg-simple` konfigurieren
7. RBAC-Service implementieren (Rollen-Matrix, Berechtigungsaufloesung)
8. `require-permission.ts` Middleware implementieren

### Schritt 3: Teams-Integration

1. Teams App Manifest erstellen (v1.17)
2. `@microsoft/teams-js` im Frontend installieren
3. TeamsProvider implementieren (SDK-Init, SSO, Theme-Sync)
4. Teams SSO Route implementieren (`/api/teams/sso` mit OBO-Flow)
5. Deep-Link-Builder implementieren
6. Tab-Config-Seite implementieren
7. Share-to-Teams Komponente implementieren
8. Manifest als ZIP mit Icons verpacken
9. Im Teams Admin Center hochladen und fuer die Organisation freigeben

### Schritt 4: Einstellungs-/Monitoring-Seite

1. System-Info-Endpunkt mit Auth/Teams-Status erstellen
2. Verbindungen-Tab mit Echtzeit-Status der Integrationen
3. Health-Endpunkt (`/healthz`) fuer Monitoring/Load Balancer
4. Connector-Validierung mit detaillierten Fehlermeldungen

### Schritt 5: Datenbank-Schema

1. Principals-Tabelle mit Entra-ExternalID als eindeutigem Schluessel
2. Role-Assignments mit Scope-Support (global + node-spezifisch)
3. Page-Permissions fuer granulare Seitenrechte
4. Audit-Events fuer lueckenlose Protokollierung
5. Session-Store-Tabelle fuer `connect-pg-simple`

---

*Erstellt: April 2026 | FlowCore v0.4 | Bildungscampus Backnang*
