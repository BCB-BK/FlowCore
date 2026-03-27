# FlowCore – Clusterpaket Seitentypen, Feldstruktur und feldbezogene KI-Ausfüllhilfe

## Kurzfazit aus dem Systemscan

Die Richtung ist gut, aber die Seitentypen sind in der aktuellen Form **noch nicht praxistauglich genug** für ein wirklich professionelles Wissensmanagement mit QM-/Prozessmanager-Anspruch.

Die drei Hauptprobleme sind:

1. **Content und Governance sind noch zu wenig getrennt.**  
   Viele Seitentypen tragen dieselben Governance-/Validity-/Classification-Felder, obwohl diese Felder für die tägliche Nutzung oft nicht auf die Inhaltsseite gehören. Für die Governance sind sie sinnvoll, für die Leselogik häufig störend.

2. **Zu viele fachlich strukturierte Anforderungen sind noch als Freitext oder halbgenerische Sektionen modelliert.**  
   Das betrifft vor allem:
   - RACI
   - SIPOC
   - Swimlane-/Prozessschritt-Logik
   - KPIs
   - Risiken & Kontrollen
   - Schnittstellen
   - FAQ-/Glossar-/Checklistenstrukturen
   - Rollenprofile

3. **Die KI ist bisher eher seiten- bzw. textabschnittsbezogen, aber nicht feldbezogen und nicht templatebewusst genug.**  
   Es fehlt ein professioneller Mechanismus, um je Feld gezielt zu sagen:
   - was dieses Feld fachlich leisten soll,
   - wie die KI formulieren darf,
   - wie sie aus Stichpunkten sauberen Unternehmenscontent macht,
   - und wie Unterschiede vor Übernahme sichtbar gemacht werden.

---

## Kritische Befunde, die vor allen UX-Feinschliffen beachtet werden müssen

### Befund A – Seitentypen sind nicht konsistent an einer einzigen Wahrheit aufgehängt
Im Export sind **18 Seitentypen** enthalten. Im Code gibt es aber an mehreren Stellen nur einen kleineren, harten Satz an Template-Typen bzw. Labels.  
Das ist ein Architekturproblem, kein Detailproblem.

### Befund B – Die Übersichtsseiten sind fachlich noch zu schwer
Gerade `core_process_overview` und `area_overview` brauchen im Alltag eine **content-first Darstellung**:
- oben Titel / ID / Status / Version
- dann direkt die inhaltliche Landkarte bzw. Unterseiten
- optionale Einleitung
- Governance in den Metadaten, nicht als inhaltlicher Block

### Befund C – Deine QM-Vorlagen sind noch nicht vollständig im Template-Modell angekommen
Insbesondere die aktuelle Verfahrensanweisung ist noch **nicht vollständig deckungsgleich** mit deinen gelieferten Musterseiten. Es fehlen bzw. sind nicht sauber strukturiert:
- SIPOC light mit Trigger
- Swimlane-Übersicht
- RACI-Mini als Matrix
- KPI-Tabelle
- Risiken & Kontrollen als strukturierte Tabelle
- Normbezug / Compliance
- Parent / Siblings / Children als echte Relationslogik im Template

### Befund D – Das Rollen-/Stellenprofil ist noch zu knapp
Das aktuelle `role_profile` deckt den hochgeladenen Stellenprofil-Standard noch nicht sauber ab. Es fehlen bzw. sind zu grob:
- Zielsetzung der Stelle
- Budget-/Personalverantwortung
- regelmäßige Routinen
- fachliche, methodische, soziale und persönliche Kompetenzen separat
- Messerfolg / Zielvereinbarung
- Arbeitsmittel
- Datenschutz-Hinweis
- Arbeitszeitmodell / ggf. Gehaltsstufe (optional / vertraulich)

### Befund E – Es fehlen compound widgets für professionelle Felder
Der aktuelle Feld-Renderer ist im Wesentlichen auf primitive Typen ausgelegt:
- Text
- Datum
- Person
- Enum
- Tags
- Number
- Boolean

Für ein professionelles Prozesssystem reicht das nicht. Es braucht wiederverwendbare **strukturiert geführte Fach-Widgets**.

---

# Seitentypen-Review – Einzelbewertung und Zielbild

## 1. Kernprozess-Übersicht (`core_process_overview`)
**Beibehalten, aber stark umbauen.**

### Aktuelles Problem
Die Seite ist noch zu sehr ein Dokument und zu wenig eine echte Prozesslandkarte.

### Zielbild
Auf der Inhaltsseite:
- optionale Kurzbeschreibung / Zweck
- direkt darunter **Prozesslandkarte / Phasen / Unterseiten / Reihenfolge**
- ggf. SIPOC-Kurzsicht
- KPI-Kacheln
- Beziehungen zu Teilprozessen

