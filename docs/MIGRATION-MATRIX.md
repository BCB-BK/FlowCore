# Migrationsmatrix – Seitentypen & Strukturierte Felder

**Version**: 1.0
**Datum**: 2026-03-27
**Registry-Version**: 2.0.0

## 1. Überblick

Dieses Dokument definiert, wie bestehende Inhalte auf die neuen strukturierten Felder und Seitentyp-Layouts gemappt werden. Es enthält pro Seitentyp eine Migrationsmatrix, Fallback-Regeln und Maßnahmen gegen stille Datenverluste.

### Datenstruktur (Ist-Zustand)

Bestehende Seiten speichern Daten in drei Spalten der `content_revisions`-Tabelle:

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `content` | JSONB | Metadaten-Schlüssel-Wert-Paare (owner, tags, dates, …) |
| `structured_fields` | JSONB | Strukturierte Abschnittsinhalte, Governance-Felder, Editor-Snapshot |
| `title` | TEXT | Seitentitel |

### Zielstruktur (Soll-Zustand)

Die neue Registry (v2.0.0) definiert pro Seitentyp:
- **Metadatenfelder** (5 Gruppen: identity, governance, responsibilities, validity, classification)
- **Abschnitte** (strukturierte Inhaltsbereiche mit `key`, `required`, `publishRequired`)
- **Compound-Typen** (sipoc_cards, raci_matrix, qa_repeater, term_repeater, check_items, competency_areas)
- **Publikationsregeln** (minimumSections, minimumMetadata, minSectionContentLength)

## 2. Migrationsmatrix pro Seitentyp

### 2.1 core_process_overview (KP – Kernprozess-Übersicht)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `content.owner` | `content.owner` | Metadaten (governance) | — | Pflicht; bleibt leer → Validierungsfehler |
| `content.document_type` | `content.document_type` | Metadaten (identity) | — | Optional; Standard: leer |
| `content.deputy` | `content.deputy` | Metadaten (governance) | — | Optional |
| `content.reviewer` | `content.reviewer` | Metadaten (governance) | — | Conditional |
| `content.valid_from` | `content.valid_from` | Metadaten (validity) | — | Optional |
| `content.confidentiality` | `content.confidentiality` | Metadaten (classification) | — | Optional |
| `content.tags` | `content.tags` | Metadaten (classification) | — | Optional |
| `structured_fields.overview` | `structured_fields.overview` | Abschnitt | — | Text; min. 50 Zeichen für Publish |
| `structured_fields.process_steps` | `structured_fields.process_steps` | Abschnitt | — | Text; min. 30 Zeichen |
| `structured_fields.sipoc` | `structured_fields.sipoc` | Abschnitt | `sipoc_cards` | JSON-Struktur; Freitext → JSON-Konvertierung |
| `structured_fields.sub_processes` | `structured_fields.sub_processes` | Abschnitt | — | Optional; Verlinkungen |
| `structured_fields.kpis` | `structured_fields.kpis` | Abschnitt | — | Recommended |
| `structured_fields.interfaces_systems` | `structured_fields.interfaces_systems` | Abschnitt | — | Optional |
| `structured_fields.compliance` | `structured_fields.compliance` | Abschnitt | — | Optional |
| `structured_fields.risks` | `structured_fields.risks` | Abschnitt | — | Optional |
| `structured_fields._editorContent` | `structured_fields._editorContent` | Editor | — | Tiptap JSON; bleibt erhalten |
| `structured_fields.governance` | `structured_fields.governance` | Governance | — | Nested Object |

### 2.2 area_overview (BER – Bereichsübersicht)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `structured_fields.description` | `structured_fields.description` | Abschnitt | — | Text; min. 50 Zeichen |
| `structured_fields.structure` | `structured_fields.structure` | Abschnitt | — | Optional |
| `structured_fields.interfaces` | `structured_fields.interfaces` | Abschnitt | — | Optional |
| Metadaten | wie core_process_overview | — | — | Gemeinsame Felder |

