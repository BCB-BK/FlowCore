# Replit-Auftragspaket – Cluster 1 bis 13 (konsolidiert, nachgeschärft)

Dieses Dokument **ersetzt** die bisherigen Einzeldateien zu Cluster 1–3 und Cluster 4–13.  
Wenn frühere Fassungen an irgendeiner Stelle anders klingen, gilt **dieses Dokument**.

## Verbindliche Planungsprämissen

1. **Die Build-Entscheidung ist gefallen:** Das System wird mit Replit als Eigenentwicklung gebaut.
2. **Die Marktsondierung dient nur noch als Benchmark.** Sie dient dazu, fehlende Funktionen, Governance-Muster und UX-Standards in das Zielbild einzubauen – nicht dazu, erneut über Build vs. Buy zu diskutieren.
3. Das Ziel ist **kein simples Wiki**, sondern eine **prozess- und wissensbasierte Campus-Plattform** für den gesamten Bildungscampus Backnang.
4. Das System muss von Beginn an **professionell, modern, anwenderfreundlich, auditierbar, revisionssicher und Teams-kompatibel** geplant werden.
5. **Versionen, Revisionen und Pflegehistorie** sind kein späteres Add-on, sondern Kernbestandteil des Systems.
6. **SharePoint/Graph** ist nicht nur Nutzerquelle, sondern auch relevante Integrations- und Medienquelle.
7. **OpenAI** ist als AI-Layer vorgesehen; interne Quellen haben Vorrang, Web-Recherche bleibt optional und administrierbar.

## Benchmark-Prinzip aus der Marktsondierung

Die folgenden Produkt- und Plattformmuster werden **nicht gekauft**, sondern als Qualitätsmaßstab für die Eigenentwicklung verwendet:

- **Confluence / Teams-Benchmark:** Bearbeiten, Teilen und Einbetten von Seiten direkt in Microsoft Teams; starke Versionierung, Inhaltsstruktur und Berechtigungslogik.
- **Docmost-Benchmark:** moderne Seitenerstellung über `+`, verschachtelte Unterseiten, Page History, Slash-Commands und Drag-and-Drop-orientierte Bedienung.
- **XWiki-Benchmark:** strukturierte Inhalte, Formulare, Rechte- und Governance-Tiefe, dokumentierte Enterprise-Integration.
- **Microsoft Teams Tabs:** Das Zielsystem wird als Teams-kompatible Webanwendung gedacht, nicht als nachträglich eingeklebte Seite.
- **Microsoft 365 Copilot Connectors:** Externe Quellen können später über Connector-Modelle copilotfähig gemacht werden; das erzwingt saubere ACL- und Source-Modelle.
- **OpenAI Responses / File Search / optional Web Search:** Der AI-Layer wird orchestriert, quellenbasiert und administrierbar gebaut.

## Verbindliche Zusatzanforderungen aus deiner Präzisierung

Diese Punkte sind **über alle Cluster hinweg** verpflichtend mitzuführen:

1. **Campus-weites Modell**
   - Das System muss den gesamten Bildungscampus abbilden können: zentrale Querschnittsprozesse, marken-/schulbezogene Prozesse, Bereiche, Teams, Rollen und Standorte.
   - Replit soll dies nicht als engen Ein-Bereichs-Wiki denken.

2. **Seitenanlage maximal einfach**
   - Auf Übersichtsseiten und an definierten Strukturstellen muss ein klarer `+`-Flow vorhanden sein.
   - Nutzer sollen neue Unterseiten, Bereiche, Prozesse, Use Cases, Richtlinien etc. mit minimalen Schritten anlegen können.
   - Wo fachlich sinnvoll, sollen auch **Child-Slots** bzw. definierte Abschnittsankerpunkte existieren, an denen Unterobjekte angelegt werden können.

3. **Moderner Editor mit Medien**
   - Drag & Drop für Bilder, Dateien, Videos und weitere Medien ist Pflicht.
   - Eingebettete Videos, Bilder, Dokumente und Diagramme müssen sauber, modern und governance-fähig eingebunden werden.
   - Medien müssen mit Metadaten, Referenzen, Berechtigungen und Wiederverwendung modelliert werden.

4. **SharePoint als Medien- und Wissensquelle**
   - SharePoint ist nicht nur ein Lesekanal für fremde Dokumente.
   - Es muss von Anfang an eine saubere Strategie geben, wie Medien in SharePoint-Dokumentbibliotheken abgelegt, referenziert, wiederverwendet und berechtigungsseitig kontrolliert werden.
   - Deshalb ist früh ein **Storage-Provider-Konzept** vorzusehen: z. B. lokaler Dev-Provider und produktiver SharePoint-Provider.

5. **Sichtbarer Versionsstamm**
   - Jede Seite braucht eine vollständig nachvollziehbare Pflegehistorie:
     - Revisionen
     - Versionen
     - Autor
     - Reviewer
     - Freigeber
     - Änderungsgrund
     - gültig ab
     - nächster Review
     - Restore-/Vergleichshistorie
   - Diese Pflegehistorie muss pro Seite sichtbar und sauber auditierbar sein.

6. **Zusätzliche Enterprise-Funktionen aus dem Benchmark**
   - Watcher / Abos / Benachrichtigungen
   - Kommentare / Annotationen
   - Backlinks / Related Content
   - Glossar / Taxonomie / Synonyme
   - Analytics / Pflegekennzahlen
   - Broken-Link-Erkennung
   - Favorites / Recent / persönliche Arbeitslisten
   - Trash / Restore / Archivlogik
   - page-level permissions
   - Verifizierungs-/Freigabestatus sichtbar im UI

7. **Template-Tiefe aus deinen Vorlagen**
   - Die gelieferten Vorlagen werden nicht nur optisch nachgebaut, sondern als strukturierte Seitentypen modelliert:
     - Gesamtprozess-Übersicht
     - Verfahrensanweisung
     - Verfahrensanweisung geleitet
     - Stellenprofil
   - Help-Text-/Guided-Template-Varianten müssen technisch möglich sein.

## Harte Sequenzregel

- **Cluster 2 darf erst starten, wenn Cluster 1 vollständig umgesetzt, auditiert und dokumentiert ist.**
- **Cluster 3 darf erst starten, wenn Cluster 2 vollständig umgesetzt, auditiert und dokumentiert ist.**
- **Cluster 4 darf erst starten, wenn Cluster 3 vollständig umgesetzt, auditiert und dokumentiert ist.**
- Danach werden **Cluster 4 bis 13 strikt sequentiell** abgearbeitet.
- Kein Vorziehen späterer Features.
- Kein stilles Überspringen einzelner Scope-Punkte.
- Bei Widersprüchen oder Architekturunklarheiten: **Stop und Rückfrage**.


## Globale Delivery-Regeln für alle Cluster

Diese Regeln gelten in jedem Cluster ohne Ausnahme:

1. Keine Hardcodings für konfigurierbare Werte.
2. Keine stillen Fallbacks im Runtime-Code.
3. Bestandsprüfung vor jeder Neuerstellung.
4. Bestehende Architektur zuerst prüfen, dann erweitern.
5. Altlasten im betroffenen Bereich direkt mitbereinigen.
6. Root-Cause-Fix statt Workaround.
7. Jede UI-relevante Änderung real im Frontend prüfen.
8. Jeder relevante Output real öffnen und prüfen.
9. Playwright-Evidenz für UI-/Workflow-/Output-relevante Pfade.
10. Dokumentation wird im selben Arbeitsschritt aktualisiert wie der Code.
11. Lint, Typecheck, Tests und No-Hardcode-Check sind Pflicht vor Abschluss.
12. Jeder Cluster endet mit Umsetzungsbericht, Audit-Report, Dateiliste, Frontend-/Output-Evidenz und offenen Punkten.

---


## Pflichtnachschärfung vor Cluster 1

Diese Punkte sind in Cluster 1 zusätzlich verbindlich:

- Die Entscheidung für die **Eigenentwicklung in Replit** ist als feste Architekturprämisse zu dokumentieren. Replit soll keine erneute Produkt-Auswahlrunde eröffnen.
- Lege ein **Benchmark-Feature-Register** an, in dem die aus Confluence, Docmost, XWiki, Teams und AI-gestützten Wissenssystemen abgeleiteten Zielmerkmale festgehalten werden.
- Lege die Architekturprämisse **Campus-first / Multi-Organisation / Multi-Brand** fest: Bildungscampus, Schulen/Marken, Bereiche, Teams, Standorte, Querschnittsfunktionen.
- Lege früh Provider-Abstraktionen fest für:
  - Auth / Identity
  - Storage / Medien
  - Search / Index
  - AI / Retrieval
  - Connectoren / Source Systems
  - Notifications
- Die bestehende Dokumentations-UI ist nicht nur zu prüfen, sondern – wenn tragfähig – als **zentrale Technik-/Audit-Doku-Oberfläche** mitzudenken.
- Ergebnis dieses Clusters muss auch eine klare Entscheidung sein, **wie** Medien-, Wissens- und Connector-Provider in der Architektur sauber austauschbar werden.

---

# Cluster 1 – Replit als sauberes Delivery-System aufsetzen

## Copy-Paste-Auftrag für Replit

### Titel
Cluster 1 – Delivery-Fundament, Agent-Playbook, Qualitäts-Gates, Dokumentation und Audit-Basis für das Enterprise-Wiki

### Ziel
Setze das Projekt so auf, dass ab jetzt **sauber, prüfbar, reproduzierbar und dokumentiert** entwickelt wird. Vor fachlichen Features muss das Repo ein belastbares Delivery-Fundament haben: Bestandsprüfung, Agent-Playbook, Config-Health, Audit-Basis, Logging, Dokumentationsstruktur, Test- und Qualitäts-Gates.

### Scope

1. Bestehendes Repo vollständig analysieren und Architekturkarte erstellen.
2. Das mitgelieferte Task-/Skill-Regelwerk in ein projektspezifisches Agent-Playbook übersetzen.
3. Einen verbindlichen Delivery-Workflow im Repo verankern.
4. Qualitäts-Gates einrichten: Lint, Typecheck, Tests, No-Hardcode-Check, Docs-Check.
5. Playwright-/E2E-Basis für reale Frontend-Prüfungen einrichten.
6. Konfigurations- und Secret-Handling professionell aufsetzen.
7. Logging-, Fehler- und Audit-Basis schaffen.
8. Die vorhandene Dokumentationsoberfläche prüfen und als zentrale Doku-Basis wiederverwenden, statt eine zweite Doku-Welt zu bauen.
9. Grundlegende technische Dokumentation, ADR-Struktur, Change Log und Tech Log aufsetzen.
10. Abschlussbericht und Audit-Bericht in einem verbindlichen Abgabeformat liefern.

### Nicht im Scope

- Fachliche Seitentypen bauen
- Editor bauen
- KI-Funktionen bauen
- Suche bauen
- Rollen- oder Freigabelogik final umsetzen
- SharePoint-/Graph-Integration fachlich vollständig bauen

### Verbindliche Leitplanken

- Vor jeder neuen Datei prüfen, ob bestehende Strukturen wiederverwendbar sind.
- Keine zweite Dokumentationslandschaft neben der vorhandenen Dokumentations-UI aufbauen.
- Keine Runtime-Defaults für kritische Konfigurationswerte.
- Keine Platzhalter-Implementierungen im finalen Code.
- Keine „temporären“ Hardcodings, die später entfernt werden sollen.
- Wenn ein Pflichtartefakt fehlt oder ein echter Frontend-Test nicht möglich ist: Stop und Rückfrage.

### Arbeitspakete / Tasks

#### Task 1.1 – Repo-Audit und Architekturkarte
**Beschreibung**
Analysiere das gesamte bestehende Projekt: Frontend, Backend, Datenbankzugriffe, Routen, Typdefinitionen, Dokumentationsmechanik, Build-/Test-Skripte, Settings-/Config-Handling, vorhandene Audit- oder Log-Strukturen.

**Definition of Done**
- Architekturkarte erstellt
- Hauptmodule und Datenflüsse dokumentiert
- Wiederverwendbare Bestandteile identifiziert
- technische Altlastenliste erstellt
- ADR „Current State“ erstellt

**Technische Anweisungen**
- Repo-weite Suche nach bestehenden Docs, Configs, Routen, Types, Validators, UI-Komponenten, Audit-/Log-Mechaniken
- Abhängigkeiten und Ankerpunkte dokumentieren
- Vorhandene Dokumentationsansicht explizit prüfen und bewerten

**Worauf besonders zu achten ist**
- Nicht vorschnell neue Ordner- oder Architekturschichten einführen
- Bestehende Dokumentationsmechanik möglichst als Single Source of Truth erhalten

---

#### Task 1.2 – Agent-Playbook und Delivery-Standard operationalisieren
**Beschreibung**
Übersetze das gelieferte Regelwerk in ein projektspezifisches Playbook, das ab jetzt für jeden Replit-Auftrag gilt.

**Definition of Done**
- `docs/96-AGENT-PLAYBOOK.md` erstellt oder aktualisiert
- verbindliche Checklisten für Bestandsprüfung, No-Hardcode, Frontend-Test, Output-Test, Regression und Dokumentation vorhanden
- Standard-Abgabeformat als Markdown-Vorlage angelegt
- Abschluss-Checkliste im Repo verankert

**Technische Anweisungen**
Das Playbook muss mindestens regeln:
- Search-first-Workflow
- Bestandsprüfung vor Neuerstellung
- Fail-fast statt stille Fallbacks
- Pflicht zur Altlastenbereinigung
- Verbot der Selbstabnahme
- Playwright-/Realprüfung bei UI-/Workflow-/Output-Themen
- Pflichtige Abgabeformate

**Worauf besonders zu achten ist**
- Nicht nur dokumentieren, sondern real in den Delivery-Prozess integrieren
- PLATO-spezifische Regelreste nicht blind übernehmen; die Disziplin übernehmen, aber das Projekt sauber auf das neue Wiki ausrichten

---

#### Task 1.3 – Qualitäts-Gates und lokale Build-Disziplin
**Beschreibung**
Richte technische Gates ein, damit künftig keine „schnellen“ unsauberen Änderungen durchrutschen.

**Definition of Done**
- standardisierte Scripts für `lint`, `typecheck`, `test`, `e2e`, `docs:check`, `no-hardcode-check` vorhanden oder auf bestehende Skripte gemappt
- Lint-Policy für geänderte Dateien dokumentiert
- Typecheck verpflichtend vor Abschluss
- Test-Runner sauber eingebunden
- Build-/Check-Reihenfolge dokumentiert

**Technische Anweisungen**
- Falls noch nicht vorhanden: `scripts/no-hardcode-check.*` anlegen
- Dokumentiere exakt, welche Kommandos vor jedem Task-Abschluss laufen müssen
- Warnungen nicht stillschweigend ignorieren

