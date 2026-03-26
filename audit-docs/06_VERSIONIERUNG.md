# 06 — Versionierung & Revisionssystem

## 6.1 Übersicht

FlowCore trennt klar zwischen **Revisionen** (jede einzelne Speicherung) und **Versionen** (formal genehmigte Meilensteine). Dieses Design gewährleistet vollständige Nachverfolgbarkeit und Compliance.

### Grundprinzipien:

- **Immutabilität:** Bestehende Revisionen werden nie überschrieben
- **Lückenlose Historie:** Jede Änderung erzeugt einen neuen, unveränderlichen Datensatz
- **Änderungsmetadaten:** Art der Änderung und Zusammenfassung werden dokumentiert
- **Rückverfolgbarkeit:** Autor, Prüfer und Genehmiger werden erfasst

## 6.2 Revisionsstatus

```
draft → in_review → approved → published → archived
                  ↙ (Ablehnung)
             draft (Überarbeitung)
```

| Status | Beschreibung |
|:-------|:-------------|
| `draft` | Arbeitsentwurf — aktiv bearbeitbar |
| `in_review` | Eingereicht zur Prüfung |
| `approved` | Geprüft und genehmigt — wartet auf Veröffentlichung |
| `published` | Aktuelle offizielle Version |
| `archived` | Frühere veröffentlichte Version |

## 6.3 Änderungstypen

| Typ | Beschreibung |
|:----|:-------------|
| `editorial` | Redaktionelle Korrektur (Tippfehler, Formatierung) |
| `minor` | Kleinere inhaltliche Anpassung |
| `major` | Wesentliche inhaltliche Änderung |
| `regulatory` | Regulatorisch bedingte Änderung |
| `structural` | Strukturelle Änderung (Neuorganisation) |

## 6.4 Workflow-Ablauf

### Schritt 1: Entwurf erstellen

```
Benutzer bearbeitet Seite → createRevision() → Neue Revision (status: "draft")
                                               → Node.current_revision_id = neue ID
```

- Jede Speicherung erzeugt eine neue Revision mit `revision_no + 1`
- Erfasst: `author_id`, `change_type`, `change_summary`, `changed_fields`
- Der vollständige Inhalt (`content` + `structured_fields`) wird als Snapshot gespeichert

### Schritt 2: Zur Prüfung einreichen

```
POST /content/revisions/:id/submit-for-review
```

1. Erstellt einen `review_workflow`-Eintrag mit Status `pending`
2. Erstellt einen `approvals`-Eintrag für den zugewiesenen Prüfer
3. Setzt Revisions- und Knotenstatus auf `in_review`
4. **Berechtigung:** `submit_for_review`

### Schritt 3: Prüfung

Der Prüfer hat zwei Optionen:

#### Genehmigen:

```
POST /content/revisions/:id/approve
```

- Setzt Workflow-Status auf `approved`
- Setzt Revisionsstatus auf `approved`
- **Berechtigung:** `approve_page`

#### Ablehnen / Zurückweisen:

```
POST /content/revisions/:id/reject
```

- Setzt Workflow-Status auf `rejected`
- Setzt Revisions- und Knotenstatus zurück auf `draft`
- Ermöglicht dem Autor weitere Bearbeitungen
- **Berechtigung:** `review_page`

### Schritt 4: Veröffentlichen

```
POST /content/revisions/:id/publish
```

1. Die bisherige `published`-Revision wird auf `archived` gesetzt
2. Die genehmigte Revision wird auf `published` gesetzt
3. Ein `version_label` wird vergeben (z.B. "1.0", "2.1")
4. `Node.published_revision_id` wird aktualisiert
5. **Berechtigung:** `approve_page`

### Schritt 5: Wiederherstellen (optional)

```
POST /content/revisions/:id/restore
```

- **Nicht-destruktiv:** Es wird eine **Kopie** der alten Revision als neue `draft`-Revision angelegt
- Referenz zur Quellrevision über `based_on_revision_id`
- Automatische `change_summary`: "Wiederhergestellt aus Revision X"
- Die Revisionshistorie bleibt vollständig linear und intakt
- **Berechtigung:** `edit_content`

## 6.5 Versionslabels

Veröffentlichte Revisionen erhalten ein formales Versionslabel:

| Schema | Beispiel | Anwendung |
|:-------|:---------|:----------|
| Major.Minor | "1.0" | Erstveröffentlichung |
| Major.Minor | "1.1" | Kleinere Aktualisierung |
| Major.Minor | "2.0" | Wesentliche Überarbeitung |

## 6.6 Diff-Vergleich

```
GET /content/revisions/:id/diff/:otherId
```

Ermöglicht den Vergleich zweier beliebiger Revisionen desselben Knotens. Zeigt:

- Geänderte Metadatenfelder
- Geänderte Sektionsinhalte
- Strukturelle Unterschiede

## 6.7 Ereignis-Timeline

```
GET /content/revisions/:id/events
```

Gibt eine chronologische Timeline aller Ereignisse einer Revision zurück:

- Erstellung
- Einreichung zur Prüfung
- Genehmigung/Ablehnung
- Veröffentlichung
- Kommentare

## 6.8 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `artifacts/api-server/src/services/revision.service.ts` | Kernlogik: createRevision, publishRevision, restoreRevision |
| `artifacts/api-server/src/routes/review.ts` | Routen für Review-Workflow (Submit, Approve, Reject) |
| `lib/db/src/schema/content-revisions.ts` | DB-Schema für Revisionen |
| `lib/db/src/schema/review-workflows.ts` | DB-Schema für Workflows und Genehmigungen |
| `docs/adr/ADR-003-*.md` | Architekturentscheidung: Revisions-/Versionstrennung |
