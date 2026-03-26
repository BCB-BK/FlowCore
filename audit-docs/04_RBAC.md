# 04 — Rollen & Berechtigungen (RBAC)

## 4.1 Übersicht

FlowCore implementiert ein mehrstufiges rollenbasiertes Zugriffskontrollsystem (RBAC) mit:

- **7 vordefinierte Rollen** mit jeweils festgelegten Berechtigungen
- **25+ granulare Berechtigungen** in 4 Kategorien
- **3 Zuweisungsebenen:** Global, bereichsbezogen und seitenspezifisch
- **Vererbung:** Berechtigungen werden entlang der Knotenhierarchie vererbt
- **Separation of Duties (SoD):** Vier-Augen-Prinzip mit konfigurierbaren Regeln
- **Stellvertretung:** Explizite Delegationen mit transparenter Protokollierung

## 4.2 Rollen

| Rolle | Schlüssel | Beschreibung |
|:------|:----------|:-------------|
| **System-Administrator** | `system_admin` | Vollzugriff auf alle Funktionen, Einstellungen und Berechtigungen |
| **Prozessmanager** | `process_manager` | Verwaltet Inhaltsstruktur, Beziehungen, Berechtigungen und Templates; kann genehmigen |
| **Compliance-Manager** | `compliance_manager` | Überwachung von Vorlagen, Audit-Logs und Backups; Fokus auf Prüfprozesse |
| **Editor** | `editor` | Erstellt und bearbeitet Inhalte; reicht zur Prüfung ein |
| **Prüfer** | `reviewer` | Prüft eingereichte Inhalte; Einsicht in Audit-Logs |
| **Genehmiger** | `approver` | Kann prüfen und final genehmigen/veröffentlichen |
| **Betrachter** | `viewer` | Grundlegender Lesezugriff |

### 4.2.1 Knotenverantwortlichkeiten (Prozessowner)

Zusätzlich zu den systemweiten Rollen können pro Inhaltsknoten folgende Verantwortlichkeiten vergeben werden:

| Funktion | Feld | Beschreibung |
|:---------|:-----|:-------------|
| **Owner (Prozessowner)** | `owner_id` | Hauptverantwortlicher für den Knoten; inhaltlich und fachlich zuständig |
| **Stellvertreter** | `deputy_id` | Übernimmt bei Abwesenheit die Aufgaben des Owners |
| **Prüfer** | `reviewer_id` | Vorgeschlagener Prüfer für den Knoten |
| **Genehmiger** | `approver_id` | Vorgeschlagener Genehmiger für den Knoten |

Diese werden über die `node_ownership`-Tabelle gespeichert.

## 4.3 Berechtigungen

### Ansichten

| Berechtigung | Beschreibung |
|:-------------|:-------------|
| `view_home` | Startseite anzeigen |
| `view_search` | Suchseite anzeigen |
| `view_glossary` | Glossar anzeigen |
| `view_dashboard` | Dashboard anzeigen |
| `view_tasks` | Aufgabenübersicht anzeigen |
| `view_settings` | Einstellungen anzeigen |

### Inhalte

| Berechtigung | Beschreibung |
|:-------------|:-------------|
| `read_page` | Seiten lesen |
| `create_page` | Neue Seiten erstellen |
| `edit_content` | Inhalte bearbeiten |
| `edit_structure` | Seitenstruktur bearbeiten (Verschieben, Umordnen) |
| `manage_relations` | Beziehungen zwischen Seiten verwalten |

### Workflow

| Berechtigung | Beschreibung |
|:-------------|:-------------|
| `submit_for_review` | Entwurf zur Prüfung einreichen |
| `review_page` | Eingereichte Inhalte prüfen |
| `approve_page` | Geprüfte Inhalte genehmigen und veröffentlichen |
| `archive_page` | Seiten archivieren (Soft-Delete) |
| `create_working_copy` | Arbeitskopie erstellen |
| `edit_working_copy` | Arbeitskopie bearbeiten |
| `submit_working_copy` | Arbeitskopie zur Prüfung einreichen |
| `review_working_copy` | Arbeitskopie prüfen |
| `amend_working_copy_in_review` | Arbeitskopie während Prüfung bearbeiten |
| `publish_working_copy` | Arbeitskopie veröffentlichen |
| `cancel_working_copy` | Arbeitskopie abbrechen |
| `force_unlock_working_copy` | Arbeitskopie zwangsweise entsperren |