**Worauf besonders zu achten ist**
- Keine neue Regelquelle neben der existierenden Toolchain erzeugen
- Keine Ignore-Listen ohne technische Begründung

---

#### Task 1.4 – Playwright- und E2E-Grundgerüst
**Beschreibung**
Richte ein echtes Browser-Testgerüst ein. Dieses Projekt darf nicht auf API-Tests und Code-Review allein vertrauen.

**Definition of Done**
- Playwright läuft lokal und in der vorgesehenen Delivery-Pipeline
- Basistests für App-Start, Routing, Dokumentationsseite und mindestens einen realen UI-Pfad vorhanden
- Screenshot-/Trace-/Video-Artefakte werden gespeichert
- Testdaten-/Seed-Strategie dokumentiert

**Technische Anweisungen**
- Testumgebung sauber von produktiven Konfigurationen trennen
- Playwright-Konfiguration so anlegen, dass spätere Kernpfade leicht ergänzt werden können
- Fehlerzustände sichtbar testen

**Worauf besonders zu achten ist**
- Kein UI-relevanter Cluster-Abschluss ohne echte Frontend-Evidenz

---

#### Task 1.5 – Config-, Env- und Health-Fundament
**Beschreibung**
Schaffe eine saubere, fail-fast Konfigurationsbasis für Dev/Test/Prod und spätere Integrationen.

**Definition of Done**
- `.env`-/Secrets-Konzept dokumentiert
- Konfigurationsschema und Validierung vorhanden
- Health-Mechanismus für Pflichtkonfigurationen vorhanden
- sichtbare Fehlerbehandlung bei unvollständiger Konfiguration spezifiziert

**Technische Anweisungen**
- Schema-Validierung z. B. über Zod oder äquivalent
- Kritische Konfigurationswerte serverseitig validieren
- Kein Runtime-Fallback auf „Dummy“-Werte
- Konfigurationen logisch trennen: App, DB, Auth, Graph, AI, Storage, Feature Flags

**Worauf besonders zu achten ist**
- Defaults nur als Seed oder bewusst dokumentierte Initialwerte, nicht als stille Runtime-Rettung

---

#### Task 1.6 – Logging, Fehlertracking und Audit-Basis
**Beschreibung**
Richte die technische Nachvollziehbarkeit des Systems ein.

**Definition of Done**
- strukturierte Server-Logs vorhanden
- Request-/Correlation-ID eingeführt
- technische Fehlerklassen dokumentiert
- Audit-Basis für spätere fachliche Aktionen vorhanden
- sensible Daten werden nicht im Klartext geloggt

**Technische Anweisungen**
- JSON-Logs
- klare Trennung zwischen App-Logs, Audit-Events, Security-Events und Integrationsfehlern
- erste Audit-Tabelle oder Audit-Schnittstelle vorbereiten

**Worauf besonders zu achten ist**
- Kein „console.log“-Wildwuchs als Logging-Strategie

---

#### Task 1.7 – Dokumentationsstruktur, Tech Log und Change Log
**Beschreibung**
Schaffe eine belastbare technische Doku-Struktur und knüpfe sie an die bestehende Dokumentationsoberfläche an.

**Definition of Done**
- nummerierte Doku-Struktur festgelegt
- ADR-Struktur vorhanden
- Change Log vorhanden
- technisches Log / Incident Log vorhanden
- Release-Notes-Struktur vorbereitet
- bestehende Dokumentations-UI nutzt diese Struktur oder ist darauf planbar ausgerichtet

**Technische Anweisungen**
- Dokumentation als Markdown-First bzw. bestehende Doku-Single-Source aufsetzen
- Kategorien definieren: Architektur, Daten, Technik, KI, Sicherheit, Betrieb, Prozesse
- Exportfähigkeit prüfen: Gesamt-Markdown, ZIP, Config-Export, sofern bereits vorhanden

**Worauf besonders zu achten ist**
- Keine zweite Schatten-Dokumentation in zufälligen Files anlegen

---

#### Task 1.8 – Cluster-1-Abschluss und Delivery-Nachweis
**Beschreibung**
Liefer einen vollständigen Abnahme-Block für Cluster 1.

**Definition of Done**
- Umsetzungsbericht vollständig
- Audit-Report vollständig
- Liste geänderter Dateien vollständig
- dokumentierte Bestandsprüfung vorhanden
- Frontend-Evidenz vorhanden
- Output-Evidenz vorhanden, falls erzeugte Artefakte existieren
- offene Punkte und Risiken dokumentiert

**Technische Anweisungen**
Vor Cluster-Abschluss verpflichtend ausführen:
- `lint`
- `typecheck`
- `test`
- `e2e`
- `no-hardcode-check`
- `docs:check`

**Worauf besonders zu achten ist**
- Cluster 1 ist nur bestanden, wenn das Delivery-System real benutzbar ist und nicht nur beschrieben wurde

### Pflichtartefakte für Cluster 1

- Architekturkarte
- ADR „Current State“
- `docs/96-AGENT-PLAYBOOK.md`
- Standard-Abgabeformat für Folgecluster
- Playwright-Grundgerüst
- Config-/Health-Konzept
- Logging-/Audit-Basis
- Doku-/Tech-Log-Struktur
- Cluster-1-Umsetzungsbericht
- Cluster-1-Audit-Report

### Abgabeformat

Liefere am Ende von Cluster 1:
1. Umsetzungsbericht Punkt für Punkt gemäß Scope
2. Audit-Report mit Bestandsprüfung und Altlasten
3. Vollständige Dateiliste
4. Liste geprüfter Bestandsstrukturen
5. Frontend-Evidenzen
6. Output-Evidenzen
7. Reale Verifikation
8. Offene Punkte, Risiken und Folgeempfehlungen

---


## Pflichtnachschärfung vor Cluster 2

Diese Punkte sind in Cluster 2 zusätzlich verbindlich:

- Das Domain Model muss den **gesamten Bildungscampus** tragen können. Zusätzliche Kernentitäten oder nahe Verwandte sind vorzusehen, z. B.:
  - `organization_units`
  - `brands` / `schools`
  - `locations`
  - `business_functions`
  - `source_systems`
  - `storage_providers`
- Das Modell muss von Anfang an folgende Enterprise-Bausteine vorbereiten:
  - `page_watchers`
  - `page_comments` / `annotations`
  - `page_verifications`
  - `favorites`
  - `notifications`
  - `source_references`
- Das Modell muss die gelieferten Seitentemplates strukturiert tragen können:
  - Gesamtprozess-Übersicht mit Prozessschritten / Child-Links
  - Verfahrensanweisung mit Zweck, Geltungsbereich, Ausschlüssen, SIPOC, Swimlane, Detailablauf, RACI, KPIs
  - geleitete Verfahrensanweisung mit Hilfetexten und Mindest-Veröffentlichungskriterien
  - Stellenprofil mit Hierarchie, Zielsetzung, Kernaufgaben, Routinen, Schnittstellen, Kompetenzen, Erfolgskriterien, Datenschutz etc.
- Das Asset-/Medienmodell muss nicht nur Uploads kennen, sondern auch:
  - Quelle / Bibliothek / Pfad
  - Klassifikation
  - Caption / Alt-Text
  - Video-spezifische Metadaten
  - Transkript / Untertitel-Referenz
  - Verwendungsnachweise über mehrere Seiten
- Der Versionsstamm muss fachlich als **sichtbarer Stammbaum** vorbereitet werden, nicht nur als Liste technischer Snapshots.

---

# Cluster 2 – Domain Model, Content Graph, Versions-/Revisionslogik und immutable Identity

## Copy-Paste-Auftrag für Replit

### Titel
Cluster 2 – Fachliches Datenmodell, Content Graph, unveränderbare Identität, Hierarchie-Logik sowie Versions- und Revisionsstamm für das Enterprise-Wiki

### Ziel
Baue das fachliche Rückgrat des Systems: stabile Inhaltsobjekte, strukturierte Felder, Relationen, hierarchische Navigation, versionierte Inhalte, Revisionskette, Versionsstamm und serverseitige Identitäts-/Nummerierungslogik. Ohne dieses Modell darf kein Editor, kein Freigabeworkflow und keine KI-Funktion gebaut werden.

### Scope

1. Fachliches Datenmodell für Content, Revisionen, Templates, Relationen, Tags, Medien, Freigaben und Audit definieren.
2. Datenbanktabellen, Migrationen, Shared Types und Validierungslogik anlegen.
3. Tree + Graph parallel modellieren: Hierarchie plus Querverweise.
4. Unveränderbare Objektidentität serverseitig einführen.
5. Automatische Nummerierungslogik professionell designen.
6. Vollständige Versions- und Revisionslogik inkl. Versionsstamm aufsetzen.
7. Diffs, Restore-Regeln und Freigabe-Historie vorbereiten.
8. Query-Layer und Testdaten für einen Kernprozess mit Beispielseiten aufsetzen.
9. Dokumentation des fachlichen Modells und der Architekturentscheidungen liefern.

### Nicht im Scope

- finaler Rich-Text-Editor
- finales Suchfrontend
- KI-Oberflächen
- Teams-Einbettung
- vollständige Graph-/Auth-Umsetzung
- endgültige UI für alle Seitentypen

### Kritische Architekturentscheidung

**Wichtig:** Eine vollständig hierarchische Nummer, die gleichzeitig die aktuelle Baumposition widerspiegelt **und** für immer unveränderbar bleibt, ist bei späteren Umstrukturierungen fachlich widersprüchlich.

Darum ist der professionelle Standard hier:

1. **Immutable System-ID**
   - serverseitig vergeben
   - nie editierbar
   - nie neu vergeben
   - bleibt auch bei Verschiebung oder Umbenennung gleich

2. **Display-/Hierarchie-Nummer**
   - für Nutzer sichtbar
   - aus der aktuellen Struktur ableitbar
   - darf sich bei echter Umstrukturierung ändern
   - alte Werte werden als Alias-/Historienwerte nachvollziehbar gespeichert

Falls das Projekt stattdessen eine absolut unveränderbare hierarchische Fachnummer verlangt, muss Replit diese Konsequenz explizit dokumentieren: **nach Veröffentlichung sind strukturelle Moves dann nur noch über Neuanlage + Redirect/Alias zulässig.**

**Replit darf diese Kollision nicht ignorieren und nicht so tun, als könne ein einziges Feld beides gleichzeitig leisten.**

### Arbeitspakete / Tasks

#### Task 2.1 – Fachliches Kernmodell definieren
**Beschreibung**
Definiere das Kernmodell für Inhaltsobjekte, Revisionen, Templates, strukturierte Felder, Medien, Relationen, Tags, Freigabe-Events und Audit.

**Definition of Done**
- ER-Modell finalisiert
- fachliche Zustände dokumentiert
- Shared Types definiert
- Pflichtfelder je Kernentität definiert
- ADR zum Modell vorhanden

**Technische Anweisungen**
Das Modell muss mindestens diese logischen Bereiche abdecken:
- `core_processes`
- `content_nodes`
- `content_revisions`
- `content_revision_events`
- `content_templates`
- `content_relations`
- `content_tags`
- `media_assets`
- `review_workflows`
- `approvals`
- `audit_events`
- optional `content_aliases` für alte Display-Nummern / Redirects

**Worauf besonders zu achten ist**
- Stable Object getrennt von inhaltlichen Snapshots modellieren
- Kein Mischmodell, bei dem die aktuelle Seite und ihre Historie im selben Datensatz „mitgeschleppt“ werden

---

#### Task 2.2 – Datenbankschema, Migrationen und Shared Contracts
**Beschreibung**
Setze das Modell als belastbares Datenbankschema um.

**Definition of Done**
- Migrationen erstellt
- Constraints und Foreign Keys sauber gesetzt
- Shared Types zwischen Frontend und Backend vorhanden
- Validierungsschemas vorhanden
- Seed-/Fixture-Strategie vorhanden

**Technische Anweisungen**
- JSONB nur dort verwenden, wo flexible Snapshot-Strukturen sinnvoll sind
- strukturierte Pflichtfelder trotzdem relational absichern
- Enum-/State-Machine-Werte zentral definieren
- Soft-Delete, Archivierung und Restore-Regeln unterscheiden

**Worauf besonders zu achten ist**
- Nicht alles in ein einziges `content`-JSON-Feld kippen
- Nicht den Fehler machen, Revisionsdaten in `updated_at` und `version`-Strings zu verstecken

---

#### Task 2.3 – Tree + Graph parallel modellieren
**Beschreibung**
Das System braucht gleichzeitig eine klare Hierarchie und fachliche Querverbindungen.

**Definition of Done**
- Parent-/Child-Modell vorhanden
- Sibling-Lookup möglich
- fachliche Querverweise möglich
- Upstream-/Downstream-Bezüge modellierbar
- Zyklen in unzulässigen Relationsarten werden validiert

**Technische Anweisungen**
- `parent_node_id` für Primärhierarchie
- separate Relations-Tabelle für fachliche Beziehungen
- Relationstypen definieren, z. B. `related_to`, `uses_template`, `depends_on`, `implements_policy`, `upstream_of`, `downstream_of`, `replaces`, `references`
- Validierungslogik für unzulässige Selbst- oder Kreisreferenzen

**Worauf besonders zu achten ist**
- Ein reiner Baum reicht für Prozessmanagement fachlich nicht aus

---

#### Task 2.4 – Immutable Identity und Nummerierungsservice
**Beschreibung**
Implementiere die serverseitige Vergabe der stabilen Objektidentität und die automatische Display-Nummerierung.

**Definition of Done**
- Immutable System-ID funktioniert transaktional
- Display-/Hierarchie-Nummer funktioniert nachvollziehbar
- IDs werden nie clientseitig erzeugt
- UI kann IDs read-only anzeigen
- Tests für Parallelität und Race Conditions vorhanden

**Technische Anweisungen**
Empfohlener Standard:
- `immutable_id`: stabil, nicht editierbar, serverseitig
- `display_code`: aktueller hierarchischer Anzeige-Code
- `display_code_aliases`: Historie bisheriger Anzeige-Codes bei Umstrukturierung
- serverseitiger Namespace pro Kernprozess / Seitentyp / ggf. Bereich
- Vergabe in DB-Transaktion mit Locking / Sequence / Retry unter Kontrolle

**Worauf besonders zu achten ist**
- Umstrukturierungen dürfen niemals zur Neuvergabe der Immutable ID führen
- Keine clientseitige Nummernlogik
- Nicht dieselbe Spalte für permanente Identität und aktuelle Navigationsnummer missbrauchen

---

