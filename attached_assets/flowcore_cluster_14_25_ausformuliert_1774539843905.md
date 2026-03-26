# FlowCore – Clusterpaket zur Systemoptimierung nach eingeführter Arbeitskopie-Logik

## Einordnung vorab

Der bereits beauftragte Arbeitsauftrag **„Arbeitskopie → Review → Freigabe → Publish“** ist **kein Problem**, sondern fachlich der richtige Richtungsentscheid. Das Thema taucht in den Optimierungsclustern trotzdem erneut auf, **nicht weil der Auftrag falsch wäre**, sondern weil seine Einführung **Folgewirkungen** auf weitere Systembereiche hat:

- Aufgabenlogik
- Suchindex / KI-Zugriff
- Rollen- und Stellvertretungslogik
- Dashboards
- Benachrichtigungen
- Restore/Versionierung
- Audit / Nachweiskette
- Archivierung / Reviewzyklen

Diese Folgearbeiten müssen separat und sauber nachgezogen werden, damit aus der guten Grundidee ein konsistentes Gesamtsystem wird.

---

## Fachliche Leitplanken für alle Cluster

Replit muss die mitgelieferte Task-Governance verbindlich einhalten:

- Bestandsprüfung vor Neuerstellung
- keine Hardcodings
- keine stillen Fallbacks
- Root-Cause-Fix statt Symptombehandlung
- Pflicht zu Frontend-Test / Playwright / realer Sichtprüfung
- Pflicht zu Audit-Report, Dateiliste, Regressionsnachweis und Dokumentationsupdate
- Stop bei Widerspruch oder fehlender Umsetzbarkeit

Diese Regeln sind bereits als verbindliches Task-Template dokumentiert und müssen jedem Cluster vorangestellt werden. Zudem sind UI-/Review-/Workflow-bezogene Änderungen real im Frontend zu prüfen und zu dokumentieren. Die Dokumentationsoberfläche ist bereits als Systembestandteil vorhanden und muss weiterverwendet, nicht parallel neu erfunden werden.

---

# Cluster 14 – Source of Truth, GitHub-Sync und Release-Disziplin

## Ziel
Sicherstellen, dass der laufende UI-Stand, die Doku, der GitHub-Stand und die Replit-Arbeitsbasis wieder dieselbe Wahrheit abbilden.

## Warum dieser Cluster nötig ist
Aktuell besteht das Risiko, dass UI-Stand und Export/GitHub nicht deckungsgleich sind. Das ist für ein professionelles Wissensmanagement-System untragbar, weil Review, Audit, Fehleranalyse und Weiterentwicklung sonst auf unterschiedlichen Ständen erfolgen.

## Scope
- Source-of-Truth-Prinzip definieren
- GitHub-Export / GitHub-Sync prüfen und härten
- Releaselogik dokumentieren
- Abweichungen zwischen produktivem Stand, Replit-Stand und Export sichtbar machen
- saubere Abnahmeregel für Deployments schaffen

## Untertasks

### Task 14.1 – Source-of-Truth-Modell definieren
**Auftrag:**  
Definiere verbindlich, welche Instanz fachlich und technisch die führende Wahrheit ist:
- DB-Schema
- Doku
- GitHub-Repo
- Replit Working State
- Deploy/Production

**Definition of Done:**
- Architekturentscheidung dokumentiert
- für Code, Migrations, Settings, Prompts, Templates und Docs jeweils klare Führungsquelle definiert
- Widersprüche explizit dokumentiert

### Task 14.2 – GitHub-Schnittstelle root-cause prüfen
**Auftrag:**  
Prüfe vollständig, warum die aktuelle GitHub-Schnittstelle / der GitHub-Export nicht verlässlich funktioniert. Keine Symptombehandlung.

**Definition of Done:**
- Root-Cause dokumentiert
- betroffene Dateien, Jobs, Services und Credentials identifiziert
- Fehlerbild reproduziert
- saubere Fix-Strategie festgelegt

### Task 14.3 – Konsistenzprüfung zwischen Runtime, Export und Repo
**Auftrag:**  
Baue eine technische Konsistenzprüfung, die erkennt:
- DB-Migrationen nicht im Repo
- Docs nicht exportiert
- lokal geänderte Dateien nicht synchron
- Build-Stand ungleich GitHub-Stand