### Ergänzungen
- strukturierte **Prozessschritt-Tabelle** wie in deiner Gesamtprozess-Vorlage
- Plus-Buttons direkt in Phasen-/Bereichsblöcken
- Governance-Felder nicht prominent auf der Inhaltsseite

---

## 2. Bereichsübersicht (`area_overview`)
**Beibehalten, aber deutlich entschlacken.**

### Aktuelles Problem
Für eine reine Bereichsübersicht sind zu viele Standardfelder denkbar bzw. zu sichtbar.

### Zielbild
Auf der Inhaltsseite:
- kurze Bereichsbeschreibung optional
- direkt die zugeordneten Prozesse / Policies / Profile / Dashboards
- Gruppen oder Themenblöcke
- Unterseitenliste mit Schnellanlage

### Ergänzungen
- klare Child-Slots
- optionale Kachellogik
- kein schwerer Governance-Einstieg auf Content-Ebene

---

## 3. Prozessseite Text (`process_page_text`)
**Beibehalten, aber fachlich strukturieren.**

### Aktuelles Problem
Der Ablauf darf nicht nur ein großes Textfeld bleiben.

### Zielbild
- Trigger / Eingaben
- strukturierte Prozessschritte
- Outputs
- Schnittstellen
- optional RACI-Kurzsicht
- Medien / Anhänge / Vorlagen

### Ergänzungen
- Schritt-für-Schritt-Komponente
- pro Schritt optionale Felder für Rolle, System, Input, Output, Hinweis

---

## 4. Prozessseite Grafik (`process_page_graphic`)
**Beibehalten, aber diagrammzentriert.**

### Zielbild
- Diagramm / Swimlane ganz oben und prominent
- darunter Erläuterung
- Legende
- Verlinkung zu Detailprozess / Verfahrensanweisung / Arbeitsanweisung

### Ergänzungen
- Swimlane-Widget
- Medien-/Diagramm-Referenz sauber modellieren
- nicht als Freitext-Ersatz missbrauchen

---

## 5. Verfahrensanweisung (`procedure_instruction`)
**Muss fachlich nachgezogen werden.**

### Aktuelles Problem
Sie ist noch nicht deckungsgleich zu deiner eigenen QM-Zielvorlage.

### Zielbild
Pflichtbausteine:
- Zweck
- Geltungsbereich
- Ausschlüsse
- SIPOC light mit Trigger
- Ablauf / Swimlane
- Detailablauf
- RACI-Mini
- KPIs
- Schnittstellen & Systeme
- Risiken & Kontrollen
- Dokumente & Vorlagen
- Normbezug / Compliance
- Relations (Parent / Siblings / Children)

### Ergänzungen
- RACI als Matrix
- KPI als Tabelle
- Risiken & Kontrollen als Tabelle
- Dokumente als strukturierte Referenzliste
- Compliance als strukturiertes Feld / Relation

---

## 6. Use Case (`use_case`)
**Grundsätzlich sinnvoll, nur leicht nachschärfen.**

### Ergänzungen
- Trigger ergänzen
- Alternativ- / Ausnahmefälle deutlicher strukturieren
- optional Verantwortlichkeiten und betroffene Systeme

---

## 7. Richtlinie / Policy (`policy`)
**Sinnvoll, aber governance-fester machen.**

### Ergänzungen
- Verantwortlichkeiten expliziter
- Ausnahmen / Eskalation
- Kontroll-/Durchsetzungslogik
- verknüpfte Verfahren / Arbeitsanweisungen

---

## 8. Rollen-/Stellenprofil (`role_profile`)
**Muss klar erweitert werden.**

### Zielbild orientiert am hochgeladenen Stellenprofil:
- Rollendefinition / Einordnung
- Zielsetzung der Stelle
- Kernaufgaben
- Budget- und Personalverantwortung
- regelmäßige Routinen
- Schnittstellen
- fachliche Kompetenzen
- methodische Kompetenzen
- soziale Kompetenzen
- persönliche Eigenschaften
- Messerfolg / Zielvereinbarungen
- Arbeitsmittel
- Datenschutz
- Arbeitszeitmodell
- optionale vertrauliche HR-Felder

---

## 9. Dashboard (`dashboard`)
**Kein klassischer Wissensseitentyp.**

### Empfehlung
Als System-/App-Seite behandeln, nicht wie eine normale Wiki-Seite.  
Optional außerhalb der regulären Prozesshierarchie führen.

---

## 10. Glossar (`glossary`)
**Aktuell zu grob.**

### Empfehlung
Entweder:
- Glossar-Indexseite + Glossareintrag als eigener Typ  
oder
- Glossarseite mit wiederholbaren, stark strukturierten Begriffsblöcken

### Nicht ausreichend
Ein einziges großes `terms`-Feld.