#### Task 2.5 – Versions- und Revisionslogik sauber trennen
**Beschreibung**
Baue einen professionellen Versionsstamm. „Version“ und „Revision“ sind nicht dasselbe und dürfen nicht technisch vermischt werden.

**Definition of Done**
- jede inhaltliche Änderung erzeugt eine nachvollziehbare Revision
- veröffentlichte Freigaben tragen eine echte Version
- Revisionskette ist vollständig sichtbar
- Diffs zwischen Revisionen möglich
- Restore-Regeln definiert
- Freigabe- und Review-Historie abbildbar

**Technische Anweisungen**
Empfohlene Logik:
- `content_node` = stabiles Objekt
- `content_revision` = unveränderlicher Snapshot pro Bearbeitungsstand
- `revision_no` = fortlaufend pro Objekt für **jede** Revision
- `version_label` = nur für veröffentlichte/freigegebene Stände, z. B. `1.0`, `1.1`, `2.0`
- `change_type` = `editorial`, `minor`, `major`, `regulatory`, `structural`
- `based_on_revision_id` = Herkunft der Revision
- `change_summary` und `changed_fields` dokumentieren, was geändert wurde
- Restore erzeugt **neue** Revision; historische Revisionen werden nie überschrieben

**Worauf besonders zu achten ist**
- `updated_at` ist keine Revisionshistorie
- Ein Publikationsstatus ersetzt keine Versionslogik
- Historische Snapshots dürfen niemals mutiert werden

---

#### Task 2.6 – Versionsstamm-Ansicht fachlich vorbereiten
**Beschreibung**
Baue die fachliche Grundlage für eine später sichtbare Versionsstamm-/Chronikansicht.

**Definition of Done**
- Abfrage für Versionsstamm vorhanden
- notwendige Datenfelder vorhanden
- Diffs und Verantwortlichkeiten referenzierbar
- Review-/Approval-Historie anschließbar

**Technische Anweisungen**
Der Versionsstamm muss mindestens liefern können:
- Version
- Revision
- Status
- Änderungsart
- Änderungssummary
- Autor
- Reviewer
- Approver/Freigeber
- erstellt am
- gültig ab
- nächstes Review
- Restore-/Vergleichsoption

**Worauf besonders zu achten ist**
- Die spätere UI muss auf diesem Modell aufsetzen können, ohne dass das Schema nochmals grundlegend umgebaut werden muss

---

#### Task 2.7 – Templates, strukturierte Felder und Seitentypen-Basis
**Beschreibung**
Schaffe das datenseitige Fundament für Seitentemplates und strukturierte Seitentypen.

**Definition of Done**
- Template-Struktur vorhanden
- Pflichtfelder und Feldtypen modelliert
- Seitentyp-Metadaten modelliert
- Validierung nach Seitentyp möglich

**Technische Anweisungen**
Berücksichtige mindestens:
- Kernprozess-Übersicht
- Bereichsübersicht
- Prozessseite Text
- Prozessseite Grafik/Swimlane
- Verfahrensanweisung / Arbeitsanweisung
- Use Case
- Richtlinie / Policy
- Rollen-/Stellenprofil
- Dashboardseite
- System-/Integrationsdoku

Prozessnahe strukturierte Felder müssen die späteren Inhalte tragen können, u. a.:
- Zweck & Geltungsbereich
- Ausschlüsse
- SIPOC
- Ablauf / Swimlane / Detailschritte
- RACI
- KPIs
- Schnittstellen / Systeme
- Risiken & Kontrollen
- Normbezug / Compliance
- Dokumente / Vorlagen

**Worauf besonders zu achten ist**
- Das Template-Modell muss strukturierte Pflichtfelder tragen; Freitext ist Ergänzung, nicht Ersatz

---

#### Task 2.8 – Query-Layer, Beispielseed und Tests
**Beschreibung**
Lege einen sauberen Query-Layer an und hinterlege Seed-Daten, damit das Modell real getestet werden kann.

**Definition of Done**
- Beispiel-Kernprozess mit Beispielknoten vorhanden
- Beispielrelationen vorhanden
- Beispielrevisionen und Versionen vorhanden
- Tests für Kernpfade vorhanden

**Technische Anweisungen**
Teste mindestens:
- Anlage eines Content Nodes
- Vergabe von immutable_id und display_code
- Anlage mehrerer Revisionen
- Versionserzeugung bei Freigabe
- Umstrukturierung mit Alias-/Historienlogik
- Graph-Relationen und Zyklusvalidierung

**Worauf besonders zu achten ist**
- Keine rein synthetischen Unit-Tests ohne realen fachlichen Beispielpfad

---

#### Task 2.9 – Cluster-2-Abschluss und Architektur-Nachweis
**Beschreibung**
Liefere eine belastbare Abnahme des Datenmodells.

**Definition of Done**
- Datenmodell dokumentiert
- Migrationen erfolgreich
- Kernpfade getestet
- Versions-/Revisionslogik nachgewiesen
- Nummerierungskonzept dokumentiert
- offene Architekturentscheidungen explizit markiert

**Technische Anweisungen**
Vor Cluster-Abschluss verpflichtend ausführen:
- `lint`
- `typecheck`
- `test`
- relevante Integrations-/E2E-Tests
- `no-hardcode-check`
- `docs:check`

### Pflichtartefakte für Cluster 2

- ER-Modell / Datenmodell-Dokument
- ADR zur ID-/Nummerierungslogik
- ADR zur Versions-/Revisionslogik
- Migrationen
- Shared Types / Schemas
- Seed-Daten
- Testnachweise
- Cluster-2-Umsetzungsbericht
- Cluster-2-Audit-Report

### Abgabeformat

Liefere am Ende von Cluster 2:
1. Umsetzungsbericht Punkt für Punkt gemäß Scope
2. Audit-Report mit Bestandsprüfung und Modellentscheidungen
3. Dateiliste
4. geprüfte Bestandsstrukturen
5. Test- und Evidenznachweise
6. klare Erklärung der ID-/Nummerierungsentscheidung
7. klare Erklärung der Versions-/Revisionslogik
8. offene Punkte und Risiken

---


## Pflichtnachschärfung vor Cluster 3

Diese Punkte sind in Cluster 3 zusätzlich verbindlich:

- Personenfelder müssen nicht nur gegen Microsoft Graph allgemein funktionieren, sondern so modelliert werden, dass später **SharePoint-/M365-nahe Gruppen- und Rollenlogik** sauber andockt.
- Das Rechtemodell muss Ebenen für
  - Campus
  - Marke/Schule
  - Kernprozess
  - Bereich
  - Seite
  - Revision/Workflow
  tragen können.
- Es ist früh festzulegen, wie **delegierte Nutzerkontexte** und **app-/servicebasierte Integrationszugriffe** sauber getrennt werden.
- Für spätere SharePoint-Medienablage und Connectoren sind die notwendigen Auth-/Permission-Pfade strukturiert vorzubereiten; keine direkte Wildwuchs-Integration in spätere Cluster verschieben.
- Rollen- und Ownership-Modell müssen klar trennen zwischen:
  - fachlicher Verantwortung
  - Bearbeitungsrecht
  - Freigaberecht
  - administrativer Systemhoheit

---

# Cluster 3 – Auth, Graph, Rollen, Rechte, Ownership und Freigabeberechtigungen

## Copy-Paste-Auftrag für Replit

### Titel
Cluster 3 – Microsoft-SSO, Graph-Abstraktionslayer, Rollen- und Rechtemodell, Ownership sowie Rechte für Bearbeitung, Review und Freigabe

### Ziel
Setze Identität und Berechtigungen professionell auf: SSO über Microsoft, Benutzer- und Gruppenbezug über Graph, Rollenmatrix, page-level permissions, Ownership, Stellvertretung sowie getrennte Rechte für Content, Struktur, Review und Freigabe. Spätere Workflows und KI-Funktionen dürfen nie auf Freitext-Personen oder impliziten Rechten basieren.

### Scope

1. Authentifizierung über Microsoft/Entra-ID aufsetzen.
2. Teams-kompatible Auth-Strategie fachlich und technisch vorbereiten.
3. Graph-Abstraktionslayer für Benutzer, Gruppen und Personensuche bauen.
4. Lokales Principal-/Identity-Modell definieren, ohne ein Shadow-User-System für Menschen zu bauen.
5. Rollen- und Rechtemodell definieren und implementieren.
6. Page-Level-Permissions, Vererbung und Overrides umsetzen.
7. Ownership, Stellvertretung, Reviewer und Freigeber nur aus Graph-Principals auswählbar machen.
8. Rechte auf Revisions- und Workflow-Ebene berücksichtigen.
9. Auditierung sicherheits- und governance-relevanter Rechteaktionen einführen.
10. Dokumentation, Tests und Abnahme liefern.

### Nicht im Scope

- vollständige Teams-App-Verpackung
- produktiver SharePoint-Content-Connector
- finales Review-Dashboard
- finaler Admin-Bereich für alle Integrationen
- spätere KI-Policies und RAG-Logik

### Verbindliche Leitplanken

- Kein lokales Passwortsystem.
- Kein Freitextfeld für Verantwortliche, Stellvertretung, Reviewer oder Freigeber.
- Rollen sind nicht gleichbedeutend mit Ownership.
- Content-Bearbeitung und Struktur-Bearbeitung sauber trennen.
- Review und Freigabe dürfen technisch getrennt sein, auch wenn sie organisatorisch anfangs derselben Gruppe zugeordnet werden.
- Rechte dürfen nicht nur im Frontend ausgeblendet, sondern müssen serverseitig erzwungen werden.

### Arbeitspakete / Tasks

#### Task 3.1 – Entra-SSO und Session-/Token-Architektur
**Beschreibung**
Setze die Login- und Session-Basis sauber auf.

**Definition of Done**
- Login über Microsoft funktioniert
- Benutzerkontext serverseitig validierbar
- Session-/Token-Handling dokumentiert
- tenantgebundene Validierung vorhanden
- Teams-Kompatibilität fachlich vorbereitet

**Technische Anweisungen**
- OIDC/OAuth2 auf Basis der bestehenden App-Architektur
- Delegated-Flow für User-Kontext bevorzugen, wenn passend
- Session-/Token-Handling sauber kapseln
- Fehlerzustände für fehlende Zustimmung / fehlende Berechtigungen sichtbar behandeln

**Worauf besonders zu achten ist**
- Keine zweite Identitätsquelle für Mitarbeiter bauen
- Keine Auth-Logik nur im Frontend

---

#### Task 3.2 – Graph-Abstraktionslayer für Benutzer, Gruppen und Personenpicker
**Beschreibung**
Baue eine saubere technische Schicht zwischen App und Microsoft Graph.

**Definition of Done**
- Personensuche funktioniert
- Gruppensuche bzw. definierte Gruppenauslese funktioniert
- Principals können für Ownership-/Review-/Freigabefelder verwendet werden
- Caching-/Sync-Strategie dokumentiert

**Technische Anweisungen**
- kein direkter Wildwuchs von Graph-Calls in UI-Komponenten
- zentraler Service/Adapter für Graph-Zugriffe
- lokale Cache-/Projection-Tabelle nur als technische Beschleunigung, nicht als führende Wahrheit
- minimal nötige Permissions beantragen und dokumentieren

**Worauf besonders zu achten ist**
- Freitexteingabe für Personen verbieten
- Fehler- und Rate-Limit-Verhalten sauber behandeln

---

#### Task 3.3 – Lokales Principal-Modell und Zuordnungslogik
**Beschreibung**
Lege fest, wie externe Identitäten intern referenziert werden.

**Definition of Done**
- lokales Principal-Modell vorhanden
- Benutzer, Gruppen und ggf. Service Principals unterscheidbar
- Mapping von externen IDs auf interne Referenzen dokumentiert
- Deaktivierung / fehlende Auflösung fachlich behandelbar

**Technische Anweisungen**
Empfohlenes Modell:
- `principals`
  - `principal_type` = `user`, `group`, optional `service_principal`
  - `external_provider` = `microsoft_graph`
  - `external_id`
  - `display_name`
  - `email/upn`
  - `status`
- Ownership- und Rechtebeziehungen immer auf `principal_id`
- keine führende Stammdatenhaltung für Menschen im Wiki selbst

**Worauf besonders zu achten ist**
- Dieses Modell ist Referenzschicht, kein Schattenverzeichnis

---

#### Task 3.4 – Rollenmatrix und Berechtigungsmodell
**Beschreibung**
Definiere Rollen und Rechte klar und serverseitig erzwingbar.

**Definition of Done**
- Rollenmatrix dokumentiert
- serverseitige Permission-Checks vorhanden
- klare Trennung von Content, Struktur, Review, Approval und Admin
- Berechtigungen für Seiten und Revisionen anschließbar

**Technische Anweisungen**
Empfohlene Startrollen:
- `system_admin`
- `process_manager`
- `editor`
- `reviewer`
- `approver`
- `viewer`
- optional `compliance_manager`

Empfohlene Start-Rechte:
- `read_page`
- `create_page`
- `edit_content`
- `edit_structure`
- `manage_relations`
- `submit_for_review`
- `review_page`
- `approve_page`
- `archive_page`
- `manage_permissions`
- `manage_templates`
- `manage_settings`
- `view_audit_log`

**Worauf besonders zu achten ist**
- Nicht in groben Rollenlabels steckenbleiben; die technischen Permission-Bits müssen explizit definiert werden

---

#### Task 3.5 – Page-Level-Permissions, Vererbung und Overrides
**Beschreibung**
Setze seitenbezogene Rechte und Vererbungsregeln um.

**Definition of Done**
- Rechtevererbung entlang der Hierarchie möglich
- per Seite Overrides möglich
- Lesen, Bearbeiten, Review, Freigabe und Admin pro Seite differenzierbar
- Ownership von Bearbeitungsrecht getrennt

**Technische Anweisungen**
- Standard: Hierarchische Vererbung mit expliziten Overrides
- Nur so viel Komplexität wie nötig; keine überladene ACL-Maschinerie im ersten Schritt
- Serverseitige Auflösung der effektiven Rechte
- Konfliktregeln dokumentieren

**Worauf besonders zu achten ist**
- Explizite Deny-Regeln nur, wenn fachlich wirklich nötig
- Rechte dürfen nicht nur als UI-Sperre existieren

---

#### Task 3.6 – Ownership, Stellvertretung, Reviewer und Freigeber
**Beschreibung**
Bilde Governance-Rollen auf Seiten- und Revisionsobjekten ab.

**Definition of Done**
- Owner auswählbar aus Graph-Principals
- Stellvertretung auswählbar aus Graph-Principals
- Reviewer/Freigeber technisch abbildbar
- Verantwortlichkeiten in Inhalt, Revision und Workflow referenzierbar

