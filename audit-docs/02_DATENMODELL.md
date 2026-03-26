# 02 — Datenmodell & Datenbankschema

## 2.1 Übersicht

Die Datenbank verwendet **PostgreSQL 16+** mit **Drizzle ORM** als Schema-Manager. Die Schema-Definitionen befinden sich in `lib/db/src/schema/`. Die Datenbank umfasst folgende funktionale Bereiche:

1. Content-Management (Knoten, Revisionen, Templates)
2. Beziehungen & Metadaten (Relationen, Tags, Aliase)
3. Principals & RBAC (Benutzer, Gruppen, Rollen, Berechtigungen)
4. Workflows & Kollaboration (Review, Genehmigungen)
5. Integration & Speicher (Quellsysteme, Medien)
6. Organisation (Einheiten, Marken, Standorte)
7. Audit & Analytik (Events, Suche, KI-Nutzung)

## 2.2 Enums

| Enum | Werte |
|:-----|:------|
| `template_type` | `core_process_overview`, `area_overview`, `process_page_text`, `process_page_graphic`, `procedure_instruction`, `policy`, `role_profile`, `system_documentation`, `glossary`, `use_case`, `dashboard` |
| `node_status` | `draft`, `in_review`, `approved`, `published`, `archived`, `deleted` |
| `change_type` | `editorial`, `minor`, `major`, `regulatory`, `structural` |
| `principal_type` | `user`, `group`, `service_principal` |
| `wiki_role` | `system_admin`, `process_manager`, `compliance_manager`, `editor`, `reviewer`, `approver`, `viewer` |
| `wiki_permission` | `read_page`, `create_page`, `edit_content`, `edit_structure`, `manage_relations`, `submit_for_review`, `review_page`, `approve_page`, `archive_page`, `manage_permissions`, `manage_templates`, `manage_settings`, `view_audit_log`, `view_home`, `view_search`, `view_glossary`, `view_dashboard`, `view_tasks`, `view_settings` |
| `relation_type` | `related_to`, `depends_on`, `replaces`, `implements`, `references` |

## 2.3 Tabellen im Detail

### 2.3.1 content_nodes (Inhaltsknoten)

Hauptentität für Wiki-Seiten und Prozessdokumente.

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK, Default: random() | Primärschlüssel |
| `immutable_id` | `text` | UNIQUE, NOT NULL | Stabile ID über Verschiebungen hinweg |
| `display_code` | `text` | NOT NULL | Menschenlesbarer Bezeichner (z.B. "PROC-001") |
| `title` | `text` | NOT NULL | Seitentitel |
| `template_type` | `template_type` | NOT NULL | Typ der Seitenvorlage |
| `template_id` | `uuid` | FK → content_templates | Optionale Template-Referenz |
| `parent_node_id` | `uuid` | FK → content_nodes (self) | Elternknoten für Baumstruktur |
| `sort_order` | `integer` | Default: 0 | Sortierreihenfolge unter Geschwistern |
| `status` | `node_status` | NOT NULL | Aktueller Status |
| `current_revision_id` | `uuid` | — | Aktuelle Arbeitsrevision |
| `published_revision_id` | `uuid` | — | Veröffentlichte Revision |
| `owner_id` | `text` | — | Verantwortlicher Benutzer |
| `search_vector` | `tsvector` | GIN-Index | Volltextsuchvektor |
| `is_deleted` | `boolean` | Default: false | Soft-Delete-Flag |
| `deleted_at` | `timestamptz` | — | Zeitpunkt der Löschung |
| `created_at` | `timestamptz` | Default: now() | Erstellungszeitpunkt |
| `updated_at` | `timestamptz` | Default: now() | Letzte Aktualisierung |

**Unique Index:** `display_code` WHERE `is_deleted = false`

### 2.3.2 content_revisions (Revisionen)

Speichert den vollständigen Inhalt und die Historie jedes Knotens.

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `node_id` | `uuid` | FK → content_nodes, NOT NULL | Zugehöriger Knoten |
| `revision_no` | `integer` | NOT NULL | Fortlaufende Revisionsnummer |
| `version_label` | `text` | — | Versionslabel (z.B. "1.0", "2.1") |
| `status` | `node_status` | NOT NULL | Revisionsstatus |
| `change_type` | `change_type` | — | Art der Änderung |
| `change_summary` | `text` | — | Beschreibung der Änderung |
| `changed_fields` | `jsonb` | — | Liste geänderter Felder |
| `title` | `text` | NOT NULL | Titel zum Revisionszeitpunkt |
| `content` | `jsonb` | — | Metadatenfelder (Owner, Gültigkeit etc.) |
| `structured_fields` | `jsonb` | — | Template-spezifische Daten + Editor-Inhalt |
| `author_id` | `text` | — | Autor der Revision |
| `reviewer_id` | `text` | — | Zugewiesener Prüfer |
| `approver_id` | `text` | — | Zugewiesener Genehmiger |
| `valid_from` | `timestamptz` | — | Gültig ab |
| `next_review_date` | `timestamptz` | — | Nächstes Prüfdatum |
| `based_on_revision_id` | `uuid` | — | Quellrevision bei Wiederherstellung |
| `created_at` | `timestamptz` | Default: now() | Erstellungszeitpunkt |

