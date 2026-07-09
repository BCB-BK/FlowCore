# Copilot-Readiness Audit — Cluster 1: Ist-Analyse

**Status:** Analysecluster — keine Implementierung, keine Quickfixes, keine DB-Patches.
**Erstellt:** 2026-07-09
**Scope:** Bestandsaufnahme der FlowCore Content-, Auth-, Graph- und Rechtepfade als Grundlage für die Copilot-/Graph-Integrationsfähigkeit.

---

## 1. Zusammenfassung

FlowCore (Bildungscampus Wiki) ist ein pnpm-Monorepo mit zwei zentralen Artefakten:

- `artifacts/api-server` — Express/TypeScript-Backend (Drizzle ORM, PostgreSQL)
- `artifacts/wiki-frontend` — React/Vite-Frontend

Das System verfügt bereits über eine ausgereifte Content-Lifecycle-Logik (Working Copies → Review → Publish), ein granulares RBAC-System, eine funktionierende Entra-ID-Authentifizierung und eine bestehende Microsoft Graph/SharePoint-Anbindung für Connector-Zwecke (Speicherquelle für Medien, Sync von externen Dokumenten). Diese Bausteine sind grundsätzlich wiederverwendbar für einen Copilot-/Graph-Zugriff, aber **nicht** speziell für einen Microsoft 365 Copilot Connector/Graph-Grounding-Anwendungsfall aufbereitet (siehe Lückenliste, Abschnitt 8).

---

## 2. Relevante Tabellen (Datenmodell)

Quelle: `lib/db/src/schema/*.ts` (Drizzle-Schema)

| Bereich | Tabelle | Zweck / Schlüsselspalten |
|---|---|---|
| Content | `content_nodes` | Haupt-Registry jeder Seite. `id`, `immutable_id`, `status` (draft/published/deleted/archived), `template_type`, `owner_id`, `current_revision_id`, `published_revision_id`, `search_vector` (tsvector, GIN-Index, `german`-Dictionary) |
| Content | `content_revisions` | Unveränderliche Versionshistorie. `revision_no`, `version_label`, `status` (published/archived) |
| Content | `content_working_copies` | Aktiver Entwurf pro Node (max. 1 aktiv, unique Index `idx_working_copies_active_per_node`). `status` (draft/submitted/in_review/changes_requested/approved_for_publish/published), `author_id`, `base_revision_id` |
| Content | `content_revision_events` / `working_copy_events` | Audit-Trail für Revisions- bzw. Freigabe-Workflow |
| Content | `content_aliases` | Historische `displayCode`-Werte (für Redirects/Suche) |
| Content | `content_relations` | Beziehungen zwischen Nodes (`relation_type`: related_to, uses_template, depends_on, implements_policy, upstream_of, downstream_of, replaces, references, inline_wiki_link) |
| Tags | `content_tags`, `content_node_tags` | Tag-Stammdaten + m:n-Zuordnung zu Nodes |
| Ownership | `node_ownership` | Owner/Deputy/Reviewer/Approver pro Node (UUID-Referenzen auf `principals`) |
| Auth/RBAC | `principals` | Nutzer/Gruppen, inkl. Sync aus Entra ID (`externalId`) |
| Auth/RBAC | `role_assignments` | Principal → `WikiRole`, `scope` (global oder node/code-spezifisch), `expires_at` |
| Auth/RBAC | `page_permissions` | Feingranulare Permission-Overrides je Node |
| Auth/RBAC | `deputy_delegations` | Temporäre Rechte-Vererbung (z. B. Urlaubsvertretung) |
| Auth/RBAC | `sod_config` | Segregation-of-Duties-Regeln (Vier-Augen-Prinzip) |
| Vertraulichkeit | `confidentiality_access_config` | Level → erlaubte Rollen (`allowed_roles: text[]`) |
| Vertraulichkeit | `confidentiality_principal_access` | Direkte Principal-Zuweisung zu einem Level |
| Admin | `system_settings` | generische Key/Value-Einstellungen |
| Admin | `ai_settings`, `ai_field_profiles` | KI-Konfiguration (Modell, Prompt, Feld-Profile) |
| Admin | `workflow_templates`, `workflow_steps` | Freigabeprozess-Definitionen, inkl. `enforce_sod`, `roles` je Schritt |
| Connectoren | `source_systems` | Externe Quellen (u. a. SharePoint: `siteId`, `driveId`, `folderId`) |
| Sessions | `user_sessions` | Express-Session-Speicher (via `connect-pg-simple`) |