**Technische Anweisungen**
- Owner ist Metadatum, nicht automatisch gleich Bearbeitungsrecht
- Stellvertretung ist kein technischer Vollersatz für alle Rechte, sondern eine bewusst definierte Governance-Funktion
- Review- und Approval-Zuordnungen auf Revisionsebene vorbereiten

**Worauf besonders zu achten ist**
- Keine versteckte Kopplung „Owner = darf alles“

---

#### Task 3.7 – Revisions- und Workflow-Berechtigungen anschließen
**Beschreibung**
Verbinde das Rollenmodell mit den in Cluster 2 gebauten Revisionen und Statusübergängen.

**Definition of Done**
- Nur berechtigte Nutzer können Revisionen anlegen, einreichen, prüfen, freigeben oder archivieren
- Rechteprüfungen sind serverseitig vorhanden
- Audit-Events für kritische Status- und Rechteänderungen vorhanden

**Technische Anweisungen**
- Rechteprüfungen auf API-/Service-Ebene
- Workflow-Transitions gegen Rollen und effektive Rechte validieren
- Konfliktfälle sauber als Fehlermeldung zurückgeben

**Worauf besonders zu achten ist**
- Kein Vertrauen in Frontend-only Guards

---

#### Task 3.8 – Sicherheit, Least Privilege und Fehlermodi
**Beschreibung**
Richte die Auth-/Rechte-Schicht mit sauberer Sicherheitslogik ein.

**Definition of Done**
- angeforderte Graph-/Auth-Berechtigungen dokumentiert
- Least-Privilege-Ansatz dokumentiert
- fehlende Einwilligungen / Scope-Probleme sichtbar behandelbar
- Sicherheitsrelevante Logs und Audit-Ereignisse vorhanden

**Technische Anweisungen**
- dokumentiere exakt, welche Microsoft-Berechtigungen benötigt werden und wofür
- minimal starten, nicht überprivilegieren
- sichere Fehlerantworten und Admin-Hinweise für Consent-/Permission-Probleme

**Worauf besonders zu achten ist**
- Keine pauschale Directory-Vollmacht, wenn kleinere Scopes reichen

---

#### Task 3.9 – Tests, Evidenzen und Cluster-Abschluss
**Beschreibung**
Liefere eine prüfbare Abnahme der Auth- und Rechtebasis.

**Definition of Done**
- Login-Pfade getestet
- Rollen-/Rechtepfade getestet
- unberechtigte Zugriffe negativ getestet
- Personenauswahl real geprüft
- Audit-/Log-Nachweise vorhanden
- Dokumentation vollständig

**Technische Anweisungen**
Teste mindestens:
- erfolgreicher Login
- fehlende Berechtigung
- Auswahl eines Owners aus Graph-Principals
- Vererbung und Override von Seitenrechten
- unzulässiger Freigabeversuch ohne Approver-Recht
- auditierter Statuswechsel mit berechtigtem Nutzer

Vor Cluster-Abschluss verpflichtend ausführen:
- `lint`
- `typecheck`
- `test`
- relevante Integrations-/E2E-Tests
- `no-hardcode-check`
- `docs:check`

### Pflichtartefakte für Cluster 3

- Auth-/Session-ADR
- Graph-Adapter-/Permissions-Dokument
- Rollenmatrix
- Permission-Matrix
- Principal-Modell-Dokument
- Seitenrechte-/Vererbungs-Dokument
- Test- und Auditnachweise
- Cluster-3-Umsetzungsbericht
- Cluster-3-Audit-Report

### Abgabeformat

Liefere am Ende von Cluster 3:
1. Umsetzungsbericht Punkt für Punkt gemäß Scope
2. Audit-Report mit Bestandsprüfung und Altlasten
3. Dateiliste
4. geprüfte Bestandsstrukturen
5. Frontend- und Test-Evidenzen
6. Beschreibung der effektiven Rollen- und Rechteauflösung
7. Dokumentation der benötigten Microsoft-Berechtigungen
8. offene Punkte, Restrisiken und Empfehlungen für Cluster 4

---

# Empfohlene Übergaberegel an Replit zwischen den Clustern

Nach jedem Cluster ist Replit explizit zu verpflichten, **nicht einfach weiterzubauen**, sondern zuerst zu liefern:

1. Scope-vs.-Ergebnis-Abgleich
2. Audit-Report
3. Liste aller geänderten Dateien
4. Bestandsprüfung
5. Frontend-/Output-Evidenzen
6. offene Punkte
7. konkrete Empfehlung für den nächsten Cluster

---


## Pflichtnachschärfung vor Cluster 4

Diese Punkte sind in Cluster 4 zusätzlich verbindlich:

- Die Startseite ist als **campusweiter Knowledge Hub** zu bauen, nicht als generische Homepage.
- Die IA muss sowohl kernprozesszentrierte Navigation als auch Querschnittssichten auf Marken/Schulen, Bereiche, Rollen, Richtlinien und Dashboards unterstützen.
- Shell-Module für **Favoriten, zuletzt genutzt, Watchlist und persönliche Aufgabenlisten** sind strukturell mitzudenken.
- Campus-, Marken- und Bereichsfilter dürfen nicht nachträglich angeklebt werden; sie müssen aus IA und Routing ableitbar sein.

---

# Cluster 4 – Informationsarchitektur, Knowledge Hub und Kernprozess-Stammdaten

## Copy-Paste-Auftrag für Replit

### Titel
Cluster 4 – Informationsarchitektur, Startseite, Kernprozess-Hub, Navigation und Stammdatenverwaltung für das Enterprise-Wissensmanagement

### Ziel
Baue das sichtbare fachliche Grundgerüst des Systems: Startseite, Kernprozess-Hub, Navigationslogik, Breadcrumbs, Tree-Navigation und die Stammdatenverwaltung für Kernprozesse, Bereiche und übergeordnete Strukturelemente. Dieses Cluster schafft die informationsarchitektonische Oberfläche, auf der Seitentypen, Templates und Editor später sauber aufsetzen.

### Scope

1. Informationsarchitektur für den gesamten Bildungscampus als formales Modell und UI-Struktur definieren.
2. Startseite / Knowledge Hub mit klarer Kernprozess-Navigation bauen.
3. Kernprozess-Stammdatenverwaltung in den Einstellungen aufsetzen.
4. Navigationselemente wie Tree, Breadcrumbs, Parent-/Child-Navigation und Schnellzugriffe bauen.
5. Platzhalter-Einstiegspunkte für Suche und AI sauber in die Shell integrieren, aber noch nicht fachlich voll ausbauen.
6. Dashboard-Kacheln für Review-Risiken, unvollständige Seiten und offene Pflegefälle als Shell vorbereiten.
7. Teams-taugliche responsive Shell bauen.

### Nicht im Scope

- finaler Rich-Text-Editor
- finales Suchsystem
- finale AI-Antwortlogik
- fertige Seitentemplates
- finaler Freigabeworkflow
- produktive SharePoint-Inhalts-Synchronisation

### Verbindliche Leitplanken

- Keine zweite Navigation neben der Primärhierarchie und keine widersprüchlichen Menülogiken.
- Startseite darf nicht wie ein Dokument aussehen, sondern wie ein **Knowledge Hub**.
- Kernprozess-Stammdaten werden zentral administriert; deren Codes und Bezeichner dürfen nicht verteilt im Content gepflegt werden.
- Übersichtsseiten müssen auch ohne Editor bereits klar, nüchtern und belastbar funktionieren.
- Such- und AI-Einstieg in der Shell jetzt nur so weit bauen, dass spätere Cluster nicht refaktoriert werden müssen.

### Arbeitspakete / Tasks

#### Task 4.1 – Informationsarchitektur formal definieren
**Beschreibung**  
Definiere die IA des Gesamtsystems: Hub, Kernprozess-Ebene, Bereichsebene, Prozess-/Policy-/Use-Case-Ebene, Hilfs- und Querschnittsebenen.

**Definition of Done**
- IA-Map dokumentiert
- Navigationsebenen beschrieben
- URL-/Routing-Schema dokumentiert
- Seitenrollen je Ebene definiert
- ADR zur IA vorhanden

**Technische Anweisungen**
- Routing nicht nur nach UI, sondern nach Domain-Modell aufsetzen
- klare Trennung von:
  - Hub-/Landingseiten
  - Inhaltsseiten
  - Dashboardseiten
  - Settings-/Adminseiten
- Slug-/Path-Konzept mit immutable Referenzmodell abstimmen

**Worauf besonders zu achten ist**
- Keine implizite Wiki-Struktur „einfach nach Dateien“
- keine Vermischung von Navigation und Berechtigung

---

#### Task 4.2 – Startseite / Knowledge Hub bauen
**Beschreibung**  
Baue die Startseite als professionellen Einstiegspunkt mit Kernprozesskarten, prominenter Suche, AI-Eingabefeld-Platzhalter, Schnellzugriffen und Pflegehinweisen.

**Definition of Done**
- Startseite produktionsreif als Shell vorhanden
- Kernprozesse werden aus Stammdaten geladen
- Schnellzugriffe und Pflegehinweise visualisiert
- AI-/Sucheinstieg ist sauber platziert
- Playwright-Evidenz für Responsiveness und Kerninteraktion vorhanden

**Technische Anweisungen**
Mindestelemente:
- prominentes Such-/AI-Feld
- Kernprozess-Kacheln / Listenansicht
- zuletzt bearbeitet
- Review fällig
- unvollständige Seiten
- Admin-/Prozessmanager-Kurzinfos je Rolle
- personalisierte Schnellzugriffe

**Worauf besonders zu achten ist**
- Nicht als statische Marketing-Homepage bauen
- Rolle und Kontext des Nutzers berücksichtigen

---

#### Task 4.3 – Kernprozess-Stammdatenverwaltung
**Beschreibung**  
Baue einen Settings-Bereich zur Pflege von Kernprozessen, Kürzeln, Sortierung, Sichtbarkeit, Default-Review-Regeln und Basis-Metadaten.

**Definition of Done**
- Kernprozess-Stammdaten können administriert werden
- Kürzel/Display-Regeln validiert
- Sortierung steuerbar
- Aktiv-/Archivstatus vorhanden
- Änderungen sind auditierbar

**Technische Anweisungen**
Felder mindestens:
- Name
- Kürzel
- Kurzbeschreibung
- Sortierung
- Status aktiv/inaktiv/archiviert
- optional Standard-Owner-Gruppe
- optionale Standard-Review-Policy
- Sichtbarkeit / Zielgruppe

**Worauf besonders zu achten ist**
- Kürzeländerungen dürfen bestehende immutable IDs nie brechen
- Stammdaten dürfen nicht als Freitext irgendwo im Frontend entstehen

---

#### Task 4.4 – Tree-Navigation, Breadcrumbs und Kontextnavigation
**Beschreibung**  
Baue die generische Navigationskomponente für Parent-/Child-/Sibling-/Breadcrumb-Darstellung.

**Definition of Done**
- Tree-Navigation funktioniert
- Breadcrumbs funktionieren
- Parent-/Child-Navigation sichtbar
- Sibling-Navigation vorbereitet
- tiefe Hierarchien funktionieren visuell sauber

**Technische Anweisungen**
- Navigation datengetrieben aus Content Graph lesen
- Rechtefilterung serverseitig berücksichtigen
- mobile und Teams-kompatible Darstellung absichern

**Worauf besonders zu achten ist**
- keine doppelte Logik zwischen Tree, Breadcrumb und Detailseite
- keine Anzeige von Objekten ohne Leserecht

---

#### Task 4.5 – Rollenabhängige Hub-Module
**Beschreibung**  
Baue die Shell für rollenabhängige Startmodule, z. B. Prozessmanager, Redakteure, Prüfer oder Betrachter.

**Definition of Done**
- rollenabhängige Module werden korrekt ein-/ausgeblendet
- keine Rechteumgehung über UI
- Admin-/Prozessmanager-Module vorbereitet
- Betrachter sehen reduzierte Shell

**Technische Anweisungen**
Beispiele:
- Prüfer: offene Freigaben / Review-Tasks
- Prozessmanager: Qualitätsrisiken / Dubletten-Hinweise
- Redakteur: eigene Entwürfe / Pflegefälle
- Betrachter: letzter Zugriff / Favoriten / Kernprozesse

**Worauf besonders zu achten ist**
- UI-Sichtbarkeit ist Ergänzung, keine Ersatzlogik für Backend-Rechte

---

#### Task 4.6 – Dokumentation und Abnahme
**Beschreibung**  
Dokumentiere IA, Navigation, Stammdatenmodell und Shell-Verhalten.

**Definition of Done**
- Fachdoku aktualisiert
- Tech Log aktualisiert
- ADR aktualisiert
- Screenshots und Testevidenzen dokumentiert

### Erwartete Artefakte
- Knowledge-Hub-Shell
- Kernprozess-Stammdatenverwaltung
- Tree-/Breadcrumb-Komponenten
- IA-Dokumentation
- Cluster-4-Audit-Report

### Abgabeformat
1. Umsetzungsbericht gemäß Scope  
2. Audit-Report  
3. Dateiliste  
4. Liste geänderter Routen / Komponenten / Modelle  
5. Frontend-Evidenzen  
6. Offene Punkte / Risiken / Folgeempfehlungen

---


## Pflichtnachschärfung vor Cluster 5

Diese Punkte sind in Cluster 5 zusätzlich verbindlich:

- Der `+`-Flow ist nicht nur auf Übersichtsseiten, sondern auch an **definierten Child-Slots / Abschnittsankern** vorzusehen, wenn ein Seitentyp dort fachlich Unterobjekte zulässt.
- Für Templates sind **Standard- und Guided-Varianten** zu unterstützen.
- Die durch deine Vorlagen nahegelegten Feldgruppen sind explizit abzubilden:
  - Prozesskopf mit Titel, Prozess-ID, Gültig ab, nächstes Review, Owner, Stellvertretung, Kategorie, Status, Version
  - Zweck & Geltungsbereich
  - Ausschlüsse
  - SIPOC
  - Ablauf / Swimlane / Detailablauf
  - RACI
  - KPIs
  - Schnittstellen / Systeme / Dokumente / Vorlagen
  - Risiken / Kontrollen / Normbezug
  - Stellenprofil-spezifische Felder
- Help-Texte aus der „geleiteten“ Vorlage müssen pro Feld oder Sektion konfigurierbar sein.
- Vollständigkeitslogik muss nicht nur Pflichtfelder, sondern auch **Pflichtsektionen je Seitentyp** kennen.

---

# Cluster 5 – Seitentypen, Templates, Feldschema und Erstellungsflow

## Copy-Paste-Auftrag für Replit

### Titel
Cluster 5 – Seitentypen, strukturierte Templates, professionelle Metadatenfelder und Plus-/Erstellungsflow für das Enterprise-Wiki