**Definition of Done:**
- Konsistenzreport vorhanden
- Abweichungen sichtbar im Admin-/Doku-Bereich
- Fehlzustände klar benannt, kein stilles Wegignorieren

### Task 14.4 – Release-Disziplin und Abnahmepfad
**Auftrag:**  
Definiere und implementiere einen verbindlichen Abschluss-/Release-Pfad:
Implementierung → Audit → GitHub-Sync → Release-Status.

**Definition of Done:**
- Release-Status je Task / Änderung sichtbar
- dokumentierte Abnahmeregel
- GitHub-Sync nicht mehr optional-intransparent

## Involvierte Bereiche / Dateien
- GitHub-Connector / Export-Service
- Deployment-/Sync-Skripte
- Doku-Export
- Admin-/Systemstatus-UI
- technische Doku / docs
- vorhandene Dokumentationsoberfläche

---

# Cluster 15 – Publikationsmodell: Live-Seite, Arbeitskopie, Review-Fassung, Publish

## Ziel
Das bereits beauftragte Arbeitskopie-Modell fachlich vollständig in die Systemarchitektur integrieren.

## Warum dieser Cluster nötig ist
Die Arbeitskopie allein löst nur den Editor-Fall. Ein professionelles Gesamtsystem braucht ein klares Publikationsmodell für:
- Live-Inhalte
- offene Bearbeitungen
- Freigaben
- Versionen
- Sichtbarkeit
- Aufgaben
- Historie

Die Vorlagen zeigen bereits, dass Status, Version, Gültig-ab und nächstes Review zentrale Metadaten sind. Diese Metadaten dürfen nicht nur dekorativ sein, sondern müssen das reale Publikationsverhalten steuern. Gleichzeitig fordern deine Prozessvorlagen Mindestumfang, Rollen, KPIs, Risiken, Schnittstellen und Reviewfähigkeit. Genau deshalb muss der Workflow strikt auf veröffentlichte Zustände ausgerichtet werden.

## Untertasks

### Task 15.1 – Zustandsmodell finalisieren
**Auftrag:**  
Führe ein sauberes Zustandsmodell ein:
- Published / Live
- In Bearbeitung (Arbeitskopie offen)
- In Review
- Freigegeben zur Veröffentlichung
- Abgelehnt / Rückgabe
- Archiviert

**Definition of Done:**
- Zustände fachlich dokumentiert
- alle Übergänge definiert
- keine verdeckten Zustände mehr

### Task 15.2 – Arbeitskopie als eigene Fachentität
**Auftrag:**  
Arbeitskopien nicht halb in Revisionen verstecken, sondern als eigene Fachentität modellieren.

**Definition of Done:**
- eindeutige Datenstruktur für offene Arbeitskopie
- Referenz auf Live-Version
- Bearbeiter, Startzeit, letzter Stand, Lock-/Besitzlogik vorhanden
- maximal eine aktive Arbeitskopie pro Seite

### Task 15.3 – Live-Seite strikt read-only
**Auftrag:**  
Die veröffentlichte Seite darf nicht direkt editiert werden. „Bearbeiten“ wird ersetzt durch:
- Arbeitskopie erstellen
- Arbeitskopie fortsetzen
- In Bearbeitung durch X

**Definition of Done:**
- kein Direktedit mehr auf Published Pages
- UI-Semantik angepasst
- Sichtbarkeit der offenen Arbeitskopie für Betrachter möglich

### Task 15.4 – Publish-Regel nur nach Genehmigung
**Auftrag:**  
Nur genehmigte Arbeitskopien dürfen neue Live-Versionen erzeugen.

**Definition of Done:**
- Publish ausschließlich nach Review-Freigabe
- klare Trennung zwischen Draft/Working Copy und offizieller Version
- Restore erzeugt ebenfalls neue Version, nicht stilles Zurückdrehen

## Involvierte Bereiche / Dateien
- Content-Node / Revision / Working-Copy-Modelle
- Seitenansicht
- Editor-Entry-Points
- Versions-/Freigabe-UI
- Routen / API für Draft, Submit, Approve, Reject, Publish

---

# Cluster 16 – Review Center, Diff-Ansicht und Freigabe-UX

## Ziel
Den Review-Prozess für Prozessmanager und Freigeber so ausbauen, dass Änderungen schnell, sicher und nachvollziehbar geprüft werden können.