### 2.3.3 content_templates (Vorlagen)

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `template_type` | `template_type` | UNIQUE | Template-Typ |
| `name` | `text` | NOT NULL | Anzeigename |
| `description` | `text` | — | Beschreibung |
| `field_schema` | `jsonb` | — | Sektions- und Felddefinitionen |
| `icon` | `text` | — | Icon-Name |
| `is_active` | `boolean` | Default: true | Aktiv-Flag |
| `created_at` | `timestamptz` | Default: now() | — |

### 2.3.4 content_relations (Beziehungen)

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `source_node_id` | `uuid` | FK → content_nodes | Quellknoten |
| `target_node_id` | `uuid` | FK → content_nodes | Zielknoten |
| `relation_type` | `relation_type` | NOT NULL | Art der Beziehung |
| `description` | `text` | — | Beschreibung |
| `created_at` | `timestamptz` | Default: now() | — |

### 2.3.5 content_tags & content_node_tags (Tags)

**content_tags:**

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `name` | `text` | UNIQUE, NOT NULL | Tag-Name |
| `slug` | `text` | UNIQUE, NOT NULL | URL-freundlicher Bezeichner |
| `color` | `text` | — | Farbcode |

**content_node_tags:**

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `node_id` | `uuid` | FK → content_nodes | Knoten |
| `tag_id` | `uuid` | FK → content_tags | Tag |

### 2.3.6 content_aliases (Aliase/Weiterleitungen)

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `node_id` | `uuid` | FK → content_nodes | Zugehöriger Knoten |
| `previous_display_code` | `text` | NOT NULL | Früherer Display-Code |
| `reason` | `text` | — | Grund der Umbenennung |
| `created_at` | `timestamptz` | Default: now() | — |

### 2.3.7 principals (Benutzer & Gruppen)

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `text` | PK | Interne ID |
| `principal_type` | `principal_type` | NOT NULL | Typ: user, group, service_principal |
| `external_id` | `text` | UNIQUE | Entra ID Object-ID |
| `display_name` | `text` | NOT NULL | Anzeigename |
| `email` | `text` | — | E-Mail-Adresse |
| `upn` | `text` | — | User Principal Name |
| `status` | `text` | Default: "active" | Kontostatus |
| `created_at` | `timestamptz` | Default: now() | — |
| `updated_at` | `timestamptz` | Default: now() | — |

### 2.3.8 role_assignments (Rollenzuweisungen)

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `principal_id` | `text` | FK → principals | Benutzer/Gruppe |
| `role` | `wiki_role` | NOT NULL | Zugewiesene Rolle |
| `scope` | `text` | Default: "global" | Geltungsbereich (global, node:ID, code:XY) |
| `created_at` | `timestamptz` | Default: now() | — |

### 2.3.9 page_permissions (Seitenberechtigungen)

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `node_id` | `uuid` | FK → content_nodes | Betroffene Seite |
| `principal_id` | `text` | FK → principals | Berechtigter |
| `permission` | `wiki_permission` | NOT NULL | Gewährte Berechtigung |
| `is_inherited` | `boolean` | Default: false | Vererbt von Elternknoten |
| `created_at` | `timestamptz` | Default: now() | — |

### 2.3.10 review_workflows & approvals

**review_workflows:**

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `revision_id` | `uuid` | FK → content_revisions | Zugehörige Revision |
| `status` | `text` | NOT NULL | pending, approved, rejected |
| `required_approvals` | `integer` | — | Erforderliche Genehmigungen |
| `current_step` | `integer` | — | Aktueller Workflow-Schritt |
| `created_at` | `timestamptz` | Default: now() | — |

**approvals:**

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `workflow_id` | `uuid` | FK → review_workflows | Zugehöriger Workflow |
| `revision_id` | `uuid` | FK → content_revisions | Revision |
| `reviewer_id` | `text` | — | Prüfer |
| `decision` | `text` | — | Entscheidung |
| `comment` | `text` | — | Kommentar |
| `created_at` | `timestamptz` | Default: now() | — |

### 2.3.11 glossary_terms (Glossarbegriffe)

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `term` | `text` | NOT NULL | Begriff |
| `slug` | `text` | UNIQUE, NOT NULL | URL-Slug |
| `definition` | `text` | — | Definition (HTML) |
| `synonyms` | `text[]` | — | Synonyme |
| `node_id` | `uuid` | FK → content_nodes | Verknüpfte Wiki-Seite |
| `created_by` | `text` | — | Ersteller |
| `created_at` | `timestamptz` | Default: now() | — |
| `updated_at` | `timestamptz` | Default: now() | — |

### 2.3.12 source_systems & source_references