### Ziel
Setze die fachliche Oberfläche für Seitentypen, Templates, strukturierte Metadaten und den Erstellungsworkflow um. Nutzer sollen von Übersichtsseiten aus einfach neue Bereiche, Prozesse, Use Cases, Richtlinien oder andere Seitentypen anlegen können. Gleichzeitig müssen Pflichtfelder, Standardlayouts und Validierungen professionell geführt werden.

### Scope

1. Seitentyp-Registry im Frontend und Backend implementieren.
2. Template-Verwaltung aufsetzen.
3. Professionelle Metadatenfelder pro Seitentyp definieren und UI-seitig rendern.
4. Plus-/Erstellungsflow von Übersichtsseiten aus umsetzen.
5. Standardlayouts je Seitentyp implementieren.
6. People-Picker für Owner, Stellvertretung, Reviewer, Freigeber anbinden.
7. Vollständigkeits-/Pflichtfeldanzeige auf Seitenebene vorbereiten.

### Nicht im Scope

- finaler Block-Editor mit allen Medienblöcken
- finale AI-Inhalte
- produktive Quellsynchronisation
- finale Dashboard-Analytik

### Verbindliche Leitplanken

- Seitentypen sind konfigurierbare Systemobjekte, keine verstreuten Switch-Case-Inseln.
- Templates sind strukturierte Ausgangspunkte, nicht bloße Dummy-Texte.
- Personenfelder kommen ausschließlich aus Microsoft-Identitäten.
- Pflichtfelder und Pflegezustände müssen maschinenlesbar sein.
- Übersichtsseiten müssen das Anlegen von Child-Objekten direkt unterstützen.

### Arbeitspakete / Tasks

#### Task 5.1 – Seitentyp-Registry und Template-Registry
**Beschreibung**  
Baue eine Registry für Seitentypen und Templates, damit Frontend und Backend dieselbe Quelle für Felder, Layouts und Regeln verwenden.

**Definition of Done**
- Seitentyp-Registry vorhanden
- Template-Registry vorhanden
- Shared Contracts vorhanden
- Seitentypen können aktiviert/deaktiviert werden
- zentrale Validierungsanbindung vorhanden

**Technische Anweisungen**
Mindestens unterstützen:
- Startseite / Hub
- Kernprozess-Übersicht
- Bereichsübersicht
- Prozessseite Text
- Prozessseite Grafik
- Verfahrensanweisung / Arbeitsanweisung
- Use Case
- Richtlinie / Policy
- Rollen-/Stellenprofil
- Vorlagen-/Dokumentseite
- Dashboardseite
- System-/Integrationsdoku

**Worauf besonders zu achten ist**
- keine pro Seitentyp frei erfundene Sonderlogik ohne Registry-Eintrag

---

#### Task 5.2 – Professionelle Metadatenfelder und Feldgruppen
**Beschreibung**  
Rendere professionelle Seitenkopf- und Metadatenbereiche mit Feldern, Feldgruppen und Validierung.

**Definition of Done**
- gemeinsame Pflichtfelder sichtbar
- seitentypabhängige Zusatzfelder sichtbar
- Validierungszustände sichtbar
- Pflichtfeldfehler nutzerfreundlich
- Feldgruppen sauber gegliedert

**Technische Anweisungen**
Gemeinsame Feldgruppen mindestens:
- Identität & Typ
- Governance
- Verantwortlichkeiten
- Geltung & Pflege
- Klassifikation
- Quellen & Referenzen
- Tags / Taxonomie

Pflichtfelder mindestens:
- immutable ID
- Display-Code
- Titel
- Kurzbeschreibung
- Seitentyp
- Status
- Version / Revision-Info
- Owner
- Stellvertretung
- Review-Zyklus
- Gültig ab
- letzter Review / nächster Review
- Sichtbarkeit / Klassifikation
- Tags

**Worauf besonders zu achten ist**
- Metadaten dürfen nicht als optisches Beiwerk behandelt werden
- keine Freitext-Personenfelder

---

#### Task 5.3 – Plus-Flow / Seitenerstellung von Übersichtsseiten aus
**Beschreibung**  
Implementiere den einfachen Erstellungsflow: Plus klicken, Seitentyp wählen, Parent übernehmen, Template wählen, Seite anlegen.

**Definition of Done**
- Plus-Button auf relevanten Übersichtsseiten vorhanden
- Seitentypauswahl funktioniert
- Parent-Kontext wird korrekt übernommen
- Default-Template kann vorgeschlagen werden
- ID/Display-Code werden serverseitig vergeben und read-only angezeigt

**Technische Anweisungen**
Flow mindestens:
1. Ausgang von Parent-Seite
2. Auswahl Seitentyp
3. Auswahl Template
4. Vorbelegung Parent / Kernprozess / Bereich
5. People-Felder setzen
6. Anlegen als Entwurf
7. Weiterleitung in Bearbeitungsansicht

**Worauf besonders zu achten ist**
- clientseitige Vorab-IDs nur optisch anzeigen, niemals final vergeben
- keine Navigation ohne Parent-Kontext, wenn Child-Typ das erfordert

---

#### Task 5.4 – Standardlayouts je Seitentyp
**Beschreibung**  
Baue die sichtbaren Grundlayouts je Seitentyp.

**Definition of Done**
- Grundlayouts vorhanden
- Layouts nutzen Feldschema und Slot-Modell
- Platzhalterbereiche für spätere Blöcke vorhanden
- klare Unterscheidung der Seitentypen im UI

**Technische Anweisungen**
Beispiele:
- Prozessübersicht: Child-Liste + Metadaten + KPI-/Statusleiste
- Prozess Text: Metadaten + strukturierte Prozesssektionen
- Prozess Grafik: Metadaten + Diagramm-Slot + Detailtext
- Verfahrensanweisung: Geltung, Zweck, Ablauf, Dokumente, Kontrollen
- Rollenprofil: Aufgaben, Verantwortungen, Schnittstellen, Kompetenzen
- Policy: Ziel, Geltung, Grundsätze, Nachweise, Verstöße

**Worauf besonders zu achten ist**
- Keine Layouts nur als optische Hülle; sie müssen mit dem Datenmodell abgestimmt sein

---

#### Task 5.5 – People-Picker und Verantwortlichkeitslogik
**Beschreibung**  
Binde People-Picker gegen die bereits gebaute Microsoft-Identitätslogik an.

**Definition of Done**
- Owner-/Stellvertretung-/Reviewer-/Approver-Felder funktionieren
- Suche gegen erlaubte Personen/Gruppen funktioniert
- Mehrfachzuweisungen dort, wo fachlich erlaubt
- Rechte werden respektiert

**Technische Anweisungen**
- People-Picker mit Debounce und Suche
- nur zulässige Identitäten
- technische IDs speichern, keine Display-Namen als Primärwert
- saubere Anzeige von Name, Rolle, Mail optional, Avatar optional

**Worauf besonders zu achten ist**
- keine Schattenkopien von Benutzern ohne Synchronisationsstrategie

---

#### Task 5.6 – Vollständigkeitsanzeige und Pflegehinweise vorbereiten
**Beschreibung**  
Baue pro Seite die Grundlage für spätere Qualitätsanzeigen.

**Definition of Done**
- Pflichtfeld-Vollständigkeit berechenbar
- fehlende Pflichtblöcke markierbar
- Pflegehinweise pro Seite sichtbar
- Schnittstelle zum späteren Dashboard vorhanden

### Erwartete Artefakte
- Seitentyp-Registry
- Template-Registry
- Seitenerstellungsflow
- Standardlayouts
- People-Picker-Integration
- Cluster-5-Audit-Report

### Abgabeformat
1. Umsetzungsbericht  
2. Audit-Report  
3. Dateiliste  
4. Liste der Seitentypen und Templates  
5. Frontend-Evidenzen  
6. Offene Punkte / Risiken / Folgeempfehlungen

---


## Pflichtnachschärfung vor Cluster 6

Diese Punkte sind in Cluster 6 zusätzlich verbindlich:

- Drag & Drop muss für **Bilder, Dokumente, Videos und sonstige Assets** real im Editor funktionieren.
- Das Editor-/Asset-Konzept muss einen **Storage-Provider-Adapter** nutzen, damit Replit nicht später von lokalem Storage auf SharePoint refaktorieren muss.
- Medienblöcke müssen mindestens diese Zusatzmetadaten unterstützen:
  - Titel
  - Beschreibung / Caption
  - Alt-Text
  - Quelle / Bibliothek / Pfad
  - Klassifikation
  - Copyright / interne Freigabe falls relevant
  - Videolänge
  - Vorschaubild
  - optional Transkript-/Untertitel-Referenz
- Replit soll moderne Bedienmuster mitdenken:
  - Slash-Commands
  - `+`-Block-Einfügen
  - Drag-and-drop-Reorder
  - Kontextmenüs
  - leere Zustände mit klarer Handlungsführung
- SharePoint ist als **produktiver Medien-Backbone** mitzudenken; Cluster 6 baut die abstrahierte Aufnahme- und Referenzlogik, Cluster 9 liefert den produktiven SharePoint-Provider.

---

# Cluster 6 – Moderner Editor, Medien, Videos, Einbettungen und Diagramm-Blocks

## Copy-Paste-Auftrag für Replit

### Titel
Cluster 6 – Moderner Block-Editor, Drag & Drop, Medienbibliothek, Videos, Einbettungen und Diagramm-/Prozessblöcke

### Ziel
Baue einen modernen, anwenderfreundlichen Editor, der nicht wie ein klassischer HTML-Formularkasten wirkt, sondern wie ein professionelles Wissens- und Prozessbearbeitungswerkzeug. Der Editor muss strukturierte Templates respektieren, freie Inhaltsblöcke erlauben und Videos, Einbettungen, Tabellen, Checklisten, Dateien und Diagramme sauber unterstützen.

### Scope

1. Headless Block-Editor integrieren.
2. Slash-/Plus-Menü und Drag-and-Drop-Blocksortierung umsetzen.
3. Blocktypen für Text, Überschrift, Tabelle, Checkliste, Callout, Datei, Embed, Video, Bild, Linkliste und Trennelement umsetzen.
4. Medienbibliothek / Asset-Anbindung aufbauen.
5. sichere Video- und Embed-Strategie implementieren.
6. Prozess-/Diagrammblöcke für Swimlane/BPMN-/Flow-Darstellungen vorbereiten oder einbetten.
7. Autosave, Draft-Recovery und Konflikthinweise umsetzen.

### Nicht im Scope

- finale AI-Textgenerierung
- finale Such- und Retrievallogik
- finaler Diagramm-Editor von Null
- produktiver SharePoint-Inhaltssync

### Verbindliche Leitplanken

- Keinen Low-Level-Editor selbst neu erfinden.
- Editor muss mit strukturierten Feldern koexistieren, nicht gegen sie arbeiten.
- Video/Embeds nur über explizite Sicherheits- und Quellenregeln.
- Blockdaten müssen revisionssicher gespeichert werden.
- Drag & Drop darf nie Datenverlust oder versteckte Reorder-Bugs produzieren.

### Arbeitspakete / Tasks

#### Task 6.1 – Editor-Fundament integrieren
**Beschreibung**  
Integriere einen Headless-/Block-Editor mit sauberem State-Management, Persistenz und Slot-Modell.

**Definition of Done**
- Editor läuft stabil
- State/Persistenz mit Revisionsmodell abgestimmt
- Read/Edit-Modus vorhanden
- Slash-/Kontextmenü vorbereitet
- Undo/Redo funktioniert

**Technische Anweisungen**
- Editor muss:
  - strukturierte Slots unterstützen
  - freie Inhaltsblöcke unterstützen
  - serialisierbare Blockdaten erzeugen
  - diff-fähig bleiben
- keine proprietären Blackbox-Blobs ohne nachvollziehbare Struktur

**Worauf besonders zu achten ist**
- Editor-State darf nicht losgelöst vom Revisionsmodell geführt werden

---

#### Task 6.2 – Blocktypen und Drag & Drop
**Beschreibung**  
Baue die Kernblocktypen und ihre Sortier-/Bearbeitungslogik.

**Definition of Done**
- Blocktypen produktiv nutzbar
- Drag & Drop stabil
- Tastatur-/Mouse-/Touch-Bedienung berücksichtigt
- Blockaktionen vorhanden: verschieben, duplizieren, löschen, konvertieren

**Technische Anweisungen**
Mindestens:
- Absatz
- Überschrift
- Tabelle
- Checkliste
- Hinweis-/Callout-Block
- Link-/Referenzblock
- Datei-/Anhangsblock
- Bildblock
- Videoblock
- Embed-Block
- Trennlinie
- Prozess-/Diagramm-Placeholderblock

**Worauf besonders zu achten ist**
- Keine instabilen Indizes als Primäridentität für Blöcke
- Drag & Drop sauber mit Revisionslogik verzahnen

---

#### Task 6.3 – Medienbibliothek / Assets
**Beschreibung**  
Baue die Medien-/Asset-Schicht für Bilder, Dateien, Videos und weitere Einbettungen.

**Definition of Done**
- Medien können hochgeladen oder referenziert werden
- Asset-Metadaten vorhanden
- Wiederverwendung von Assets möglich
- Asset-Abhängigkeiten nachvollziehbar
- Rechte und Sichtbarkeit berücksichtigt

**Technische Anweisungen**
Asset-Metadaten mindestens:
- Asset-ID
- Dateiname
- Medientyp
- MIME-Type
- Quelle
- Größe
- Vorschau
- Owner
- Hochgeladen von
- Verknüpfte Seiten
- Klassifikation
- Prüfstatus optional

**Worauf besonders zu achten ist**
- Medien nicht als anonyme Dateianhänge behandeln
- spätere SharePoint-/Storage-Strategie offen halten

---

#### Task 6.4 – Videos und Embeds professionell umsetzen
**Beschreibung**  
Ermögliche das saubere Einbetten von Videos und anderen Inhalten.

**Definition of Done**
- Videoblock funktioniert
- erlaubte Quellen konfigurierbar
- Vorschaubilder / Metadaten sauber
- Embed-Sicherheit dokumentiert
- Teams-/Browser-Kompatibilität geprüft

**Technische Anweisungen**
Unterstützung mindestens für:
- hochgeladene Videos bzw. referenzierte Video-Assets
- freigegebene Unternehmensquellen
- optional externe Videoquellen, falls Admin dies erlaubt
- sichere Embed-Whitelist
- klare Fallback-Darstellung bei blockierter Quelle

**Worauf besonders zu achten ist**
- keine beliebigen iFrames ohne Policy
- nicht auf lokale Browser-Sonderfälle bauen

---

#### Task 6.5 – Prozess- und Diagrammblöcke
**Beschreibung**  
Ermögliche das saubere Anzeigen/Einbetten von Swimlane-, Flow- oder BPMN-Darstellungen.

