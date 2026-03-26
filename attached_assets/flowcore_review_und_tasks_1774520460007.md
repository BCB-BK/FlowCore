# FlowCore – Review des aktuellen Stands und Taskpaket zur Professionalisierung

## Prüfgrundlage
Dieses Review basiert auf dem hochgeladenen Quellcode-Export `FlowCore-master.zip`, der Systemdokumentation `FlowCore_Systemdokumentation_Audit.zip` sowie dem bereitgestellten Screenshot zur gewünschten Backup-UX.

Wichtig: Das ist ein **statisches Architektur-, UX- und Strukturreview**, kein vollständiger Live-Systemtest. Ich habe also Code, Dokumentation, Modelle, UI-Struktur und Konsistenz geprüft – nicht jede Funktion im laufenden Betrieb durchgeklickt.

---

## 1. Executive Summary

### Gesamturteil
Der Stand ist **deutlich weiter als ein Mockup**. Die Grundarchitektur ist professionell angelegt:
- saubere Trennung von `content_nodes` und `content_revisions`
- Dual-ID-Modell mit `immutable_id` und `display_code`
- Rollen-/Rechtebasis vorhanden
- SharePoint-/Teams-/OpenAI-Anbindung strukturell berücksichtigt
- Editor-Grundlage mit Medien, Video, Embed, Dateien und Drag-Mechanik vorhanden
- Versions- und Review-Logik grundsätzlich richtig gedacht

### Aber
Für ein **wirklich belastbares Wissensmanagement-System auf Mittelstands-Niveau** fehlen an mehreren Stellen noch wichtige Dinge:
1. **Template-Set ist noch nicht fachlich vollständig und teils inkonsistent dokumentiert.**
2. **Seitentypen sind funktional da, aber noch nicht stark genug als geführte Fachvorlagen.**
3. **UX ist ordentlich, aber noch nicht maximal anwenderfreundlich und noch nicht durchgängig „business polished“.**
4. **Backup ist dokumentiert, aber praktisch noch nicht als vollständige produktive Admin-Funktion umgesetzt.**
5. **GitHub-Schnittstelle ist im aktuellen Export nicht als fertige produktive Connector-Integration sichtbar.**
6. **Medien-/Editorlogik ist gut angelegt, aber noch nicht durchgängig auf professionelles Wissensmanagement mit sauberer Wiederverwendung, Policies und Governance gehärtet.**

### Klare Einordnung
Das System ist **architektonisch auf dem richtigen Weg**, aber noch nicht in dem Zustand, den du als „final professionell“ beschreiben würdest. Es braucht jetzt keine komplette Neuausrichtung mehr, sondern **gezielte Härtung und Standardisierung**.

---

## 2. Positiv: Was bereits gut und richtig gelöst ist

### 2.1 Architektur und Datenmodell
Sehr gut gelöst ist die Trennung aus:
- `content_nodes` als stabile Seitenidentität
- `content_revisions` als immutable Inhalts-Snapshots
- `content_aliases` für Historie der sichtbaren Codes
- `content_relations` für Graph-Beziehungen
- `media_assets`, `source_references`, `page_watchers`, `page_verifications`, `notifications`

Das ist **kein Wiki-Spielzeugmodell**, sondern eine tragfähige Basis. Besonders richtig ist:
- **immutable ID + mutable display code**
- **Revision ≠ Version**
- **Restore als neue Revision statt Überschreiben historischer Daten**

### 2.2 Review- und Freigabelogik
Die Statuskette `draft -> in_review -> approved -> published -> archived` ist professionell. Auch die Trennung von Reviewer/Freigeber ist fachlich richtig.

### 2.3 Editor-Grundlage
Der Editor ist bereits überdurchschnittlich gut vorbereitet:
- Tiptap-basiert
- Blockstruktur
- Slash-Commands
- Drag-Handle vorhanden
- Bild, Video, Datei, Embed, Callout, Diagramm-Erweiterungen vorhanden
- Medienbibliothek ist angedacht