---

## 3. Relevante API-Routen

Quelle: `artifacts/api-server/src/routes/index.ts` (Mount unter `/api`), `app.ts`

| Route-Datei | Prefix | Zweck |
|---|---|---|
| `routes/health.ts` | `/api/healthz` | Health-/DB-Check |
| `routes/admin.ts` | `/api/admin/*` | Systeminfo, Migrationen, Konsistenzchecks, Audit-Log |
| `routes/workflows-admin.ts` | `/api/admin/workflows/*` | Verwaltung Freigabeprozesse |
| `routes/backup.ts` | `/api/admin/backups` | Backup-Konfiguration/-Ausführung |
| `routes/auth.ts` | `/api/auth/*` | Entra-ID-Login/Logout/Session-Info |
| `routes/principals.ts` | `/api/principals/*`, `/api/rbac/*`, `/api/graph/*` | Nutzer/Gruppen, RBAC-Konfiguration, Graph-Anbindung |
| `routes/content.ts` | `/api/content/*` | Node-CRUD, Baum-Navigation, Relationen |
| `routes/review.ts` | `/api/content/*` (Legacy) | Alter Revisions-Review, durch Working Copies abgelöst |
| `routes/working-copies.ts` | `/api/content/working-copies/*` | Draft → Review → Approve → Publish |
| `routes/notifications.ts` | `/api/notifications/*` | Workflow-Benachrichtigungen |
| `routes/search.ts` | `/api/search/*` | Volltextsuche, Vorschläge, Analytics, Click-Tracking |
| `routes/tags.ts` | `/api/tags/*` | Tag-Verwaltung/-Zuordnung |
| `routes/glossary.ts` | `/api/glossary/*` | Glossarverwaltung |
| `routes/media.ts` | `/api/media/*` | Medien-Uploads/-Verwaltung |
| `routes/connectors.ts` | `/api/connectors/*` | Externe Systeme (SharePoint) |
| `routes/source-refs.ts` | `/api/content/*` | Quellenverweise für Nodes |
| `routes/ai.ts` | `/api/ai/*` | KI-gestützte Content-Generierung |
| `routes/quality.ts` | `/api/quality/*` | Qualitäts-Dashboards |
| `routes/teams.ts` | `/api/teams/*` | Microsoft Teams SSO/Kontext |
| `routes/api-tokens.ts` | `/api/tokens` | Persönliche API-Tokens |
| `routes/deletion-requests.ts` | `/api/content/*` | Löschanträge/Archivierung |
| `routes/confidentiality.ts` | `/api/confidentiality-config` | Konfiguration Vertraulichkeitsstufen |
| `routes/docs.ts` | `/api/docs/*` | Eingebauter Doku-Viewer/Export |

---

## 4. Auth-Flows

Quelle: `artifacts/api-server/src/services/auth.service.ts`, `routes/auth.ts`, `app.ts`, `middlewares/require-auth.ts`, `services/principal.service.ts`, `lib/config.ts`