**Definition of Done**
- Diagramm-Block vorhanden
- Upload/Referenz/Embed sauber möglich
- Beschriftung / Legende / Beschreibung vorgesehen
- Detailtext mit Diagramm kombinierbar

**Technische Anweisungen**
- Viewer first, Editor second
- bereits existierende Grafik-/Dateiquellen nutzbar machen
- späteren Ausbau für spezialisierte Diagrammtools offen halten

**Worauf besonders zu achten ist**
- jetzt keinen eigenen BPMN-Modeller neu bauen, wenn Einbettung/Viewer reicht

---

#### Task 6.6 – Autosave, Recovery, Konfliktanzeige
**Beschreibung**  
Baue einen professionellen Bearbeitungsbetrieb.

**Definition of Done**
- Autosave vorhanden
- Entwurfsspeicherung sauber
- Recovery nach Reload möglich
- Konflikthinweise bei konkurrierender Bearbeitung vorhanden
- Playwright-Evidenz vorhanden

### Erwartete Artefakte
- produktionsfähiger Editor-Fundament
- Kernblocktypen
- Medienbibliothek
- Video-/Embed-Strategie
- Diagrammblock
- Cluster-6-Audit-Report

### Abgabeformat
1. Umsetzungsbericht  
2. Audit-Report  
3. Dateiliste  
4. Liste aller Blocktypen  
5. Frontend-Evidenzen  
6. Output-Evidenzen  
7. Offene Punkte / Risiken / Folgeempfehlungen

---


## Pflichtnachschärfung vor Cluster 7

Diese Punkte sind in Cluster 7 zusätzlich verbindlich:

- Der Versionsstamm ist als **sauberer, sichtbarer Pflegebaum** darzustellen – nicht nur als technische Verlaufsliste.
- Nutzer müssen sofort unterscheiden können zwischen:
  - aktuellem Entwurf
  - freigegebener Version
  - letzter Revision
  - veraltetem Inhalt
  - Review fällig
  - Änderungsanforderung offen
- Watcher-/Abo-Logik und Änderungsbenachrichtigungen sind mindestens fachlich anzuschließen.
- Verifizierungs-/Freigabestatus müssen visuell klar erkennbar sein.

---

# Cluster 7 – Versionsstamm, Revisionen, Review- und Freigabeoberflächen

## Copy-Paste-Auftrag für Replit

### Titel
Cluster 7 – Versionsstamm, Revisionshistorie, Diff-/Restore-UI, Review, Freigabe und Pflegeoberflächen

### Ziel
Mache das in Cluster 2 modellierte Versions- und Revisionssystem für Anwender sichtbar und nutzbar. Jede Seite braucht eine belastbare Pflegeoberfläche: Versionen, Revisionen, Workflow-Historie, Änderungsgründe, Review-Status, Restore, Vergleich, Reviewer- und Freigeber-Ansicht.

### Scope

1. Versions-/Revisionsansicht pro Seite bauen.
2. Diff-/Vergleichsansicht implementieren.
3. Restore- und Branch-/Fork-Logik sichtbar machen.
4. Review- und Freigabe-UI bauen.
5. Pflege-/Review-Historie und Statusbadges visualisieren.
6. Watcher-/Abo-Logik und Änderungsbenachrichtigungen vorbereiten oder implementieren.
7. Versionsstamm und Pflegekontext auch auf Übersichtsseiten anschließbar machen.

### Nicht im Scope

- AI-Dashboard
- finale Teams-Benachrichtigungen
- finale externe Quellenbewertung

### Verbindliche Leitplanken

- Version und Revision dürfen in der UI nie vermischt werden.
- Restore überschreibt nie Geschichte, sondern erzeugt neue Revision.
- Pflegehistorie muss nachvollziehbar, auditierbar und rollenbasiert zugänglich sein.
- Nutzer sollen erkennen können, ob eine Seite freigegeben, in Prüfung, veraltet, unvollständig oder revisionspflichtig ist.

### Arbeitspakete / Tasks

#### Task 7.1 – Versionsstamm- und Revisionsseitenleiste
**Beschreibung**  
Baue die sichtbare Chronik-/Sidebar- oder Dialogansicht für Versionen, Revisionen und Events.

**Definition of Done**
- Versionen und Revisionen getrennt sichtbar
- Autoren / Reviewer / Approver sichtbar
- Änderungsgründe sichtbar
- Statushistorie sichtbar
- Sortierung logisch und verständlich

**Technische Anweisungen**
Anzeigen mindestens:
- Version
- Revision
- Status
- Änderungsart
- Autor
- Reviewer
- Freigeber
- erstellt am
- gültig ab
- nächster Review
- Change Summary

**Worauf besonders zu achten ist**
- keine versteckten technischen Werte ohne fachliche Erklärung
- keine Vermischung aus Audit-Events und Revisionssnapshots

---

#### Task 7.2 – Diff-/Vergleichsansicht
**Beschreibung**  
Implementiere Vergleichsansichten für Revisionen und Versionen.

**Definition of Done**
- Vergleich zweier Revisionen möglich
- strukturierte Felder und Inhaltsblöcke werden verglichen
- Unterschiede nutzerverständlich visualisiert
- Medien-/Blockänderungen erkennbar

**Technische Anweisungen**
- Diff nicht nur für Freitext
- separate Anzeige für:
  - Metadatenänderungen
  - Blockänderungen
  - Relation-/Tag-Änderungen
  - Governance-Feldänderungen

**Worauf besonders zu achten ist**
- diff-fähiges Datenformat als Voraussetzung respektieren
- keine irreführenden „alles geändert“-Ansichten

---

#### Task 7.3 – Review-/Freigabeoberflächen
**Beschreibung**  
Baue die UI für Review, Freigabe, Ablehnung, Rückgabe, Kommentierung und Zuständigkeitswechsel.

**Definition of Done**
- Review-Aktionen vorhanden
- Freigabe-/Ablehnungsgründe erfassbar
- Reviewer/Freigeber klar ausgewiesen
- Statusübergänge rechtekonform
- Workflow-Historie sichtbar

**Technische Anweisungen**
Funktionen mindestens:
- zur Prüfung geben
- an Reviewer zuweisen
- freigeben
- ablehnen / zurückgeben
- Änderungen anfordern
- Freigabekommentar
- neues Review-Datum setzen

**Worauf besonders zu achten ist**
- kein Workflow-Bypass über unsichtbare Buttons oder APIs
- Statusübergänge serverseitig validieren

---

#### Task 7.4 – Restore, Fork und Pflegezweige
**Beschreibung**  
Mache Wiederherstellung und Pflegezweige fachlich bedienbar.

**Definition of Done**
- Restore erzeugt neue Revision
- alte Stände können als Ausgangsbasis genutzt werden
- UI erklärt die Konsequenz verständlich
- Audit-Events entstehen korrekt

**Technische Anweisungen**
- explizite Bestätigungsdialoge
- Herkunftsrevision anzeigen
- Nutzer muss erkennen, ob er einen alten Stand nur ansieht, vergleicht oder als Basis neu nutzt

---

#### Task 7.5 – Pflegeindikatoren, Verifizierungsbadges und Watcher
**Beschreibung**  
Baue sichtbare Indikatoren für Pflegequalität und Aktualität.

**Definition of Done**
- Badges für Status / veraltet / Review fällig / unvollständig vorhanden
- Watcher-/Abo-Mechanik vorbereitet oder umgesetzt
- Änderungsbenachrichtigungsmodell dokumentiert

**Technische Anweisungen**
Beispiele:
- Freigegeben
- In Prüfung
- Entwurf
- Archiviert
- Review überfällig
- Owner fehlt
- Stellvertretung fehlt
- Pflichtfelder fehlen
- Quellverweise fehlen

### Erwartete Artefakte
- Versionsstamm-UI
- Diff-/Restore-UI
- Review-/Freigabe-UI
- Pflegeindikatoren
- Cluster-7-Audit-Report

### Abgabeformat
1. Umsetzungsbericht  
2. Audit-Report  
3. Dateiliste  
4. Liste der Workflow-Übergänge  
5. Frontend-Evidenzen  
6. Output-Evidenzen  
7. Offene Punkte / Risiken / Folgeempfehlungen

---


## Pflichtnachschärfung vor Cluster 8

Diese Punkte sind in Cluster 8 zusätzlich verbindlich:

- Suche muss nicht nur Fließtext, sondern auch strukturierte Felder, IDs, Personen, Tags, Glossarbegriffe, Medien-Metadaten und – soweit vorhanden – Transkripte/Captions berücksichtigen.
- Synonyme, Alias-Codes und alte Display-Codes müssen suchbar sein.
- Glossar/Taxonomie ist für einen campusweiten Wissensbestand Pflicht und nicht optionales Nice-to-have.

---

# Cluster 8 – Suche, Taxonomie, Glossar und Wissensvernetzung

## Copy-Paste-Auftrag für Replit

### Titel
Cluster 8 – Interne Suche, Facetten, Taxonomie, Glossar, Verknüpfungen und Wissensvernetzung

### Ziel
Baue ein internes Such- und Vernetzungssystem, das das Wiki als Wissensplattform nutzbar macht: Volltext, Filter, Seitentyp-Facetten, Kernprozessfilter, Statusfilter, Verantwortlichkeiten, Tags, Glossar und verknüpfte Inhalte.

### Scope

1. Suchindex für internes Wiki aufbauen.
2. Suchoberfläche mit Facetten und schnellen Filtern implementieren.
3. Taxonomie-/Tagging-System sichtbar machen.
4. Glossar-Logik und Glossar-Seiten bzw. Begriffsauflösung implementieren.
5. Related Content, Backlinks und Querverweise sichtbar machen.
6. Zero-Result- und Suchqualitätsmetriken vorbereiten.
7. Broken-Link-/Orphan-Hinweise fachlich anschließen.

### Nicht im Scope

- finale SharePoint-/externe Suche
- finale AI-Antworten
- Microsoft-Copilot-Connector

### Verbindliche Leitplanken

- Suche ist nicht nur Textsuche, sondern muss strukturierte Filter beherrschen.
- Taxonomie darf nicht unkontrolliert explodieren.
- Glossar und Tags sind Governance-Objekte, keine freie Chaoswolke.
- Querverweise müssen Rechte respektieren.

### Arbeitspakete / Tasks

#### Task 8.1 – Interner Suchindex und Query-Layer
**Beschreibung**  
Baue den Suchindex und die Suchabfragen für interne Inhalte.

**Definition of Done**
- Suche findet interne Seiten performant
- strukturierte Felder fließen ein
- Relevanzregeln dokumentiert
- Seitentypen, Status und Tags filterbar

**Technische Anweisungen**
Mindestens indexieren:
- Titel
- Kurzbeschreibung
- strukturierte Schlüsselfelder
- Inhaltsblöcke
- Tags
- Seitentyp
- Kernprozess
- Bereich
- Status
- Owner / Gruppen optional
- Referenzen / verknüpfte Objekte

---

#### Task 8.2 – Suchoberfläche mit Facetten
**Beschreibung**  
Baue die Nutzersuche mit Facetten, Snippets, Trefferarten und Schnellfiltern.

**Definition of Done**
- Sucheingabe funktioniert
- Facetten funktionieren
- Trefferlisten mit Snippets vorhanden
- Nulltrefferzustand sinnvoll
- Tastaturnutzung und Responsiveness geprüft

**Technische Anweisungen**
Filter mindestens:
- Kernprozess
- Bereich
- Seitentyp
- Status
- Verantwortlichkeit
- Tags
- Review-Status
- Archivstatus

**Worauf besonders zu achten ist**
- keine reine technische Suchmaske
- Treffer müssen fachlich verständlich lesbar sein

---

#### Task 8.3 – Taxonomie und Tags
**Beschreibung**  
Mache Taxonomien und Tags administrierbar und suchwirksam.

**Definition of Done**
- Tags verwaltbar
- kontrollierte Taxonomien möglich
- Seitentyp-/Kernprozess-Bezug möglich
- Tag-Seiten oder Tag-Ansichten vorhanden

**Technische Anweisungen**
- trenne freie Schlagworte von kontrollierten Taxonomien
- Synonyme und Aliasbegriffe vorbereiten
- ungenutzte / doppelte Begriffe sichtbar machen

---

#### Task 8.4 – Glossar
**Beschreibung**  
Baue Glossar-Einträge und Begriffsvernetzung.

**Definition of Done**
- Glossar-Seitentyp oder Glossar-Modul vorhanden
- Begriffe verlinkbar
- Glossarbegriffe auffindbar
- spätere AI-Nutzung anschließbar

**Technische Anweisungen**
Glossar-Felder mindestens:
- Begriff
- Definition
- Synonyme
- Abgrenzung
- zugehöriger Kernprozess / Bereich
- Quellen
- gültig ab / letzter Review

---

#### Task 8.5 – Related Content, Backlinks und Broken-Link-Grundlage
**Beschreibung**  
Mache Inhalte untereinander auffindbar und verknüpft.

**Definition of Done**
- Related-Content-Bereich vorhanden
- Backlinks sichtbar
- Querverweise sauber dargestellt
- Broken-Link-Erkennung vorbereitet

### Erwartete Artefakte
- interne Suche
- Facettensuche
- Taxonomie-/Glossarmodul
- Related-Content-/Backlink-Ansichten
- Cluster-8-Audit-Report

### Abgabeformat
1. Umsetzungsbericht  
2. Audit-Report  
3. Dateiliste  
4. Suchindex-/Relevanzdokumentation  
5. Frontend-Evidenzen  
6. Offene Punkte / Risiken / Folgeempfehlungen

---


## Pflichtnachschärfung vor Cluster 9

Diese Punkte sind in Cluster 9 zusätzlich verbindlich:

- Cluster 9 baut nicht nur einen Lese-Connector für externe Quellen, sondern auch den **produktiven SharePoint-Storage-Provider** für Medienbibliotheken.
- Zu berücksichtigen sind mindestens:
  - SharePoint-Seiten und Dokumentbibliotheken als Wissensquelle
  - dedizierte Medienbibliotheken als Asset-Ziel
  - Pfad-/URL-Referenzen
  - ACL-respektierte Sichtbarkeit
  - Wiederverwendung bestehender Medien
- Replit muss klar trennen zwischen:
  - **Source Connector** (lesen/indexieren)
  - **Storage Provider** (schreiben/ablegen/referenzieren)
- Quell- und Medienobjekte müssen in Zitationen, Referenzen und Backlinks sauber auflösbar sein.

---

# Cluster 9 – SharePoint-/Graph-Wissensquellen und Connector-Layer

## Copy-Paste-Auftrag für Replit