### 2.3 process_page_text (PRZ – Prozessseite Text)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `content.process_type` | `content.process_type` | Metadaten (classification) | — | Optional; enum: core/support/management |
| `structured_fields.purpose` | `structured_fields.purpose` | Abschnitt | — | Text; min. 30 Zeichen |
| `structured_fields.scope` | `structured_fields.scope` | Abschnitt | — | Text |
| `structured_fields.procedure` | `structured_fields.procedure` | Abschnitt | — | Text |
| `structured_fields.responsibilities` | `structured_fields.responsibilities` | Abschnitt | — | Optional |
| `structured_fields.documents` | `structured_fields.documents` | Abschnitt | — | Optional |

### 2.4 process_page_graphic (PRG – Prozessseite Grafik)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `structured_fields.process_description` | `structured_fields.process_description` | Abschnitt | — | Text |
| `structured_fields.process_diagram` | `structured_fields.process_diagram` | Abschnitt | — | Text/Referenz |
| `structured_fields.sipoc` | `structured_fields.sipoc` | Abschnitt | `sipoc_cards` | JSON |
| `structured_fields.responsibilities` | `structured_fields.responsibilities` | Abschnitt | `raci_matrix` | JSON |

### 2.5 procedure_instruction (VA – Verfahrensanweisung)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `structured_fields.purpose` | `structured_fields.purpose` | Abschnitt | — | Text |
| `structured_fields.scope` | `structured_fields.scope` | Abschnitt | — | Text |
| `structured_fields.terms` | `structured_fields.terms` | Abschnitt | — | Text |
| `structured_fields.procedure_steps` | `structured_fields.procedure_steps` | Abschnitt | — | Text |
| `structured_fields.responsibilities` | `structured_fields.responsibilities` | Abschnitt | — | Text |
| `structured_fields.documents` | `structured_fields.documents` | Abschnitt | — | Text |
| `structured_fields.flowchart` | `structured_fields.flowchart` | Abschnitt | — | Text/Referenz |
| `structured_fields.raci` | `structured_fields.raci` | Abschnitt | `raci_matrix` | JSON |

### 2.6 use_case (UC – Anwendungsfall)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `structured_fields.scenario` | `structured_fields.scenario` | Abschnitt | — | Text |
| `structured_fields.actors` | `structured_fields.actors` | Abschnitt | — | Text |
| `structured_fields.preconditions` | `structured_fields.preconditions` | Abschnitt | — | Text |
| `structured_fields.flow` | `structured_fields.flow` | Abschnitt | — | Text |
| `structured_fields.postconditions` | `structured_fields.postconditions` | Abschnitt | — | Text |
| `structured_fields.exceptions` | `structured_fields.exceptions` | Abschnitt | — | Text |

### 2.7 policy (RL – Richtlinie)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `structured_fields.purpose` | `structured_fields.purpose` | Abschnitt | — | Text |
| `structured_fields.scope` | `structured_fields.scope` | Abschnitt | — | Text |
| `structured_fields.principles` | `structured_fields.principles` | Abschnitt | — | Text |
| `structured_fields.rules` | `structured_fields.rules` | Abschnitt | — | Text |
| `structured_fields.exceptions` | `structured_fields.exceptions` | Abschnitt | — | Text |
| `structured_fields.consequences` | `structured_fields.consequences` | Abschnitt | — | Text |
| `structured_fields.references` | `structured_fields.references` | Abschnitt | — | Text |

### 2.8 role_profile (RP – Rollenprofil)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `structured_fields.role_description` | `structured_fields.role_description` | Abschnitt | — | Text |
| `structured_fields.responsibilities` | `structured_fields.responsibilities` | Abschnitt | — | Text |
| `structured_fields.competencies` | `structured_fields.competencies` | Abschnitt | `competency_areas` | JSON |
| `structured_fields.interfaces` | `structured_fields.interfaces` | Abschnitt | — | Text |

