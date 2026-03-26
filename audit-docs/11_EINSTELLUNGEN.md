# 11 — Einstellungen & Konfiguration

## 11.1 Übersicht

FlowCore bietet Konfigurationsoptionen auf drei Ebenen:

1. **Umgebungsvariablen** — Infrastruktur- und Sicherheitseinstellungen
2. **Admin-UI** — Anwendungskonfiguration über die Einstellungsseite
3. **Datenbank** — Persistente Einstellungen in dedizierten Tabellen

## 11.2 Umgebungsvariablen

### Anwendung

| Variable | Beschreibung | Pflicht |
|:---------|:-------------|:--------|
| `PORT` | Server-Port | Ja |
| `NODE_ENV` | Umgebung: development, production, test | Ja |
| `LOG_LEVEL` | Log-Level: trace, debug, info, warn, error, fatal | Nein |
| `DATABASE_URL` | PostgreSQL-Verbindungsstring | Ja |

### Authentifizierung

| Variable | Beschreibung | Pflicht |
|:---------|:-------------|:--------|
| `AUTH_DEV_MODE` | Entwicklungsmodus ohne SSO (true/false) | Nein |
| `SESSION_SECRET` | Schlüssel für Session-Cookie-Signatur | Ja (Prod) |
| `ENTRA_TENANT_ID` | Microsoft Entra Mandanten-ID | Ja (Prod) |
| `ENTRA_CLIENT_ID` | Microsoft Entra Client-ID | Ja (Prod) |
| `ENTRA_CLIENT_SECRET` | Microsoft Entra Client-Secret | Ja (Prod) |
| `ENTRA_REDIRECT_URI` | OAuth2-Redirect-URI | Ja (Prod) |

### Teams-Integration

| Variable | Beschreibung | Pflicht |
|:---------|:-------------|:--------|
| `TEAMS_APP_ID` | Microsoft Teams App-ID | Nein |

### Validierung

Umgebungsvariablen werden beim Serverstart über **Zod-Schemas** validiert (Datei: `artifacts/api-server/src/lib/config.ts`). Bei fehlenden Pflichtfeldern schlägt der Start fehl.

## 11.3 Einstellungsseite (Admin-UI)

Die Einstellungsseite ist über die Sidebar erreichbar und erfordert die Berechtigung `view_settings`. Sie enthält folgende Tabs:

### Tab: Allgemein

- Systeminformationen (Version, Umgebung, Datenbankstatus)
- Auth-Konfigurationsstatus (Entra ID verbunden/nicht verbunden)
- Integrationsstatus-Übersicht

### Tab: Benutzer & Rollen

- **Benutzerverwaltung:**
  - Benutzer und Gruppen durchsuchen
  - Principals aus Microsoft Entra ID importieren
  - Rollen zuweisen/entziehen
  - Bereichsbezogene Rollen konfigurieren

- **Rollenübersicht:**
  - Alle 7 Rollen mit Beschreibungen
  - Berechtigungs-Matrix-Ansicht
  - Berechtigungsgruppen: Ansichten, Inhalte, Workflow, Administration

- **Berechtigung erforderlich:** `manage_permissions`

### Tab: KI-Assistent

- **Allgemein:**
  - KI ein-/ausschalten
  - Modellauswahl (GPT-5.2, GPT-5 Mini, GPT-5 Nano)
  - Max. Antwort-Tokens

- **Quellenkonfiguration:**
  - Quellenmodus: Nur Wiki / Wiki + Konnektoren / Wiki + Konnektoren + Web
  - Websuche aktivieren/deaktivieren
  - Quellenpriorität

- **Antwortverhalten:**
  - Antwortsprache (Auto, Deutsch, Englisch)
  - Zitierstil (Inline, Fußnoten, Keine)
  - Max. Quellen pro Antwort
  - Benutzerdefinierter System-Prompt

- **Nutzungsstatistiken:**
  - Gesamtanfragen, Fehlerrate, Null-Ergebnis-Rate
  - Durchschnittliche Latenz, Token-Verbrauch

- **Berechtigung erforderlich:** `manage_settings`

### Tab: Konnektoren

- **Quellsysteme:**
  - Erstellen, Bearbeiten, Aktivieren/Deaktivieren
  - SharePoint-Picker mit Site/Bibliothek/Ordner-Auswahl
  - Sync-Konfiguration (Intervall, manueller Sync)

- **Speicheranbieter:**
  - Erstellen, Bearbeiten
  - Standard-Anbieter festlegen
  - SharePoint-Ordner als Speicherziel

- **Berechtigung erforderlich:** `manage_settings`

### Tab: Organisation

- **Organisationseinheiten:** Hierarchische Struktur der Organisation
- **Marken:** Name, Logo, Primärfarbe
- **Standorte:** Physische Standorte
- **Geschäftsfunktionen:** Funktionale Bereiche

## 11.4 Datenbank-Einstellungen

### ai_settings

Speichert KI-Konfiguration (siehe Kapitel 09 — KI-Integration).

### Konnektorkonfiguration

Gespeichert in `source_systems.connection_config` und `storage_providers.config` als JSONB.

### Organisation

Gespeichert in den Tabellen `organization_units`, `brands`, `locations`, `business_functions`.

## 11.5 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `artifacts/api-server/src/lib/config.ts` | Umgebungsvariablen-Validierung (Zod) |
| `artifacts/wiki-frontend/src/pages/SettingsPage.tsx` | Einstellungsseite (Haupt-Container) |
| `artifacts/wiki-frontend/src/components/settings/GeneralTab.tsx` | Allgemein-Tab |
| `artifacts/wiki-frontend/src/components/settings/UsersRolesTab.tsx` | Benutzer & Rollen |
| `artifacts/wiki-frontend/src/components/settings/AISettingsTab.tsx` | KI-Assistent |
| `artifacts/wiki-frontend/src/pages/ConnectorsPage.tsx` | Konnektoren |
| `artifacts/wiki-frontend/src/components/settings/OrganizationTab.tsx` | Organisation |
