# 04 — Rollen & Berechtigungen (RBAC)

## 4.1 Übersicht

FlowCore implementiert ein mehrstufiges rollenbasiertes Zugriffskontrollsystem (RBAC) mit:

- **7 vordefinierte Rollen** mit jeweils festgelegten Berechtigungen
- **19 granulare Berechtigungen** in 4 Kategorien
- **3 Zuweisungsebenen:** Global, bereichsbezogen und seitenspezifisch
- **Vererbung:** Berechtigungen werden entlang der Knotenhierarchie vererbt

## 4.2 Rollen

| Rolle | Schlüssel | Beschreibung |
|:------|:----------|:-------------|
| **System-Administrator** | `system_admin` | Vollzugriff auf alle Funktionen, Einstellungen und Berechtigungen |
| **Prozessmanager** | `process_manager` | Verwaltet Inhaltsstruktur, Beziehungen und Berechtigungen; kann nicht genehmigen |
| **Compliance-Manager** | `compliance_manager` | Überwachung von Vorlagen und Audit-Logs; Fokus auf Prüfprozesse |
| **Editor** | `editor` | Erstellt und bearbeitet Inhalte; reicht zur Prüfung ein |
| **Prüfer** | `reviewer` | Prüft eingereichte Inhalte; Einsicht in Audit-Logs |
| **Genehmiger** | `approver` | Kann prüfen und final genehmigen/veröffentlichen |
| **Betrachter** | `viewer` | Grundlegender Lesezugriff |

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

### Administration

| Berechtigung | Beschreibung |
|:-------------|:-------------|
| `manage_permissions` | Rollen und Berechtigungen verwalten |
| `manage_templates` | Seitenvorlagen verwalten |
| `manage_settings` | Systemeinstellungen verwalten |
| `view_audit_log` | Audit-Protokoll einsehen |

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
| `review_page` | X | — | X | — | X | X | — |
| `approve_page` | X | — | — | — | — | X | — |
| `archive_page` | X | X | — | — | — | — | — |
| `manage_permissions` | X | X | — | — | — | — | — |
| `manage_templates` | X | — | X | — | — | — | — |
| `manage_settings` | X | X | — | — | — | — | — |
| `view_audit_log` | X | — | X | — | X | X | — |

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
```

### Algorithmus:

1. Alle `role_assignments` des Principals laden
2. Globale Rollen ergeben das Basis-Berechtigungsset
3. Für Scoped-Rollen: Prüfen, ob der angefragte Knoten im Scope liegt (durch Traversierung der Knotenhierarchie)
4. Direkte `page_permissions` auf dem Knoten und seinen Eltern auflösen
5. Vereinigung aller gefundenen Berechtigungen bildet das effektive Set

## 4.7 Durchsetzung

### Backend

- **Middleware `requirePermission`:** Jede geschützte Route deklariert die benötigte Berechtigung
- **Resolver-Funktion:** Optional, um `nodeId` aus dem Request zu extrahieren für kontextabhängige Prüfung
- **HTTP 403:** Bei fehlender Berechtigung wird ein `403 Forbidden` zurückgegeben

### Frontend

- **`useAuth` Hook:** Stellt `permissions`-Array des aktuellen Benutzers bereit
- **Bedingte Darstellung:** UI-Elemente (Buttons, Menüeinträge, Tabs) werden basierend auf Berechtigungen ein-/ausgeblendet
- **Navigation:** Sidebar-Einträge und Einstellungs-Tabs prüfen die entsprechenden `view_*`-Berechtigungen

## 4.8 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `artifacts/api-server/src/services/rbac.service.ts` | Kernlogik: Rollen, Berechtigungen, Berechnung |
| `artifacts/api-server/src/middlewares/require-permission.ts` | Middleware für Routenschutz |
| `lib/db/src/schema/principals.ts` | DB-Schema für Principals und Rollenzuweisungen |
| `lib/db/src/schema/enums.ts` | Enum-Definitionen für Rollen und Berechtigungen |
| `artifacts/wiki-frontend/src/components/settings/UsersRolesTab.tsx` | UI für Rollen- und Benutzerverwaltung |