### 2.9 glossary (GL – Glossar)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `structured_fields.terms` | `structured_fields.terms` | Abschnitt | `term_repeater` | JSON; Freitext → JSON |
| `structured_fields.categories` | `structured_fields.categories` | Abschnitt | — | Text |

### 2.10 checklist (CL – Checkliste)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `structured_fields.purpose` | `structured_fields.purpose` | Abschnitt | — | Text |
| `structured_fields.items` | `structured_fields.items` | Abschnitt | `check_items` | JSON |
| `structured_fields.instructions` | `structured_fields.instructions` | Abschnitt | — | Text |

### 2.11 faq (FAQ)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `structured_fields.questions` | `structured_fields.questions` | Abschnitt | `qa_repeater` | JSON |
| `structured_fields.categories` | `structured_fields.categories` | Abschnitt | — | Text |

### 2.12 work_instruction (AA – Arbeitsanweisung)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `structured_fields.purpose` | `structured_fields.purpose` | Abschnitt | — | Text |
| `structured_fields.materials` | `structured_fields.materials` | Abschnitt | — | Text |
| `structured_fields.steps` | `structured_fields.steps` | Abschnitt | — | Text |
| `structured_fields.safety` | `structured_fields.safety` | Abschnitt | — | Text |
| `structured_fields.quality_criteria` | `structured_fields.quality_criteria` | Abschnitt | — | Text |

### 2.13 dashboard (DSH – Dashboard)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `content.owner` | `content.owner` | Metadaten (governance) | — | Optional |
| `structured_fields.widgets` | `structured_fields.widgets` | Abschnitt | — | JSON; min. 10 Zeichen für Publish |
| `structured_fields.description` | `structured_fields.description` | Abschnitt | — | Optional |

### 2.14 system_documentation (SYS – Systemdokumentation)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `content.system_owner` | `content.system_owner` | Metadaten (governance) | — | Optional |
| `content.environment` | `content.environment` | Metadaten (classification) | — | enum: production/staging/development/test |
| `content.system_criticality` | `content.system_criticality` | Metadaten (classification) | — | enum: mission_critical/business_critical/standard/non_critical |
| `structured_fields.system_info` | `structured_fields.system_info` | Abschnitt | — | Text; Pflicht |
| `structured_fields.architecture` | `structured_fields.architecture` | Abschnitt | — | Optional |
| `structured_fields.interfaces` | `structured_fields.interfaces` | Abschnitt | — | Optional |
| `structured_fields.data_objects` | `structured_fields.data_objects` | Abschnitt | — | Optional |
| `structured_fields.access_rights` | `structured_fields.access_rights` | Abschnitt | — | Optional |
| `structured_fields.operations` | `structured_fields.operations` | Abschnitt | — | Recommended |
| Metadaten | wie core_process_overview | — | — | Gemeinsame Felder |

### 2.15 interface_description (SST – Schnittstellenbeschreibung)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `content.interface_type` | `content.interface_type` | Metadaten (classification) | — | enum: api/file_transfer/database/message_queue/manual/organizational |
| `content.source_system` | `content.source_system` | Metadaten (identity) | — | Text |
| `content.target_system` | `content.target_system` | Metadaten (identity) | — | Text |
| `structured_fields.overview` | `structured_fields.overview` | Abschnitt | — | Text; Pflicht |
| `structured_fields.data_flow` | `structured_fields.data_flow` | Abschnitt | — | Text; Pflicht |
| `structured_fields.protocol` | `structured_fields.protocol` | Abschnitt | — | Optional |
| `structured_fields.error_handling` | `structured_fields.error_handling` | Abschnitt | — | Optional |
| `structured_fields.sla` | `structured_fields.sla` | Abschnitt | — | Optional |
| `structured_fields.responsibilities` | `structured_fields.responsibilities` | Abschnitt | — | Recommended |
| Metadaten | wie core_process_overview | — | — | Gemeinsame Felder |