---

## 11. Systemdokumentation (`system_documentation`)
**Gute Basis, aber mehr Struktur nötig.**

### Ergänzungen
- Komponentenliste
- Datenobjekte als strukturierte Tabelle
- Zugriffsrechte als Matrix
- Schnittstellenreferenzen
- Betrieb / Wartung / Backup / SLA sauber getrennt

---

## 12. Arbeitsanweisung (`work_instruction`)
**Sinnvoll, aber arbeitsplatznäher machen.**

### Ergänzungen
- Schrittkomponente mit Screenshots / Medien
- Sicherheits-/Hinweisblöcke
- Qualitätskriterien
- benötigte Materialien / Tools strukturiert
- ideal für Bild-/Video-unterstützte Arbeitsschritte

---

## 13. Checkliste (`checklist`)
**Sinnvoll, aber nicht als generisches Textformular.**

### Ergänzungen
- wiederholbare Prüfpunkte
- Typ je Prüfpunkteintrag
- optional Pflichtnachweis / Artefakt
- Akzeptanzkriterium
- Frequenz / Fälligkeit

---

## 14. FAQ / Wissensartikel (`faq`)
**Sinnvoll, aber als Q&A-Repeater bauen.**

### Nicht ideal
Ein großes Feld `content`.

### Zielbild
- Summary
- einzelne Frage-/Antwort-Einträge
- verwandte Themen
- Zielgruppe

---

## 15. Schnittstellenbeschreibung (`interface_description`)
**Sehr sinnvoll, aber stärker strukturieren.**

### Ergänzungen
- Quellsystem
- Zielsystem
- Richtung
- Datenobjekte
- Format / Protokoll
- Frequenz
- Fehlerbehandlung
- Verantwortlichkeiten pro Seite

---

## 16. Meeting-/Entscheidungsprotokoll (`meeting_protocol`)
**Nützlich, aber eher Begleitmodul.**

### Empfehlung
Nicht im Kernprozessbaum priorisieren, sondern als separaten Dokumentations-/Arbeitsmodus denken.

---

## 17. Schulung / Lernressource (`training_resource`)
**Sinnvoll, aber fachlich separater Bereich.**

### Empfehlung
Für Wissens-/Trainingsbereich gut, aber nicht Kernprozess-Default.

---

## 18. Kontroll-/Prüfobjekt (`audit_object`)
**Sinnvoll für QM/Audit, aber modulartig.**

### Empfehlung
Als Qualitäts-/Auditmodul, nicht als allgemeine Standardseite.

---

# Cluster 26 – Seitentypen-Registry, Source of Truth und Template-Konsolidierung

## Ziel
Alle Seitentypen, Felddefinitionen, Labels, erlaubten Kindtypen, API-Validierungen und UI-Mappings auf eine einzige verbindliche Quelle konsolidieren.

## Warum dieser Cluster nötig ist
Aktuell ist das System an dieser Stelle nicht sauber genug. Export, Shared Registry, UI-Labels und Backend-Validierung wirken nicht vollständig synchron. Solange das nicht bereinigt ist, produziert jede weitere Layout- oder KI-Arbeit technische Schulden.

## Untertasks

### Task 26.1 – Vollständige Seitentypen-Inventur
**Auftrag:**  
Vergleiche vollständig:
- Export der Seitentypen
- Shared Page Type Registry
- DB-Enum / Template-Type-Enum
- UI-Label-Mappings
- API-Validierungen / Hardcodings
- Create-/Update-Flows

**Definition of Done:**
- Abweichungsreport vorhanden
- jeder Seitentyp ist eindeutig dokumentiert
- keine stillen Unterschiede mehr zwischen Export, Code und API

### Task 26.2 – Single Source of Truth definieren
**Auftrag:**  
Lege verbindlich fest, wo Seitentypen und Felddefinitionen künftig führend gepflegt werden:
- codebasiert
- datenbankbasiert
- hybrid mit definierter Richtung

**Definition of Done:**
- ADR / Architekturentscheidung dokumentiert
- Replit beseitigt alle parallelen Wahrheiten
- Export wird künftig aus derselben Quelle generiert

### Task 26.3 – Template-Typen und Labels angleichen
**Auftrag:**  
Säubere alle Mappings für:
- TemplateType
- Page Labels
- Icons
- Kategorien
- allowedChildTypes
- Update-/Create-Validierungen

**Definition of Done:**
- alle 18 Seitentypen systemweit konsistent
- keine Hardcoded-Listen mit abweichendem Umfang
- Labels, Icons und Backend-Typen stimmen überein

### Task 26.4 – Display Profile je Seitentypklasse einführen
**Auftrag:**  
Führe ein zusätzliches Metamodell ein, das definiert, wie ein Seitentyp dargestellt wird:
- `overview_container`
- `process_document`
- `reference_article`
- `governance_document`
- `system_document`
- `module_page`

