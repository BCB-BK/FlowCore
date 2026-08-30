# Editor-Leitfaden – FlowCore

## Erste Schritte

### Anmeldung
1. Öffnen Sie FlowCore über `https://flowcore.bildungscampus-backnang.de` oder den Teams-Tab **„FlowCore"**
2. Die Anmeldung erfolgt automatisch über Ihr Microsoft-Konto (SSO)
3. Nach der Anmeldung sehen Sie die Wiki-Startseite (Hub)

### Navigation
- **Seitenleiste** (links): Baumstruktur aller Wiki-Seiten
- **Suchleiste** (oben): Volltextsuche über alle Inhalte
- **Meine Aufgaben**: Persönliche Übersicht Ihrer Entwürfe und ausstehenden Reviews
- **Glossar**: Fachbegriffe und Definitionen
- **Review-Inbox**: Eingegangene Prüfaufgaben

---

## Seiten erstellen

### Neue Seite anlegen
1. Navigieren Sie zur gewünschten Elternseite
2. Klicken Sie auf **„+ Unterseite"**
3. Wählen Sie den passenden **Seitentyp**:
   - **Kernprozess-Übersicht**: Für übergeordnete Prozessbeschreibungen (SIPOC, KPIs)
   - **Bereichsübersicht**: Für Organisationseinheiten
   - **Prozessseite (Text)**: Textbasierte Prozessbeschreibungen mit RACI, Schnittstellen
   - **Prozessseite (BPMN)**: Prozesse mit BPMN 2.0-Diagramm
   - **Verfahrensanweisung**: Schritt-für-Schritt-Anleitungen
   - **Arbeitsanweisung**: Detaillierte Arbeitsschritte
   - **Richtlinie**: Verbindliche Vorgaben und Regeln
   - **Rollenprofil**: Beschreibung von Rollen und Verantwortlichkeiten
   - **Formularvorlage**: Vorlagen für Formulare und Checklisten
   - **FAQ**: Häufig gestellte Fragen
   - **Infoseite**: Allgemeine Informationsseiten
4. Geben Sie einen **Titel** ein
5. Klicken Sie auf **„Erstellen"**

### Prozess-IDs
Jede Seite erhält automatisch eine hierarchische Prozess-ID:
- `KP-0001` — Kernprozess
- `KP-0001.1` — Teilprozess
- `RL-0001` — Richtlinie
- `AA-0001` — Arbeitsanweisung

---

## Inhalte bearbeiten

### Block-Editor (Rich Text)
Der Editor unterstützt verschiedene Inhaltsblöcke:
- **Text**: Fließtext mit Formatierung (fett, kursiv, unterstrichen, durchgestrichen)
- **Überschriften**: H1–H3
- **Listen**: Aufzählung und Nummerierung
- **Aufgabenliste**: Checklisten mit Kontrollkästchen
- **Tabellen**: Strukturierte Daten mit Bearbeitungsmenü
- **Bilder**: Aus Medienbibliothek oder per Upload
- **Dateien**: Dateianhänge
- **Hinweise / Callout-Boxen**: Farbige Boxen (Info, Warnung, Fehler, Erfolg)
- **Trennlinien**: Visuelle Abschnittstrennungen
- **Code-Blöcke**: Formatierter Quellcode

### Slash-Befehle
Tippen Sie `/` im Editor, um das Blockmenü zu öffnen:
- `/heading` — Überschrift einfügen
- `/table` — Tabelle einfügen
- `/image` — Bild einfügen
- `/callout` — Hinweisbox einfügen
- `/task` — Aufgabenliste einfügen
- `/file` — Dateianhang einfügen
- `/divider` — Trennlinie einfügen

### BPMN 2.0-Diagramme
Für Seitentypen mit BPMN-Diagramm steht der integrierte **BPMN-Editor** (bpmn-js) zur Verfügung:
1. Öffnen Sie eine Prozessseite (Grafik) im Bearbeitungsmodus
2. Der BPMN-Editor erscheint automatisch im Diagrammabschnitt
3. Ziehen Sie Elemente (Aufgaben, Ereignisse, Gateways) per Drag & Drop
4. Verbinden Sie Elemente mit Pfeilen
5. Doppelklick auf ein Element zum Beschriften
6. Das Diagramm wird automatisch als Teil der Revision gespeichert

---

## Medien & Dateien

### Datei hochladen (Medienbibliothek)
1. Klicken Sie im Editor auf das **Bild/Datei-Symbol** oder tippen Sie `/image`
2. Klicken Sie **„Datei hochladen"**
3. Wählen Sie eine Datei von Ihrem Computer (max. 100 MB)
4. Die Datei wird automatisch in die SharePoint-Medienablage hochgeladen
5. Das Asset erscheint sofort im Editor und in der Medienbibliothek

### Aus Medienbibliothek wählen
Bereits hochgeladene Dateien können wiederverwendet werden:
1. Klicken Sie im Editor auf das Medienbibliothek-Symbol
2. Suchen Sie nach Dateiname oder filtern nach Typ (Bild, Dokument, Video…)
3. Klicken Sie auf das gewünschte Medium → **„Einfügen"**

### Aus SharePoint auswählen
1. Klicken Sie im Referenzen-Bereich auf **„SharePoint auswählen"**
2. Navigieren Sie durch die SharePoint-Bibliotheksstruktur
3. Wählen Sie die gewünschte Datei aus
4. Der Link wird automatisch als Referenz eingefügt

### Referenzen & mitgeltende Dokumente
Im Abschnitt **„Referenzen & mitgeltende Dokumente"** können Sie:
- **URLs manuell** eingeben (externe Weblinks)
- **Dateien hochladen** und als Referenz anhängen
- **SharePoint-Dateien** direkt verknüpfen (ohne Kopie)