**source_systems:**

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `name` | `text` | NOT NULL | Systemname |
| `slug` | `text` | UNIQUE, NOT NULL | Kurzbezeichner |
| `system_type` | `text` | NOT NULL | z.B. "sharepoint" |
| `connection_config` | `jsonb` | — | Verbindungskonfiguration |
| `sync_enabled` | `boolean` | Default: false | Sync aktiviert |
| `sync_interval_minutes` | `integer` | Default: 60 | Sync-Intervall |
| `is_active` | `boolean` | Default: true | Aktiv-Status |
| `created_at` | `timestamptz` | Default: now() | — |

**source_references:**

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `node_id` | `uuid` | FK → content_nodes | Wiki-Knoten |
| `source_system_id` | `uuid` | FK → source_systems | Quellsystem |
| `external_id` | `text` | — | Externe Dokument-ID |
| `external_url` | `text` | — | URL zum externen Dokument |
| `sync_status` | `text` | — | Synchronisationsstatus |
| `created_at` | `timestamptz` | Default: now() | — |

### 2.3.13 media_assets (Medien-Assets)

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `node_id` | `uuid` | FK → content_nodes | Zugehöriger Knoten |
| `filename` | `text` | NOT NULL | Dateiname |
| `mime_type` | `text` | NOT NULL | MIME-Typ |
| `size` | `integer` | — | Dateigröße in Bytes |
| `storage_key` | `text` | NOT NULL | Speicherschlüssel |
| `storage_provider_id` | `uuid` | FK → storage_providers | Speicheranbieter |
| `is_deleted` | `boolean` | Default: false | Lösch-Flag |
| `created_at` | `timestamptz` | Default: now() | — |

### 2.3.14 audit_events (Audit-Protokoll)

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `action` | `text` | NOT NULL | Aktionstyp |
| `actor_id` | `text` | — | Ausführender Benutzer |
| `resource_type` | `text` | — | Betroffener Ressourcentyp |
| `resource_id` | `text` | — | Betroffene Ressourcen-ID |
| `metadata` | `jsonb` | — | Zusätzliche Kontextdaten |
| `created_at` | `timestamptz` | Default: now() | — |

### 2.3.15 ai_settings & ai_usage_logs

**ai_settings:**

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `enabled` | `boolean` | Default: true | KI aktiviert |
| `model` | `text` | — | Modellname |
| `system_prompt` | `text` | — | System-Prompt |
| `max_completion_tokens` | `integer` | Default: 8192 | Max. Antwort-Tokens |
| `source_mode` | `text` | — | wiki_only, wiki_and_connectors, etc. |
| `web_search_enabled` | `boolean` | Default: false | Websuche aktiviert |
| `prompt_policies` | `jsonb` | — | Antwortrichtlinien |

**ai_usage_logs:**

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `user_id` | `text` | — | Anfragender Benutzer |
| `query` | `text` | — | Gestellte Frage |
| `model` | `text` | — | Verwendetes Modell |
| `tokens_used` | `integer` | — | Verbrauchte Tokens |
| `latency_ms` | `integer` | — | Antwortzeit in ms |
| `error` | `text` | — | Fehlermeldung |
| `created_at` | `timestamptz` | Default: now() | — |

### 2.3.16 search_analytics

**search_queries:**

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `query` | `text` | NOT NULL | Suchbegriff |
| `result_count` | `integer` | — | Anzahl Ergebnisse |
| `user_id` | `text` | — | Suchender Benutzer |
| `created_at` | `timestamptz` | Default: now() | — |

**search_clicks:**

| Spalte | Typ | Constraints | Beschreibung |
|:-------|:----|:------------|:-------------|
| `id` | `uuid` | PK | Primärschlüssel |
| `query_id` | `uuid` | FK → search_queries | Zugehörige Suche |
| `node_id` | `uuid` | FK → content_nodes | Angeklickter Knoten |
| `position` | `integer` | — | Position im Suchergebnis |
| `created_at` | `timestamptz` | Default: now() | — |

### 2.3.17 Organisation

**organization_units, brands, locations, business_functions** — Tabellen für Organisationsstruktur, Marken, Standorte und Geschäftsfunktionen, verknüpft über `content_node_context`.

## 2.4 Entity-Relationship-Übersicht

```
content_nodes ──1:N──> content_revisions
content_nodes ──1:N──> content_relations (source)
content_nodes ──1:N──> content_relations (target)
content_nodes ──N:M──> content_tags (via content_node_tags)
content_nodes ──1:N──> content_aliases
content_nodes ──1:N──> source_references
content_nodes ──1:N──> media_assets
content_nodes ──1:N──> page_permissions
content_nodes ──self── content_nodes (parent_node_id)

principals ──1:N──> role_assignments
principals ──1:N──> page_permissions

content_revisions ──1:N──> review_workflows
review_workflows ──1:N──> approvals

source_systems ──1:N──> source_references
glossary_terms ──N:1──> content_nodes (optional)
```