**Definition of Done:**
- jeder Seitentyp hat ein Display Profile
- Layout-Engine nutzt dieses Profil
- nicht mehr jeder Seitentyp wird generisch behandelt

## Involvierte Dateien / Bereiche
- `lib/shared/src/page-types/registry.ts`
- `artifacts/wiki-frontend/src/lib/types.ts`
- `artifacts/api-server/src/routes/content.ts`
- `lib/db/src/schema/enums.ts`
- `lib/db/src/schema/content-templates.ts`
- ggf. API-Spec und generierte Client-Typen
- Seitentyp-Export / Registry-Export-Logik

---

# Cluster 27 – Content-First Layouts und praxistaugliche Seitenanordnung

## Ziel
Die Inhaltsseiten so umbauen, dass Nutzer zuerst den eigentlichen fachlichen Content sehen und nicht Verwaltungslogik.

## Warum dieser Cluster nötig ist
Der Nutzer arbeitet inhaltlich. Governance-Metadaten sind wichtig, aber sie dürfen die Leselogik nicht dominieren. Gerade Übersichtsseiten müssen deutlich stärker wie Navigations- und Prozesslandkarten wirken.

## Untertasks

### Task 27.1 – Header-/Meta-Modell definieren
**Auftrag:**  
Definiere verbindlich, was auf jeder Seite in den Header gehört:
- Titel
- ID
- Status
- Version
- Freigabebadge
- optional letzte Prüfung / Beobachten / Teilen

Und was **nicht** in den Inhaltsfluss gehört.

**Definition of Done:**
- globales Header-Modell dokumentiert
- keine unnötigen Governance-Blöcke im Content-Bereich
- Header konsistent über alle Seitentypen

### Task 27.2 – Übersichtsseiten vereinfachen
**Auftrag:**  
Baue `core_process_overview` und `area_overview` content-first um.

**Definition of Done:**
- optionale Kurzbeschreibung
- direkt sichtbare Kinder / Bereiche / Phasen / Unterseiten
- Plus-Aktionen im Kontext
- keine schwergewichtigen Zusatzfelder im Hauptcontent

### Task 27.3 – Seitentyp-spezifische Layouts erweitern
**Auftrag:**  
Erweitere die Layout-Engine so, dass nicht nur wenige Typen Speziallayouts haben.

**Definition of Done:**
- keine unpassende Generic-Layout-Überdehnung
- fachlich passende Layouts für die zentralen Seitentypen
- klare Reihenfolge pro Seitentyp

### Task 27.4 – Quick Facts Strip nur dort, wo fachlich sinnvoll
**Auftrag:**  
Falls ein Quick Facts Strip angezeigt wird, dann nur mit wirklich relevanten Infos:
- z. B. Gültig ab, Nächstes Review, Owner
- aber nicht als Standardmüll auf jeder Übersichtsseite

**Definition of Done:**
- Quick Facts nur nach Seitentyp / Display Profile
- Übersichtsseiten bleiben schlank
- Governance sichtbar, aber nicht störend

## Involvierte Dateien / Bereiche
- `artifacts/wiki-frontend/src/pages/NodeDetail.tsx`
- `artifacts/wiki-frontend/src/components/layouts/PageLayout.tsx`
- `artifacts/wiki-frontend/src/components/layouts/ProcessOverviewLayout.tsx`
- `artifacts/wiki-frontend/src/components/layouts/ProcedureLayout.tsx`
- `artifacts/wiki-frontend/src/components/layouts/PolicyLayout.tsx`
- `artifacts/wiki-frontend/src/components/layouts/RoleProfileLayout.tsx`
- `artifacts/wiki-frontend/src/components/layouts/GenericSectionLayout.tsx`

---

# Cluster 28 – Strukturierte QM-Komponenten statt Freitext

## Ziel
Alle fachlich stark strukturierten Prozess- und QM-Felder als echte Komponenten implementieren.

## Warum dieser Cluster nötig ist
Ein professionelles Wissensmanagement lebt nicht von „einfachen Textfeldern mit viel Hoffnung“.  
Gerade RACI, SIPOC, Swimlane, KPI und Risiko-/Kontrolllogik müssen strukturiert geführt werden.

## Hinweis
Weil du vom „S-Feld“ gesprochen hast und die Formulierung nicht ganz eindeutig war, soll Replit **beides** professionell umsetzen:
- **SIPOC**
- **Swimlane**

## Untertasks

### Task 28.1 – RACI-Matrix-Komponente
**Auftrag:**  
Implementiere eine RACI-Komponente mit:
- Zeilen = Prozessschritte
- Spalten = Rollen
- Zellwerte = leer / R / A / C / I
- Legende
- optional Validierungsregeln