---

## Strukturierte Abschnitte (je nach Seitentyp)

Bestimmte Seitentypen bieten vorgefertigte strukturierte Abschnitte:

| Seitentyp | Verfügbare Abschnitte |
|---|---|
| Kernprozess-Übersicht | SIPOC-Tabelle, KPI-Tabelle, Compliance-Angaben |
| Prozessseite (Text) | RACI-Matrix, Prozessschritte, Schnittstellen & Systeme |
| Verfahrensanweisung | Zweck, Geltungsbereich, Schritte, Verantwortlichkeiten |
| Richtlinie | Zweck, Regelwerk, Compliance-Hinweise |
| Rollenprofil | Aufgaben, Befugnisse, Qualifikationen |

Strukturierte Abschnitte können über die **Abschnittsleiste** (Stift-Icon oben rechts) bearbeitet werden.

---

## Metadaten pflegen

### Pflichtfelder
- **Verantwortlicher (Owner)**: Person, die für die Seite zuständig ist (wird über Microsoft-Personenpicker ausgewählt)
- **Tags**: Mindestens ein Tag für bessere Auffindbarkeit

### Optionale Felder (je nach Seitentyp)
- **Gültig ab**: Datum, ab dem der Inhalt gilt
- **Nächste Überprüfung**: Datum der nächsten inhaltlichen Prüfung
- **Änderungszusammenfassung**: Beschreibung der Änderungen
- **Vertraulichkeitsstufe**: Einschränkung des Leserkreises

---

## KI-Assistent (FlowCore-Assistent)

Der **FlowCore-Assistent** (KI-Assistent) unterstützt Sie beim Erstellen und Verbessern von Inhalten:

1. Klicken Sie auf das **Assistenten-Symbol** (oben rechts oder in der Toolbar)
2. Stellen Sie Fragen zu bestehenden Inhalten im Wiki
3. Lassen Sie sich Entwürfe oder Vorschläge für strukturierte Felder generieren
4. Der Assistent berücksichtigt den Kontext der aktuell geöffneten Seite

**Hinweis**: Der KI-Assistent ist optional und muss vom Administrator aktiviert werden. Er benötigt einen konfigurierten OpenAI API-Schlüssel.

---

## Revisionen erstellen

### Workflow
1. **Bearbeiten**: Nehmen Sie Ihre Änderungen vor
2. **Entwurf speichern**: Änderungen werden automatisch als lokaler Entwurf gespeichert
3. **Revision erstellen**: Klicken Sie auf **„Neue Revision"** und fügen Sie eine Änderungszusammenfassung hinzu
4. **Zur Prüfung einreichen**: Die Revision geht an den Reviewer
5. **Review**: Reviewer prüft im Diff-View und gibt Feedback oder genehmigt
6. **Genehmigung**: Approver erteilt die finale Freigabe
7. **Veröffentlichung**: Die genehmigte Revision wird mit Versionsnummer veröffentlicht

### Änderungstypen
- **Redaktionell**: Tippfehler, Formatierung, keine inhaltliche Änderung
- **Inhaltlich (Minor)**: Kleinere fachliche Aktualisierungen
- **Inhaltlich (Major)**: Wesentliche fachliche Änderungen, neue Versions-Nummer
- **Regulatorisch**: Änderungen aufgrund neuer Vorschriften oder Normen

### Revisions-Diff
Im Revisions-Diff-View sehen Sie:
- **Grün unterlegt**: Neu hinzugefügter Text
- **Rot durchgestrichen**: Gelöschter Text
- Strukturierte Felder: Vorher/Nachher-Vergleich

---

## Tags und Glossar

### Tags zuweisen
1. Öffnen Sie die Seite im Bearbeitungsmodus
2. Im Metadaten-Bereich: **„Tags"** → bestehende Tags wählen oder neue erstellen
3. Tags verbessern die Suche und Kategorisierung

### Glossareinträge
- Fachbegriffe können als Glossareinträge angelegt werden
- Synonyme und Abkürzungen können verknüpft werden
- Glossareinträge erscheinen als Tooltip auf Seiten, die den Begriff verwenden

---

## Teilen und Zusammenarbeit

### Link teilen
1. Klicken Sie auf **„Teilen"** auf einer Seite
2. Wählen Sie:
   - **Link kopieren**: Kopiert den direkten Link
   - **In Teams teilen**: Teilt den Link in einem Teams-Chat

### Seite beobachten (Watch)
Klicken Sie auf das **Auge-Symbol** auf einer Seite, um diese zu beobachten:
- Sie erhalten Benachrichtigungen bei Änderungen
- „Unterseiten einschließen" beobachtet den gesamten Teilbaum

### Favoriten
Klicken Sie auf das **Stern-Symbol**, um eine Seite zu Ihren Favoriten hinzuzufügen (für Schnellzugriff von der Startseite).

---

## Tipps für gute Wiki-Inhalte

1. **Klare Struktur**: Nutzen Sie Überschriften und strukturierte Abschnitte
2. **Aktualität**: Setzen Sie stets ein „Nächste Überprüfung"-Datum
3. **Verlinkungen**: Verknüpfen Sie verwandte Seiten über Querverweise
4. **Vollständigkeit**: Füllen Sie alle Metadaten aus (höherer Qualitätsscore im Dashboard)
5. **Sprache**: Verwenden Sie klare, verständliche Sprache
6. **Medien**: Nutzen Sie Bilder, BPMN-Diagramme und Tabellen zur Veranschaulichung
7. **Glossar nutzen**: Definieren Sie Fachbegriffe als Glossareinträge