### Titel
Cluster 9 – SharePoint-/Graph-Connector, Wissensquellen-Registry, Quellobjekte, ACL-respektierte Ingestion und externe Wissensbasis

### Ziel
Baue den Quell- und Connector-Layer des Systems. Das eigene Wiki soll nicht isoliert bleiben, sondern SharePoint und weitere Wissensquellen als referenzier- und später AI-nutzbare Quellen einbinden. Dieser Cluster schafft die technische und fachliche Grundlage dafür.

### Scope

1. Wissensquellen-Registry aufbauen.
2. SharePoint-/Graph-Connector für Dokumente/Seiten/Quellobjekte anbinden.
3. Quellobjekte, Metadaten und ACL-respektierte Zugriffsschicht implementieren.
4. Sync-/Indexierungsjobs und Monitoring aufbauen.
5. Zitations- und Quellenreferenzen im UI vorbereiten.
6. generische Connector-Schnittstelle für weitere Quellen vorbereiten.

### Nicht im Scope

- finale AI-Antwort-UI
- Microsoft-Copilot-Connector produktiv
- beliebig viele Fremdquellen sofort fertig

### Verbindliche Leitplanken

- Externe Quellen dürfen nie ungefiltert als „frei lesbar“ behandelt werden.
- ACL-Respektierung ist Pflicht.
- SharePoint ist Wissensquelle, nicht zwangsläufig Primär-Contentsystem.
- Quellenmodell muss auch mit AI-Zitationen zusammenspielen.

### Arbeitspakete / Tasks

#### Task 9.1 – Wissensquellen-Registry und Settings
**Beschreibung**  
Baue die Verwaltung externer Wissensquellen im Admin-Bereich.

**Definition of Done**
- Quellen anlegbar/aktivierbar/deaktivierbar
- Quellentypen modelliert
- Sync-Strategie hinterlegbar
- Sichtbarkeit / ACL-Modell hinterlegbar
- Audit vorhanden

**Technische Anweisungen**
Quellentypen mindestens:
- Internal Wiki
- SharePoint
- Upload Collection
- externe Connector-Quelle
- Web (später optional für AI, nicht als generelle Primärquelle)

---

#### Task 9.2 – SharePoint-/Graph-Ingestion
**Beschreibung**  
Baue den ersten produktiven Connector gegen SharePoint/Graph.

**Definition of Done**
- SharePoint-Inhalte können gelesen werden
- Metadaten werden gespeichert
- inkrementelle oder kontrollierte Synchronisation möglich
- Fehlerfälle und Re-Sync dokumentiert

**Technische Anweisungen**
Mindestens berücksichtigen:
- Site
- Library / Ordnerkontext
- Dokument-/Item-ID
- Pfad / URL
- Titel
- Änderungsdatum
- Berechtigungsbezug
- MIME / Typ
- Quelleigentümer
- Sync-Status

**Worauf besonders zu achten ist**
- keine Vollkopie ohne Modellentscheidung
- keine Berechtigungsverkürzung

---

#### Task 9.3 – ACL-respektierte Zugriffsschicht
**Beschreibung**  
Sorge dafür, dass externe Quellen nur für berechtigte Nutzer such- und AI-seitig sichtbar werden.

**Definition of Done**
- ACL-Prinzip technisch vorgesehen oder umgesetzt
- Rechteverletzungen getestet
- serverseitige Zugriffsschicht dokumentiert

**Technische Anweisungen**
- Rechte niemals nur im Frontend filtern
- Nutzer- / Gruppenmapping sauber aus Graph übernehmen
- Caching und ACL-Invaliderung planen

---

#### Task 9.4 – Quellenreferenzen und Zitationsoberfläche vorbereiten
**Beschreibung**  
Baue die sichtbare Basis für spätere Quellenhinweise.

**Definition of Done**
- Seiten können Quellen referenzieren
- externe und interne Quellen unterscheidbar
- Quellenkarten / Referenzlisten vorhanden
- AI-Cluster kann darauf direkt aufsetzen

---

#### Task 9.5 – Generic Connector Contract
**Beschreibung**  
Definiere einen generischen Anschluss für weitere Wissensquellen.

**Definition of Done**
- Connector-Vertrag dokumentiert
- Mappingmodell vorhanden
- Erweiterungspunkte sauber
- keine SharePoint-Einbahnstraße

### Erwartete Artefakte
- Quellen-Registry
- SharePoint-/Graph-Connector V1
- ACL-Zugriffsschicht
- Quellenreferenzbasis
- Cluster-9-Audit-Report

### Abgabeformat
1. Umsetzungsbericht  
2. Audit-Report  
3. Dateiliste  
4. Liste der Quellenmodelle und Sync-Jobs  
5. Frontend-/Output-Evidenzen  
6. Offene Punkte / Risiken / Folgeempfehlungen

---


## Pflichtnachschärfung vor Cluster 10

Diese Punkte sind in Cluster 10 zusätzlich verbindlich:

- Die AI-Architektur ist mit **OpenAI Responses API** zu planen.
- Interne Retrieval-Pfade müssen kombinieren können:
  - internes Wiki
  - SharePoint-/Connector-Quellen
  - optional Dateisammlungen / Vector Stores
  - optional Web Search
- AI-Aktionen müssen mindestens unterstützen:
  - aus Stichworten professionell formulieren
  - bestehende Inhalte professionalisieren / glätten
  - Template-Lücken erkennen
  - fehlende Pflichtsektionen vorschlagen
  - Dubletten-/Konflikthinweise anstoßen
  - quellenbasierte Antworten mit klarer Herkunft liefern
- Websuche darf nur explizit aktivierbar sein und muss im UI deutlich markiert werden.

---

# Cluster 10 – AI-Layer, interne Wissenssuche, Schreibassistent und optionales Web

## Copy-Paste-Auftrag für Replit

### Titel
Cluster 10 – OpenAI-basierter AI-Layer, interne Retrieval-Antworten, Seitenassistent, Schreib-/Pflegehilfe und optionales Web-Search-Gate

### Ziel
Baue die AI-Schicht des Systems. Nutzer sollen auf der Startseite und auf einzelnen Seiten einen AI-Assistenten nutzen können, der auf internen Wiki-Inhalten, angebundenen Wissensquellen und optional – nur wenn freigegeben – auf Webquellen basiert. Die AI muss Inhalte sauber zitieren, professionell formulieren, fehlende Inhalte erkennen und Pflegevorschläge machen.

### Scope

1. AI-Orchestrierungsschicht implementieren.
2. OpenAI-basierte Antworterstellung integrieren.
3. Interne Quellen und angebundene Wissensquellen retrieval-seitig anschließen.
4. optionales Web-Search-Gate implementieren.
5. Seitenassistent für Schreiben, Überarbeiten, Strukturieren und Zusammenfassen bauen.
6. Startseiten-/Global-Assistant bauen.
7. Quellenzitation, Prompt-Policies und Nutzungslogging implementieren.

### Nicht im Scope

- finale Management-Dashboards
- Microsoft-Copilot-Connector produktiv
- unkontrollierte autonome Agentenlogik

### Verbindliche Leitplanken

- Standardmodus: **interne Quellen zuerst**.
- Web-Suche nur als explizite Option und transparent gekennzeichnet.
- Jede belastbare Antwort braucht Quellenhinweise.
- AI darf Governance-Daten nicht stillschweigend überschreiben.
- AI-Ausgaben sind Vorschläge oder generierte Inhalte, keine versteckten Direktänderungen ohne Nutzeraktion.
- AI-Policies und Quellpriorisierung müssen administrierbar sein.

### Architekturhinweis
Der AI-Layer soll auf einer **orchestrierten Retrieval-Architektur** aufsetzen:
- internes Wiki
- SharePoint-/Connector-Quellen
- optional hochgeladene Dateien / Vektorspeicher
- optional Web Search
- OpenAI Responses API als Modell-/Tool-Orchestrierung

Nicht auf einen einzigen Retrieval-Mechanismus fest verdrahten.

### Arbeitspakete / Tasks

#### Task 10.1 – AI-Settings, Policies und Source Modes
**Beschreibung**  
Baue den Admin-Bereich für AI-Modi und Quellpolitik.

**Definition of Done**
- AI global aktivier-/deaktivierbar
- Quellmodi definierbar
- Web-Suche separat schaltbar
- Modell-/Provider-Konfiguration abstrahiert
- AI-Policy dokumentiert

**Technische Anweisungen**
Quellmodi mindestens:
- nur internes Wiki
- internes Wiki + SharePoint / Connectoren
- internes Wiki + Connectoren + Web
- Seitenkontext only
- Entwurfsmodus vs veröffentlichte Inhalte only

---

#### Task 10.2 – Global Assistant auf der Startseite
**Beschreibung**  
Baue den zentralen Assistant im Hub.

**Definition of Done**
- Global Assistant funktioniert
- Antwort basiert auf erlaubten Quellen
- Zitationen sichtbar
- Rollen-/ACL-Respektierung geprüft
- Nulltreffer-/Unsicherheitsfälle sauber

**Technische Anweisungen**
- explizite Quellenchips / Referenzen
- Antwortmodus: knapp / ausführlich / Quellenliste optional
- keine Halluzinations-UI, die unbelegte Antworten wie Wahrheit darstellt

---

#### Task 10.3 – Seitenassistent / Schreibhilfe
**Beschreibung**  
Baue den AI-Assistenten pro Seite.

**Definition of Done**
- Text verbessern / professionalisieren
- aus Stichworten formulieren
- zusammenfassen
- umstrukturieren
- in professionellen Stil bringen
- fehlende Sektionen vorschlagen
- Ergebnis als Vorschlag einfügen, nicht blind überschreiben

**Technische Anweisungen**
Aktionen mindestens:
- neu formulieren
- professionalisieren
- kürzen
- erweitern
- Ton anpassen
- Rechtschreibung / Grammatik
- Zusammenfassung
- Lückenanalyse gegen Template
- Vorschlag für fehlende Pflichtfelder

---

#### Task 10.4 – Quellenzitation, Answer Cards und Transparenz
**Beschreibung**  
Mache AI-Antworten nachvollziehbar.

**Definition of Done**
- Quellen sichtbar
- interne vs externe Quellen unterscheidbar
- Webantworten explizit markiert
- Antwort-Confidence/Unsicherheitsmuster dokumentiert

**Technische Anweisungen**
- Quellenkarten mit Titel, Typ, Quelle, Link-/Objektbezug
- keine Antwort ohne klaren Hinweis, wenn Quellenlage dünn ist

---

#### Task 10.5 – Nutzungslogging, Schutzmechanismen und Evaluation
**Beschreibung**  
Baue die operative Basis für AI-Betrieb.

**Definition of Done**
- AI-Nutzungsereignisse geloggt
- Fehlerfälle sichtbar
- Grundmetriken vorhanden
- Evaluationsset vorbereitet
- Token-/Kosten-/Latenzsicht vorgesehen

**Technische Anweisungen**
- Logging ohne sensible Inhalte unnötig zu vervielfachen
- Standardauswertungen:
  - Anfragevolumen
  - Nulltreffer
  - Web-Nutzung
  - Antwort mit/ohne Quelle
  - Modellfehler
  - Latenz

### Erwartete Artefakte
- AI-Settings
- Global Assistant
- Seitenassistent
- Quellenzitationen
- AI-Logging-/Evaluation-Basis
- Cluster-10-Audit-Report

### Abgabeformat
1. Umsetzungsbericht  
2. Audit-Report  
3. Dateiliste  
4. Liste der AI-Modi / Policies  
5. Frontend-/Output-Evidenzen  
6. Offene Punkte / Risiken / Folgeempfehlungen

---


## Pflichtnachschärfung vor Cluster 11

Diese Punkte sind in Cluster 11 zusätzlich verbindlich:

- Das Dashboard muss die Pflege- und Qualitätsrealität sichtbar machen, insbesondere:
  - unvollständige Seiten
  - fehlende Owner/Stellvertretung
  - Review überfällig
  - fehlende Freigabe
  - hohe Ähnlichkeit / Dublettenverdacht
  - veraltete Referenzen
  - Broken Links
  - verwaiste Seiten
  - Medien ohne Referenz
  - Suchanfragen ohne Treffer
  - Review-/Freigabe-Backlogs
- Neben dem Prozessmanager-Dashboard sind **persönliche Cockpits** für Redakteure, Reviewer, Approver und Owner Pflicht.

---

# Cluster 11 – Prozessmanagement-Dashboard, Qualitätsanalytik und Pflegecockpit

## Copy-Paste-Auftrag für Replit

### Titel
Cluster 11 – Prozessmanagement-Dashboard, Qualitätscockpit, Dublettenanalyse, Vollständigkeit, Inkonsistenzen und Pflegepriorisierung

### Ziel
Baue das Prozessmanager- und Governance-Dashboard. Das System soll nicht nur Inhalte speichern, sondern aktiv auf Qualitätsprobleme, Dubletten, unvollständige Seiten, fehlende Verantwortlichkeiten, veraltete Reviews, Konflikte und Pflegebedarf hinweisen.

### Scope

1. Qualitätsmetriken und Pflegeindikatoren pro Seite / Bereich / Kernprozess berechnen.
2. Prozessmanager-Dashboard bauen.
3. Dubletten-/Ähnlichkeitsanalyse implementieren.
4. Inkonsistenz- und Konflikthinweise bauen.
5. Pflegepriorisierung und Aufgabenlisten aufbauen.
6. Such-/Nutzungsmetriken für Content-Qualität anschließen.

### Nicht im Scope

- vollautomatische Prozessoptimierung ohne Review
- autonome Massenänderungen durch AI

### Verbindliche Leitplanken

- AI-/Heuristik-Hinweise sind Vorschläge, keine stillen Entscheidungen.
- Qualitätsmetriken müssen nachvollziehbar sein.
- Ein Dashboard ohne belastbare Drilldowns ist unbrauchbar.
- Konflikthinweise brauchen erklärbare Gründe.

### Arbeitspakete / Tasks

#### Task 11.1 – Qualitätsmetriken definieren
**Beschreibung**  
Definiere, berechne und dokumentiere die Qualitätsmetriken.

**Definition of Done**
- Metriken dokumentiert
- Query-/Berechnungslogik vorhanden
- Drilldown pro Seite möglich
- Schnittstellen zum Dashboard vorhanden

**Technische Anweisungen**
Mindestens:
- Pflichtfelder fehlen
- Review überfällig
- Owner/Stellvertretung fehlt
- Freigabe fehlt
- Quellverweise fehlen
- Tags/Taxonomie fehlen
- Broken Links
- verwaiste Seiten
- ungenutzte Templates / Altstände
- Medien ohne Referenz
- Suchanfragen ohne Treffer
- hohe Ähnlichkeit / Dublettenverdacht