**Definition of Done:**
- kein Freitext-RACI mehr
- editierbare Matrix
- lesbare Darstellungsansicht
- export-/diff-fähig

### Task 28.2 – SIPOC-Light-Komponente
**Auftrag:**  
Implementiere SIPOC strukturiert, orientiert an deiner QM-Vorlage:
- Trigger
- Supplier
- Inputs
- Process (Kurz)
- Outputs
- Customer / Stakeholder

**Definition of Done:**
- Eingabe als geführte Struktur
- Anzeige nicht als JSON-Text
- kontextbezogene Hilfetexte vorhanden

### Task 28.3 – Swimlane-/Diagramm-Komponente
**Auftrag:**  
Implementiere einen geführten Swimlane-/Diagramm-Baustein:
- Kurzbeschreibung
- Rollen / Lanes
- Diagramm / Bild / Visio / Medienreferenz
- Link zu Detailablauf / Detailseite

**Definition of Done:**
- diagrammzentrierte Darstellung
- Medien-/Dateireferenz sauber integriert
- geeignet für Prozessseiten mit Grafikfokus

### Task 28.4 – KPI-Tabelle
**Auftrag:**  
Implementiere eine strukturierte KPI-Komponente mit Spalten:
- KPI
- Definition / Scope
- Formel
- Ziel
- Datenquelle / Report
- Messfrequenz
- Owner (Rolle)

**Definition of Done:**
- KPI nicht mehr als Freitextblock
- sortier-/vergleichbar
- sauber im Review diffbar

### Task 28.5 – Risiken-&-Kontrollen-Komponente
**Auftrag:**  
Implementiere strukturierte Tabelle für:
- Risiko
- Auswirkung
- Kontrolle / Maßnahme
- Nachweis / Artefakt
- Owner (Rolle)
- optional Bewertung / Severity

**Definition of Done:**
- strukturierte Eingabe
- saubere Darstellungsansicht
- geeignet für QM- und Audit-Seiten

### Task 28.6 – Schnittstellen-&-Systeme-Komponente
**Auftrag:**  
Implementiere strukturierte Eingabe für:
- Typ (Upstream / Downstream / System / organisatorisch)
- Gegenstelle
- Input / Output
- Medium / System
- Bemerkung

**Definition of Done:**
- keine unstrukturierten Schnittstellenlisten mehr
- sowohl Prozess- als auch Systemseiten nutzbar

### Task 28.7 – Prozessschritt-/Prozesslandkarten-Komponente
**Auftrag:**  
Für Kernprozess-Übersichten und Bereichsübersichten eine tabellarische / kartenbasierte Prozessschritt-Komponente bauen:
- Reihenfolge
- Titel
- Prozess-ID
- Seitentyp
- Kurzinhalt
- Rolle / Stelle
- Organ / Gremium
- Link zur Seite

**Definition of Done:**
- orientiert an deiner Gesamtprozess-Vorlage
- Unterseitenliste und Prozesslandkarte sauber verbunden
- Plus-Aktionen im Kontext möglich

## Involvierte Dateien / Bereiche
- `lib/shared/src/page-types/registry.ts`
- neue strukturierte UI-Komponenten unter z. B. `artifacts/wiki-frontend/src/components/structured/`
- `artifacts/wiki-frontend/src/components/metadata/MetadataFieldRenderer.tsx`
- `artifacts/wiki-frontend/src/components/layouts/*`
- `artifacts/wiki-frontend/src/pages/NodeDetail.tsx`
- API-/Revision-/Diff-Logik für strukturierte Felder

---

# Cluster 29 – Ausfüllhilfen, Feldunterteilung und Guided Input UX

## Ziel
Felder und Sektionen so führen, dass auch nicht perfektionierte Autor:innen sofort wissen, was wohin gehört.

## Warum dieser Cluster nötig ist
Gerade bei RACI, SIPOC, Rollenprofilen, Risiken, KPIs usw. führt ein offenes Textfeld fast zwangsläufig zu Wildwuchs.

## Untertasks

### Task 29.1 – Feld-Hilfe-Modell pro Feld einführen
**Auftrag:**  
Erweitere jedes relevante Feld um:
- Kurzbeschreibung
- Ausfüllhilfe
- Beispiel
- optional „schlechtes Beispiel vermeiden“
- Placeholder / Erwartungsformat

**Definition of Done:**
- Hilfen im UI direkt verfügbar
- nicht nur in Template-Preview versteckt
- Hilfetexte kontextbezogen

### Task 29.2 – Compound Fields statt Einzelfreitext
**Auftrag:**  
Felder mit starrer Logik als unterteilte Eingabe bauen.