## Warum dieser Cluster nötig ist
Dein gewünschter Workflow steht und fällt mit einer guten Review-Oberfläche. Ohne präzise Änderungsdarstellung wird der Freigabeprozess im Alltag langsam und fehleranfällig.

## Untertasks

### Task 16.1 – Review Inbox / Aufgabenliste
**Auftrag:**  
Baue eine klare Aufgabenliste für Prozessmanager / Freigeber:
- eingereichte Arbeitskopien
- Priorität / Alter / Bereich
- Status
- zugewiesene Person
- Stellvertretung

**Definition of Done:**
- Review-Aufgabenliste vorhanden
- Filter und Sortierung funktionsfähig
- nur berechtigte Rollen sehen freizugebende Aufgaben

### Task 16.2 – Feldbasierter Diff-Viewer
**Auftrag:**  
Implementiere eine professionelle Änderungsansicht:
- nur geänderte Felder anzeigen
- alt/neu nebeneinander oder inline-diff
- Textänderungen farblich markieren
- Tabellen-/Metadaten-/Relationsänderungen sichtbar machen

**Definition of Done:**
- diff für Titel, Metadaten, Rich-Text-Blöcke, Relationen, Medien und Felder verfügbar
- keine reinen JSON-Rohdumps als Standard-UX
- Änderungen im Frontend real geprüft

### Task 16.3 – Review-Kommentare und Rückgabe
**Auftrag:**  
Freigeber müssen kommentieren, genehmigen, ablehnen oder mit Korrekturhinweisen zurückgeben können.

**Definition of Done:**
- strukturierte Review-Entscheidungen vorhanden
- Rückgabe mit Kommentar möglich
- Bearbeiter sieht Rückgabebegründung und kann Arbeitskopie fortsetzen

### Task 16.4 – KI-gestützte Änderungszusammenfassung
**Auftrag:**  
Die KI erstellt aus den Änderungen automatisch eine editierbare Kurz-Zusammenfassung für die Versionshistorie.

**Definition of Done:**
- Zusammenfassung basiert auf tatsächlichen Diffs
- Text im Review editierbar
- finaler Publish übernimmt freigegebenen Summary-Text in Historie

## Involvierte Bereiche / Dateien
- Review Dashboard
- Aufgaben-APIs
- Diff-Service
- KI-Prompt / Änderungszusammenfassung
- Version-History-UI
- Benachrichtigungs-/Kommentarlogik

---

# Cluster 17 – Rollen, Stellvertretung, SoD und Governance

## Ziel
Rollen- und Freigaberechte auf Unternehmensniveau professionalisieren.

## Warum dieser Cluster nötig ist
Ein mittelständisches Wissensmanagement-System braucht klare Trennung zwischen Bearbeiten, Prüfen, Freigeben und Administrieren. Die Vorlagen selbst verlangen Owner, Stellvertretung, Review und Verantwortlichkeiten. Dazu kommen Personenzuordnung und Rollenklarheit aus Microsoft/SharePoint.

## Untertasks

### Task 17.1 – Rollenmatrix fachlich finalisieren
**Auftrag:**  
Definiere verbindlich, was folgende Rollen dürfen:
- Betrachter
- Editor
- Prozessowner
- Stellvertretung
- Prüfer / Review
- Prozessmanager
- Administrator

**Definition of Done:**
- Rechte-Matrix dokumentiert
- alle kritischen Aktionen klar einer Rolle zugeordnet
- keine versteckten Sonderrechte

### Task 17.2 – Separation of Duties (SoD)
**Auftrag:**  
Prüfe und implementiere, wo Vier-Augen-Prinzip verpflichtend sein soll. In den geleiteten Prozessvorlagen wird Freigabe-Workflow + 4-Augen-Prinzip explizit als Kontrollmaßnahme genannt.

**Definition of Done:**
- definierte Regeln, wann Selbstfreigabe verboten ist
- optional konfigurierbare Ausnahmen
- Auditlog erfasst Genehmiger / Einreicher sauber

### Task 17.3 – Stellvertretungslogik produktiv machen
**Auftrag:**  
Stellvertretung darf nicht nur ein Anzeigenfeld sein, sondern muss Aufgaben, Reviewfähigkeit und Eskalation steuern.