### 2.4 SharePoint-/Microsoft-Ausrichtung
SharePoint ist nicht nur kosmetisch erwähnt, sondern technisch bereits als Storage-/Connector-Schicht vorgesehen. Das ist wichtig und richtig, weil du Medien, Archive und Wissensquellen sauber über Microsoft anbinden willst.

### 2.5 Rechte und Personenbezug
PeoplePicker, Rollenverwaltung und Graph-basierte Personenlogik gehen klar in die richtige Richtung. Für dein Ziel ist das zwingend.

---

## 3. Kritische Befunde

## 3.1 Templates / Seitentypen: gut angelegt, aber noch nicht vollständig genug

### Positiv
In der Registry sind aktuell diese Typen angelegt:
- `core_process_overview`
- `area_overview`
- `process_page_text`
- `process_page_graphic`
- `procedure_instruction`
- `use_case`
- `policy`
- `role_profile`
- `dashboard`
- `system_documentation`
- `glossary`

Das ist eine gute Basis.

### Das Problem
Für ein professionelles Wissensmanagement fehlen noch **einige fachlich sinnvolle Spezialisierungen** oder sie sind in der Doku/UI nicht sauber konsistent:
- Arbeitsanweisung vs. Verfahrensanweisung nicht sauber getrennt
- Formular-/Checklisten-Vorlage fehlt als eigener Typ
- FAQ / Q&A-Wissenseintrag fehlt
- Schulungs-/WBT-/Lernressourcen-Typ fehlt trotz Bildungs-/Trainingskontext
- Meeting-/Entscheidungsprotokoll fehlt
- System-/Schnittstellenkatalog ist zu grob
- Rollenprofil ist noch nicht stark genug an Stellenprofil / Verantwortungsmatrix angelehnt

### Inkonsistenz
Der Editor-Leitfaden nennt mehr Typen als die Registry tatsächlich enthält, z. B.:
- Teilprozess
- Arbeitsanweisung
- Formularvorlage
- Infoseite
- FAQ
- Glossareintrag
- Bereichsseite

Das ist problematisch. Entweder ist die Doku zu alt oder die Produktlogik ist nicht nachgezogen.

**Bewertung:** fachlich nicht sauber genug synchronisiert.

---

## 3.2 Templates sind noch zu generisch statt wirklich geführt

Aktuell bestehen viele Templates im Kern aus:
- Metadatenfeldern
- Sektionen
- generischem Layout oder leicht spezialisiertem Layout

Das reicht für eine gute technische Basis, aber noch nicht für ein belastbares Redaktionssystem.

### Was fehlt
Ein professionelles Template braucht zusätzlich:
- Pflichtlogik je Rolle/Status
- section-level guidance
- Placeholder-/Leittext
- fachliche Validierungsregeln
- abhängigkeitsbasierte Pflichtfelder
- Review-Hinweise
- Qualitätswarnungen pro Feld/Sektion
- strukturierte Tabellen-/Matrix-Komponenten statt nur Freitext

Beispiel: Eine Verfahrensanweisung darf nicht nur aus `scope`, `procedure`, `documents` bestehen. Sie sollte strukturell mindestens unterstützen:
- Zweck
- Geltungsbereich
- Auslöser / Vorbedingungen
- Eingaben
- Durchführungsablauf
- Verantwortlichkeiten / Rollen
- Schnittstellen
- Systeme / Tools
- mitgeltende Dokumente
- Risiken / Kontrollen
- Kennzahlen / Qualitätskriterien
- Änderungen / Hinweise

**Bewertung:** aktuelle Templates sind brauchbar, aber noch nicht „QM-/Prozessmanagement-reif“.

---

## 3.3 UX / Benutzerfreundlichkeit: solide, aber noch nicht maximal einfach

### Positiv
- `CreateNodeDialog` ist grundsätzlich richtig aufgebaut
- Kategorien, Varianten und Elternlogik sind da
- Unterseiten können angelegt werden
- Node-Detail-Seite hat Tabs für Inhalt, Metadaten, Versionen, Unterseiten