**Beispiele:**
- RACI = Matrix
- SIPOC = Einzelkarten
- FAQ = QA-Repeater
- Glossar = Begriff/Definition/Synonym
- Checklist = strukturierte Prüfpunkte
- Role Profile = getrennte Kompetenzbereiche

**Definition of Done:**
- keine fachlich starren Felder mehr als dumpfes Freitextfeld
- konsistente Eingabestruktur

### Task 29.3 – Guided Mode pro Seitentyp ausbauen
**Auftrag:**  
Seitentypen müssen schrittweise ausfüllbar sein:
- was ist Pflicht
- was wird empfohlen
- was fehlt noch
- was ist veröffentlichungsrelevant

**Definition of Done:**
- Guided Mode real nutzbar
- Vollständigkeitsstatus nachvollziehbar
- Publish-Readiness wird verständlich angezeigt

### Task 29.4 – Template-spezifische Validierung schärfen
**Auftrag:**  
Publish- und Review-Validierung auf die strukturierten Felder anpassen.

**Definition of Done:**
- keine Veröffentlichung trotz leeren Pseudoinhalts
- Mindestumfang pro Seitentyp geprüft
- Fehlertexte verständlich und konkret

## Involvierte Dateien / Bereiche
- `lib/shared/src/page-types/registry.ts`
- `artifacts/wiki-frontend/src/components/metadata/MetadataFieldRenderer.tsx`
- `artifacts/wiki-frontend/src/components/metadata/MetadataPanel.tsx`
- `artifacts/wiki-frontend/src/components/settings/TemplateDetailPanel.tsx`
- `artifacts/wiki-frontend/src/components/metadata/CompletenessIndicator.tsx`
- Create-/Publish-/Review-Validierungen im Frontend und Backend

---

# Cluster 30 – Feldbezogene KI-Ausfüllhilfe und zentrale KI-Feldlogik

## Ziel
Eine professionelle feldbezogene KI implementieren, die Inhalte je Feldtyp sauber verbessert, aus Stichpunkten formuliert und Änderungen transparent vorschlägt.

## Warum dieser Cluster nötig ist
Die bisherige KI ist seiten- bzw. textselektionsorientiert. Dein Ziel ist aber präziser:
- direkt am Feld arbeiten
- fachlich passend zum Feld
- Änderungen sichtbar vor Übernahme
- zentral administrierbar

## Untertasks

### Task 30.1 – Magic-Wand-UX je Feld / Sektion
**Auftrag:**  
Implementiere an relevanten Feldern und strukturierten Sektionen einen kleinen KI-Button (Zauberstab).

**Definition of Done:**
- Button sichtbar, aber nicht störend
- auf Metadatenfeldern, Sektionen und strukturierten Widgets nutzbar
- nur bei berechtigten Rollen verfügbar

### Task 30.2 – Nicht-destruktive Vorschau / Diff
**Auftrag:**  
Die KI darf Inhalte nicht blind überschreiben. Nutzer müssen sehen:
- vorher
- nachher
- optional Diff / Änderungsmarkierung
- übernehmen / verwerfen / ergänzen

**Definition of Done:**
- jeder KI-Vorschlag ist vor Übernahme prüfbar
- keine verdeckte Auto-Änderung
- für Prozessmanager und Editor nachvollziehbar

### Task 30.3 – Feldprofil-/Prompt-Registry
**Auftrag:**  
Baue eine zentrale Admin-Logik für feldbezogene KI-Regeln.

**Pro Eintrag mindestens:**
- pageType
- fieldKey / sectionKey / widgetKey
- Label
- Zweck des Feldes
- Prompt-Anweisung
- gewünschter Stil
- Halluzinationsgrenze
- erlaubte Operationen (umformulieren, professionalisieren, aus Stichpunkten ausbauen, kürzen, korrigieren)

**Definition of Done:**
- Admin kann diese Regeln zentral einsehen und pflegen
- Default-Regeln aus Template-Definition ableitbar
- Overrides sauber gespeichert

### Task 30.4 – KI-Guardrails je Feldtyp
**Auftrag:**  
Definiere feldspezifische Regeln.

**Beispiele:**
- RACI: KI darf Rollen-/Verantwortungslogik strukturieren, aber keine Personen halluzinieren
- KPI: KI darf Definitionen sprachlich säubern, aber keine Kennzahlen erfinden
- Risiken: KI darf Formulierungen verbessern, aber keine falschen Kontrollen ergänzen
- Role Profile: KI darf Stichpunkte strukturieren, aber keine HR-Daten erfinden

**Definition of Done:**
- Guardrails je Feldtyp dokumentiert
- KI-Verhalten fachlich belastbar
- keine unkontrollierte „Kreativität“ in Governance-Feldern

### Task 30.5 – Feldbezogene API-Endpunkte und Logging
**Auftrag:**  
Erweitere die AI-API um feldbezogene Operationen inkl. Logging.