**Definition of Done:**
- Aufgaben können an Stellvertretung übergehen
- Abwesenheits-/Fallback-Regeln transparent
- keine stillen Vertretungs-Fallbacks

### Task 17.4 – Rollen- und Rechteprüfung im Frontend
**Auftrag:**  
Alle UI-Aktionen müssen die Rechte auch sichtbar korrekt spiegeln.

**Definition of Done:**
- Buttons, Menüs, Review-Optionen rollenabhängig korrekt
- keine UI-Optionen, die serverseitig scheitern, obwohl sie sichtbar angeboten werden
- Playwright-Rechtepfade vorhanden

## Involvierte Bereiche / Dateien
- Rollen-/Rechtesystem
- User-/Profile-/SharePoint-/Graph-Zuordnung
- Review-/Task-Service
- Frontend Guards
- Audit-Log / Approval-Log

---

# Cluster 18 – Seitentypen, Templates und Feldgovernance professionalisieren

## Ziel
Die Seitentypen so schärfen, dass sie die Anforderungen an professionelles Prozess- und Wissensmanagement belastbar erfüllen.

## Warum dieser Cluster nötig ist
Die vorhandenen Vorlagen sind fachlich eine gute Basis, aber sie dürfen nicht nur als hübsche Formblätter existieren. Sie müssen im System als strukturierte Templates mit Pflichtfeldern, Guided Mode und Qualitätsprüfungen wirken.

Die Verfahrensanweisung fordert u. a. Zweck/Geltungsbereich, SIPOC, Swimlane, RACI, KPIs, Schnittstellen, Risiken, Dokumente/Vorlagen, Normbezug, Parent-/Sibling-/Children-Relationen und Schlagworte. Die geleitete Variante nennt sogar einen Mindestumfang für Veröffentlichung. Die Gesamtprozess-Vorlage fordert eine hierarchische Prozessübersicht mit Prozessschritten und IDs. Das Stellenprofil ergänzt strukturierte Rollen-/Kompetenz-/Schnittstellen-Felder. Diese Logik muss Template-seitig erzwungen und nicht nur optisch imitiert werden.

## Untertasks

### Task 18.1 – Seitentyp-Katalog final definieren
**Auftrag:**  
Definiere verbindlich die unterstützten Seitentypen, z. B.:
- Kernprozess-Übersicht
- Bereichsübersicht
- Verfahrensanweisung / Prozessseite
- Prozessseite mit Grafik-/Swimlane-Fokus
- Use Case
- Richtlinie / Policy
- Stellenprofil
- Glossareintrag
- System-/Tool-Seite
- Formular-/Checklisten-Seite

**Definition of Done:**
- Seitentyp-Katalog dokumentiert
- pro Typ klares Zielbild
- Typen nicht redundant oder überlappend

### Task 18.2 – Pflichtfelder, optionale Felder, Veröffentlichungslogik
**Auftrag:**  
Für jeden Seitentyp definieren:
- Muss-Felder
- empfohlene Felder
- bedingte Felder
- Veröffentlichungs-Mindestumfang

**Definition of Done:**
- regelbasierte Validierung vorhanden
- Mindestumfang vor Einreichung geprüft
- Fehlertexte verständlich

### Task 18.3 – Guided Templates / Assistenzlogik
**Auftrag:**  
Templates müssen geführt ausfüllbar sein, mit Hilfetexten und sinnvoller Reihenfolge.

**Definition of Done:**
- Guided Mode pro Typ vorhanden
- Hilfetexte konfigurierbar / dokumentiert
- Formlogik unterstützt tatsächliches Arbeiten

### Task 18.4 – Template-Registry als Single Source of Truth
**Auftrag:**  
Seitentypen, Felder, Default-Layouts und Regeln zentral verwalten.

**Definition of Done:**
- keine doppelte Typdefinition in UI + Backend + Seeds + Docs
- zentrale Registry / Konfiguration
- Änderungen nachvollziehbar versioniert

## Involvierte Bereiche / Dateien
- Template-Registry
- Seitentyp-Modelle / DB-Schema
- Validatoren
- Erstellungsdialog
- Form-/Wizard-Komponenten
- Dokumentation

---

# Cluster 19 – Editor-UX, Medienblöcke und Inhaltsproduktion