### 2.16 meeting_protocol (MPR – Meeting-/Entscheidungsprotokoll)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `content.owner` | `content.owner` | Metadaten (governance) | — | Pflicht (Protokollführer) |
| `content.meeting_date` | `content.meeting_date` | Metadaten (validity) | — | Pflicht |
| `content.meeting_type` | `content.meeting_type` | Metadaten (classification) | — | enum: project_meeting/steering_committee/team_meeting/board_meeting/workshop/review/retrospective/other |
| `structured_fields.participants` | `structured_fields.participants` | Abschnitt | — | Text; Pflicht |
| `structured_fields.agenda` | `structured_fields.agenda` | Abschnitt | — | Text; Pflicht |
| `structured_fields.discussion` | `structured_fields.discussion` | Abschnitt | — | Text; Pflicht |
| `structured_fields.decisions` | `structured_fields.decisions` | Abschnitt | — | Optional |
| `structured_fields.action_items` | `structured_fields.action_items` | Abschnitt | — | Optional |
| `structured_fields.next_meeting` | `structured_fields.next_meeting` | Abschnitt | — | Recommended |

### 2.17 training_resource (SCH – Schulung/Lernressource)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `content.target_audience` | `content.target_audience` | Metadaten (classification) | — | Pflicht |
| `content.training_type` | `content.training_type` | Metadaten (classification) | — | enum: onboarding/skill_training/compliance_training/certification/refresher/self_study |
| `content.duration_minutes` | `content.duration_minutes` | Metadaten (identity) | — | Zahl |
| `content.difficulty_level` | `content.difficulty_level` | Metadaten (classification) | — | enum: beginner/intermediate/advanced |
| `structured_fields.objectives` | `structured_fields.objectives` | Abschnitt | — | Text; Pflicht |
| `structured_fields.prerequisites` | `structured_fields.prerequisites` | Abschnitt | — | Optional |
| `structured_fields.content` | `structured_fields.content` | Abschnitt | — | Text; Pflicht |
| `structured_fields.exercises` | `structured_fields.exercises` | Abschnitt | — | Optional |
| `structured_fields.assessment` | `structured_fields.assessment` | Abschnitt | — | Optional |
| `structured_fields.materials` | `structured_fields.materials` | Abschnitt | — | Recommended |
| Metadaten | wie core_process_overview | — | — | Gemeinsame Felder |

### 2.18 audit_object (AUD – Kontroll-/Prüfobjekt)

| Bestehendes Feld | Ziel-Feld | Ziel-Bereich | Compound-Typ | Fallback |
|-------------------|-----------|--------------|--------------|----------|
| `content.audit_type` | `content.audit_type` | Metadaten (classification) | — | enum: internal_audit/external_audit/management_review/self_assessment/spot_check/routine_check |
| `content.severity` | `content.severity` | Metadaten (classification) | — | enum: critical/major/minor/observation/improvement |
| `content.due_date` | `content.due_date` | Metadaten (validity) | — | Datum |
| `structured_fields.finding` | `structured_fields.finding` | Abschnitt | — | Text; Pflicht |
| `structured_fields.evidence` | `structured_fields.evidence` | Abschnitt | — | Text; Pflicht |
| `structured_fields.root_cause` | `structured_fields.root_cause` | Abschnitt | — | Optional |
| `structured_fields.corrective_action` | `structured_fields.corrective_action` | Abschnitt | — | Optional |
| `structured_fields.preventive_action` | `structured_fields.preventive_action` | Abschnitt | — | Optional |
| `structured_fields.effectiveness_check` | `structured_fields.effectiveness_check` | Abschnitt | — | Recommended |
| Metadaten | wie core_process_overview | — | — | Gemeinsame Felder |

## 3. Compound-Typ-Migration

Compound-Felder erfordern besondere Aufmerksamkeit bei der Migration:

| Compound-Typ | Betroffene Seitentypen | Datenformat (JSON-serialisiert als String) | Fallback bei Freitext |
|--------------|------------------------|-------------|----------------------|
| `sipoc_cards` | core_process_overview, process_page_graphic | `{suppliers:string, inputs:string, process:string, outputs:string, customers:string}` – jede Spalte als Freitext | Freitext wird als `process`-Feld gespeichert |
| `raci_matrix` | procedure_instruction, process_page_graphic | `{roles:string[], entries:[{activity:string, assignments:Record<string,string>}]}` | Freitext → leere Matrix mit Standardstruktur |
| `qa_repeater` | faq | `[{question:string, answer:string}]` | Freitext → einzelnes Q&A-Paar mit Text als Antwort |
| `term_repeater` | glossary | `[{term:string, definition:string, synonyms?:string}]` – `synonyms` ist ein einzelner String | Freitext → einzelner Term mit Text als Definition |
| `check_items` | checklist | `[{text:string, category?:string, note?:string}]` – kein `checked`-Feld, Items als Textliste | Freitext → Zeilenweise Zerlegung in Items |
| `competency_areas` | role_profile | `[{area:string, tasks:string}]` – `tasks` als Freitext-Beschreibung | Freitext → einzelner Bereich mit Text als Aufgaben |

## 4. Fallback-Regeln

### 4.1 Fehlende Pflichtfelder

| Situation | Fallback | Konsequenz |
|-----------|----------|------------|
| `owner` fehlt | Feld bleibt leer | Seite kann nicht veröffentlicht werden; Warnung im Dashboard |
| Pflicht-Abschnitt leer | Leerer Abschnitt wird angezeigt | Completeness-Indicator zeigt Defizit |
| Unbekanntes `templateType` | Generisches Layout | Abschnitte werden als Freitext angezeigt |

### 4.2 Datentypkonvertierung

| Quelltyp | Zieltyp | Konvertierung |
|----------|---------|---------------|
| Freitext → Compound JSON | Automatisch | Text wird als erstes Element im Array eingefügt |
| JSON → Freitext | Verlustfrei | JSON wird mit `JSON.stringify` formatiert |
| Alte enum-Werte → Neue Options | Mapping-Tabelle | Unbekannte Werte bleiben erhalten, werden als ungültig markiert |
| `_display`-Suffixe | Anzeigewerte | Werden parallel beibehalten für Lesbarkeit |

### 4.3 Garantie: Keine stillen Datenverluste

1. **Alle bestehenden Schlüssel bleiben erhalten**: Unbekannte Keys in `content` oder `structured_fields` werden nicht gelöscht, sondern ignoriert von der Validierung.
2. **Working-Copy-Snapshots**: Beim Erstellen einer Working Copy werden `content` und `structured_fields` vollständig aus der Basis-Revision kopiert (inkl. unbekannter Felder).
3. **Revisions-Immutabilität**: Veröffentlichte Revisionen sind unveränderlich; nur neue Revisionen werden erstellt.
4. **Audit-Trail**: Jede Änderung wird als `audit_event` protokolliert.
5. **Validierung nur bei Publish**: Fehlende Felder blockieren nur die Veröffentlichung, nicht das Bearbeiten.

## 5. Migrationsstrategie

### Phase 1: Keine Breaking Migration (aktuell)
- Bestehende Daten bleiben unverändert in der DB.
- Neue UI-Layouts rendern bestehende Daten mit Fallback-Logik.
- Compound-Typ-Editoren akzeptieren sowohl Freitext als auch JSON.

### Phase 2: Optionale Konvertierung (bei Bearbeitung)
- Beim Öffnen einer Working Copy werden Freitext-Compound-Felder zur JSON-Konvertierung angeboten.
- Konvertierung ist freiwillig und umkehrbar.

### Phase 3: Batch-Migration (geplant)
- Automatisiertes Script zur Konvertierung aller Freitext-Compound-Felder.
- Trockenlauf-Modus mit Bericht vor tatsächlicher Migration.
- Validierungsbericht nach Migration.