**Definition of Done:**
- API für `field_assist`
- Logging je Aufruf
- nachvollziehbar, welches Feld mit welchem Modus bearbeitet wurde

### Task 30.6 – AI Settings um Feldlogik erweitern
**Auftrag:**  
Die AI-Einstellungen sollen nicht nur globale Modelle/Source Modes kennen, sondern auch die feldbezogene Konfiguration.

**Definition of Done:**
- eigene Admin-Sicht für Feldregeln
- Such-/Filtermöglichkeit nach Seitentyp/Feld
- kein unübersichtliches Freitextmonster

## Involvierte Dateien / Bereiche
- `artifacts/wiki-frontend/src/components/settings/AISettingsTab.tsx`
- `artifacts/wiki-frontend/src/components/ai/PageAssistant.tsx`
- `artifacts/wiki-frontend/src/components/metadata/MetadataFieldRenderer.tsx`
- strukturierte Widgets aus Cluster 28
- `artifacts/api-server/src/routes/ai.ts`
- `artifacts/api-server/src/services/ai.service.ts`
- `lib/db/src/schema/ai-settings.ts`
- ggf. neue DB-Tabelle für feldbezogene AI-Profile / Overrides

---

# Cluster 31 – Fachliche Nachschärfung einzelner Seitentypen

## Ziel
Die wichtigsten Seitentypen fachlich auf dein echtes Zielbild ausrichten.

## Warum dieser Cluster nötig ist
Die Systemlogik ist jetzt weit genug, dass man die Seitentypen selbst präzisieren muss. Sonst bleibt das Tool strukturell gut, aber fachlich mittelmäßig.

## Untertasks

### Task 31.1 – Verfahrensanweisung an QM-Muster anpassen
**Auftrag:**  
Richte `procedure_instruction` vollständig an deiner Muster-Verfahrensanweisung aus.

**Definition of Done:**
- Zweck, Geltungsbereich, Ausschlüsse
- SIPOC light
- Swimlane
- RACI-Mini
- KPI
- Schnittstellen
- Risiken & Kontrollen
- Dokumente / Vorlagen
- Normbezug / Compliance
- Relations

### Task 31.2 – Kernprozess-Übersicht an Gesamtprozess-Vorlage anpassen
**Auftrag:**  
Richte `core_process_overview` an deiner Gesamtprozess-Übersicht aus.

**Definition of Done:**
- Prozessschrittelogik
- hierarchische Phasen / Unterprozesse
- Verlinkung auf Detailseiten
- content-first Übersicht

### Task 31.3 – Rollenprofil an Stellenprofil ausrichten
**Auftrag:**  
Erweitere `role_profile` anhand des hochgeladenen Stellenprofils.

**Definition of Done:**
- Zielsetzung, Kernaufgaben, Kompetenzen, Routinen, Verantwortungen usw. sauber enthalten
- sensible HR-Felder sinnvoll klassifiziert
- nicht alles in zwei grobe Textblöcke gepresst

### Task 31.4 – FAQ, Glossar, Checkliste spezialisieren
**Auftrag:**  
Mache aus diesen Typen echte Fachtypen mit Repeaters/Entry-Strukturen statt generischer Contentfelder.

**Definition of Done:**
- FAQ = Frage/Antwort-Blöcke
- Glossar = Begriffslogik
- Checklist = strukturierte Prüfpunkte

### Task 31.5 – Dashboard, Meeting, Audit, Training modular einordnen
**Auftrag:**  
Prüfe und implementiere, welche Typen im Kernbaum standardmäßig auftauchen und welche eher modulartig / separat behandelt werden.

**Definition of Done:**
- keine unklare Vermischung von Prozesslandkarte und Begleitdokumenten
- Navigations- und Anlagelogik danach bereinigt

## Involvierte Dateien / Bereiche
- `lib/shared/src/page-types/registry.ts`
- alle spezialisierten Layout-Komponenten
- Create-/Preview-/Template-Ansichten
- ggf. Migration bestehender Inhalte

---

# Cluster 32 – Smarter Erstellungsflow und bessere Seitenanlage

## Ziel
Die Erstellung neuer Seiten deutlich intelligenter, geführter und schneller machen.

## Warum dieser Cluster nötig ist
Wenn die Anlage schon sperrig ist, leidet die spätere Inhaltsqualität. Gerade Überblicksseiten müssen die Erstellung von Unterseiten leicht machen.

## Untertasks

### Task 32.1 – Erstellungsdialog kontextsensitiv machen
**Auftrag:**  
Zeige je Parent-Seite nur die sinnvollsten Typen, priorisiert nach Nutzungskontext.

**Definition of Done:**
- nicht nur erlaubte, sondern empfohlene Typen
- bessere Erstentscheidung für Nutzer