## Ziel
Den Editor von „technisch möglich“ auf „radikal anwenderfreundlich und professionell“ heben.

## Warum dieser Cluster nötig ist
Dein Anspruch ist klar: Plus-Flow, Drag & Drop, Bilder, Videos, Dateien, einfache Bedienung. Das darf nicht halbgar werden. Ein Unternehmenssystem scheitert oft nicht an der Datenbank, sondern am täglichen Inhaltspfad.

## Untertasks

### Task 19.1 – Plus-Flow / Block-Einfügen professionalisieren
**Auftrag:**  
Jeder sinnvolle Bereich muss einen klaren Plus-Einstieg für:
- neue Unterseite
- neuer Block
- neues Medienobjekt
- neuer Abschnitt

**Definition of Done:**
- Plus-Flow überall konsistent
- keine versteckten Wege nötig
- Seitentyp-Auswahl verständlich

### Task 19.2 – Drag-and-Drop-Editor stabilisieren
**Auftrag:**  
Blöcke, Medien, Sektionen und Layouts sauber per Drag & Drop anordnen.

**Definition of Done:**
- reordering stabil
- keine Layout-Sprünge / Verlust von Inhalten
- mobile/responsive Grundverhalten geprüft

### Task 19.3 – Medienblöcke auf Unternehmensniveau
**Auftrag:**  
Saubere Blöcke für:
- Bild
- Galerie
- Video
- Datei
- Embed
- Diagramm / Visio / Prozessgrafik
- SharePoint-Dateireferenz

**Definition of Done:**
- Medienobjekte mit Metadaten, Quelle, Titel, Alt-Text / Beschreibung
- Vorschaulogik vorhanden
- Wiederverwendungslogik berücksichtigt

### Task 19.4 – Inhaltsqualität und Strukturhilfen
**Auftrag:**  
Editor soll Schreiben erleichtern:
- Abschnittsvorschläge
- leere Template-Felder sichtbar
- Pflichtfelder visuell markiert
- Status „vollständig / unvollständig“

**Definition of Done:**
- Autoren sehen klar, was noch fehlt
- kein Blindflug bei komplexen Prozessseiten
- Qualitätshilfen real nutzbar

## Involvierte Bereiche / Dateien
- Editor-Komponenten
- Block-Registry
- Medienservice
- Layout-/DnD-Komponenten
- Upload-/Embed-Logik
- SharePoint-Datei-Referenzierung

---

# Cluster 20 – Navigationslogik, Informationsarchitektur und Übersichtsseiten

## Ziel
Die Informationsarchitektur so schärfen, dass das System wie eine echte Prozess- und Wissenslandkarte funktioniert.

## Warum dieser Cluster nötig ist
Die Gesamtprozess-Vorlage zeigt klar: Du willst nicht nur Einzelartikel, sondern hierarchische Prozessnavigation mit Gesamtübersicht, Prozessschritten und untergeordneten Prozessen. Genau das muss sich im Produkt spiegeln.

## Untertasks

### Task 20.1 – IA-Modell finalisieren
**Auftrag:**  
Struktur definieren für:
- Startseite / Hub
- Kernprozesse
- Bereichsübersichten
- Unterprozesse
- Fachseiten / Policies / Use Cases / Profile
- übergreifende Querverlinkung

**Definition of Done:**
- Navigationsmodell dokumentiert
- kein Wildwuchs in Hierarchien
- konsistente Breadcrumb-Logik

### Task 20.2 – Übersichtsseiten mit echter Arbeitslogik
**Auftrag:**  
Übersichtsseiten dürfen nicht nur Listen sein, sondern müssen anlegen, verknüpfen und führen.

**Definition of Done:**
- unter Überschriften neue Unterseiten via Plus anlegbar
- Child-Slots klar definiert
- Reihenfolge / Nummerierung nachvollziehbar

### Task 20.3 – Relationstypen professionalisieren
**Auftrag:**  
Verknüpfungen wie Parent, Sibling, Children, mitgeltende Prozesse, abhängige Dokumente und Rollen explizit modellieren.

**Definition of Done:**
- Relationstypen technisch sauber
- UI zeigt Beziehungen verständlich
- keine rein textuelle Pseudo-Verlinkung

## Involvierte Bereiche / Dateien
- Navigation
- Breadcrumbs
- Übersichtsseiten-Templates
- Relation-Modelle
- Tree-/Graph-Service
- Seiten-Erstellungsdialoge

