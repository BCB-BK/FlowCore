# Editor-Leitfaden – FlowCore

## Erste Schritte

### Anmeldung
1. Öffnen Sie FlowCore über den bereitgestellten Link oder den Teams-Tab "FlowCore"
2. Die Anmeldung erfolgt automatisch über Ihr Microsoft-Konto (SSO)
3. Nach der Anmeldung sehen Sie die Wiki-Startseite (Hub)

### Navigation
- **Seitenleiste**: Baumstruktur aller Wiki-Seiten
- **Suchleiste**: Volltextsuche über alle Inhalte
- **Meine Aufgaben**: Persönliche Übersicht Ihrer Entwürfe und ausstehenden Reviews

## Seiten erstellen

### Neue Seite anlegen
1. Navigieren Sie zur gewünschten Elternseite
2. Klicken Sie auf **"+ Unterseite"**
3. Wählen Sie den passenden **Seitentyp**:
   - **Kernprozessübersicht**: Für übergeordnete Prozessbeschreibungen
   - **Teilprozess**: Für Unterprozesse eines Kernprozesses
   - **Verfahrensanweisung**: Schritt-für-Schritt-Anleitungen
   - **Arbeitsanweisung**: Detaillierte Arbeitsschritte
   - **Richtlinie**: Verbindliche Vorgaben und Regeln
   - **Formularvorlage**: Vorlagen für Formulare und Checklisten
   - **Rollenprofil**: Beschreibung von Rollen und Verantwortlichkeiten
   - **Infoseite**: Allgemeine Informationsseiten
   - **FAQ**: Häufig gestellte Fragen
   - **Glossareintrag**: Begriffsdefinitionen
   - **Bereichsseite**: Organisationseinheiten
4. Geben Sie einen **Titel** ein
5. Klicken Sie auf **"Erstellen"**

### Prozess-IDs
Jede Seite erhält automatisch eine hierarchische Prozess-ID:
- `KP-0001` — Kernprozess
- `KP-0001.1` — Teilprozess
- `RL-0001` — Richtlinie
- `AA-0001` — Arbeitsanweisung

## Inhalte bearbeiten

### Block-Editor
Der Editor unterstützt verschiedene Inhaltsblöcke:
- **Text**: Fließtext mit Formatierung (fett, kursiv, unterstrichen)
- **Überschriften**: H1–H3
- **Listen**: Aufzählung und Nummerierung
- **Aufgabenliste**: Checklisten mit Kontrollkästchen
- **Tabellen**: Strukturierte Daten
- **Bilder**: Hochladen oder aus Medienbibliothek
- **Hinweise**: Farbige Callout-Boxen (Info, Warnung, Fehler, Erfolg)
- **Dateien**: Dateianhänge
- **Trennlinien**: Visuelle Abschnittstrennungen

### Slash-Befehle
Tippen Sie `/` im Editor, um das Blockmenü zu öffnen:
- `/heading` — Überschrift einfügen
- `/table` — Tabelle einfügen
- `/image` — Bild einfügen
- `/callout` — Hinweisbox einfügen
- `/task` — Aufgabenliste einfügen

### Automatisches Speichern
Ihre Änderungen werden automatisch als lokaler Entwurf gespeichert. Um eine offizielle Version zu erstellen, müssen Sie eine **Revision** anlegen.

## Metadaten pflegen

### Pflichtfelder
- **Verantwortlicher (Owner)**: Person, die für die Seite zuständig ist
- **Tags**: Mindestens ein Tag für bessere Auffindbarkeit

### Optionale Felder (je nach Seitentyp)
- **Gültig ab**: Datum, ab dem der Inhalt gilt
- **Nächste Überprüfung**: Datum der nächsten inhaltlichen Prüfung
- **Änderungszusammenfassung**: Beschreibung der Änderungen

## Revisionen erstellen

### Workflow
1. **Bearbeiten**: Nehmen Sie Ihre Änderungen vor
2. **Revision erstellen**: Klicken Sie auf "Neue Revision" und fügen Sie eine Änderungszusammenfassung hinzu
3. **Zur Prüfung einreichen**: Die Revision geht an den Reviewer
4. **Review**: Reviewer prüft und gibt Feedback
5. **Genehmigung**: Approver genehmigt die Revision
6. **Veröffentlichung**: Die genehmigte Revision wird veröffentlicht

### Änderungstypen
- **Redaktionell**: Kleinere Textänderungen, Tippfehler
- **Inhaltlich**: Fachliche Änderungen
- **Strukturell**: Umstrukturierung der Seite

## Tags und Glossar

### Tags zuweisen
1. Öffnen Sie die Seite
2. Im Metadaten-Bereich finden Sie "Tags"
3. Wählen Sie vorhandene Tags oder erstellen Sie neue
4. Tags verbessern die Suche und Kategorisierung

### Glossareinträge
- Fachbegriffe können als Glossareinträge angelegt werden
- Synonyme und Abkürzungen werden automatisch verknüpft
- Glossareinträge erscheinen als Tooltip auf verknüpften Seiten

## Tipps für gute Wiki-Inhalte

1. **Klare Struktur**: Verwenden Sie Überschriften und Absätze
2. **Aktualität**: Prüfen Sie regelmäßig, ob Inhalte noch aktuell sind
3. **Verknüpfungen**: Verlinken Sie auf verwandte Seiten
4. **Vollständigkeit**: Füllen Sie alle Metadaten aus (höherer Qualitätsscore)
5. **Sprache**: Verwenden Sie klare, verständliche Sprache
6. **Medien**: Nutzen Sie Bilder und Diagramme zur Veranschaulichung

## Teilen und Zusammenarbeit

### Link teilen
1. Öffnen Sie die Seite
2. Klicken Sie auf **"Teilen"**
3. Wählen Sie:
   - **Link kopieren**: Kopiert den direkten Link
   - **In Teams teilen**: Teilt den Link in einem Teams-Chat
   - **Im Browser öffnen**: Öffnet die Seite außerhalb von Teams
