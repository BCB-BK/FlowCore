# 05 — Seitenvorlagen (Templates)

## 5.1 Übersicht

FlowCore verwendet ein **Registry-basiertes Vorlagensystem**, bei dem alle Seitentypen zentral definiert werden. Jede Vorlage spezifiziert:

- **Metadatenfelder** (z.B. Verantwortlicher, Gültigkeitsdatum, Vertraulichkeit)
- **Inhaltssektionen** (z.B. Verfahrensbeschreibung, SIPOC-Tabelle, KPIs)
- **Hierarchieregeln** (erlaubte Kinder- und Elterntypen)
- **Vollständigkeitsprüfung** (erforderliche Felder und Sektionen)

**Registry-Datei:** `lib/shared/src/page-types/registry.ts`

## 5.2 Alle Seitenvorlagen

### 5.2.1 Kernprozess-Übersicht (`core_process_overview`)

| Eigenschaft | Wert |
|:------------|:-----|
| **Kategorie** | Prozess |
| **Beschreibung** | Überblicksseite für einen Kernprozess mit SIPOC, KPIs und Compliance |
| **Sektionen** | `overview`, `sipoc`, `kpis`, `compliance` |
| **Layout** | `ProcessOverviewLayout.tsx` — spezielle Darstellung mit SIPOC-Tabelle und KPI-Badges |
| **Erlaubte Kinder** | `process_page_text`, `process_page_graphic`, `procedure_instruction` |

### 5.2.2 Bereichsübersicht (`area_overview`)

| Eigenschaft | Wert |
|:------------|:-----|
| **Kategorie** | Dokumentation |
| **Beschreibung** | Strukturelle Übersicht eines Organisationsbereichs |
| **Sektionen** | `description`, `structure` |
| **Layout** | Generisches Sektionslayout |
| **Erlaubte Kinder** | `core_process_overview`, `policy`, `system_documentation` |

### 5.2.3 Prozessseite — Text (`process_page_text`)

| Eigenschaft | Wert |
|:------------|:-----|
| **Kategorie** | Prozess |
| **Beschreibung** | Textbasierte Prozessbeschreibung mit Verfahrensschritten |
| **Sektionen** | `procedure`, `interfaces` |
| **Layout** | Generisches Sektionslayout |
| **Erlaubte Kinder** | `procedure_instruction` |

### 5.2.4 Prozessseite — Grafik (`process_page_graphic`)

| Eigenschaft | Wert |
|:------------|:-----|
| **Kategorie** | Prozess |
| **Beschreibung** | Grafische Prozessdarstellung mit Diagramm und Beschreibung |
| **Sektionen** | `diagram`, `description` |
| **Layout** | Generisches Sektionslayout |
| **Erlaubte Kinder** | `procedure_instruction` |

### 5.2.5 Verfahrensanweisung (`procedure_instruction`)

| Eigenschaft | Wert |
|:------------|:-----|
| **Kategorie** | Prozess |
| **Beschreibung** | Detaillierte Arbeitsanweisung für einen bestimmten Vorgang |
| **Sektionen** | `scope`, `procedure`, `documents` |
| **Layout** | Generisches Sektionslayout |
| **Erlaubte Kinder** | Keine |

### 5.2.6 Richtlinie / Policy (`policy`)

| Eigenschaft | Wert |
|:------------|:-----|
| **Kategorie** | Governance |
| **Beschreibung** | Organisationsrichtlinie mit Zweck, Geltungsbereich und Durchsetzung |
| **Sektionen** | `purpose`, `scope`, `policy_text`, `enforcement` |
| **Layout** | `PolicyLayout.tsx` — dediziertes Layout mit Governance-Karten |
| **Erlaubte Kinder** | `procedure_instruction` |

### 5.2.7 Rollen-/Stellenprofil (`role_profile`)

| Eigenschaft | Wert |
|:------------|:-----|
| **Kategorie** | Governance |
| **Beschreibung** | Profil einer organisatorischen Rolle mit Verantwortlichkeiten |
| **Sektionen** | `role_definition`, `responsibilities`, `qualifications` |
| **Layout** | Generisches Sektionslayout |
| **Erlaubte Kinder** | Keine |

### 5.2.8 Systemdokumentation (`system_documentation`)

| Eigenschaft | Wert |
|:------------|:-----|
| **Kategorie** | System |
| **Beschreibung** | Technische Dokumentation eines IT-Systems |
| **Sektionen** | `system_info`, `interfaces`, `data_objects` |
| **Layout** | Generisches Sektionslayout |
| **Erlaubte Kinder** | `use_case` |

### 5.2.9 Use Case (`use_case`)