### Schwächen
1. **Der Erstellungsflow ist technisch gut, aber noch nicht maximal schnell und intuitiv.**
2. **Das von dir gewünschte direkte „Plus unter Überschriften/Abschnitten“ ist so noch nicht wirklich umgesetzt.**
3. **Unterseiten sind als Tab und globaler Button sichtbar, aber nicht fein im Inhaltskontext verankert.**
4. **Generische Sektionskarten sind brauchbar, aber noch nicht „wow“-mäßig redaktionsfreundlich.**
5. **Es fehlt ein stärkeres Inline-Gefühl wie in Notion/modernem Block-Authoring.**
6. **Die Seiten wirken funktional, aber noch nicht visuell vollständig wie ein durchdesigntes Enterprise-Produkt.**

### Konkreter UX-Befund
Du willst:
- Plus-Logik direkt im Kontext
- Drag & Drop von Bildern/Videos/Dateien
- extrem einfaches Erstellen von Unterseiten
- moderne, sofort verständliche Bearbeitung

Aktuell ist das **teilweise vorhanden**, aber **noch nicht kompromisslos umgesetzt**.

---

## 3.4 Editor / Medien: gute Basis, aber noch nicht ganz professionell genug

### Was bereits da ist
- Image
- VideoBlock
- EmbedBlock
- FileBlock
- DragHandle
- MediaLibraryDialog

### Kritische Punkte
1. **Video-/Embed-Handling basiert aktuell stark auf URL-/Node-Attributen.**
   Das ist okay, aber für Enterprise-Betrieb noch zu dünn, wenn man Governance, Vorschaubilder, Freigaben, Quelle, Media-Policy, Lebenszyklus und Wiederverwendung sauber will.

2. **Diagramm-/Grafiklogik ist sichtbar, aber noch nicht als starker Business-Baustein erkennbar.**
   Für Prozesse brauchst du mehr als „hier ist ein Diagrammblock“.

3. **Medien sollten stärker als wiederverwendbare, referenzierte Assets funktionieren**, nicht nur als Block-Einbettung.

4. **Es fehlt eine klare Policy für erlaubte Quellen, Dateitypen, Dateigrößen, Versionierung von Medien und Ersetzung bestehender Medien.**

5. **Es fehlt ein sauberer Unterschied zwischen:**
   - eingebettetes Medienobjekt
   - referenzierter SharePoint-Inhalt
   - hochgeladenes lokales Asset
   - externes Embed

**Bewertung:** technisch gut vorbereitet, aber noch nicht als produktive Wissensmanagement-Medienarchitektur fertig.

---

## 3.5 SharePoint-Integration: sinnvoll, aber funktional weiter zu härten

Die SharePoint-Logik ist klar erkennbar. Es gibt Services zum:
- Sites listen
- Drives listen
- Drive-Items browsen
- Inhalte lesen
- Storage abstrahieren

Das ist richtig.

### Aber
Noch nicht ausreichend gehärtet ist aus Produktsicht:
- verbindliche Auswahl eines Standard-Zielsystems je Anwendungsfall
- Trennung Wissensquellen vs. Medienarchiv vs. Backup-Ziel
- Fallback-/Fehlerlogik in der Admin-Oberfläche
- Sichtbarkeit der tatsächlich verwendeten Drive-/Folder-Zuordnung
- klare Schreib-/Lese-Berechtigung je Connector-Zweck
- Konsistenzregeln bei verschobenen oder gelöschten SharePoint-Dateien

**Bewertung:** technisch brauchbar, produktseitig noch nicht durchdefiniert genug.

---

## 3.6 GitHub-Schnittstelle: im aktuellen Stand offenbar nicht produktiv integriert

Du hast explizit gesagt, dass die aktuelle Schnittstelle zu GitHub nicht richtig funktioniert.

Im exportierten Code ist zwar eine Connector-/Settings-Struktur vorhanden, aber eine **klare, fertige GitHub-Connector-Implementierung** ist im relevanten Produktcode nicht in gleicher Weise sichtbar wie SharePoint.

