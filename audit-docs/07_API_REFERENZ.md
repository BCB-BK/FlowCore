# 07 — API-Referenz

## 7.1 Übersicht

Die API basiert auf **Express 5** und folgt dem **OpenAPI 3.1 Standard**. Alle Endpunkte verwenden JSON als Austauschformat. Die API-Spezifikation ist definiert in `lib/api-spec/openapi.yaml`.

**Basis-URL:** `/api`

## 7.2 Authentifizierungs-Schutz

| Guard | Beschreibung |
|:------|:-------------|
| `requireAuth` | Prüft Session oder Dev-Mode-Header |
| `requirePermission(p)` | Prüft spezifische RBAC-Berechtigung |
| `authRateLimit` | Rate-Limiting für Auth-Endpunkte |

## 7.3 Health & System

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/healthz` | Datenbankverbindung und Systemstatus prüfen | Keiner |
| GET | `/admin/system-info` | System-, DB-, Auth- und Integrationskonfiguration | `requireAuth` |

## 7.4 Authentifizierung

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/auth/config` | Öffentliche Auth-Konfiguration | Keiner |
| GET | `/auth/login` | OAuth2-Login initiieren | `authRateLimit` |
| GET | `/auth/callback` | OAuth2-Callback-Handler | `authRateLimit` |
| GET | `/auth/me` | Aktuelles Benutzerprofil mit Rollen und Berechtigungen | `requireAuth` |
| POST | `/auth/logout` | Session zerstören, Audit-Event loggen | `requireAuth` |

## 7.5 Principals & RBAC

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/principals` | Principals suchen/auflisten | `manage_permissions` |
| POST | `/principals` | Principal erstellen/upserten | `manage_permissions` |
| GET | `/principals/:id` | Principal-Details mit Rollen | `manage_permissions` (fremde) |
| GET | `/principals/:id/permissions` | Effektive Berechtigungen | `manage_permissions` (fremde) |
| POST | `/principals/:id/roles` | Rolle zuweisen | `manage_permissions` |
| DELETE | `/principals/:id/roles/:assignmentId` | Rolle entziehen | `manage_permissions` |
| GET | `/rbac/matrix` | Rollen-Berechtigungs-Matrix | `requireAuth` |

## 7.6 Microsoft Graph

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/graph/photo/:userId` | Profilbild-Proxy (gecached) | `requireAuth` |
| GET | `/graph/people` | Personen in der Organisation suchen | `manage_permissions` |
| GET | `/graph/groups` | Gruppen in der Organisation suchen | `manage_permissions` |

## 7.7 Content-Management

### Knoten (Nodes)

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/content/page-types` | Alle Seitentyp-Definitionen | `requireAuth` |
| GET | `/content/page-types/:type` | Spezifische Seitentyp-Definition | `requireAuth` |
| GET | `/content/nodes` | Alle nicht-gelöschten Knoten | `read_page` |
| GET | `/content/nodes/roots` | Wurzelknoten | `read_page` |
| POST | `/content/nodes` | Neuen Knoten erstellen | `create_page` |
| GET | `/content/nodes/:id` | Knoten-Metadaten | `read_page` |
| PATCH | `/content/nodes/:id` | Knoten aktualisieren | `edit_content` |
| DELETE | `/content/nodes/:id` | Knoten archivieren (Soft-Delete) | `archive_page` |
| POST | `/content/nodes/:id/move` | Knoten verschieben | `edit_structure` |
| GET | `/content/nodes/:id/children` | Unterknoten | `read_page` |
| GET | `/content/nodes/:id/ancestors` | Breadcrumb-Pfad | `read_page` |
| GET | `/content/nodes/:id/tree` | Vollständiger Unterbaum | `read_page` |
| GET | `/content/nodes/:id/aliases` | Display-Code-Historie | `read_page` |

### Revisionen

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/content/nodes/:id/revisions` | Versionshistorie | `read_page` |
| POST | `/content/nodes/:id/revisions` | Neue Entwurfsrevision | `edit_content` |
| POST | `/content/revisions/:id/publish` | Revision veröffentlichen | `approve_page` |
| POST | `/content/revisions/:id/restore` | Alte Revision wiederherstellen | `edit_content` |

### Templates

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/content/templates` | Aktive Content-Templates | `read_page` |
| GET | `/content/broken-links` | Verwaiste Knoten und tote Verknüpfungen | `read_page` |

## 7.8 Knotenberechtigungen & Eigentümerschaft

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/content/nodes/:id/permissions` | Explizite Seitenberechtigungen | `manage_permissions` |
| POST | `/content/nodes/:id/permissions` | Berechtigung gewähren | `manage_permissions` |
| DELETE | `/content/nodes/:id/permissions/:pId` | Berechtigung entziehen | `manage_permissions` |
| GET | `/content/nodes/:id/ownership` | Eigentümer, Stellvertreter, Prüfer, Genehmiger | `read_page` |
| PUT | `/content/nodes/:id/ownership` | Eigentümerschaft aktualisieren | `manage_permissions` |

## 7.9 Relationen & Backlinks

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| POST | `/content/relations` | Relation erstellen | `manage_relations` |
| DELETE | `/content/relations/:id` | Relation löschen | `manage_relations` |
| GET | `/content/nodes/:id/relations` | Ausgehende Relationen | `read_page` |
| GET | `/content/nodes/:id/backlinks` | Eingehende Verknüpfungen | `read_page` |
| GET | `/content/nodes/:id/forward-links` | Ausgehende Verknüpfungen | `read_page` |