### Administration

| Berechtigung | Beschreibung |
|:-------------|:-------------|
| `manage_permissions` | Rollen und Berechtigungen verwalten |
| `manage_templates` | Seitenvorlagen verwalten |
| `manage_settings` | Systemeinstellungen verwalten |
| `view_audit_log` | Audit-Protokoll einsehen |
| `manage_connectors` | Konnektoren und Quellsysteme verwalten |
| `manage_backup` | Backup-Konfiguration verwalten |
| `run_backup` | Backup manuell starten |
| `restore_backup` | Backup wiederherstellen |
| `view_backups` | Backup-Übersicht und -Status einsehen |
| `manage_media` | Medien-Assets global verwalten (löschen, bearbeiten) |

## 4.4 Rollen-Berechtigungs-Matrix

| Berechtigung | Admin | Prozess-Mgr | Compliance | Editor | Prüfer | Genehmiger | Betrachter |
|:-------------|:-----:|:-----------:|:----------:|:------:|:------:|:----------:|:----------:|
| `view_home` | X | X | X | X | X | X | X |
| `view_search` | X | X | X | X | X | X | X |
| `view_glossary` | X | X | X | X | X | X | X |
| `view_dashboard` | X | X | X | X | X | X | — |
| `view_tasks` | X | X | X | X | X | X | — |
| `view_settings` | X | X | X | — | — | — | — |
| `read_page` | X | X | X | X | X | X | X |
| `create_page` | X | X | — | X | — | — | — |
| `edit_content` | X | X | — | X | — | — | — |
| `edit_structure` | X | X | — | — | — | — | — |
| `manage_relations` | X | X | — | X | — | — | — |
| `submit_for_review` | X | X | — | X | — | — | — |
| `review_page` | X | X | X | — | X | X | — |
| `approve_page` | X | X | — | — | — | X | — |
| `archive_page` | X | X | — | — | — | — | — |
| `manage_permissions` | X | X | — | — | — | — | — |
| `manage_templates` | X | X | X | — | — | — | — |
| `manage_settings` | X | — | — | — | — | — | — |
| `view_audit_log` | X | X | X | — | X | X | — |
| `manage_connectors` | X | — | — | — | — | — | — |
| `manage_backup` | X | — | — | — | — | — | — |
| `run_backup` | X | — | — | — | — | — | — |
| `restore_backup` | X | — | — | — | — | — | — |
| `view_backups` | X | — | X | — | — | — | — |
| `manage_media` | X | — | — | — | — | — | — |
| `create_working_copy` | X | — | — | X | — | — | — |
| `edit_working_copy` | X | — | — | X | — | — | — |
| `submit_working_copy` | X | — | — | X | — | — | — |
| `review_working_copy` | X | X | — | — | X | — | — |
| `amend_working_copy_in_review` | X | X | — | — | — | — | — |
| `publish_working_copy` | X | — | — | — | — | X | — |
| `cancel_working_copy` | X | — | — | X | — | — | — |
| `force_unlock_working_copy` | X | — | — | — | — | — | — |

## 4.5 Zuweisungsebenen

### Globale Rollen

```
scope = "global"
```

Eine globale Rolle gilt systemweit für alle Inhalte. Standard bei der Erstanlage.

### Bereichsbezogene Rollen (Scoped)

```
scope = "node:<uuid>" oder "code:<display_code>"
```

Rollen können auf einen bestimmten Knoten und dessen Unterbaum eingeschränkt werden. Beispiel: Ein Editor, der nur für den Bereich "HR" zuständig ist.

### Seitenspezifische Berechtigungen

Über die `page_permissions`-Tabelle können einzelne Berechtigungen direkt an bestimmte Seiten vergeben werden:

```
page_permissions: { node_id, principal_id, permission, is_inherited }
```

## 4.6 Berechtigungsauflösung

Die effektiven Berechtigungen eines Benutzers werden wie folgt berechnet:

```
1. Globale Rollen → Basis-Berechtigungsset
2. + Bereichsbezogene Rollen → Erweitert um Scope-spezifische Berechtigungen
3. + Seitenberechtigungen → Erweitert um direkte Grants auf dem Knoten
4. + Vererbung → Berechtigungen der Elternknoten werden berücksichtigt
5. + Stellvertretung → Berechtigungen der delegierenden Person werden übernommen
```

### Algorithmus:

1. Alle `role_assignments` des Principals laden
2. Globale Rollen ergeben das Basis-Berechtigungsset
3. Für Scoped-Rollen: Prüfen, ob der angefragte Knoten im Scope liegt (durch Traversierung der Knotenhierarchie)
4. Direkte `page_permissions` auf dem Knoten und seinen Eltern auflösen
5. Aktive Stellvertretungen (`deputy_delegations`) auflösen: Berechtigungen der delegierenden Person werden dem Stellvertreter hinzugefügt
6. Vereinigung aller gefundenen Berechtigungen bildet das effektive Set

## 4.7 Durchsetzung

### Backend

- **Middleware `requirePermission`:** Jede geschützte Route deklariert die benötigte Berechtigung
- **Resolver-Funktion:** Optional, um `nodeId` aus dem Request zu extrahieren für kontextabhängige Prüfung
- **HTTP 403:** Bei fehlender Berechtigung wird ein `403 Forbidden` zurückgegeben

### Frontend

- **`useAuth` Hook:** Stellt `permissions`-Array des aktuellen Benutzers bereit
- **Bedingte Darstellung:** UI-Elemente (Buttons, Menüeinträge, Tabs) werden basierend auf Berechtigungen ein-/ausgeblendet
- **Navigation:** Sidebar-Einträge und Einstellungs-Tabs prüfen die entsprechenden `view_*`- und `manage_*`-Berechtigungen
- **SoD-Hinweise:** Wenn das Vier-Augen-Prinzip eine Aktion blockiert, wird dies dem Benutzer transparent angezeigt

## 4.8 Separation of Duties (Vier-Augen-Prinzip)

### Regeln

| Regel-Schlüssel | Beschreibung | Standard |
|:----------------|:-------------|:---------|
| `four_eyes_review` | Einreicher darf eigene Inhalte nicht prüfen/freigeben | Aktiviert |
| `four_eyes_publish` | Einreicher darf eigene Inhalte nicht veröffentlichen | Aktiviert |

### Konfiguration

SoD-Regeln sind standardmäßig aktiviert und können über die `sod_config`-Tabelle konfiguriert werden:

```
sod_config: { rule_key, description, is_enabled, updated_by, updated_at }
```

Nur `system_admin` kann SoD-Regeln deaktivieren (erfordert `manage_settings`-Berechtigung).

### Durchsetzung

1. **Backend:** Bei Freigabe/Veröffentlichung wird geprüft, ob der Akteur der **Einreicher** (`submittedBy`) der Arbeitskopie ist (Fallback auf `authorId` wenn kein Einreicher erfasst). Dies stellt sicher, dass auch bei Einreichung durch Dritte das Vier-Augen-Prinzip gewahrt bleibt.
2. **Frontend:** Approve/Publish-Buttons werden für den Einreicher ausgeblendet; ein transparenter Hinweis erklärt den Grund
3. **Audit:** Jeder SoD-Verstoß wird im Audit-Log mit Event-Typ `sod_violation_blocked` protokolliert, inkl. `submittedBy` und `authorId` in den Details

### Ausnahmen

- SoD-Regeln können pro Regel deaktiviert werden (z.B. für Testzwecke oder kleine Teams)
- Deaktivierung wird im Audit-Log als `sod_config_updated` protokolliert
- Deaktivierte Regeln erlauben die Aktion, loggen aber eine Warnung (`rule_disabled`)

## 4.9 Stellvertretungslogik

### Prinzip

Die Stellvertretung ermöglicht die explizite Übertragung von Aufgaben und Berechtigungen an eine Vertretungsperson. Es gibt **keine stillen Fallbacks** — jede Vertretung muss aktiv eingerichtet werden.

### Delegationen