Das heißt nüchtern:
- Entweder GitHub ist nur teilweise / experimentell angebunden
- oder die Umsetzung ist unvollständig
- oder sie liegt nicht in dem exportierten relevanten Pfad

**Bewertung:** GitHub aktuell nicht als belastbare produktive Wissensquelle bewertbar.

---

## 3.7 Backup: dokumentiert, aber noch nicht als reife Admin-Funktion umgesetzt

Es gibt bereits eine Datei `docs/12-BACKUP-RESTORE.md`. Die ist sinnvoll. Aber das ist **Betriebsdokumentation**, keine fertige Admin-Funktion.

Was fehlt:
- produktive UI im Stil deines Screenshots
- persistente Backup-Konfiguration in DB
- Auswahl von SharePoint-Site/Drive/Ordner
- Zeitpläne im System
- Retention-Regeln
- manuelles Backup per UI
- Backup-Historie mit Status
- Restore-Trigger mit Schutzmechanismen
- Auditierung aller Backup-Aktionen
- Health-/Fehlermeldungen für fehlende Drive-ID oder Token

**Bewertung:** funktional noch nicht fertig. Genau hier brauchst du jetzt einen sauberen eigenen Cluster bzw. Taskblock.

---

## 4. Fachliche Bewertung der Seitentypen

## 4.1 Die aktuelle Grundlogik ist richtig
Die existierenden Haupttypen machen Sinn:
- Bereichsübersicht
- Kernprozess
- Prozess (Text)
- Prozess (Grafik)
- Verfahrensanweisung
- Richtlinie
- Use Case
- Rollenprofil
- Systemdokumentation
- Glossar

Das ist als Kernset brauchbar.

## 4.2 Was ich ergänzen würde
Für wirklich professionelles Wissensmanagement fehlen aus meiner Sicht noch diese Seitentypen oder Template-Varianten:

### Pflicht-Ergänzungen
1. **Arbeitsanweisung**
   Noch granularer als Verfahrensanweisung.

2. **Checkliste / Formularvorlage**
   Für wiederkehrende operative Arbeit.

3. **FAQ / Knowledge Article**
   Für konkrete Fragestellungen und schnelle Hilfe.

4. **Schnittstellenbeschreibung**
   Für System-zu-System- oder Prozess-zu-System-Integration.

5. **Meeting-/Entscheidungsprotokoll**
   Für Governance und Nachvollziehbarkeit.

6. **Schulung / Lernressource / WBT-Beschreibung**
   Gerade in eurem Umfeld sinnvoll.

7. **Kontroll-/Prüfobjekt**
   Für QM, Audit, Compliance, Kontrollpunkte.

### Optionale Ergänzungen
- Risikoeintrag
- KPI-Definition
- Rollenmatrix / RACI-Matrix
- Tool-/Systemsteckbrief
- Formularinstanz / Protokollinstanz

---

## 5. Fachliche Bewertung der Metadatenfelder

Die vorhandenen Gruppen sind sinnvoll:
- Identität
- Governance
- Validity
- Classification

### Aber für „absolut professionell“ fehlen noch mehrere Felder

### Pflicht-Ergänzungen
- `status_reason`
- `process_owner_org_unit`
- `deputy_org_unit`
- `review_required_by`
- `effective_date` vs. `publish_date` sauber getrennt
- `document_type`
- `source_of_truth`
- `related_systems`
- `related_roles`
- `risk_level`
- `control_level`
- `change_impact`
- `training_required`
- `approval_required`
- `archiving_rule`
- `language`
- `applicability`
- `mandatory_for_units`
- `last_verified_at`
- `verification_result`

### Für Prozesse zusätzlich
- Trigger / Auslöser
- Input / Output
- Vorbedingungen
- Nachbedingungen
- SLA / Zielzeit
- Eskalationsweg
- verwendete Formulare
- betroffene Systeme
- KPI-Referenzen

### Für Richtlinien zusätzlich
- Normbezug
- Rechtsgrundlage
- Sanktion / Durchsetzung
- Dokumentklasse

