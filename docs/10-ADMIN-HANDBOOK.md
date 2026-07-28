# Administrationshandbuch – FlowCore

## Überblick

Dieses Handbuch beschreibt die Systemadministration von FlowCore, einschließlich Konfiguration, Benutzerverwaltung, Konnektoren, Backup-System, Sicherheit und Wartung.

---

## Systemarchitektur

- **Frontend**: React + Vite (SPA, bereitgestellt über Replit Autoscale)
- **Backend**: Express 5 API-Server (Node.js 24)
- **Datenbank**: PostgreSQL mit Drizzle ORM
- **Authentifizierung**: Microsoft Entra ID (SSO via OIDC/PKCE)
- **Medienablage**: SharePoint (Microsoft Graph API)
- **Backup**: Automatisch in SharePoint (konfigurierbar)
- **Teams-Integration**: Microsoft Teams JS SDK v2

---

## Umgebungsvariablen

Vollständige Dokumentation: [05-CONFIG-ENV.md](./05-CONFIG-ENV.md)

| Variable | Beschreibung | Pflicht |
|---|---|---|
| `DATABASE_URL` | PostgreSQL-Verbindungszeichenfolge | Ja |
| `SESSION_SECRET` | Session-Schlüssel (mind. 32 Zeichen) | Ja |
| `ENTRA_CLIENT_ID` | Azure AD App-Registrierung Client-ID | Ja |
| `ENTRA_CLIENT_SECRET` | Azure AD App-Registrierung Secret | Ja |
| `ENTRA_TENANT_ID` | Azure AD Tenant-ID | Ja |
| `ENTRA_REDIRECT_URI` | OAuth-Callback-URL | Ja |
| `TEAMS_APP_ID` | Teams App-ID für Deep Links | Optional |
| `OPENAI_API_KEY` | OpenAI API-Schlüssel für KI-Assistent | Optional |
| `AUTH_DEV_MODE` | Entwicklungsmodus (deaktiviert Auth-Prüfung) | Nur Entwicklung |
| `LOG_LEVEL` | Logging-Stufe (trace/debug/info/warn/error) | Optional |
| `NODE_ENV` | Umgebung (development/production) | Ja |

---

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

Das System verwendet feingranulare Berechtigungen (definiert in `rbac.service.ts`):

**Inhalte**
- `read_page`, `create_page`, `edit_content`, `edit_structure`, `manage_relations`, `archive_page`

**Arbeitskopien (Working Copies)**
- `create_working_copy`, `edit_working_copy`, `submit_working_copy`
- `review_working_copy`, `amend_working_copy_in_review`, `publish_working_copy`
- `cancel_working_copy`, `force_unlock_working_copy`

**Prüfung & Freigabe**
- `submit_for_review`, `review_page`, `approve_page`

**Administration**
- `manage_permissions`, `manage_templates`, `manage_settings`, `manage_workflows`
- `view_audit_log`, `manage_connectors`, `manage_media`

**Backup**
- `manage_backup`, `manage_backups`, `run_backup`, `restore_backup`, `view_backups`

**Navigation & Ansichten**
- `view_home`, `view_search`, `view_glossary`, `view_dashboard`, `view_tasks`, `view_settings`

**Copilot / Graph Connector**
- `export_copilot_content`, `manage_agent_metadata`, `manage_copilot_index_status`
- `manage_graph_connector`, `manage_copilot_connector_keys`

### Rollenzuweisung

Unter **Einstellungen → Benutzer & Rollen** können Administratoren Rollen zuweisen.

API:
```
POST /api/principals/:id/roles
{ "role": "editor", "scope": null }
```

---

## Konnektoren-Verwaltung

Konnektoren verbinden FlowCore mit externen Diensten. Die Verwaltung erfolgt unter **Einstellungen → Konnektoren**.

### Speicheranbieter

Speicheranbieter definieren, wohin Dateien hochgeladen werden und wo Backups gespeichert werden.

**Tabs**: Speicheranbieter | Sync-Status | SharePoint-Bibliotheken

#### SharePoint-Ablagen durchsuchen