## 7.10 Review-Workflow

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| POST | `/content/revisions/:id/submit-for-review` | Zur Prüfung einreichen | `submit_for_review` |
| POST | `/content/revisions/:id/approve` | Genehmigen | `approve_page` |
| POST | `/content/revisions/:id/reject` | Ablehnen/Zurückweisen | `review_page` |
| GET | `/content/revisions/:id/workflow` | Workflow-Status und Genehmigungshistorie | `read_page` |
| GET | `/content/revisions/:id/events` | Ereignis-Timeline | `read_page` |
| GET | `/content/revisions/:id/diff/:otherId` | Revisionsvergleich | `read_page` |

## 7.11 Suche

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/search/` | Volltextsuche mit Facetten und Filtern | `read_page` |
| GET | `/search/suggestions` | Schnelle Autovervollständigung | `read_page` |
| GET | `/search/analytics` | Suchpopularität und Null-Ergebnis-Berichte | `view_audit_log` |
| POST | `/search/click` | Klick-Tracking für Analytik | `read_page` |

## 7.12 Tags

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/tags/` | Tags auflisten/suchen | `read_page` |
| POST | `/tags/` | Tag erstellen | `edit_content` |
| PATCH | `/tags/:id` | Tag aktualisieren | `edit_content` |
| DELETE | `/tags/:id` | Tag löschen | `edit_content` |
| GET | `/tags/nodes/:nodeId` | Tags eines Knotens | `read_page` |
| POST | `/tags/nodes/:nodeId` | Tag zuweisen | `edit_content` |
| DELETE | `/tags/nodes/:nodeId/:tagId` | Tag entfernen | `edit_content` |

## 7.13 Glossar

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/glossary/` | Begriffe filtern (Query, Buchstabe) | `read_page` |
| POST | `/glossary/` | Begriff erstellen | `edit_content` |
| GET | `/glossary/:id` | Begriff-Details | `read_page` |
| PATCH | `/glossary/:id` | Begriff aktualisieren | `edit_content` |
| DELETE | `/glossary/:id` | Begriff löschen | `edit_content` |
| POST | `/glossary/:id/link` | Mit Wiki-Knoten verknüpfen | `edit_content` |
| POST | `/glossary/:id/unlink` | Verknüpfung lösen | `edit_content` |
| GET | `/glossary/by-node/:nodeId` | Begriffe eines Knotens | `read_page` |

## 7.14 Medien & Speicher

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| POST | `/media/upload` | Datei hochladen | `edit_content` |
| GET | `/media/assets` | Assets auflisten/suchen | `requireAuth` |
| GET | `/media/assets/:id` | Asset-Metadaten | `requireAuth` |
| DELETE | `/media/assets/:id` | Asset als gelöscht markieren | `edit_content` |
| GET | `/media/files/:key` | Datei herunterladen/streamen | `requireAuth` |
| POST | `/media/assets/:id/usages` | Nutzung eines Assets tracken | `requireAuth` |
| POST | `/media/validate-embed` | Domain für Einbettung validieren | `requireAuth` |

## 7.15 Konnektoren

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/connectors/source-systems` | Konfigurierte externe Systeme | `manage_settings` |
| POST | `/connectors/source-systems` | Quellsystem erstellen | `manage_settings` |
| PATCH | `/connectors/source-systems/:id` | Quellsystem aktualisieren | `manage_settings` |
| POST | `/connectors/source-systems/:id/sync` | Manuelle Synchronisation | `manage_settings` |
| GET | `/connectors/sync/status` | Sync-Gesundheitsübersicht | `manage_settings` |
| GET | `/connectors/sharepoint/sites` | SharePoint-Sites durchsuchen | `manage_settings` |
| GET | `/connectors/sharepoint/drives/:siteId` | SharePoint-Bibliotheken | `manage_settings` |
| GET | `/connectors/sharepoint/drives/:driveId/items` | Ordner/Dateien durchsuchen | `manage_settings` |
| GET | `/content/nodes/:id/source-references` | Quellreferenzen eines Knotens | `read_page` |
| POST | `/content/nodes/:id/source-references` | Quellreferenz erstellen | `edit_content` |
| DELETE | `/content/source-references/:refId` | Quellreferenz löschen | `edit_content` |

## 7.16 KI-Dienste

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/ai/settings` | KI-Konfiguration abrufen | `manage_settings` |
| PUT | `/ai/settings` | KI-Konfiguration aktualisieren | `manage_settings` |
| POST | `/ai/ask` | Frage beantworten (RAG + Streaming) | `requireAuth` |
| POST | `/ai/page-assist` | Seitenassistenz (Streaming) | `requireAuth` |
| GET | `/ai/usage-stats` | KI-Nutzungsstatistiken | `manage_settings` |

## 7.17 Qualität & Dashboard

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| GET | `/quality/overview` | Aggregierte Qualitäts-KPIs | `read_page` |
| GET | `/quality/pages` | Seiten mit Qualitätsbewertung | `read_page` |
| GET | `/quality/duplicates` | Potenzielle Duplikate | `read_page` |
| GET | `/quality/maintenance-hints` | Automatisierte Wartungsvorschläge | `read_page` |
| GET | `/quality/my-work` | Aufgaben des aktuellen Benutzers | `read_page` |

## 7.18 Microsoft Teams

| Methode | Pfad | Zweck | Schutz |
|:--------|:-----|:------|:-------|
| POST | `/teams/sso` | Teams SSO-Token austauschen | `authRateLimit` |
| GET | `/teams/context` | Teams-App-Konfiguration | Keiner |