### Für Rollenprofile zusätzlich
- Stellenniveau
- Berichtslinie
- Befugnisse
- Stellvertretungsregel
- benötigte Systeme / Rechte

---

## 6. Konsistenzreview: wo der aktuelle Stand noch nicht sauber ist

### 6.1 Doku vs. Registry nicht vollständig synchron
Das ist ein echter Mangel. Die produktive Wahrheit muss eindeutig sein. Aktuell gibt es sichtbare Differenzen zwischen:
- Audit-Dokumentation
- Editor-Leitfaden
- tatsächlicher Registry
- UI-Realität

### 6.2 Template-Layouts sind noch zu uneinheitlich tief
Einige Typen haben spezialisierte Layouts, andere fallen auf generische Section-Cards zurück. Das ist okay für MVP, aber für dein Ziel noch zu inkonsistent.

### 6.3 Rollen/Rechte sind vorhanden, aber noch nicht durchgehend als „Enterprise Governance Layer“ erkennbar
Rechte scheinen da zu sein, aber auf Produktniveau solltest du zusätzlich sauber definieren:
- wer darf Templates ändern
- wer darf Struktur ändern
- wer darf Medien global verwalten
- wer darf Storage-/Connector-Ziele ändern
- wer darf Restore auslösen
- wer darf nur veröffentlichen, aber nicht editieren

### 6.4 Inhaltsmodell ist stark, UI-Modell noch nicht vollständig auf Redakteure optimiert
Das Backend-/Schema-Denken ist schon recht professionell. Die UI wirkt dagegen stellenweise noch wie „technisch sauber“, aber noch nicht wie „radikal einfach“.

---

## 7. Harte Empfehlung zur Priorisierung

Nicht alles gleichzeitig anfassen. Sonst verwässert es.

### Prio A – sofort
1. Template- und Seitentypmodell fachlich finalisieren
2. Doku/Registry/UI synchronisieren
3. Editor-/Medien-UX härten
4. Backup produktiv bauen

### Prio B – danach
5. SharePoint-Storage-/Library-Konzept finalisieren
6. GitHub-Schnittstelle sauber neu aufsetzen oder bewusst aus Scope entfernen
7. Rollen-/Rechte-Härtung
8. Review-/Versionsstamm visuell verbessern

### Prio C – danach
9. Qualitätsdashboard und Vollständigkeitsregeln ausbauen
10. KI-Assistenz kontextbezogener und kontrollierter machen
11. Teams-Feinschliff

---

## 8. Konkrete Taskvorschläge

## Taskblock A – Template- und Seitentypen professionalisieren

### Task A1 – Master-Template-Matrix finalisieren
**Beschreibung**
Alle produktiven Seitentypen final definieren und Dokumentation, Registry, UI und Create-Flow darauf normieren.

**Umfang**
- Ziel-Soll-Liste aller Seitentypen festlegen
- Doppelte / unklare Typen entfernen oder sauber trennen
- fehlende Typen ergänzen
- Typen, Kategorien, Eltern-/Kindlogik finalisieren

**Definition of Done**
- Eine einzige verbindliche Masterliste existiert
- Registry, UI, Doku und Preview greifen auf dieselbe Logik zu
- keine Widersprüche zwischen Dokumentation und Produkt

---

### Task A2 – Geführte Fachvorlagen statt nur Sektionen
**Beschreibung**
Alle Kern-Templates zu fachlich geführten Vorlagen ausbauen.

**Umfang**
- pro Seitentyp Pflichtsektionen definieren
- pro Sektion Hilfetexte / Leitfragen / Beispielstruktur ergänzen
- strukturierte Felder statt Freitext dort, wo fachlich sinnvoll
- Qualitätsregeln je Typ definieren

**Definition of Done**
- Mindestens Kernprozess, Prozessseite, Verfahrensanweisung, Richtlinie, Rollenprofil und Systemdokumentation sind fachlich geführt
- Vollständigkeitsprüfung bewertet sinnvolle Fachlogik statt nur Feldanzahl