---

# Cluster 21 – Suche, KI und Published-Only-Wahrheit

## Ziel
Suche und KI so ausrichten, dass sie nur auf verlässlichen, freigegebenen Inhalten operieren – außer wenn explizit anders gewollt.

## Warum dieser Cluster nötig ist
Mit Arbeitskopien darf die KI nicht versehentlich Entwürfe, halbfertige Änderungen oder offene Arbeitsstände als Wahrheit behandeln. Sonst wird das System fachlich unzuverlässig.

## Untertasks

### Task 21.1 – Suchindex-Zustände definieren
**Auftrag:**  
Definiere, welche Zustände in welchen Suchmodi auftauchen:
- Standardnutzer: nur Published
- Prozessmanager: optional Published + Review + Working Copy
- Admin: vollständig filterbar

**Definition of Done:**
- Suchsichtbarkeit je Rolle definiert
- keine Arbeitskopien im normalen Live-Suchergebnis

### Task 21.2 – KI-Kontextquellen sauber trennen
**Auftrag:**  
Die KI muss unterscheiden zwischen:
- veröffentlichte interne Inhalte
- angebundene SharePoint-Wissensquellen
- hochgeladene Medien/Dokumente
- optional Web

**Definition of Done:**
- Quellenkennzeichnung in Antworten vorhanden
- Published-first-Logik
- optionaler Web-Zugriff als klarer Schalter

### Task 21.3 – KI auf Änderungs- und Qualitätslogik ausrichten
**Auftrag:**  
KI nicht nur für Chat, sondern für:
- Änderungszusammenfassungen
- Vervollständigung fehlender Felder
- Qualitätswarnungen
- Dubletten-/Widerspruchserkennung

**Definition of Done:**
- KI-Prompts rollen- und zustandsbewusst
- Drafts werden nicht versehentlich als veröffentlicht behandelt
- Ergebnisquellen nachvollziehbar

## Involvierte Bereiche / Dateien
- Search-Service / Search-Index
- KI-Konfiguration
- Prompt-Layer
- Quellenmodell / Wissensquellen
- UI für Suchergebnisse / Quellenhinweise

---

# Cluster 22 – Dashboard, Aufgabensteuerung und Prozessmanagement-Sicht

## Ziel
Die operative Steuerung für Prozessmanager, Reviewer und Verantwortliche auf echtes Management-Niveau heben.

## Warum dieser Cluster nötig ist
Ein Wissensmanagement-System ist kein hübscher Seitenbaum. Es braucht eine Steuerungssicht auf:
- offene Reviews
- Seiten in Bearbeitung
- überfällige Reviews
- unvollständige Seiten
- Dubletten
- Regelverstöße
- Prozesslücken

## Untertasks

### Task 22.1 – Review-/Arbeitskopie-Dashboard
**Auftrag:**  
Dashboard für:
- offene Arbeitskopien
- in Review befindliche Änderungen
- Rückgaben
- Freigaben
- überfällige Prüfungen

**Definition of Done:**
- klare Management-Sicht vorhanden
- Aufgaben filterbar nach Bereich, Owner, Status, Alter

### Task 22.2 – Qualitäts- und Vollständigkeitsdashboard
**Auftrag:**  
Seitenqualität messen:
- Pflichtfelder fehlen
- nächstes Review überfällig
- keine KPIs / keine Risiken / keine Schnittstellen
- Medien fehlen
- Verwaiste Seiten
- Dublettenpotenzial

**Definition of Done:**
- Qualitätsindikatoren sichtbar
- Mängel priorisierbar
- Links direkt in betroffene Seiten / Aufgaben

### Task 22.3 – Eigentümer-/Verantwortlichkeitsmonitor
**Auftrag:**  
Sicht auf Seiten ohne Owner, ohne Stellvertretung, ohne Reviewverantwortung.

**Definition of Done:**
- Verantwortlichkeitslücken sichtbar
- Eskalationslogik definierbar
- nutzbar für Governance

## Involvierte Bereiche / Dateien
- Dashboards
- Task-/Queue-Service
- Qualitätsprüfungen
- Aggregations-Queries
- Rollen-/Owner-Auswertung

---

# Cluster 23 – Backup, Restore, Retention und Notfallfähigkeit