| Eigenschaft | Wert |
|:------------|:-----|
| **Kategorie** | Dokumentation |
| **Beschreibung** | Beschreibung eines Anwendungsfalls |
| **Sektionen** | `main` |
| **Layout** | Generisches Sektionslayout |
| **Erlaubte Kinder** | Keine |

### 5.2.10 Dashboard (`dashboard`)

| Eigenschaft | Wert |
|:------------|:-----|
| **Kategorie** | System |
| **Beschreibung** | Konfigurierbares Dashboard mit Widgets |
| **Sektionen** | `widgets`, `description` |
| **Layout** | Generisches Sektionslayout |
| **Erlaubte Kinder** | Keine |

## 5.3 Metadatenfelder

Jede Vorlage kann aus einem Pool gemeinsamer Metadatenfelder auswählen, die in Gruppen organisiert sind:

### Identität

| Feld | Beschreibung |
|:-----|:-------------|
| `owner` | Verantwortlicher / Prozesseigner |
| `deputy` | Stellvertreter |
| `department` | Abteilung |

### Governance

| Feld | Beschreibung |
|:-----|:-------------|
| `reviewer` | Zugewiesener Prüfer |
| `approver` | Zugewiesener Genehmiger |
| `review_cycle` | Prüfzyklus (z.B. jährlich, halbjährlich) |

### Gültigkeit

| Feld | Beschreibung |
|:-----|:-------------|
| `valid_from` | Gültig ab (Datum) |
| `valid_until` | Gültig bis (Datum) |
| `next_review_date` | Nächstes Prüfdatum |

### Klassifizierung

| Feld | Beschreibung |
|:-----|:-------------|
| `confidentiality` | Vertraulichkeitsstufe |
| `scope` | Geltungsbereich |
| `compliance_relevant` | Compliance-Relevanz (Boolean) |

## 5.4 Inhaltsmodell (Dual-Content)

Jede Revision speichert Inhalte in zwei JSONB-Spalten:

```
content_revisions
├── content (JSONB)           → Metadatenfelder (owner, valid_from, ...)
└── structured_fields (JSONB) → Sektionsdaten + Editor-Inhalt
    └── _editorContent        → Tiptap/ProseMirror Dokument-JSON
```

### Rendering-Pipeline:

1. **Registry** definiert verfügbare Sektionen pro Template-Typ
2. **PageLayout.tsx** dispatcht basierend auf `templateType` zum richtigen Layout
3. **Spezifische Layouts** (z.B. `ProcessOverviewLayout.tsx`) rendern `structuredFields` in spezialisierte Komponenten
4. **GenericSectionLayout.tsx** rendert Templates ohne eigenes Layout als editierbare Sektionskarten
5. **MetadataPanel.tsx** rendert das Metadaten-Formular basierend auf der `metadataFields`-Definition

## 5.5 Hierarchieregeln

Die Baumstruktur wird über `allowedChildTypes` gesteuert:

```
area_overview
├── core_process_overview
│   ├── process_page_text
│   │   └── procedure_instruction
│   ├── process_page_graphic
│   │   └── procedure_instruction
│   └── procedure_instruction
├── policy
│   └── procedure_instruction
└── system_documentation
    └── use_case
```

Die Durchsetzung erfolgt im Frontend über den `CreateNodeDialog.tsx`, der die `getAllowedChildTypes`-Hilfsfunktion verwendet.

## 5.6 Vollständigkeitsprüfung

Das System berechnet einen **Vollständigkeitsprozentsatz** (`calculateCompleteness`), indem es:

1. Alle erforderlichen Metadatenfelder für den Template-Typ ermittelt
2. Alle definierten Sektionen prüft
3. Vorhandene Daten in der aktuellen Revision dagegen abgleicht
4. Den Prozentsatz der ausgefüllten Felder/Sektionen berechnet

Dieser Wert wird im **Qualitäts-Dashboard** und auf Seitenebene angezeigt.

## 5.7 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `lib/shared/src/page-types/registry.ts` | Zentrale Template-Registry |
| `artifacts/wiki-frontend/src/components/layouts/PageLayout.tsx` | Layout-Dispatcher |
| `artifacts/wiki-frontend/src/components/layouts/ProcessOverviewLayout.tsx` | Kernprozess-Layout |
| `artifacts/wiki-frontend/src/components/layouts/PolicyLayout.tsx` | Richtlinien-Layout |
| `artifacts/wiki-frontend/src/components/layouts/GenericSectionLayout.tsx` | Generisches Layout |
| `artifacts/wiki-frontend/src/components/layouts/MetadataPanel.tsx` | Metadaten-Formular |
| `artifacts/wiki-frontend/src/components/dialogs/CreateNodeDialog.tsx` | Erstellungsdialog mit Hierarchieprüfung |