### Task 32.2 – Variantenlogik schärfen
**Auftrag:**  
Varianten müssen wirklich sinnvoll sein:
- schlank
- standard
- QM-detailliert
- grafisch
- container

**Definition of Done:**
- Varianten sind fachlich nachvollziehbar
- nicht nur kosmetische Voreinstellungen

### Task 32.3 – Kontext-Plus-Buttons auf Übersichtsseiten
**Auftrag:**  
Unter Überschriften / Bereichen / Phasen sollen neue Seiten direkt angelegt werden können.

**Definition of Done:**
- Plus-Buttons im Inhaltskontext
- automatische Parent-/Relation-Vorbelegung
- Seite landet an richtiger Stelle

### Task 32.4 – Vorbelegte Struktur statt leerer Hülle
**Auftrag:**  
Beim Anlegen sollen sinnvolle strukturierte Blöcke/Widgets direkt mitkommen.

**Definition of Done:**
- kein leeres Blatt, wenn strukturierte Seite erwartet wird
- User startet mit sinnvoller Arbeitsoberfläche

## Involvierte Dateien / Bereiche
- `artifacts/wiki-frontend/src/components/CreateNodeDialog.tsx`
- `artifacts/wiki-frontend/src/pages/NodeDetail.tsx`
- Übersichtsseiten-/Layout-Komponenten
- Registry / Variantendefinitionen

---

# Cluster 33 – Regression, Migration und formale Abnahme

## Ziel
Sicherstellen, dass die neuen Seitentyp- und Feldlogiken produktionsreif eingeführt werden.

## Warum dieser Cluster nötig ist
Die Umstellung auf strukturierte Felder und neue Layoutlogik ist tiefgreifend. Ohne Migration, Tests und Sichtprüfung drohen Inkonsistenzen in bestehenden Seiten.

## Untertasks

### Task 33.1 – Migrationsstrategie für bestehende Seiten
**Auftrag:**  
Definiere, wie bestehende Inhalte auf neue strukturierte Felder gemappt werden.

**Definition of Done:**
- Migrationsmatrix pro Seitentyp
- Fallback-Regeln dokumentiert
- keine stillen Datenverluste

### Task 33.2 – Diff-/Review-/History-Kompatibilität prüfen
**Auftrag:**  
Prüfe, dass strukturierte Widgets sauber diffbar und reviewbar bleiben.

**Definition of Done:**
- Versionsvergleich funktioniert auch für Tabellen/Matrizen
- Review-UI bleibt brauchbar

### Task 33.3 – Playwright-/Frontend-Abnahme
**Auftrag:**  
Teste:
- Seitenerstellung
- Seitentypwechsel
- strukturierte Felder
- KI-Vorschläge
- Übersichtsseiten
- Publish-Readiness

**Definition of Done:**
- dokumentierte E2E-Abnahme
- Screenshots / Nachweise vorhanden
- keine Regression in zentralen Flows

### Task 33.4 – Doku und technisches Log aktualisieren
**Auftrag:**  
Alle Änderungen an Seitentypen, Feldern, AI-Regeln und Layouts sauber dokumentieren.

**Definition of Done:**
- Systemdoku aktualisiert
- Change-Log aktualisiert
- Clusterreport mit Dateiliste und Ergebnisnachweis vorhanden

## Involvierte Dateien / Bereiche
- Migrationen / Seeds
- E2E-Tests
- Doku
- Audit- / Cluster-Reports
- Versions-/Review-Logik

---

# Empfohlene Reihenfolge

1. **Cluster 26** – Registry / Source of Truth  
2. **Cluster 27** – Content-First Layouts  
3. **Cluster 28** – Strukturierte QM-Komponenten  
4. **Cluster 29** – Guided Input / Ausfüllhilfen  
5. **Cluster 30** – Feldbezogene KI-Ausfüllhilfe  
6. **Cluster 31** – Fachliche Nachschärfung Seitentypen  
7. **Cluster 32** – Smarter Erstellungsflow  
8. **Cluster 33** – Migration / Regression / Abnahme

---

# Harte Schlussbewertung

Dein Gefühl ist richtig:  
Die aktuelle Tablogik ist als Grundgerüst brauchbar, aber die **Seitentypen selbst** sind noch nicht sauber genug auf den späteren Praxiseinsatz optimiert.

Die entscheidende Korrektur lautet:

**Nicht alle Felder müssen weg – aber sie müssen fachlich besser modelliert und deutlich besser dargestellt werden.**

Für FlowCore ist jetzt der nächste Reifegrad nicht „mehr Felder“, sondern:

- **bessere Feldtypen**
- **bessere Seitentypen**
- **bessere Darstellung**
- **bessere Erstellungslogik**
- **feldbezogene KI mit klarer Führung**