## Ziel
Die Backup-Funktion so professionalisieren, dass sie dem Systemanspruch genügt und sauber auf SharePoint sichern kann.

## Warum dieser Cluster nötig ist
Ein professionelles Wissensmanagement-System braucht belastbare Datensicherung und Wiederherstellung. Du hast bereits klar beschrieben, dass Backup auf auswählbare SharePoint-Bibliotheken/Ordner mit konfigurierbarer Frequenz und Aufbewahrung erfolgen soll. Die aktuelle UI-Idee ist brauchbar, aber die Logik muss vollständig und produktionsfest gemacht werden.

## Untertasks

### Task 23.1 – Backup-Funktionsumfang final definieren
**Auftrag:**  
Sichern:
- Datenbank vollständig
- strukturierte Konfiguration
- Medien-/Dateireferenzen oder Exportartefakte
- Audit-/Systemmetadaten soweit notwendig

**Definition of Done:**
- Scope des Backups fachlich dokumentiert
- klare Trennung zwischen DB-Dump, Config-Export, Dateilisten / Medienindex

### Task 23.2 – SharePoint-Zielauswahl sauber umsetzen
**Auftrag:**  
Admin muss Zielbibliothek / Zielordner sauber auswählen können.

**Definition of Done:**
- Bibliothek/Ordner auswählbar
- Drive-/Site-/Folder-IDs korrekt gespeichert
- Fehlerzustände klar sichtbar
- keine stillen Fallbacks auf falsche Ziele

### Task 23.3 – Frequenz und Retention umsetzen
**Auftrag:**  
Konfigurierbar:
- Intervall
- tägliche Aufbewahrung
- wöchentliche Aufbewahrung
- monatliche Aufbewahrung
- optional manuelles Backup

**Definition of Done:**
- Retention-Regeln technisch wirksam
- Lösch-/Bereinigungslogik nachvollziehbar
- Admin-UI verständlich

### Task 23.4 – Restore-Strategie und Sicherheitslogik
**Auftrag:**  
Restore darf kein gefährlicher Blindflug sein.

**Definition of Done:**
- Restore nur für berechtigte Rollen
- Voransicht / Metadaten pro Backup
- Sicherheitsabfrage
- Restore-Protokoll
- Test-Restore-/Dry-Run-Konzept dokumentiert

### Task 23.5 – Backup-Historie und Evidenz
**Auftrag:**  
UI analog deiner Zielvorstellung:
- Verlauf
- Status
- Größe
- Dauer
- Fehlertext
- Wiederherstellen

**Definition of Done:**
- Backuphistorie vollständig
- Fehler verständlich
- keine SeaTable-Logik in diesem Modul

## Involvierte Bereiche / Dateien
- Backup-Service
- Scheduler / Jobs
- SharePoint-Connector
- Admin-UI Backup
- Restore-Service
- Audit-/Historienmodell

---

# Cluster 24 – Benachrichtigungen, Watcher und Reviewzyklen

## Ziel
Das System reaktiv und steuerbar machen, damit Verantwortliche nicht manuell alles überwachen müssen.

## Warum dieser Cluster nötig ist
Wenn Seiten Reviewzyklen, Arbeitskopien und Freigaben haben, müssen Benachrichtigungen und Watcher sauber funktionieren. Sonst kippt die Governance im Alltag.

## Untertasks

### Task 24.1 – Watcher-/Beobachten-Logik finalisieren
**Auftrag:**  
Beobachten-Funktion fachlich definieren:
- Seite beobachten
- Prozess / Bereich beobachten
- Änderungen / Review / Freigaben abonnieren

**Definition of Done:**
- Watcher-Regeln dokumentiert
- Beobachten hat klaren Nutzwert
- UI klar verständlich

### Task 24.2 – Ereignisbasierte Benachrichtigungen
**Auftrag:**  
Benachrichtigungen für:
- Arbeitskopie eröffnet
- Review angefordert
- Review zurückgegeben
- freigegeben
- Review überfällig
- Seite steht lange in Bearbeitung

**Definition of Done:**
- Ereigniskatalog vorhanden
- Rollen-/Empfängerlogik korrekt
- keine Benachrichtigungsflut durch Duplikate