- **Protokoll:** OIDC via Entra ID, implementiert mit `@azure/msal-node` (`ConfidentialClientApplication`).
- **Login-Flow:** `GET /api/auth/login` → Redirect zu Entra (`getAuthUrl`) → `GET /api/auth/callback` verifiziert `state` (HMAC-signiert) und tauscht den Code gegen Token (`exchangeCodeForToken`).
- **Teams-SSO:** `exchangeTeamsSsoToken` implementiert einen On-Behalf-Of-Flow (OBO) für Microsoft Teams.
- **Session:** `express-session` + `connect-pg-simple` (Tabelle `user_sessions`); Cookie `httpOnly`, `secure` in Produktion, `maxAge` 8 Stunden. Session enthält `principalId`, `externalId` (Entra OID), `displayName`, `email`, `graphAccessToken`.
- **User-Mapping:** `upsertPrincipal` (principal.service.ts) mappt Entra-OID → interne `principals`-UUID; automatische Zuweisung der Rolle `viewer` beim ersten Login, sofern keine Rollen existieren.
- **Gruppenerzwingung:** Ist `ENTRA_REQUIRED_GROUP_ID` gesetzt, prüft `require-auth.ts` per `checkGroupMembership` (15-Min-Cache) die Gruppenmitgliedschaft; Nutzer, die die Gruppe verlassen, werden abgelehnt.
- **Dev-Modus:** `AUTH_DEV_MODE=true` umgeht den Entra-Handshake vollständig; `require-auth.ts` akzeptiert den Header `X-Dev-Principal-Id` zur Impersonation. **Risiko:** Muss in Produktionsumgebungen sicher deaktiviert bzw. abgesichert sein (siehe Risiken, Abschnitt 9).
- **API-Tokens:** Alternative Bearer-Token-Authentifizierung für programmatischen Zugriff (`routes/api-tokens.ts`), ebenfalls durch `require-auth.ts` unterstützt.

---

## 5. RBAC-Flows

Quelle: `artifacts/api-server/src/services/rbac.service.ts`, `middlewares/require-auth.ts`, `middlewares/require-permission.ts`, `lib/db/src/schema/principals.ts`

- **Rollen (`WikiRole`):** `system_admin`, `process_manager`, `editor`, `reviewer`, `approver`, `viewer`, `compliance_manager`.
- **Permissions (`WikiPermission`):** >40 granulare Rechte (z. B. `read_page`, `edit_content`, `publish_working_copy`, `manage_permissions`), statisch je Rolle in `ROLE_PERMISSIONS` gemappt.
- **Auflösung effektiver Rechte** (`getEffectivePermissions`), Reihenfolge:
  1. Globale Rollen (`role_assignments`, `scope = 'global'`)
  2. Node-/Code-skalierte Rollen
  3. Hierarchische Vererbung über rekursive CTE (`resolveNodeScopes`) — Rechte einer Vorfahrenseite werden an Nachfahren vererbt
  4. Direkte Overrides aus `page_permissions`
  5. Delegationen (`deputy_delegations`) — Vertretungslogik
- **Middleware-Durchsetzung:**
  - `requireAuth` — Session- oder Bearer-Token-Prüfung, optionale Entra-Gruppenpflicht
  - `requirePermission(permission, nodeIdExtractor?)` — einzelne Berechtigung, optional node-spezifisch (z. B. `requirePermission("edit_content", (req) => req.params.id)`)
  - `requireAnyPermission([...])` — mindestens eine der genannten Berechtigungen
- **Separation of Duties:** `sod_config` + `workflow_templates.enforce_sod` erzwingen z. B. Vier-Augen-Prinzip bei Freigaben.

---

## 6. Status-/Freigabe-Logik & Published-Content-Erkennung

Quelle: `artifacts/api-server/src/services/working-copy.service.ts`, `routes/working-copies.ts`, `routes/content.ts`, `lib/db/src/schema/content-*.ts`

**Lifecycle-Zustände:**

| Zustand | Node-Status | Working-Copy-Status |
|---|---|---|
| Entwurf | `draft` | `draft` |
| Eingereicht | (unverändert) | `submitted` |
| In Prüfung | (unverändert) | `in_review` |
| Änderung angefordert | (unverändert) | `changes_requested` |
| Freigegeben (noch nicht live) | (unverändert) | `approved_for_publish` |
| Veröffentlicht | `published` | `published` (terminal) |
| Archiviert | — | Revision-Status `archived` |
| Gelöscht | `deleted`, `is_deleted=true` | — |