Der Reiter „SharePoint-Bibliotheken" beginnt bei den **Teams** der
Organisation: Team auswählen → Dokumentbibliotheken des Teams → Ordner und
Dateien. Technisch ist ein Team eine Microsoft-365-Gruppe mit Teamsite; die
Auswahl fragt daher Gruppen mit aktivierter Team-Bereitstellung ab
(Berechtigung `Group.Read.All`) und löst die zugehörige Teamsite auf.

Über „Alle SharePoint-Sites" lässt sich auf die Site-Suche umschalten — für
Ablagen ohne zugehöriges Team, etwa ältere Projektsites. Persönliche
OneDrive-Ablagen erscheinen in keiner der beiden Ansichten.

#### Speicheranbieter anlegen

1. **Einstellungen → Konnektoren → Speicheranbieter → „Speicheranbieter hinzufügen"**
2. Felder ausfüllen:
   - **Name**: Anzeigename (z.B. „Medienablage Hauptsite")
   - **Slug**: Technischer Bezeichner (z.B. `media-main`)
   - **Typ**: `sharepoint`
   - **Zweck**: `media_archive` (Medienablage) oder `backup_target` (Backup-Ziel)
   - **Zugriffsmodus**: `Lesen & Schreiben`
   - **Als Standard setzen**: Ja/Nein
3. SharePoint-Site und -Bibliothek über den integrierten Picker auswählen
4. Speichern

#### Credential-Logik

Speicheranbieter des Typs SharePoint nutzen für den API-Zugriff (Client-Credentials-Flow):
1. **Eigene Credentials** aus der Konfiguration des Anbieters (falls hinterlegt)
2. **Fallback**: Umgebungsvariablen `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`

Die App-Registrierung muss die Anwendungsberechtigung **`Files.ReadWrite.All`** (oder `Sites.ReadWrite.All`) in Microsoft Graph besitzen, mit erteilt**em Admin-Consent**.

#### Zwecke der Speicheranbieter

| Zweck | Beschreibung | Standard |
|---|---|---|
| `media_archive` | Ziel für alle Datei-Uploads aus dem Editor | Einer als Standard markiert |
| `backup_target` | Ziel für automatische und manuelle Backups | — |
| `knowledge_source` | Quellbibliothek für Content-Sync | — |

### Quellsysteme

Quellsysteme (z.B. SharePoint-Bibliotheken) können als Wissensquellen konfiguriert werden. Content kann von dort in das Wiki synchronisiert werden.

---

## Backup-Konfiguration

Die Backup-Konfiguration erfolgt unter **Einstellungen → Backup**.

### Konfiguration

- **Automatischer Backup**: Ein/Aus-Schalter
- **SharePoint-Zielordner**: Picker für den Backup-Zielordner in SharePoint
- **Aufbewahrungsregeln**: Tägliche / Wöchentliche / Monatliche Anzahl
- **Backup-Inhalte**: Template-Definitionen, Konnektor-Konfiguration, Medien-Index, Audit-Metadaten

### Backup-Historie

Unter dem Tab **„Backup-Historie"** sind alle durchgeführten Backups einsehbar.

Vollständige Dokumentation: [12-BACKUP-RESTORE.md](./12-BACKUP-RESTORE.md)

---

## Seitenvorlagen (Templates)

Unter **Einstellungen → Seitenvorlagen** können Administratoren:
- Bestehende Vorlagen ansehen und deren Feldschemas einsehen
- Vorlagen aktivieren/deaktivieren
- Neue benutzerdefinierte Vorlagen erstellen

### Vorhandene Template-Typen (11)

| Typ | Deutsch | Hauptfelder |
|---|---|---|
| `core_process_overview` | Kernprozess-Übersicht | SIPOC, KPIs, Compliance |
| `area_overview` | Bereichsübersicht | Beschreibung |
| `process_page_text` | Prozessseite (Text) | Schritte, RACI, Schnittstellen |
| `process_page_graphic` | Prozessseite (BPMN) | BPMN-Diagramm |
| `procedure_instruction` | Verfahrensanweisung | Zweck, Schritte, Verantwortliche |
| `work_instruction` | Arbeitsanweisung | Detaillierte Schritte |
| `policy` | Richtlinie | Zweck, Geltungsbereich, Regelwerk |
| `role_profile` | Rollenprofil | Aufgaben, Qualifikationen |
| `form_template` | Formularvorlage | Formularfelder |
| `faq` | FAQ | Fragen & Antworten |
| `info_page` | Infoseite | Freier Inhalt |

---

## KI-Einstellungen

Unter **Einstellungen → KI** (bzw. **KI-Einstellungen**) können Administratoren:
- KI-Feldsprofile konfigurieren (automatische Vorschläge für strukturierte Felder)
- KI-Assistent (FlowCore-Assistent) aktivieren/deaktivieren
- OpenAI-Modell und Parameter einstellen

---

## Vertraulichkeitsstufen

FlowCore unterstützt vier Vertraulichkeitsstufen für Seiten. Die Stufen folgen einem Clearance-Modell: Zugriff auf eine höhere Stufe impliziert automatisch Zugriff auf alle niedrigeren Stufen.

### Stufen (von niedrig nach hoch)

| Stufe | Beschreibung | Zugriff |
|---|---|---|
| `public` | Öffentlich sichtbar | Alle (kein Login erforderlich) |
| `internal` | Intern (Standard) | Alle eingeloggten Benutzer — kein expliziter Grant erforderlich |
| `confidential` | Vertraulich | Nur Benutzer mit explizitem `confidential`-Grant |
| `strictly_confidential` | Streng vertraulich | Nur Benutzer mit explizitem `strictly_confidential`-Grant |

### Wichtig: Hierarchie-Logik

- **`internal`** ist der Standard-Level für alle neuen Seiten. Jeder authentifizierte Benutzer kann `internal`-Seiten lesen — kein Grant erforderlich.
- **`confidential`-Grant** gewährt automatisch auch Zugriff auf `internal` und `public`.
- **`strictly_confidential`-Grant** gewährt Zugriff auf alle Stufen.

### Grants verwalten

Grants werden in der Tabelle `confidentiality_principal_access` gespeichert (`level`, `principal_id`). Die Verwaltung erfolgt derzeit direkt über die Datenbank oder die Admin-API.

Beim Zusammenführen doppelter Principals (automatisch bei erneutem Login) werden alle Grants des Duplikats auf den kanonischen Principal übertragen.

---

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

---

## Datenbank-Verwaltung

### Schema-Updates
```bash
pnpm --filter @workspace/db run push-force
```

### Wichtige Tabellen

| Tabelle | Inhalt |
|---|---|
| `content_nodes` | Wiki-Seiten (Identität) |
| `content_revisions` | Revisionshistorie (unveränderlich) |
| `principals` | Benutzer und Gruppen |
| `role_assignments` | Rollenzuweisungen pro Principal |
| `confidentiality_principal_access` | Vertraulichkeits-Grants pro Principal (`internal`, `confidential`, `strictly_confidential`) |
| `audit_events` | Audit-Trail |
| `storage_providers` | Speicheranbieter-Konfiguration |
| `source_systems` | Quellsysteme |
| `backup_configs` | Backup-Konfiguration |
| `media_assets` | Medien-Asset-Metadaten |
| `notifications` | In-App-Benachrichtigungen |
| `user_sessions` | Datenbankgestützte Session-Speicherung |

---

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
| `connector` | `storage_provider_created` | Speicheranbieter angelegt |
| `connector` | `storage_provider_updated` | Speicheranbieter geändert |
| `backup` | `backup_completed` | Backup erfolgreich |
| `backup` | `backup_failed` | Backup fehlgeschlagen |

---

## Wartungsaufgaben

### Regelmäßige Aufgaben

| Häufigkeit | Aufgabe |
|---|---|
| Täglich | Automatisches Backup prüfen (Backup-Historie) |
| Wöchentlich | Audit-Log auf ungewöhnliche Aktivitäten prüfen |
| Monatlich | Benutzer-Rollen überprüfen und aktualisieren |
| Vierteljährlich | Wiederherstellungstest aus Backup durchführen |
| Jährlich | Entra-Client-Secret rotieren |

### Entra Client-Secret rotieren

1. Neues Secret im Azure Portal erstellen (App-Registrierungen → FlowCore → Zertifikate & Geheimnisse)
2. `ENTRA_CLIENT_SECRET` in Replit Secrets aktualisieren
3. App neu deployen
4. Altes Secret im Azure Portal löschen