---

#### Task 11.2 – Prozessmanager-Dashboard
**Beschreibung**  
Baue das Hauptdashboard für Prozessmanager und Governance-Rollen.

**Definition of Done**
- Dashboard produktiv nutzbar
- Drilldowns funktionieren
- Filter nach Kernprozess / Bereich / Status möglich
- priorisierte Listen vorhanden

**Technische Anweisungen**
Kacheln/Module mindestens:
- Dublettenverdacht
- unvollständige Seiten
- Review überfällig
- fehlende Verantwortliche
- veraltete Policies
- Konflikte zwischen Prozessen / Richtlinien
- Broken Links / Orphans
- offene Review-/Freigabe-Backlogs

---

#### Task 11.3 – Dubletten- und Ähnlichkeitsanalyse
**Beschreibung**  
Implementiere eine belastbare Similarity-/Dublettenhilfe.

**Definition of Done**
- Ähnlichkeitsberechnung dokumentiert
- Trefferlisten vorhanden
- Prozent-/Score-Anzeige verständlich
- Drilldown und Vergleich möglich

**Technische Anweisungen**
- Kombiniere strukturierte und inhaltliche Signale
- reine Textähnlichkeit reicht nicht
- berücksichtigte Signale dokumentieren, z. B. Titel, Kurzbeschreibung, Tags, Kernprozess, Inhaltsblöcke, verknüpfte Systeme

---

#### Task 11.4 – Konflikt- und Pflegehinweise
**Beschreibung**  
Identifiziere fachliche Risiken und Pflegekonflikte.

**Definition of Done**
- Konfliktmuster sichtbar
- Pflegevorschläge priorisiert
- kein Blackbox-Scoring ohne Begründung

**Technische Anweisungen**
Beispiele:
- gleiche Rolle in widersprüchlicher Zuständigkeit
- Richtlinie neuer als referenzierender Prozess
- Seite referenziert archivierte Inhalte
- Grafik vorhanden, Textprozess fehlt
- Pflichtdokument fehlt
- Review-Zyklus verletzt

---

#### Task 11.5 – Persönliche Cockpits / Arbeitslisten
**Beschreibung**  
Baue individualisierte Arbeitslisten für Redakteure, Reviewer, Freigeber und Prozessmanager.

**Definition of Done**
- persönliche Pflege-/Review-Listen vorhanden
- Priorisierung logisch
- Rechte respektiert
- Hub anbindbar

### Erwartete Artefakte
- Qualitätsmetriken
- Prozessmanager-Dashboard
- Dubletten-/Konfliktanalyse
- persönliche Cockpits
- Cluster-11-Audit-Report

### Abgabeformat
1. Umsetzungsbericht  
2. Audit-Report  
3. Dateiliste  
4. Liste aller Qualitätsmetriken  
5. Frontend-Evidenzen  
6. Offene Punkte / Risiken / Folgeempfehlungen

---


## Pflichtnachschärfung vor Cluster 12

Diese Punkte sind in Cluster 12 zusätzlich verbindlich:

- Das Zielsystem ist als **Teams-kompatible Webanwendung** umzusetzen, die als Custom Tab sauber funktioniert.
- Zu berücksichtigen sind:
  - personal / team / groupchat-Kontext
  - Deep Links in Seiten und Prozesse
  - Teams-taugliche Responsiveness
  - sauberes Verhalten von Editor, Dialogen und Medienansichten im eingebetteten Kontext

---

# Cluster 12 – Microsoft Teams-App, Teams-UX und kollaborative Einbettung

## Copy-Paste-Auftrag für Replit

### Titel
Cluster 12 – Microsoft Teams App / Tab, Teams-optimierte UX, Deep Links, Kontextintegration und kollaborative Einbettung

### Ziel
Mache das System zu einer sauberen Teams-kompatiblen Anwendung. Nutzer sollen das Wissensmanagement des Bildungscampus Backnang direkt in Microsoft Teams verwenden können – mit sauberem Login, ordentlicher UX, Deep Links und sinnvoller Einbettung in Teams-Kontexte.

### Scope

1. Teams-App-/Tab-Variante vorbereiten und bauen.
2. Teams-optimierte Auth-/Session- und Redirect-Logik finalisieren.
3. Responsive Teams-UX und Layout-Anpassungen umsetzen.
4. Deep Links und Seiten-/Prozessverlinkung für Teams sauber lösen.
5. Share-/Öffnen-in-Teams-Kontexte vorbereiten.
6. dokumentierte Einbettungsstrategie für Kanäle / persönliche Tabs / Teams-Kontexte liefern.

### Nicht im Scope

- produktive Copilot-Connector-Ausrollung
- beliebige Teams-Bot-Funktionen
- Vollausbau aller ChatOps-Workflows

### Verbindliche Leitplanken

- Teams ist kein nachträglicher Wrapper, sondern Laufzeitkontext.
- Keine Sonder-UI nur für Demo-Fälle.
- Deep Links müssen stabil und versionsrobust sein.
- Teams-spezifische Anpassungen dürfen Web-Nutzung nicht kaputt machen.

### Arbeitspakete / Tasks

#### Task 12.1 – Teams-App-/Tab-Strategie und Manifest
**Beschreibung**  
Baue die Teams-App-Grundlage bzw. dokumentiere und implementiere die gewählte Tab-Strategie.

**Definition of Done**
- Teams-Einbettungsstrategie dokumentiert
- Manifest-/App-Basis vorhanden
- Umgebungs-/Domainanforderungen dokumentiert
- Installations-/Testanleitung vorhanden

---

#### Task 12.2 – Teams-optimierte Auth und Routing
**Beschreibung**  
Finalisiere die Auth- und Routinglogik für Teams.

**Definition of Done**
- Login in Teams funktioniert
- Redirect-/Callback-Logik stabil
- Session-Verhalten geprüft
- Fehlerpfade dokumentiert

**Technische Anweisungen**
- Teams-Kontext erkennen
- saubere Rückkehr in den richtigen Zielpfad
- kein kaputtes Verhalten zwischen Browser und Teams-Client

---

#### Task 12.3 – Teams-UX, Deep Links und Kontextnavigation
**Beschreibung**  
Optimiere die UI für Teams und baue stabile Deep Links.

**Definition of Done**
- Deep Links funktionieren
- Seiten aus Teams-Kontexten erreichbar
- UI im Teams-Rahmen sauber
- Navigation und Modale funktionieren

---

#### Task 12.4 – Kollaborative Einbettung und Teilbarkeit
**Beschreibung**  
Baue die Grundlage, um Inhalte aus dem System in Teams-Kontexte zu tragen.

**Definition of Done**
- Inhalte als Tab einbindbar
- Teilen/Öffnen in Teams vorbereitet
- relevante Kontexte dokumentiert
- Berechtigungen berücksichtigt

### Erwartete Artefakte
- Teams-App-/Tab-Basis
- Teams-UX-Finalisierung
- Deep-Linking
- Installations-/Testdoku
- Cluster-12-Audit-Report

### Abgabeformat
1. Umsetzungsbericht  
2. Audit-Report  
3. Dateiliste  
4. Teams-Manifest-/Einbettungsdokumentation  
5. Frontend-Evidenzen  
6. Offene Punkte / Risiken / Folgeempfehlungen

---


## Pflichtnachschärfung vor Cluster 13

Diese Punkte sind in Cluster 13 zusätzlich verbindlich:

- Es ist eine belastbare Migrationsstrategie vom bisherigen SharePoint-/Teams-Ansatz vorzusehen:
  - bestehende Seiten
  - bestehende Vorlagen
  - bestehende Medien
  - bestehende Links / Referenzen
- Rollout ist campusweit zu denken: Pilot, Stabilisierungsphase, Governance-Schulung, Betriebsmodell, Supportmodell.
- Backup/Restore, Export/Import und Notfallpfade sind sauber mitzudenken.

---

# Cluster 13 – Security-Hardening, Betrieb, Migration, Pilot und Rollout

## Copy-Paste-Auftrag für Replit

### Titel
Cluster 13 – Security-Hardening, Betriebskonzept, Backup/Restore, Migration aus Bestandsquellen, Pilot, Schulung und Go-Live-Vorbereitung

### Ziel
Schließe das System professionell ab: Sicherheit, Observability, Backup/Restore, Betriebsdokumentation, Migration erster Inhalte, Pilotbetrieb, Schulung und Go-Live-Readiness. Dieses Cluster macht aus einer funktionierenden Anwendung ein belastbares Unternehmenssystem.

### Scope

1. Security-Hardening finalisieren.
2. Backup-/Restore-/Disaster-Recovery-Konzept umsetzen oder belastbar dokumentieren.
3. Performance-, Last- und Stabilitätsprüfungen durchführen.
4. Betriebsdoku, Admin-Handbuch und Runbooks fertigstellen.
5. erste Migrationspfade aus Bestandsquellen umsetzen.
6. Pilotbetrieb mit Testgruppen vorbereiten.
7. Schulungs- und Rolloutpaket erstellen.
8. finale Go-Live-Checkliste und Abnahme vorbereiten.

### Nicht im Scope

- unbegrenzte historische Vollmigration aller Altbestände
- unbegrenzte Organisationsentwicklung neben dem Toolbau

### Verbindliche Leitplanken

- Kein Go-Live ohne Restore-Test.
- Kein Go-Live ohne Rechte-/Audit-/AI-/Teams-Prüfung.
- Kein „wir dokumentieren das später“.
- Migration nur kontrolliert und nachvollziehbar.
- Pilotgruppen bewusst auswählen und Rückmeldungen strukturiert erfassen.

### Arbeitspakete / Tasks

#### Task 13.1 – Security-Hardening und Datenschutz
**Beschreibung**  
Finalisiere Sicherheitsmaßnahmen und dokumentiere sie.

**Definition of Done**
- Security-Checkliste abgearbeitet
- Header-/CSP-/Cookie-/Session-/Secret-Themen geprüft
- Rollen-/Rechteprüfung regressionsgesichert
- sensible Logs und AI-Datenflüsse bewertet
- Datenschutz-/Datenklassifikationshinweise dokumentiert

---

#### Task 13.2 – Backup, Restore und Betriebsfähigkeit
**Beschreibung**  
Baue oder dokumentiere belastbare Wiederanlaufmechanismen.

**Definition of Done**
- Backup-Konzept vorhanden
- Restore-Prozedur dokumentiert
- mindestens ein Restore-Test durchgeführt
- Betriebshandbuch / Runbooks vorhanden

**Technische Anweisungen**
Mindestens abdecken:
- Datenbank
- Dateien / Assets
- Konfiguration / Secrets-Verweise
- Indizes / Suchdaten
- Connector-Zustände, falls relevant

---

#### Task 13.3 – Migration erster Bestandsinhalte
**Beschreibung**  
Baue kontrollierte Migrationspfade für erste reale Inhalte.

**Definition of Done**
- definierte Pilotinhalte migriert
- Mappingregeln dokumentiert
- Fehler- und Nachbearbeitungspfad definiert
- IDs / Referenzen / Versionen sauber

**Technische Anweisungen**
Zuerst kleine, repräsentative Menge:
- 1–2 Kernprozesse
- 1 Bereich
- 2–3 Prozessseiten
- 1 Verfahrensanweisung
- 1 Richtlinie / Policy
- 1 Rollenprofil
- 1 Dashboard-/Doku-Seite

---

#### Task 13.4 – Pilotbetrieb und UAT
**Beschreibung**  
Bereite Pilotgruppen vor und führe einen strukturierten Pilot durch.

**Definition of Done**
- Pilotgruppen definiert
- Testfälle definiert
- Feedback strukturiert erfasst
- UAT-Protokoll vorhanden
- Go-/No-Go-Kriterien dokumentiert

---

#### Task 13.5 – Schulung, Admin-Handbuch und Rollout
**Beschreibung**  
Erstelle die Unterlagen für Betrieb und Einführung.

**Definition of Done**
- Admin-Handbuch vorhanden
- Redakteursleitfaden vorhanden
- Reviewer-/Freigeberleitfaden vorhanden
- Kurzschulung / Einführungsleitfaden vorhanden
- finale Go-Live-Checkliste vorhanden

### Erwartete Artefakte
- Security-/Ops-Dokumentation
- Backup-/Restore-Dokumentation
- Migrationspaket V1
- Pilot-/UAT-Unterlagen
- Schulungsunterlagen
- Cluster-13-Audit-Report

### Abgabeformat
1. Umsetzungsbericht  
2. Audit-Report  
3. Dateiliste  
4. Security-/Ops-/Backup-Dokumentation  
5. Migrations- und Pilotbericht  
6. Frontend-/Output-Evidenzen  
7. finale Risiken / Restpunkte / Go-Live-Empfehlung

---

# 4) Zusammenfassende Empfehlung an Replit

Replit soll dieses System **nicht** als „Wiki mit KI“ bauen, sondern als:

- strukturierte Wissens- und Prozessplattform
- governancefähiges Redaktionssystem
- Teams-kompatible Unternehmensanwendung
- AI-gestützte Wissensoberfläche
- integrierte Plattform für Kernprozesse, Richtlinien, Rollen, Verfahrensanweisungen und Nachweise

Die heikelsten Architekturfehler wären:

1. **AI zu früh vorziehen**
2. **Editor vor Fachmodell priorisieren**
3. **eine einzige ID für alles erzwingen**
4. **SharePoint nur technisch und nicht fachlich modellieren**
5. **Personen und Rechte per Freitext oder UI-Konventionen lösen**
6. **Dashboard ohne belastbare Qualitätsmetriken bauen**
7. **Teams als spätere Kosmetik behandeln**
8. **Versionen und Revisionen weiterhin unklar lassen**

---

# 5) Klare Management-Entscheidungsvorlage

Wenn du eine Management-Entscheidung brauchst, lautet meine Empfehlung:

## Option 1 – Sofortiger Greenfield-Bau
Weiter mit Cluster 4 bis 13.

**Nur sinnvoll wenn**
- der Eigenbau politisch und budgetär gewollt ist
- ihr maximale Passung wollt
- ihr langfristig die Plattformhoheit wollt

## Option 2 – 1- bis 2-wöchiger Basis-PoC vor Cluster 4
Kurzer Realtest mit:
- XWiki
- Docmost
- Confluence

**Dann harte Entscheidung**
- wenn keines der Systeme 70 %+ der Musskriterien ohne Grundbruch trifft: Greenfield fortsetzen
- wenn eins erstaunlich nahe dran ist: „extend instead of build“ neu bewerten

Für eure bisherige Stoßrichtung wirkt **Greenfield oder starker Fork/Extension-Ansatz** realistischer als der Kauf einer Standardsoftware, wenn ihr das Zielbild tatsächlich kompromissarm wollt.