---

### Task A3 – Template-spezifische Speziallayouts ausbauen
**Beschreibung**
Weg von generischen Karten, hin zu wirklich nützlichen Fachlayouts.

**Umfang**
- eigenes Layout für Prozessseite Text
- eigenes Layout für Prozessseite Grafik
- eigenes Layout für Verfahrensanweisung
- eigenes Layout für Rollenprofil
- eigenes Layout für Systemdokumentation

**Definition of Done**
- diese Typen rendern fachlich passende UI-Komponenten
- weniger generische Textblöcke, mehr strukturierte Eingabe-/Anzeigeformen

---

## Taskblock B – UX und Editor modernisieren

### Task B1 – Kontextuelles Plus-System einbauen
**Beschreibung**
Neue Unterseiten und Inhaltsbausteine direkt dort anlegen, wo der Nutzer denkt.

**Umfang**
- `+ Unterseite` nicht nur global, sondern kontextuell in Bereichen/Slots anzeigen
- Child-Slots unter relevanten Überschriften / Bereichen ermöglichen
- leere Zustände mit klaren CTAs versehen

**Definition of Done**
- Nutzer kann innerhalb einer Seite an sinnvollen Stellen neue Unterseiten anlegen
- Child-Erstellung folgt Template-/Hierarchieregeln

---

### Task B2 – Drag & Drop UX für Medien wirklich fertigstellen
**Beschreibung**
Dateien, Bilder und Videos direkt in den Editor ziehen können, mit sauberem Upload- und Einbettungsflow.

**Umfang**
- Dropzone-Verhalten verbessern
- Dateityp-Erkennung
- automatischer Blocktyp je Medium
- Upload-Progress + Fehleranzeige
- nachgelagerte Asset-Referenzierung

**Definition of Done**
- Bild, Video, Datei funktionieren per Drag & Drop konsistent
- Nutzer braucht keinen technischen Zwischenschritt

---

### Task B3 – Medienblöcke professionalisieren
**Beschreibung**
Medienblöcke als wiederverwendbare Enterprise-Assets ausbauen.

**Umfang**
- Caption
- Alt-Text
- Quelle
- Lizenz-/Rechtehinweis optional
- Vorschaubild / Thumbnail
- Ersetzen statt neu einfügen
- Referenz auf SharePoint-Datei vs. Upload sauber sichtbar

**Definition of Done**
- Medienblöcke sind governance-fähig
- Asset-Herkunft ist nachvollziehbar

---

### Task B4 – Diagramm-/Prozessgrafik-Modell stärken
**Beschreibung**
Prozessgrafik darf nicht nur „irgendein Block“ sein.

**Umfang**
- definierte Diagrammtypen
- Diagramm-Metadaten
- Verknüpfung Diagramm ↔ Prozessschritte ↔ Rollen
- strukturierte Swimlane-Modelle
- Export-/Einbettungslogik

**Definition of Done**
- grafische Prozessseiten sind fachlich belastbar, nicht nur dekorativ

---

## Taskblock C – Rollen, Rechte, Governance nachhärten

### Task C1 – Berechtigungsmatrix finalisieren
**Beschreibung**
Alle Rollen und Spezialrechte sauber definieren.

**Umfang**
- View / Comment / Edit / Review / Approve / Publish / Archive / Restore / Manage Templates / Manage Connectors / Manage Backup / Manage Media
- Rollenzuordnung dokumentieren
- Seitebene + Funktionsrechte sauber trennen

**Definition of Done**
- vollständige Rechte-Matrix dokumentiert und technisch umgesetzt
- keine kritischen Admin-Aktionen ohne dedizierte Permission

---

### Task C2 – Governance-Events und Audit-Log erweitern
**Beschreibung**
Alle kritischen Operationen auditierbar machen.

**Umfang**
- Template-Änderungen
- Rollenänderungen
- Backup-Konfiguration
- Backup-Start
- Restore
- Connector-Änderungen
- SharePoint-Zieländerung