**Publish-Mechanik** (`publishWorkingCopy`):
1. Aktuelle `published`-Revision wird auf `archived` gesetzt.
2. Neue `content_revisions`-Zeile wird aus der Working Copy erzeugt (`revision_no`+1).
3. `content_nodes.published_revision_id` zeigt auf die neue Revision.
4. `content_nodes.status` wird auf `published` gesetzt.

**Published-Content-Erkennung:** Ausschließlich über `content_nodes.published_revision_id` (Join auf `content_revisions`). Das ist der maßgebliche Signalpunkt für "was ist live sichtbar" — **das ist der zentrale Ankerpunkt für einen künftigen Copilot-/Graph-Connector**, der nur veröffentlichte, freigegebene Inhalte crawlen/indexieren darf.

**Relevante Workflow-Routen:**
`POST /nodes/:nodeId/working-copies`, `PATCH /working-copies/:id`, `POST /working-copies/:id/submit`, `/approve`, `/return-for-changes`, `/publish`, `GET /nodes/:id/revisions`, `GET /working-copies/:id/diff`.

---

## 7. Graph-/SharePoint-Konfiguration

Quelle: `artifacts/api-server/src/lib/config.ts`, `services/graph-client.service.ts`, `services/sharepoint.service.ts`, `services/sharepoint-storage.service.ts`, `services/sync-scheduler.service.ts`, `routes/connectors.ts`