### Task 24.3 – Review-Zyklen / Nächstes Review operationalisieren
**Auftrag:**  
„Nächstes Review“ muss mehr sein als ein Feld.

**Definition of Done:**
- Reviewfälligkeit erzeugt Aufgaben / Hinweise
- Eskalation an Owner / Stellvertretung / Prozessmanager möglich
- überfällige Seiten im Dashboard sichtbar

## Involvierte Bereiche / Dateien
- Notification-Service
- Watcher-/Subscription-Modelle
- Scheduler / Reminder-Jobs
- Aufgabenlogik
- UI-Komponenten für Beobachten

---

# Cluster 25 – Auditfähigkeit, Historie und Nachweiskette

## Ziel
Das System revisionssicherer und auditfähiger machen.

## Warum dieser Cluster nötig ist
Gerade im Umfeld von Prozessen, Richtlinien, Compliance und organisatorischen Standards ist nicht nur „was gilt aktuell?“ wichtig, sondern auch:
- wer hat was geändert?
- warum?
- wer hat genehmigt?
- wann galt was?
- was wurde zurückgewiesen?

Die Vorlagen enthalten bereits Version, Gültig ab, nächstes Review, Status und Normbezug. Die SKILL-Regeln verlangen darüber hinaus Audit-Report, Frontend-Evidenz, Output-Prüfung, Regressionsnachweis und saubere Abschlussdokumentation. Diese Logik muss sich systemisch widerspiegeln.

## Untertasks

### Task 25.1 – Ereignislog / Audittrail vervollständigen
**Auftrag:**  
Auditierbare Ereignisse für:
- Arbeitskopie erstellt
- bearbeitet
- eingereicht
- kommentiert
- freigegeben
- abgelehnt
- veröffentlicht
- wiederhergestellt
- archiviert

**Definition of Done:**
- nachvollziehbarer Audittrail
- keine Lücken bei kritischen Ereignissen
- UI / Export für Admins nutzbar

### Task 25.2 – Versionshistorie fachlich schärfen
**Auftrag:**  
Historie soll nicht nur Revisionsnummern zeigen, sondern echten Nachweischarakter haben.

**Definition of Done:**
- pro veröffentlichter Version: Autor, Reviewer, Zeitpunkt, Summary, Gültigkeit
- offene Arbeitskopien klar getrennt von offizieller Historie
- Rückgaben / Ablehnungen nachvollziehbar

### Task 25.3 – Export-/Nachweisfähigkeit
**Auftrag:**  
Prüfe, welche Auditinformationen exportierbar sein müssen.

**Definition of Done:**
- definierter Exportumfang
- Nachweise für interne Audits / Qualitätssicherung
- keine personenbezogenen Exporte ohne Rechteprüfung

## Involvierte Bereiche / Dateien
- Audit-Log
- Versionshistorie
- Export-Services
- Admin-/Historien-UI
- Rollen-/Rechteprüfung

---

## Empfohlene Reihenfolge

Wenn du nicht alles gleichzeitig in Auftrag geben willst, ist die sinnvollste Reihenfolge:

1. **Cluster 14** – Source of Truth / GitHub / Release-Disziplin  
2. **Cluster 15** – Publikationsmodell Live / Arbeitskopie / Publish  
3. **Cluster 16** – Review Center / Diff / Freigabe-UX  
4. **Cluster 17** – Rollen / Stellvertretung / SoD  
5. **Cluster 21** – Suche / KI / Published-Only-Wahrheit  
6. **Cluster 23** – Backup / Restore / Retention  
7. **Cluster 18** – Templates / Felder / Guided Mode  
8. **Cluster 19** – Editor / Medien / UX  
9. **Cluster 20** – Navigation / Übersichtsseiten / Beziehungen  
10. **Cluster 22** – Dashboards / Prozessmanagement  
11. **Cluster 24** – Benachrichtigungen / Watcher / Reviewzyklen  
12. **Cluster 25** – Audittrail / Historie / Nachweiskette

---

## Klare Schlussbewertung

Der von dir eingeführte Arbeitskopie-Ansatz ist **nicht atypisch**, sondern für euer Zielbild genau richtig.  
Was jetzt folgt, sind **keine Korrekturen an deiner Grundidee**, sondern die **notwendigen Folgecluster**, damit FlowCore als vollständiges, professionelles Wissensmanagement-System konsistent funktioniert.