**Definition of Done**
- alle Governance-relevanten Aktionen erscheinen nachvollziehbar im Audit-Log

---

## Taskblock D – SharePoint-/Quellenlogik finalisieren

### Task D1 – Drei klare Connector-Zwecke einführen
**Beschreibung**
SharePoint nicht als unscharfen Sammelbegriff behandeln.

**Zwecke**
1. Wissensquelle
2. Medienarchiv
3. Backup-Ziel

**Definition of Done**
- pro Connector / Ziel ist eindeutig, wofür er verwendet wird
- UI zeigt Zweck, Site, Drive, Ordner und Zugriffsmodus klar an

---

### Task D2 – Referenzierte vs. gespeicherte Assets trennen
**Beschreibung**
System soll unterscheiden zwischen:
- referenziertem SharePoint-Inhalt
- kopiertem/verwaltetem Asset
- externem Embed
- lokal hochgeladenem Asset

**Definition of Done**
- jeder Medien-/Quellen-Eintrag hat klaren Herkunftstyp

---

## Taskblock E – GitHub-Schnittstelle sauber neu aufsetzen

### Task E1 – GitHub-Connector-Status klären und neu definieren
**Beschreibung**
GitHub entweder sauber produktiv anbinden oder bewusst aus Scope nehmen.

**Umfang**
- Zielbild definieren: Codequelle, Issues, Releases, technische Doku?
- Auth-Modell definieren
- Sync-/Abrufmodus definieren
- Such- und Zitierlogik definieren

**Definition of Done**
- GitHub-Schnittstelle ist nicht mehr „halb drin“, sondern klar spezifiziert und produktiv oder bewusst deaktiviert

---

## 9. Separater Abschnitt: Backup-Funktion professionell formuliert

## Zielbild
Backup soll als eigener Einstellungsbereich im Adminbereich umgesetzt werden – **optisch und funktional so wie im Screenshot**, aber **ohne SeaTable-Sektion**.

### Fachliches Ziel
Der Administrator kann komplette Systemsicherungen definieren und auslösen, wobei Backups in eine ausgewählte SharePoint-Bibliothek bzw. einen ausgewählten Ordner geschrieben werden.

### Zu sichernde Bestandteile
Pflichtbestandteile jeder Vollsicherung:
- PostgreSQL-Datenbank vollständig
- anwendungsrelevante Metadaten / Konfiguration aus DB
- optional Export der Template-Definitionen
- optional Export der Connector-Konfigurationen ohne Secrets im Klartext
- optional Export eines technischen Manifestes (Backup-Metadaten)

### Nicht Bestandteil der ersten Ausbaustufe
- SeaTable
- vollständige Kopie externer SharePoint-Wissensquellen
- vollständige Medien-Deduplizierung über alle Fremdquellen hinweg

### UI-Anforderungen
Die Backup-Seite enthält:

#### 1. Backup-Konfiguration
- Toggle: Automatisches Backup aktiv / inaktiv
- Feld: SharePoint-Zielordner
- Button: „Ordner wählen“
- Feld: Backup-Intervall
  - täglich
  - wöchentlich
  - monatlich
- Feld: tägliche Backups behalten
- Feld: wöchentliche Backups behalten
- Feld: monatliche Backups behalten
- Button: „Manuelles Backup starten“

#### 2. Backup-Historie
Tabellarische Anzeige aller Sicherungen mit:
- Datum/Uhrzeit
- Typ (manuell / geplant)
- Status (erfolgreich / fehlgeschlagen / läuft)
- Größe
- Dauer
- Dateiname
- Aktionen
  - Protokoll anzeigen
  - Wiederherstellen

#### 3. Status- und Fehlermeldungen
- fehlende SharePoint-Drive-ID
- fehlender Token
- fehlende Schreibberechtigung
- ungültiger Zielordner
- laufendes Backup blockiert neues Backup

### Technische Umsetzung

#### Datenmodell
Neue Tabellen / Erweiterungen:
- `backup_configs`
- `backup_runs`
- `backup_retention_policies`
- optional `backup_restore_runs`