- **Konfiguration:** `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `ENTRA_TENANT_ID` (Secrets vorhanden, siehe verfügbare Secrets: `ENTRA_CLIENT_SECRET`); SharePoint-Verbindungsdetails (`siteId`, `driveId`, `folderId`) liegen pro Connector in `source_systems`.
- **Graph-Client:** `getGraphClient(accessToken)` initialisiert das `@microsoft/microsoft-graph-client` SDK mit einem übergebenen Token (interaktiver Nutzerkontext).
- **Systemseitiger Zugriff:** `acquireSystemToken(connectionConfig)` — Client-Credentials-Flow für Hintergrundoperationen (kein eingeloggter Nutzer nötig).
- **SharePoint-Operationen** (`sharepoint.service.ts`): `listSites`, `listDrives`, `listDriveItems`, `getDriveItemContent`, `getDriveItemMeta`.
- **Storage-Provider** (`sharepoint-storage.service.ts`): `SharePointStorageProvider` implementiert `IStorageProvider` (upload/download/delete/exists/getSignedUrl) — wird für Medien-Assets genutzt, **nicht** für Content-Nodes selbst.
- **Sync:** `sync-scheduler.service.ts` pollt periodisch (`pollIntervalMs: 60000`) auf Änderungen in verknüpften SharePoint-Quellen und markiert Items als `stale`, wenn `externalModifiedAt` neuer ist als der gespeicherte Stand.
- **Admin-Routen:** `GET /api/sharepoint/sites`, `GET /api/sharepoint/drives/:siteId`, `GET /api/sharepoint/drives/:driveId/items` (unter `connectors.ts`).
- **Teams-Integration:** `routes/teams.ts` + `exchangeTeamsSsoToken` — SSO-Kontext aus Microsoft Teams, potentiell relevant für einen Teams-/Copilot-Chat-Einstiegspunkt.

**Fazit:** Die bestehende Graph-Anbindung ist **konsumierend** (FlowCore liest/importiert von SharePoint) und für **Medien-Storage**, nicht für einen **Copilot-Grounding-Anwendungsfall** (FlowCore-Inhalte als durchsuchbare/zitierbare Quelle für Microsoft 365 Copilot bereitstellen) ausgelegt. Es existiert keine "Graph Connector"-Registrierung, kein Custom-Connector-Schema-Push und keine ACL-Synchronisation Richtung Graph.

---

## 8. Lückenliste (Gaps ggü. einer Copilot-/Graph-Readiness)

1. **Kein Microsoft Graph Connector (Custom Connector API) implementiert** — FlowCore-Inhalte sind nicht als durchsuchbare externe Datenquelle bei Microsoft Graph registriert (kein Schema-Push, kein Item-Ingestion-Job, keine ACL-Synchronisation für Search/Copilot).
2. **Keine Copilot-taugliche Content-Extraktion:** Es gibt keinen Endpunkt, der veröffentlichten Content in einem für Grounding geeigneten Format (z. B. reiner Text/Markdown + Metadaten + ACL) exportiert; vorhandene Inhalte liegen als ProseMirror-JSON/HTML in `content_revisions`.
3. **Keine ACL-Abbildung Richtung Graph:** Die granulare FlowCore-RBAC/Confidentiality-Logik (Rollen, Node-Ownership, Vertraulichkeitsstufen) hat kein Äquivalent in Graph-ACL-Form (Azure AD Group/User Security Trimming für Connector-Ergebnisse).
4. **Published-Only-Filterung ist FlowCore-intern, nicht Graph-seitig verifizierbar** — ein Copilot-Connector müsste eigenständig sicherstellen, dass nur `published_revision_id`-Inhalte indexiert werden; aktuell existiert dafür kein dedizierter, für Batch-Export optimierter Read-Pfad (nur Einzel-Node- bzw. Suchroute).
5. **`AUTH_DEV_MODE` Header-Bypass** (`X-Dev-Principal-Id`) ist ein Sicherheitsrisiko, falls versehentlich in einer produktionsnahen/veröffentlichten Umgebung aktiv — muss vor jeder Copilot-/Graph-Anbindung hart validiert und ausgeschlossen werden.
6. **Kein inkrementeller Änderungs-Feed** für Copilot-Indexierung (Delta-Sync) — vorhanden ist nur der SharePoint-seitige `sync-scheduler.service.ts` (Richtung FlowCore, nicht davon weg).
7. **Keine dedizierte API-Route für Bulk-/Batch-Export** veröffentlichter Seiten (nur Einzelabruf via `GET /nodes/:id` bzw. Suchergebnis-Pagination über `/api/search`).
8. **Tags/Relationen/Owner sind vorhanden, aber nicht als strukturierte Metadaten für ein Connector-Schema aufbereitet** (kein definiertes "Property Schema" für Graph Connector Content).
9. **Admin-UI (`AISettingsPage.tsx`, `SettingsPage.tsx`) hat keine Sektion für Copilot-/Graph-Connector-Konfiguration** — Konfigurationsoberfläche für eine künftige Anbindung fehlt vollständig.
10. **Keine Tests/Monitoring für Graph-Sync-Fehlerfälle** speziell im Hinblick auf einen Copilot-Anwendungsfall (bestehender Sync-Scheduler ist auf SharePoint-Import ausgelegt, nicht auf Export-Fehlerbehandlung).

---

## 9. Technische Risiken

| Risiko | Beschreibung | Schweregrad |
|---|---|---|
| Sicherheits-Bypass in Dev-Modus | `AUTH_DEV_MODE` erlaubt Impersonation per Header; muss zwingend über Secret/Env-Gate abgesichert bleiben, besonders wenn ein Graph-Connector mit weiterreichenden Rechten arbeitet | Hoch |
| ACL-Drift zwischen FlowCore-RBAC und Graph | Ohne synchronisierte ACLs könnte ein Copilot-Connector Inhalte anzeigen, für die ein Nutzer in FlowCore keine Leserechte hat (Vertraulichkeitsstufen, Node-Ownership-Overrides, Delegationen) | Hoch |
| Doppelte Rechteauflösung | RBAC-Auflösung ist bereits komplex (5-stufige Kaskade inkl. rekursiver CTE); eine zusätzliche Graph-ACL-Ebene erhöht Inkonsistenzrisiko bei Rechteänderungen (z. B. Rollenentzug, Deputy-Ablauf) | Mittel |
| Fehlende Batch-Exportroute | Ohne dedizierten Bulk-Read-Pfad müsste ein Connector viele Einzelaufrufe (`/api/search` Pagination) durchführen → Performance-/Rate-Limit-Risiko bei großem Content-Bestand | Mittel |
| Inhaltsformat (ProseMirror-JSON) | Rohinhalt ist nicht direkt "Copilot-lesbar"; erfordert eine verlustarme Transformation nach Text/Markdown, die aktuell nicht existiert | Mittel |
| Sync-Konsistenz bei parallelen Working Copies | Nur eine aktive Working Copy pro Node ist erlaubt, aber Publish-Events sind nicht mit einem externen Push-Mechanismus verknüpft — ein Copilot-Sync müsste auf Polling oder neue Webhook-Logik zurückgreifen (aktuell nicht vorhanden) | Mittel |
| Secret-Handling | `ENTRA_CLIENT_SECRET` ist vorhanden, aber ein Graph-Connector-spezifischer Service Principal/App-Registrierung mit erweiterten Graph-Scopes (z. B. `ExternalConnection.ReadWrite.OwnedBy`) existiert nicht — neue Berechtigungsanforderung an Entra-Admin nötig | Niedrig/Prozessrisiko |

---

## 10. Empfohlene Implementierungsreihenfolge (für Folgecluster)

1. **Cluster 2 — Content-Export-Pfad:** Dedizierte, performante Batch-Read-API für ausschließlich veröffentlichte Inhalte (`published_revision_id`-basiert), inkl. Text-/Markdown-Transformation aus ProseMirror-JSON und Metadaten (Tags, Owner, Relationen, `displayCode`, Confidentiality-Level).
2. **Cluster 3 — ACL-Mapping-Konzept:** Definition, wie FlowCore-RBAC/Confidentiality-Level auf Graph-Connector-ACLs (Azure AD Security Groups/User-IDs) abgebildet werden; Entscheidung, ob Security Trimming rein clientseitig (Query-Time) oder per Connector-ACL erfolgt.
3. **Cluster 4 — Graph Connector Registrierung & Schema:** App-Registrierung mit passenden Graph-Scopes, Definition des Connector-Schemas (Properties: Titel, Body, URL, LastModified, ACL, Tags, TemplateType), Ingestion-Job (initial + inkrementell).
4. **Cluster 5 — Delta-/Change-Feed:** Mechanismus, um Publish-/Archivierungs-Events (bereits vorhanden als `working_copy_events`/`content_revision_events`) in einen Connector-Push/-Delta-Sync zu übersetzen.
5. **Cluster 6 — Admin-UI & Monitoring:** Konfigurationsoberfläche (Connector-Status, letzter Sync, Fehlerprotokoll) analog zu bestehenden Admin-Seiten (`SettingsPage.tsx`, `AISettingsPage.tsx`); Monitoring/Alerting für Sync-Fehler.
6. **Cluster 7 — Security-Hardening:** Verifikation/Absicherung von `AUTH_DEV_MODE` in allen Zielumgebungen, Audit der Graph-App-Berechtigungen, Penetrationstest des neuen Export-Pfads.

Diese Reihenfolge stellt sicher, dass zuerst die *Datenbasis* (Export/Format) und *Zugriffskontrolle* (ACL-Mapping) technisch geklärt sind, bevor die eigentliche Graph-Connector-Registrierung (irreversibler externer Schritt) erfolgt.

---

## 11. Datenkettenübersicht (End-to-End, vereinfacht)

```
Entra ID (OIDC) ──▶ auth.service.ts ──▶ Session (user_sessions)
                                   └──▶ principal.service.ts ──▶ principals ──▶ role_assignments / page_permissions / node_ownership
                                                                                        │