```
deputy_delegations: {
  principal_id,    -- Wer delegiert (Abwesender)
  deputy_id,       -- Wer übernimmt (Stellvertreter)
  scope,           -- Geltungsbereich ("global" oder "node:<uuid>")
  reason,          -- Begründung (optional)
  starts_at,       -- Beginn der Vertretung
  ends_at,         -- Ende der Vertretung (optional, null = unbefristet)
  is_active,       -- Aktiv-Flag
  created_by       -- Wer hat die Delegation eingerichtet
}
```

### Berechtigungsvererbung

- Der Stellvertreter erbt **alle Rollenberechtigungen** der delegierenden Person
- Der Geltungsbereich der Delegation bestimmt, für welche Bereiche die Vererbung gilt
- Delegationen sind zeitlich begrenzt (Start-/Enddatum)
- Nur aktive Delegationen im gültigen Zeitraum werden berücksichtigt

### Transparenz

- Jede Delegation wird im Audit-Log protokolliert (`delegation_created`, `delegation_revoked`)
- Der Stellvertreter sieht seine aktiven Delegationen über die API
- Es gibt keine automatische Stellvertretung — jede Delegation muss explizit eingerichtet werden
- Eigene Delegationen können von der Person selbst oder von Administratoren erstellt werden

## 4.10 Audit-Log Event-Typen (Governance)

Alle governance-relevanten Aktionen werden im Audit-Log protokolliert:

| Event-Typ | Aktion | Beschreibung |
|:----------|:-------|:-------------|
| `rbac` | `role_assigned` | Rolle einem Principal zugewiesen |
| `rbac` | `role_revoked` | Rolle von einem Principal entfernt |
| `rbac` | `principal_created` | Neuer Principal (Benutzer/Gruppe) angelegt |
| `rbac` | `page_permission_granted` | Seitenspezifische Berechtigung erteilt |
| `rbac` | `page_permission_revoked` | Seitenspezifische Berechtigung entzogen |
| `rbac` | `ownership_updated` | Seitenverantwortlichkeit geändert |
| `rbac` | `sod_violation_blocked` | Vier-Augen-Prinzip hat eine Aktion blockiert |
| `rbac` | `sod_config_updated` | SoD-Konfiguration geändert |
| `rbac` | `delegation_created` | Stellvertretung eingerichtet |
| `rbac` | `delegation_revoked` | Stellvertretung widerrufen |
| `connector` | `source_system_created` | Neues Quellsystem angelegt |
| `connector` | `source_system_updated` | Quellsystem geändert |
| `connector` | `source_system_deleted` | Quellsystem gelöscht |
| `connector` | `storage_provider_created` | Neuer Speicheranbieter angelegt |
| `content` | `media_uploaded` | Medien-Asset hochgeladen |
| `content` | `media_deleted` | Medien-Asset gelöscht |
| `backup` | `backup_config_changed` | Backup-Konfiguration geändert |
| `backup` | `backup_started` | Backup manuell gestartet |
| `backup` | `backup_restored` | Backup wiederhergestellt |
| `template` | `template_changed` | Seitentemplate geändert |

## 4.11 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `artifacts/api-server/src/services/rbac.service.ts` | Kernlogik: Rollen, Berechtigungen, SoD, Stellvertretung |
| `artifacts/api-server/src/middlewares/require-permission.ts` | Middleware für Routenschutz |
| `lib/db/src/schema/principals.ts` | DB-Schema: Principals, Rollenzuweisungen, Delegationen, SoD-Config |
| `lib/db/src/schema/enums.ts` | Enum-Definitionen für Rollen und Berechtigungen |
| `artifacts/wiki-frontend/src/components/settings/UsersRolesTab.tsx` | UI für Rollen- und Benutzerverwaltung |
| `artifacts/wiki-frontend/src/components/versioning/WorkingCopyActions.tsx` | UI für Arbeitskopie-Aktionen mit SoD-Prüfung |
| `artifacts/api-server/src/routes/principals.ts` | API-Routen: Delegationen, SoD-Konfiguration |
| `artifacts/api-server/src/routes/working-copies.ts` | API-Routen: Arbeitskopie-Workflow mit SoD-Enforcement |