##### backup_configs
- id
- is_enabled
- provider_type (`sharepoint`)
- sharepoint_site_id
- sharepoint_drive_id
- sharepoint_folder_id
- sharepoint_folder_path
- frequency (`daily|weekly|monthly`)
- keep_daily_count
- keep_weekly_count
- keep_monthly_count
- include_db_dump (bool)
- include_config_manifest (bool)
- encryption_enabled (bool, vorbereitend)
- last_success_at
- last_failure_at
- created_by
- updated_by
- created_at
- updated_at

##### backup_runs
- id
- config_id
- run_type (`manual|scheduled|restore_test`)
- status (`queued|running|success|failed|cancelled`)
- target_provider
- target_site_id
- target_drive_id
- target_folder_id
- target_path
- filename
- size_bytes
- duration_ms
- started_at
- finished_at
- initiated_by
- error_message
- manifest_json

#### Backend-Logik
Neue Services/Routen:
- `GET /api/admin/backups/config`
- `PUT /api/admin/backups/config`
- `POST /api/admin/backups/run`
- `GET /api/admin/backups/runs`
- `GET /api/admin/backups/runs/:id`
- `POST /api/admin/backups/runs/:id/restore`
- `POST /api/admin/backups/validate-target`

#### Backup-Ablauf
1. Admin startet manuell oder Scheduler löst aus
2. DB-Dump erzeugen (`pg_dump -Fc`)
3. Manifest erzeugen
4. Artefakte paketieren
5. Upload in gewählten SharePoint-Ordner
6. Run protokollieren
7. Retention anwenden
8. Audit-Event schreiben

#### Dateistruktur im Zielordner
Empfehlung:
- `/Backups/YYYY/MM/backup_YYYY-MM-DD_HH-mm.dump`
- `/Backups/YYYY/MM/backup_YYYY-MM-DD_HH-mm.manifest.json`
- optional als `.zip` gebündelt

#### Wiederherstellung
- Restore nicht direkt blind ausführen
- zuerst Restore-Dialog mit Warnhinweis
- Restore nur für Rolle mit Spezialrecht `restore_backup`
- optional zuerst Test-Restore in temporäre DB

### Berechtigungen
Neue Rechte:
- `view_backups`
- `manage_backups`
- `run_backup`
- `restore_backup`

### Auditpflicht
Zu protokollieren:
- Backup-Konfiguration geändert
- Backup manuell gestartet
- geplanter Lauf gestartet
- Lauf fehlgeschlagen
- Lauf erfolgreich
- Restore initiiert
- Restore erfolgreich / fehlgeschlagen

### Definition of Done
- Backup-Tab existiert in Einstellungen
- UI entspricht in Aufbau und Logik dem gelieferten Screenshot (ohne SeaTable-Block)
- SharePoint-Ziel kann über Picker ausgewählt werden
- manuelles Backup funktioniert
- automatische Läufe funktionieren
- Retention-Regeln werden angewendet
- Historie ist sichtbar
- Fehlerfälle werden verständlich angezeigt
- Audit-Events werden geschrieben
- Restore ist abgesichert und protokolliert

---

## 10. Meine klare Schlussfolgerung

Das System ist **architektonisch stark genug, um jetzt professionell fertiggebaut zu werden**. Es ist nicht mehr an dem Punkt, wo man alles neu denken müsste.

Aber: Es ist aktuell noch **zu technisch-MVPig in UX, Templates und Betriebsfunktionen**. Für dein Zielbild müssen jetzt genau diese Punkte nachgezogen werden:
- Template-Tiefe
- UX-Vereinfachung
- Medien-/Editor-Härtung
- SharePoint-Zwecktrennung
- Backup als echte Admin-Funktion
- Doku/Code/UI-Konsistenz

Der größte Fehler wäre jetzt, einfach weiter Features anzustückeln. Was du jetzt brauchst, ist **ein sauberer Finalisierungsblock mit Fokus auf Konsistenz, UX und Governance**.