Content-Erstellung ──▶ content_nodes ──▶ content_working_copies ──(submit/approve/publish)──▶ content_revisions
                                                    │                                              │
                                          working_copy_events                              content_nodes.published_revision_id
                                                                                                     │
                                                                                    ┌────────────────┴────────────────┐
                                                                             /api/search (RBAC-gefiltert)      /api/content/nodes/:id
                                                                                                                       │
                                                                                                     [GAP] Kein Graph-Connector-Export
SharePoint ──(sync-scheduler.service.ts, Import)──▶ source_systems / Media-Storage (SharePointStorageProvider)
```

---

## 12. Offene technische Blocker

- Fehlende Entscheidung/Freigabe für eine neue Entra-App-Registrierung mit Graph-Connector-Scopes (organisatorischer Blocker, nicht codeseitig lösbar in diesem Cluster).
- Keine verbindliche Vorgabe, ob Security Trimming über Connector-ACLs oder Query-Time-Filterung erfolgen soll (Produktentscheidung nötig vor Cluster 3/4).
- Kein definierter Ziel-Schema-Vertrag (welche Felder/Metadaten Copilot exakt erhalten soll) — muss vor Cluster 2 final spezifiziert werden.

---

## 13. Evidenz (Datei-/Codepfadliste)

**Auth:**
`artifacts/api-server/src/services/auth.service.ts`, `services/principal.service.ts`, `routes/auth.ts`, `middlewares/require-auth.ts`, `lib/config.ts`, `app.ts`

**RBAC:**
`artifacts/api-server/src/services/rbac.service.ts`, `middlewares/require-permission.ts`, `lib/db/src/schema/principals.ts`, `routes/principals.ts`

**Content-Lifecycle:**
`artifacts/api-server/src/services/working-copy.service.ts`, `routes/working-copies.ts`, `routes/content.ts`, `routes/review.ts`, `routes/deletion-requests.ts`, `lib/db/src/schema/content-nodes.ts`, `content-revisions.ts`, `content-working-copies.ts`, `enums.ts`

**Suche:**
`artifacts/api-server/src/routes/search.ts`, `lib/db/src/schema/content-nodes.ts` (search_vector)

**Graph/SharePoint:**
`artifacts/api-server/src/services/graph-client.service.ts`, `services/sharepoint.service.ts`, `services/sharepoint-storage.service.ts`, `services/sync-scheduler.service.ts`, `routes/connectors.ts`, `routes/teams.ts`

**Datenmodell (Tags/Relationen/Owner/Vertraulichkeit/Admin):**
`lib/db/src/schema/content-tags.ts`, `content-relations.ts`, `content-nodes.ts`, `principals.ts` (node_ownership), `confidentiality.ts`, `workflow-templates.ts`, `ai-settings.ts`

**Admin-UI (Client):**
`artifacts/wiki-frontend/src/pages/SettingsPage.tsx`, `AISettingsPage.tsx`

**Routen-Registrierung:**
`artifacts/api-server/src/routes/index.ts`, `artifacts/api-server/src/app.ts`

---

## 14. Definition of Done — Bewertung

✅ **BESTANDEN.** Der reale Ist-Zustand ist entlang aller im Scope geforderten Bereiche (Graph/SharePoint, Auth/Entra, RBAC, Seitenstatus/Freigabe, Versionen, API-Routen, Suche, Datenmodell für Tags/Relationen/Owner/Vertraulichkeit, Admin-Einstellungen) mit konkreten Datei-/Tabellen-/Routenreferenzen dokumentiert. Die Lückenliste und die empfohlene Cluster-Reihenfolge (Abschnitte 8 und 10) liefern eine belastbare technische Grundlage für die Folgecluster. Keine Implementierung, keine Quickfixes und keine DB-Patches wurden im Rahmen dieses Audits vorgenommen.
