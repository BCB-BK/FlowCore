# FlowCore — Benutzerhandbuch

**Bildungscampus Backnang · Prozess-Wiki**

> **Stand**: März 2026 · Der Funktionsumfang kann je nach Rolle, Konfiguration und Systemversion variieren.

---

## Inhaltsverzeichnis

- [a) Aufbau des Tools](#a-aufbau-des-tools)
- [b) Wie mache ich was?](#b-wie-mache-ich-was)
- [c) Unterstützungsmöglichkeiten](#c-unterstützungsmöglichkeiten)
- [d) Erläuterung der Einstellungen](#d-erläuterung-der-einstellungen)
- [e) Technische Infos](#e-technische-infos)

---

## a) Aufbau des Tools

### Was ist FlowCore?

FlowCore ist das Prozess-Wiki des Bildungscampus Backnang. Es dient der strukturierten Verwaltung von Prozessdokumentationen, Richtlinien, Rollenprofilen, Checklisten und Systemdokumentationen. FlowCore vereint ein modernes Wiki-System mit einem Qualitätsmanagement-Werkzeug — inklusive Versionierung, Freigabe-Workflows und KI-Unterstützung.

### Hauptbereiche der Anwendung

#### Dashboard / Hub

Das Dashboard ist die zentrale Startseite nach der Anmeldung. Es bietet einen Überblick über:

- **Qualitäts-KPIs**: Gesamtvollständigkeit aller Seiten, Seiten mit Review-Bedarf, offene Entwürfe, verwaiste und veraltete Seiten.
- **Wartungshinweise**: Automatische Vorschläge zu fälligen Reviews, unvollständigen Pflichtfeldern und fehlenden Verknüpfungen.
- **Duplikaterkennung**: Hinweise auf inhaltlich ähnliche Seiten.

Das Dashboard ist für Rollen ab Editor aufwärts sichtbar (Berechtigung `view_dashboard`).

#### Seitenbaum / Navigation

FlowCore organisiert alle Inhalte in einer hierarchischen Baumstruktur. Jede Seite hat eine eindeutige Prozess-ID (z. B. „KP-001") und kann Unterseiten enthalten. Die Baumstruktur folgt festgelegten Hierarchieregeln — eine Kernprozess-Übersicht kann beispielsweise Prozessseiten und Verfahrensanweisungen als Kinder haben, aber keine Richtlinien.

Die Navigation erfolgt über:

- **Sidebar (Seitenbaum)**: Auf- und zuklappbare Baumstruktur aller Wiki-Seiten. Die Sidebar zeigt den Seitentyp-Icon, den Titel und den Status jeder Seite.
- **Breadcrumb-Navigation**: Am oberen Rand jeder Seite wird der Pfad vom Wurzelknoten bis zur aktuellen Seite angezeigt. Jeder Breadcrumb-Eintrag ist anklickbar.

#### Editor

Der Editor basiert auf Tiptap (ProseMirror) und bietet einen modernen Rich-Text-Editor mit folgenden Funktionen:

- **Formatierung**: Überschriften, Fett, Kursiv, Unterstrichen, Listen, Zitate.
- **Tabellen**: Einfügen und Bearbeiten von Tabellen.
- **Callouts**: Hervorgehobene Hinweisboxen (Info, Warnung, Tipp).
- **Diagramme**: Einbettung von Mermaid-Diagrammen.
- **Medien**: Bilder, Videos und Dokumente per Drag & Drop oder Upload einfügen.
- **Autosave**: Änderungen werden alle 2 Sekunden automatisch gesichert.

Der Editor wird im Rahmen des Arbeitskopie-Systems verwendet (siehe [Arbeitskopie-System](#arbeitskopie-system)).

#### Suche

Die Suchseite bietet eine leistungsstarke Volltextsuche mit:

- **Sofortvorschläge**: Ab 2 Zeichen werden Seitenvorschläge in Echtzeit angezeigt.
- **Facettenfilter**: Ergebnisse nach Seitentyp, Status, Eigentümer und Schlagwörtern filtern.
- **Trefferhervorhebung**: Suchbegriffe werden in den Ergebnis-Snippets hervorgehoben.
- **Alias-Suche**: Auch frühere Prozess-IDs (nach Umbenennung) werden gefunden.

Details zur Nutzung finden Sie unter [Suche verwenden](#suche-verwenden).

#### Meine Aufgaben

Die Aufgabenübersicht (Berechtigung `view_tasks`) zeigt alle persönlichen, offenen Arbeitselemente:

- **Eigene Entwürfe**: Arbeitskopien im Status „Entwurf", die bearbeitet oder eingereicht werden können.
- **Zur Prüfung anstehend**: Seiten, für die Sie als Prüfer oder Genehmiger eingetragen sind.
- **Wartende Reviews**: Eingereichte Arbeitskopien, auf deren Prüfung Sie warten.
- **Fällige Reviews**: Seiten, deren regulärer Prüfzyklus abgelaufen ist.

#### Einstellungen

Die Einstellungen (Berechtigung `view_settings`) umfassen Systemkonfiguration, Benutzerverwaltung, KI-Konfiguration, Konnektoren, Backups und mehr. Eine ausführliche Beschreibung aller Tabs finden Sie in [Kapitel d)](#d-erläuterung-der-einstellungen).

### Sidebar-Navigation

Die linke Sidebar enthält folgende Hauptbereiche:

| Bereich | Beschreibung | Sichtbar für |
|:--------|:-------------|:-------------|
| **Home / Hub** | Dashboard mit Qualitäts-KPIs | Alle Rollen |
| **Seitenbaum** | Hierarchische Navigation aller Seiten | Alle Rollen |
| **Suche** | Volltextsuche | Alle Rollen |
| **Glossar** | Fachbegriffe und Definitionen | Alle Rollen |
| **Meine Aufgaben** | Persönliche offene Aufgaben | Ab Editor |
| **Dashboard** | Qualitäts-Dashboard | Ab Editor |
| **Einstellungen** | Systemkonfiguration | Admin, Prozessmanager, Compliance |

Die Sichtbarkeit der Sidebar-Einträge passt sich automatisch an die Berechtigungen des angemeldeten Benutzers an.

### Rollenkonzept

FlowCore verwendet ein mehrstufiges rollenbasiertes Zugriffskontrollsystem (RBAC) mit 7 vordefinierten Rollen:

| Rolle | Beschreibung | Typische Aufgaben |
|:------|:-------------|:------------------|
| **System-Administrator** | Vollzugriff auf alle Funktionen | Systemkonfiguration, Benutzerverwaltung, Backup, Konnektoren |
| **Prozessmanager** | Verwaltet Inhaltsstruktur und Berechtigungen | Seiten erstellen, Struktur pflegen, Beziehungen verwalten, Freigaben erteilen |
| **Compliance-Manager** | Überwachung und Qualitätssicherung | Audit-Logs einsehen, Backups prüfen, Templates verwalten |
| **Editor** | Erstellt und bearbeitet Inhalte | Seiten anlegen, Inhalte schreiben, Arbeitskopien erstellen und einreichen |
| **Reviewer (Prüfer)** | Prüft eingereichte Inhalte | Arbeitskopien prüfen, Kommentare hinterlassen, Audit-Logs einsehen |
| **Approver (Genehmiger)** | Genehmigt und veröffentlicht | Geprüfte Inhalte final freigeben und veröffentlichen |
| **Betrachter** | Grundlegender Lesezugriff | Veröffentlichte Seiten lesen, Suche und Glossar nutzen |

**Zuweisungsebenen**: Rollen können auf drei Ebenen vergeben werden:

1. **Global**: Die Rolle gilt systemweit für alle Inhalte.
2. **Bereichsbezogen**: Die Rolle gilt nur für einen bestimmten Knotenbereich und dessen Unterseiten (z. B. „Editor nur für den Bereich HR").
3. **Seitenspezifisch**: Einzelne Berechtigungen können direkt auf bestimmte Seiten vergeben werden.

Berechtigungen werden entlang der Baumstruktur vererbt — Unterseiten erben die Berechtigungen ihrer Elternseiten.

**Vier-Augen-Prinzip (Separation of Duties)**: Standardmäßig darf die Person, die eine Arbeitskopie eingereicht hat, diese nicht selbst prüfen oder veröffentlichen. Diese Regel stellt sicher, dass immer mindestens zwei Personen an der Freigabe beteiligt sind.

**Stellvertretung**: Bei Abwesenheit kann eine Stellvertretung eingerichtet werden. Der Stellvertreter erbt alle Rollenberechtigungen der vertretenen Person für den festgelegten Zeitraum und Geltungsbereich. Jede Stellvertretung wird im Audit-Log protokolliert.

---

## b) Wie mache ich was?

### Neue Seite anlegen

1. **Erstellen starten**: Klicken Sie im Seitenbaum auf die Schaltfläche „Neue Seite" oder nutzen Sie den „+"-Button an einem bestehenden Knoten, um eine Unterseite anzulegen.
2. **Seitentyp wählen**: Im Erstellungsdialog werden die verfügbaren Seitentypen angezeigt. Welche Typen verfügbar sind, hängt vom Elternknoten ab (Hierarchieregeln).
3. **Variante wählen**: Nach der Auswahl des Seitentyps können Sie eine Variante wählen (z. B. Schlank, Standard, QM-detailliert). Die Variante bestimmt, welche Sektionen und Felder vorausgefüllt werden.
4. **Titel und Prozess-ID**: Geben Sie einen Titel ein. Die Prozess-ID wird automatisch vergeben.
5. **Guided Mode (optional)**: Für viele Seitentypen steht ein geführter Modus zur Verfügung, der Sie Schritt für Schritt durch die Pflichtfelder und -sektionen führt.

**Berechtigung**: `create_page` (Editor, Prozessmanager, Admin)

### Die 18 Seitentypen

FlowCore bietet 18 spezialisierte Seitentypen, die jeweils eigene Sektionen, Metadatenfelder und Hierarchieregeln mitbringen:

#### Kategorie: Prozess

| Seitentyp | ID-Präfix | Zweck | Typischer Einsatz |
|:----------|:----------|:------|:------------------|
| **Kernprozess-Übersicht** | KP | Übergeordneter Geschäftsprozess mit SIPOC, KPIs und Schnittstellen | Dokumentation eines Hauptprozesses wie „Auftragsabwicklung" oder „Personalgewinnung" |
| **Bereichsübersicht** | BO | Strukturelle Übersicht eines Organisationsbereichs | Übersichtsseite für eine Abteilung oder einen Fachbereich |
| **Prozessseite (Text)** | PT | Textbasierte Prozessbeschreibung mit Verfahrensschritten | Detaillierte Beschreibung eines Teilprozesses |
| **Prozessseite (Grafisch)** | PG | Grafische Prozessdarstellung mit Diagramm | Ablaufdiagramm eines Prozesses mit begleitender Beschreibung |
| **Verfahrensanweisung** | VA | Detaillierte Anweisung für einen bestimmten Vorgang | Schritt-für-Schritt-Anleitung für einen Arbeitsablauf |
| **Arbeitsanweisung** | AA | Konkrete Handlungsanweisung für operative Tätigkeiten | Detaillierte Arbeitsschritte für wiederkehrende Aufgaben |

#### Kategorie: Dokumentation

| Seitentyp | ID-Präfix | Zweck | Typischer Einsatz |
|:----------|:----------|:------|:------------------|
| **Checkliste** | CL | Strukturierte Prüfliste mit abhakbaren Elementen | Qualitätsprüfung, Einarbeitungs-Checkliste, Audit-Checkliste |
| **Use Case** | UC | Beschreibung eines Anwendungsfalls | Dokumentation eines konkreten Nutzungsszenarios |
| **FAQ** | FAQ | Häufig gestellte Fragen und Antworten | Sammlung wiederkehrender Fragen zu einem Thema |
| **Sitzungsprotokoll** | SP | Dokumentation von Besprechungsergebnissen | Protokolle von Meetings, Workshops, Reviews |
| **Schulungsressource** | SR | Lern- und Schulungsmaterial | Trainingsmaterial, Anleitungen, Onboarding-Ressourcen |

#### Kategorie: Governance

| Seitentyp | ID-Präfix | Zweck | Typischer Einsatz |
|:----------|:----------|:------|:------------------|
| **Richtlinie** | RL | Organisationsrichtlinie mit Zweck und Durchsetzung | Unternehmensrichtlinien, Compliance-Vorgaben |
| **Rollenprofil** | RP | Profil einer organisatorischen Rolle | Stellenbeschreibungen, Verantwortlichkeitsmatrix |
| **Audit-Objekt** | AO | Prüfgegenstand für interne/externe Audits | Dokumentation von Audit-Anforderungen und -Ergebnissen |

#### Kategorie: System

| Seitentyp | ID-Präfix | Zweck | Typischer Einsatz |
|:----------|:----------|:------|:------------------|
| **Systemdokumentation** | SD | Technische Dokumentation eines IT-Systems | Beschreibung von Softwaresystemen, Schnittstellen, Datenflüssen |
| **Schnittstellenbeschreibung** | SB | Dokumentation einer technischen Schnittstelle | API-Dokumentation, Datenaustauchformate |
| **Dashboard** | DB | Konfigurierbares Dashboard mit Widgets | Steuerungs- und Übersichtsseiten |

#### Kategorie: Wissen

| Seitentyp | ID-Präfix | Zweck | Typischer Einsatz |
|:----------|:----------|:------|:------------------|
| **Glossar** | GL | Begriffsdefinitionen und Fachvokabular | Zentrale Begriffsliste eines Fachbereichs |

### Varianten-Kategorien

Beim Anlegen einer Seite stehen je nach Seitentyp verschiedene Varianten zur Verfügung:

| Variante | Beschreibung | Wann verwenden? |
|:---------|:-------------|:----------------|
| **Schlank** | Minimale Struktur — nur das Nötigste | Für schnelle Dokumentation, wenn wenig formale Anforderungen bestehen |
| **Standard** | Bewährte Grundstruktur für den Regelbetrieb | Standardwahl für die meisten Anwendungsfälle |
| **QM-detailliert** | Vollständig nach QM-Standard mit allen Pflichtfeldern | Wenn alle Qualitätsmanagement-Anforderungen erfüllt werden müssen |
| **Grafisch** | Visuelle Darstellung im Vordergrund | Für Prozesse, die primär als Diagramm dargestellt werden sollen |
| **Container** | Übersichtsseite zur Bündelung von Unterseiten | Für Strukturseiten, die vor allem Unterseiten gruppieren |

### Seite bearbeiten

Das Bearbeiten von Seiten erfolgt immer über das **Arbeitskopie-System**. Eine direkte Bearbeitung der veröffentlichten Version ist nicht möglich — stattdessen wird eine Arbeitskopie erstellt, die unabhängig von der veröffentlichten Version bearbeitet werden kann.

#### Editor-Funktionen

- **Rich-Text-Formatierung**: Überschriften (H1–H6), Fett, Kursiv, Unterstrichen, Durchgestrichen, Code.
- **Listen**: Aufzählungen (nummeriert und unnummeriert), verschachtelte Listen.
- **Tabellen**: Einfügen, Zeilen/Spalten hinzufügen/entfernen, Zellen zusammenführen.
- **Callouts**: Hervorgehobene Hinweisboxen mit verschiedenen Typen (Info, Warnung, Erfolg, Fehler).
- **Diagramme**: Mermaid-Diagramme direkt im Editor erstellen und als Vorschau anzeigen.
- **Medien**: Bilder und Videos per Drag & Drop einbetten, Dateien hochladen, externe URLs einbetten.
- **Spezial-Komponenten**: Je nach Seitentyp stehen besondere Editoren bereit, z. B. SIPOC-Karten, RACI-Matrix, Frage-Antwort-Paare, Begriffs-Wiederholer, Checklisten-Editor oder Kompetenzbereich-Editor.

#### KI-Ausfüllhilfe bei Feldern und Sektionen

Sowohl bei Metadatenfeldern (Textfelder) als auch bei Sektionskarten steht eine **KI-Ausfüllhilfe** zur Verfügung. Erkennbar am Zauberstab-Symbol (✨) neben dem Feld oder der Sektion. Die KI bietet folgende Aktionen:

| Aktion | Beschreibung |
|:-------|:-------------|
| **Umformulieren** | Text neu formulieren bei gleichem Inhalt |
| **Professionalisieren** | Sprachstil verbessern und professioneller gestalten |
| **Aus Stichpunkten** | Stichpunkte in Fließtext umwandeln |
| **Erweitern** | Text inhaltlich ausbauen und ergänzen |
| **Kürzen** | Text auf das Wesentliche reduzieren |
| **Korrektur** | Rechtschreib- und Grammatikfehler korrigieren |

**So funktioniert es:**

1. Klicken Sie auf das Zauberstab-Symbol neben einem Feld oder einer Sektion.
2. Wählen Sie die gewünschte Aktion aus dem Menü.
3. Die KI generiert einen Vorschlag, der in einem Diff-Dialog angezeigt wird — Sie sehen Original und Vorschlag nebeneinander.
4. Klicken Sie auf „Übernehmen", um den Vorschlag zu akzeptieren, oder „Abbrechen", um ihn zu verwerfen.

Die KI-Ausfüllhilfe steht nur zur Verfügung, wenn das KI-Modul in den Einstellungen aktiviert ist und das Feld bereits Text enthält.

### Metadaten pflegen

Jede Seite besitzt neben dem Inhalt einen Metadatenbereich, der im rechten Panel oder unterhalb der Sektionen bearbeitet wird. Die Metadaten sind in Gruppen organisiert:

#### Identität

| Feld | Typ | Beschreibung |
|:-----|:----|:-------------|
| Dokumentenart | Auswahl | Art des Dokuments (Verfahren, Richtlinie, Leitfaden, Formular etc.) |

#### Governance

| Feld | Typ | Beschreibung |
|:-----|:----|:-------------|
| Prozesseigner | Person | Fachlich verantwortliche Person — **Pflichtfeld** |
| Stellvertreter | Person | Vertretung des Prozesseigners — Empfohlen |
| Prüfer | Person | Fachliche Prüfung (Vier-Augen-Prinzip) — Pflicht zur Veröffentlichung |
| Freigeber | Person | Genehmiger für regulatorische Inhalte — Bedingt |
| Führendes System | Text | Maßgebliches Quellsystem — Empfohlen |

#### Gültigkeit

| Feld | Typ | Beschreibung |
|:-----|:----|:-------------|
| Gültig ab | Datum | Ab wann gilt das Dokument — Pflicht zur Veröffentlichung |
| Gültig bis | Datum | Befristung — Bedingt (wenn zeitlich begrenzt) |
| Inkrafttretungsdatum | Datum | Verbindliches Gültigkeitsdatum — Bedingt (regulatorisch) |
| Prüfzyklus (Monate) | Zahl | Regelmäßiger Prüfintervall — Pflicht zur Veröffentlichung |
| Nächste Prüfung | Datum | Termin der nächsten Überprüfung — Empfohlen |
| Letzte Verifizierung | Datum | Datum der letzten inhaltlichen Prüfung — Bedingt |
| Verifizierungsergebnis | Auswahl | Aktuell / Aktualisierung nötig / Veraltet — Bedingt |

#### Klassifizierung

| Feld | Typ | Beschreibung |
|:-----|:----|:-------------|
| Vertraulichkeit | Auswahl | Öffentlich / Intern / Vertraulich / Streng vertraulich — Pflicht zur Veröffentlichung |
| Risikoeinstufung | Auswahl | Niedrig / Mittel / Hoch / Kritisch — Empfohlen |
| Schlagwörter | Tags | Freie Verschlagwortung — Empfohlen |

**Anforderungsstufen der Felder:**

- 🔴 **Pflicht**: Muss ausgefüllt sein (rotes Badge „Pflicht").
- 🟡 **Empfohlen**: Sollte ausgefüllt werden, ist aber nicht erzwungen (gelbes Badge „Empfohlen").
- ⚪ **Bedingt**: Nur in bestimmten Situationen erforderlich (graues Badge „Bedingt" mit Erklärung).

Bei jedem Feld steht ein **Hilfe-Tooltip** (ℹ️) zur Verfügung, der Ausfüllhinweise, Beispiele und gegebenenfalls Negativbeispiele anzeigt. Die KI-Ausfüllhilfe (Zauberstab-Symbol) steht bei allen Textfeldern zur Verfügung und kann Vorschläge generieren, umformulieren oder korrigieren.

### Arbeitskopie-System

FlowCore verwendet ein Arbeitskopie-System (Working Copies), das sicherstellt, dass die veröffentlichte Version einer Seite jederzeit stabil bleibt, während Änderungen in einer separaten Kopie vorbereitet werden.

#### Arbeitskopie erstellen

1. Öffnen Sie die Seite, die Sie bearbeiten möchten.
2. Klicken Sie auf „Bearbeiten". Es wird eine **Arbeitskopie** erstellt — ein Entwurf, der unabhängig von der veröffentlichten Version existiert.
3. Solange eine Arbeitskopie aktiv ist, sehen andere Benutzer weiterhin die veröffentlichte Version. Pro Seite existiert immer nur eine aktive Arbeitskopie.

#### Arbeitskopie bearbeiten

- Bearbeiten Sie Inhalte im Editor und Metadaten im Seitenpanel.
- Änderungen werden **automatisch gespeichert** (Autosave alle 2 Sekunden).
- Der aktuelle Status der Arbeitskopie wird als Banner über der Seite angezeigt.
- Sie können die Arbeitskopie jederzeit verlassen und später über „Weiter bearbeiten" fortsetzen.
- Bei jeder Speicherung wird eine Änderungsart (Redaktionell, Kleinere Änderung, Größere Änderung, Regulatorisch, Strukturell) und eine Änderungszusammenfassung erfasst.

#### Arbeitskopie-Status

Eine Arbeitskopie durchläuft folgende Status:

| Status | Farbe | Beschreibung |
|:-------|:------|:-------------|
| **Entwurf** | 🟡 Gelb | Aktiv in Bearbeitung — nur der Autor kann bearbeiten |
| **Zur Prüfung eingereicht** | 🔵 Blau | Eingereicht und wartet auf einen Prüfer |
| **In Prüfung** | 🟣 Lila | Ein Prüfer hat die Überprüfung begonnen |
| **Änderung zurückgegeben** | 🟠 Orange | Vom Prüfer mit Kommentar zurückgegeben — der Autor kann nachbessern |
| **Freigegeben** | 🟢 Grün | Geprüft und genehmigt — bereit zur Veröffentlichung |
| **Veröffentlicht** | 🟢 Grün | Wurde als neue offizielle Version veröffentlicht |
| **Abgebrochen** | ⚪ Grau | Die Arbeitskopie wurde verworfen |

#### Zur Prüfung einreichen

1. Stellen Sie sicher, dass alle Pflichtfelder ausgefüllt sind (die Vollständigkeitsanzeige hilft dabei).
2. Wählen Sie die **Änderungsart** (z. B. „Größere Änderung") und geben Sie eine **Änderungszusammenfassung** ein.
3. Klicken Sie auf „Zur Prüfung einreichen".

**Berechtigung**: `submit_working_copy` (Editor, Admin)

#### Prüfen und Freigeben

Als Prüfer haben Sie folgende Möglichkeiten:

- **Freigeben**: Die Arbeitskopie wird als „freigegeben" markiert und ist bereit zur Veröffentlichung. Sie können einen optionalen Kommentar hinterlassen.
- **Zur Überarbeitung zurückgeben**: Die Arbeitskopie geht mit einem Kommentar zurück an den Autor. Der Autor sieht den Rückgabekommentar als Hinweis im Banner.
- **Während der Prüfung bearbeiten**: Prozessmanager und Admins können eine Arbeitskopie auch direkt während der Prüfphase bearbeiten (Aktion „Vom Prüfer geändert").

**Vier-Augen-Prinzip**: Die Person, die die Arbeitskopie eingereicht hat, kann diese nicht selbst freigeben oder veröffentlichen. Entsprechende Buttons werden ausgeblendet und ein Hinweis erklärt den Grund.

#### Veröffentlichen

1. Nach der Freigabe kann ein Genehmiger die Arbeitskopie veröffentlichen.
2. Vergeben Sie ein **Versionslabel** (z. B. „1.0", „2.1").
3. Die bisherige veröffentlichte Version wird automatisch archiviert.
4. Die neue Version wird zur offiziellen, sichtbaren Fassung.

**Veröffentlichungsvalidierung**: Vor der Veröffentlichung prüft das System automatisch, ob alle Pflichtfelder und Pflichtsektionen ausgefüllt sind. Werden Fehler gefunden, wird die Veröffentlichung blockiert und die fehlenden Elemente aufgelistet.

**Berechtigung**: `publish_working_copy` (Genehmiger, Admin)

#### Arbeitskopie abbrechen

Sollte eine Arbeitskopie nicht mehr benötigt werden, kann sie jederzeit abgebrochen werden. Die veröffentlichte Version bleibt davon unberührt.

#### Arbeitskopie-Timeline

Jede Arbeitskopie führt eine chronologische Timeline aller Ereignisse:

- Erstellt, Aktualisiert, Eingereicht, Prüfung begonnen, Zurückgegeben, Vom Prüfer geändert, Freigegeben, Veröffentlicht, Abgebrochen, Entsperrt.

### Review- und Freigabe-Workflow

Der vollständige Workflow einer Inhaltsänderung:

```
Arbeitskopie erstellen → Bearbeiten → Einreichen → Prüfung
                                                       ↓
                                    ┌── Freigeben → Veröffentlichen
                                    └── Zurückgeben → Überarbeiten → Erneut Einreichen
```

1. **Arbeitskopie erstellen**: Editor oder Prozessmanager erstellt eine Arbeitskopie.
2. **Bearbeiten**: Inhalt und Metadaten werden bearbeitet. Autosave sichert Änderungen automatisch.
3. **Einreichen**: Der Autor reicht die Arbeitskopie mit Änderungsart und Zusammenfassung zur Prüfung ein.
4. **Prüfung**: Ein Prüfer (Reviewer) begutachtet die Änderungen.
   - **Freigeben**: Die Arbeitskopie wird genehmigt.
   - **Zurückgeben**: Die Arbeitskopie geht mit einem Kommentar zurück an den Autor.
5. **Veröffentlichen**: Ein Genehmiger (Approver) veröffentlicht die freigegebene Arbeitskopie als neue offizielle Version mit einem Versionslabel.

### Versionshistorie und Diff-Ansicht

Jede Seite speichert eine lückenlose Revisionshistorie. Jede Speicherung erzeugt eine neue, unveränderliche Revision (Immutable-Revision-Modell).

- **Versionshistorie**: Im Panel „Versionshistorie" sehen Sie alle Revisionen einer Seite mit Autor, Datum, Änderungsart und Zusammenfassung.
- **Diff-Vergleich**: Wählen Sie zwei beliebige Revisionen aus, um deren Unterschiede zu vergleichen. Der Diff zeigt geänderte Metadatenfelder, Sektionsinhalte und strukturelle Unterschiede.
- **Wiederherstellen**: Eine frühere Revision kann als neue Arbeitskopie wiederhergestellt werden. Die bestehende Historie bleibt vollständig erhalten — die Wiederherstellung erzeugt lediglich eine Kopie als neuen Entwurf.

### Suche verwenden

1. **Suchseite öffnen**: Klicken Sie auf „Suche" in der Sidebar oder nutzen Sie die Tastenkombination.
2. **Suchbegriff eingeben**: Ab 2 Zeichen werden Sofortvorschläge angezeigt (Titel und Prozess-ID).
3. **Ergebnisse filtern**: Nutzen Sie die Facettenfilter am linken Rand:
   - **Seitentyp**: Nur bestimmte Seitentypen anzeigen (z. B. nur Verfahrensanweisungen).
   - **Status**: Nach Veröffentlichungsstatus filtern.
   - **Eigentümer**: Seiten eines bestimmten Prozesseigners anzeigen.
   - **Schlagwörter**: Nach Tags filtern.
4. **Entwürfe einblenden**: Benutzer mit der Rolle Editor oder höher können über den Toggle „Entwürfe zeigen" auch nicht-veröffentlichte Inhalte in den Suchergebnissen sehen.

**Sichtbarkeitsregeln**: Betrachter sehen nur veröffentlichte Seiten. Editoren, Prüfer und Prozessmanager können optional Entwürfe und Seiten in Prüfung sehen. Admins und Compliance-Manager sehen alle Status.

### Glossar nutzen

1. **Glossar öffnen**: Klicken Sie auf „Glossar" in der Sidebar.
2. **Alphabetische Navigation**: Nutzen Sie das A–Z-Register, um schnell zu einem Buchstaben zu springen.
3. **Suche**: Geben Sie einen Suchbegriff ein, um Begriffe und Definitionen zu durchsuchen.
4. **Begriff erstellen**: Klicken Sie auf „Neuer Begriff" (Berechtigung `edit_content`). Geben Sie den Begriff, eine Definition (Rich-Text), Synonyme und optional eine Verknüpfung zu einer Wiki-Seite ein.
5. **Begriff bearbeiten/löschen**: Klicken Sie auf einen Begriff und wählen Sie „Bearbeiten" oder „Löschen".
6. **Wiki-Verknüpfung**: Begriffe können mit Wiki-Seiten verknüpft werden — klicken Sie dazu auf „Mit Seite verknüpfen" und wählen Sie die Zielseite.

### Seiten beobachten (Watcher-Funktion)

FlowCore bietet eine Beobachtungsfunktion, mit der Sie über Änderungen an bestimmten Seiten informiert werden. Klicken Sie auf das Glocken-/Beobachten-Symbol auf einer Seitendetailansicht, um Benachrichtigungen für diese Seite zu aktivieren. Sie erhalten dann Hinweise, wenn Arbeitskopien erstellt, eingereicht, freigegeben oder veröffentlicht werden.

---

## c) Unterstützungsmöglichkeiten

### FlowCore-Assistent (KI-Chat)

Der FlowCore-Assistent ist ein KI-gestützter Wissensassistent, der Fragen zu den im Wiki gespeicherten Inhalten beantwortet. Er nutzt ein RAG-Verfahren (Retrieval-Augmented Generation): Ihre Frage wird zunächst gegen den Wiki-Bestand und optional gegen angebundene Quellsysteme und Websuche geprüft. Relevante Inhalte werden als Kontext an das KI-Modell übergeben, das daraufhin eine fundierte Antwort generiert.

**So nutzen Sie den Assistenten:**

1. Öffnen Sie den FlowCore-Assistenten über das Chat-Symbol in der Navigation.
2. Stellen Sie Ihre Frage in natürlicher Sprache, z. B. „Wie funktioniert der Onboarding-Prozess?" oder „Welche Richtlinien gibt es zum Datenschutz?"
3. Die Antwort wird in Echtzeit gestreamt und enthält anklickbare Quellenreferenzen.
4. Jede Quelle trägt ein Typ-Label: **Wiki**, **Connector** oder **Web**.
5. Ein Konfidenzniveau (Hoch, Mittel, Niedrig) zeigt an, wie gut die Frage durch Quellen abgedeckt ist.

**Quellenverhalten:**
- Standardmäßig werden nur **veröffentlichte** Inhalte als Kontext verwendet.
- Benutzer mit entsprechenden Rollen können optional auch Entwürfe und Inhalte in Prüfung einbeziehen. Solche Quellen werden mit einem Status-Label gekennzeichnet (z. B. „[Status: draft]").
- Der Assistent warnt automatisch, wenn Quellen nicht freigegeben sind oder Widersprüche bestehen.

**Fragetypen**, die besonders gut unterstützt werden:
- **Faktenfragen**: Präzise, quellenbasierte Antworten.
- **Prozessfragen**: Schrittweise Erklärungen.
- **Vergleichsfragen**: Strukturierte Gegenüberstellung.
- **Problemlösungsfragen**: Lösungsvorschläge mit Begründung.
- **Explorative Fragen**: Umfassende Übersicht zu einem Thema.

### Seiten-Assistent (KI-Schreibhilfe)

Der Seiten-Assistent unterstützt Sie direkt beim Bearbeiten von Inhalten. Er ist über das Bot-Symbol im Editor erreichbar und bietet zwei Kategorien von Aktionen:

#### Schreibhilfe

| Aktion | Beschreibung |
|:-------|:-------------|
| **Umformulieren** | Text bei gleichem Inhalt neu formulieren |
| **Zusammenfassen** | Kernaussagen extrahieren |
| **Erweitern** | Text inhaltlich ausbauen und ergänzen |
| **Kürzen** | Auf das Wesentliche reduzieren |
| **Professionalisieren** | Sprachstil verbessern |
| **Tonalität anpassen** | Formell oder informell umschreiben |
| **Umstrukturieren** | Logische Neuordnung des Textes |
| **Grammatikprüfung** | Rechtschreib- und Grammatikfehler korrigieren |

#### Qualitätsprüfung

| Aktion | Beschreibung |
|:-------|:-------------|
| **Lückenanalyse** | Fehlende Informationen identifizieren |
| **Template-Vollständigkeit** | Prüfen, ob alle vorgesehenen Felder ausgefüllt sind |
| **Qualitätsprüfung** | Widersprüche und veraltete Informationen erkennen |
| **Dubletten prüfen** | Redundante Informationen identifizieren |

#### Änderungslogik

| Aktion | Beschreibung |
|:-------|:-------------|
| **Änderungszusammenfassung** | Änderungen sachlich und prägnant zusammenfassen |

### KI-Ausfüllhilfe für Metadaten-Felder und Sektionen

Neben dem Seiten-Assistenten bietet FlowCore eine **feldbezogene KI-Ausfüllhilfe** direkt an jedem Textfeld und jeder Sektion. Erkennbar am Zauberstab-Symbol (✨), steht die Ausfüllhilfe überall dort zur Verfügung, wo Text eingegeben werden kann:

- **Bei Metadatenfeldern**: Neben jedem Textfeld im Metadatenbereich (z. B. „Führendes System", Beschreibungsfelder).
- **Bei Sektionskarten**: Neben jeder bearbeitbaren Sektion (z. B. „Zweck & Geltungsbereich", „Prozessschritte").

Die verfügbaren Aktionen (Umformulieren, Professionalisieren, Aus Stichpunkten, Erweitern, Kürzen, Korrektur) werden kontextbezogen angeboten. Nach dem Klick auf eine Aktion generiert die KI einen Vorschlag, der im **Diff-Dialog** angezeigt wird: Sie sehen das Original und den Vorschlag nebeneinander und können den Vorschlag übernehmen oder verwerfen.

### Guided-Mode beim Erstellen neuer Seiten

Viele Seitentypen bieten einen **geführten Modus** (Guided Mode) beim Erstellen. Statt alle Felder auf einmal zu sehen, werden Sie Schritt für Schritt durch die wichtigsten Sektionen geführt:

1. **Schritt 1**: Zweck & Geltungsbereich (oder äquivalente Hauptsektion)
2. **Schritt 2**: Prozessschritte, Verfahrensbeschreibung oder Hauptinhalt
3. **Schritt 3**: Ergänzende Sektionen (SIPOC, KPIs, Schnittstellen etc.)
4. **Schritt 4**: Verknüpfungen und Referenzen

Jeder Schritt zeigt nur die relevanten Felder und enthält Leitfragen als Orientierungshilfe.

### Leitfragen in Sektionen

Viele Sektionen enthalten **Leitfragen** (Guiding Questions), die als Orientierungshilfe beim Ausfüllen dienen. Diese Fragen erscheinen als Hinweis in der Sektion und helfen Ihnen, die richtigen Informationen zu erfassen. Beispiele:

- „Welches Geschäftsziel unterstützt dieser Prozess?"
- „Für welche Bereiche/Standorte gilt er?"
- „Wer liefert die Eingaben (Suppliers)?"

Die Leitfragen sind nur im Bearbeitungsmodus sichtbar und erscheinen nicht in der veröffentlichten Ansicht.

### Qualitäts-Dashboard

Das Qualitäts-Dashboard bietet einen Überblick über die Inhaltsqualität im gesamten Wiki:

- **Gesamtvollständigkeit**: Durchschnittlicher Vollständigkeitsgrad aller Seiten (basierend auf ausgefüllten Pflichtfeldern und Sektionen).
- **Seiten mit Review-Bedarf**: Seiten, deren nächstes Prüfdatum überschritten ist.
- **Entwürfe ohne Prüfung**: Entwürfe, die noch nicht eingereicht wurden.
- **Verwaiste Seiten**: Seiten ohne eingehende Verknüpfungen.
- **Veraltete Seiten**: Seiten, die seit längerer Zeit nicht aktualisiert wurden.
- **Duplikaterkennung**: Hinweise auf inhaltlich ähnliche Seiten.
- **Wartungsvorschläge**: Automatische Hinweise zu fälligen Reviews, unvollständigen Pflichtfeldern, fehlenden Verantwortlichen und verwaisten Seiten.

---

## d) Erläuterung der Einstellungen

Die Einstellungsseite ist über die Sidebar erreichbar und erfordert die Berechtigung `view_settings` (verfügbar für System-Administrator, Prozessmanager und Compliance-Manager). Die verfügbaren Tabs passen sich automatisch an Ihre Berechtigungen an.

### Tab: Allgemein

Zeigt Systeminformationen und den aktuellen Konfigurationsstatus:

- **Systeminformationen**: Anwendungsversion, Umgebung (Development/Production), Datenbankstatus.
- **Authentifizierungsstatus**: Zeigt an, ob Microsoft Entra ID (Azure AD) korrekt verbunden ist und ob der Entwicklungsmodus aktiv ist.
- **Integrationsstatus**: Übersicht über verbundene externe Dienste.

### Tab: Benutzer & Rollen

Verwaltung von Benutzern, Gruppen und Rollen. Berechtigung: `manage_permissions`.

- **Benutzerliste**: Alle registrierten Benutzer und Gruppen durchsuchen und verwalten.
- **Entra-ID-Import**: Benutzer und Gruppen direkt aus Microsoft Entra ID (Azure AD) importieren, um sie als Principals im System anzulegen.
- **Rollen zuweisen**: Rollen an Benutzer oder Gruppen vergeben — global oder bereichsbezogen (auf einen bestimmten Knotenbereich beschränkt).
- **Rollen entziehen**: Bestehende Rollenzuweisungen entfernen.
- **Rollenmatrix**: Übersicht aller 7 Rollen mit ihren Berechtigungen in einer Matrix-Ansicht, unterteilt nach Berechtigungsgruppen (Ansichten, Inhalte, Workflow, Administration).

### Tab: Verbindungen

Übersicht und Verwaltung externer Verbindungen und Integrationen.

### Tab: FlowCore-Assistent (KI)

Konfiguration des KI-Assistenten. Berechtigung: `manage_settings`.

**Allgemein:**
- **KI ein-/ausschalten**: Aktiviert oder deaktiviert den gesamten KI-Assistenten.
- **Modellwahl**: Auswahl des KI-Modells:
  - **GPT-5.2** (Standard, Empfohlen) — Beste Qualität
  - **GPT-5 Mini** — Schneller, gutes Gleichgewicht
  - **GPT-5 Nano** — Schnellster, für einfache Anfragen
- **Max. Antwort-Tokens**: Maximale Länge der KI-Antworten (Standard: 8192).

**Quellenkonfiguration:**
- **Quellenmodus**: Bestimmt, welche Inhalte die KI als Kontext verwendet:
  - **Nur Wiki**: Nur Inhalte aus dem Wiki.
  - **Wiki + Konnektoren**: Zusätzlich Inhalte aus angebundenen Quellsystemen (z. B. SharePoint).
  - **Wiki + Konnektoren + Web**: Zusätzlich Websuche für Echtzeitinformationen.
- **Websuche aktivieren**: Erlaubt der KI, für Antworten auch im Web zu suchen.
- **Quellenpriorität**: Wiki bevorzugt / Ausgewogen / Konnektor bevorzugt.

**Antwortrichtlinien:**
- **Antwortsprache**: Auto (automatische Erkennung), Deutsch oder Englisch.
- **Zitierstil**: Inline [1], Fußnoten oder Keine Zitation.
- **Max. Quellen pro Antwort**: Wie viele Quellenreferenzen maximal angezeigt werden (Standard: 12).
- **Benutzerdefinierter System-Prompt**: Möglichkeit, den KI-Basis-Prompt anzupassen.

**Nutzungsstatistiken:**
- Gesamtanzahl der KI-Anfragen, Fehlerrate, Null-Ergebnis-Rate, durchschnittliche Latenz und Token-Verbrauch.

### Tab: Seitentemplates

Übersicht aller verfügbaren Seitenvorlagen mit ihren Sektionen, Metadatenfeldern und Varianten. Dieser Tab zeigt die Registry-Details jedes Seitentyps, inklusive Ausfüllhilfen, Leitfragen und Anforderungsstufen.

Berechtigung: `manage_templates` (Admin, Prozessmanager, Compliance-Manager).

### Tab: Konnektoren

Verwaltung von Quellsystemen und Speicheranbietern. Berechtigung: `manage_settings`.

**Quellsysteme:**
- **Erstellen**: Neues Quellsystem anlegen (z. B. SharePoint-Site/Bibliothek).
- **SharePoint-Picker**: Dreistufige Auswahl — Site → Bibliothek → Ordner/Datei.
- **Sync-Konfiguration**: Automatische Synchronisation aktivieren, Intervall festlegen (Standard: 60 Minuten).
- **Manueller Sync**: Synchronisation manuell auslösen.
- **Aktivieren/Deaktivieren**: Quellsysteme vorübergehend deaktivieren.

**Speicheranbieter:**
- **Erstellen**: Neuen Speicheranbieter anlegen (Lokal oder SharePoint).
- **Standard-Anbieter**: Festlegen, welcher Anbieter für neue Uploads verwendet wird.
- **SharePoint-Ordner**: Bei SharePoint-Anbietern wird nur die Ordnerauswahl angeboten (kein Dateibrowser).

### Tab: Backup

Konfiguration und Verwaltung der automatischen Datensicherung. Berechtigung: `manage_backup`.

- **Backup-Konfiguration**: Automatische Sicherung aktivieren/deaktivieren, Sicherungsziel festlegen (z. B. SharePoint-Ordner).
- **Aufbewahrungsregeln**: Festlegen, wie viele Backups aufbewahrt werden und wie lange.
- **Manuelles Backup**: Sofortige Sicherung starten.
- **Backup-Verlauf**: Liste aller durchgeführten Sicherungen mit Status (Erfolg, Fehlgeschlagen), Dateigröße, Dauer und Zeitstempel.
- **Wiederherstellung**: Aus einem früheren Backup wiederherstellen. Vor der Wiederherstellung kann ein Trockenlauf (Dry Run) durchgeführt werden, um die Auswirkungen vorab zu prüfen.
- **Zielvalidierung**: Das Backup-Ziel (z. B. SharePoint-Ordner) kann auf Erreichbarkeit geprüft werden.

Berechtigung zum Einsehen: `view_backups` (Admin, Compliance-Manager).

### Tab: Audit-Trail

Vollständiges Ereignisprotokoll aller systemrelevanten Aktionen. Berechtigung: `view_audit_log`.

- **Ereignisliste**: Chronologische Liste aller protokollierten Aktionen mit Akteur, Zeitstempel, Ressourcentyp und Details.
- **Filter**: Filtern nach Aktionstyp (z. B. „Arbeitskopie erstellt", „Rolle zugewiesen", „Vier-Augen-Verletzung blockiert"), Ressourcentyp und Ereignistyp (Content, RBAC, Auth, System).
- **Seitenweise Navigation**: Blättern durch große Mengen von Audit-Ereignissen (50 Einträge pro Seite).
- **Export**: Audit-Daten exportieren für externe Dokumentation oder Compliance-Nachweise.

Protokollierte Ereignisse umfassen unter anderem:
- Arbeitskopie-Aktionen (erstellt, bearbeitet, eingereicht, zurückgegeben, freigegeben, veröffentlicht, abgebrochen, entsperrt)
- Rollenzuweisungen und -entzug
- Vier-Augen-Prinzip-Verletzungen (blockiert)
- Konfigurationsänderungen
- An-/Abmeldungen

### Tab: Konsistenzprüfung

Prüft die Übereinstimmung zwischen Code-Schema, Datenbank, Konfiguration, Dokumentation und Release-Stand. Berechtigung: `manage_settings`.

- **Prüfung starten**: Analysiert verschiedene Kategorien auf Konsistenz.
- **Ergebnis-Übersicht**: Zusammenfassung mit Anzahl der Prüfungen, Warnungen und Fehler.
- **Detailergebnisse**: Jede Prüfung zeigt Status (OK, Warnung, Fehler), Kategorie, betroffenes Element und eine Beschreibung.

### Tab: Releases

Verwaltung von Release-Zyklen für koordinierte Veröffentlichungen. Berechtigung: `manage_settings`.

- **Release erstellen**: Neuen Release mit Titel, Beschreibung und Version anlegen.
- **Release-Workflow**: Ein Release durchläuft folgende Status:
  - **In Arbeit** → **Audit ausstehend** → **Audit bestanden** → **Sync ausstehend** → **Veröffentlicht** (oder **Zurückgezogen**)
- **Statusübergänge**: Je nach aktuellem Status stehen verschiedene Aktionen zur Verfügung (Einreichen, Audit bestehen, GitHub-Sync starten, Freigeben, Zurückziehen).

---

## e) Technische Infos

### Architektur

FlowCore ist als **Monorepo** aufgebaut und wird mit **pnpm** (Workspace-Monorepo) verwaltet. Die Anwendung besteht aus zwei Hauptkomponenten:

| Komponente | Technologie | Beschreibung |
|:-----------|:------------|:-------------|
| **Frontend** | React 19 + Vite | Single-Page-Application mit modernem UI (Radix UI / Shadcn UI, Tailwind CSS, Framer Motion) |
| **Backend** | Express 5 + Node.js | REST-API mit OpenAPI-Spezifikation, Authentifizierung, RBAC und KI-Integration |
| **Datenbank** | PostgreSQL 16+ | Relationale Datenbank mit Drizzle ORM als Schema-Manager |

### Monorepo-Struktur

```
workspace/
├── artifacts/
│   ├── api-server/          Express 5 Backend (Auth, RBAC, Content, KI, Konnektoren)
│   ├── wiki-frontend/       React 19 Frontend (Editor, Navigation, Dashboards)
│   └── mockup-sandbox/      UI-Prototyping (nur Entwicklung)
│
├── lib/
│   ├── api-spec/            OpenAPI 3.1 Spezifikation — "Source of Truth"
│   ├── api-client-react/    Generierte TanStack Query Hooks für API-Zugriff
│   ├── api-zod/             Generierte Zod-Validierungsschemas
│   ├── db/                  Drizzle ORM Schema und DB-Verbindung
│   └── shared/              Seitentyp-Registry, gemeinsame Typen und Konstanten
│
├── docs/                    Architekturentscheidungen (ADRs)
├── e2e/                     Playwright End-to-End Tests
└── audit-docs/              Technische Dokumentation für Audits
```

### OpenAPI-first-Ansatz

Die API-Spezifikation (`openapi.yaml`) ist die zentrale Wahrheit des Systems. Daraus werden automatisch generiert:

- **Client-Hooks**: TanStack Query Hooks (React) für typsicheren API-Zugriff im Frontend.
- **Validierungsschemas**: Zod-Schemas für die Backend-Validierung eingehender Requests.
- **Typen**: TypeScript-Typen für Request- und Response-Objekte.

Die Code-Generierung erfolgt über **Orval** und stellt sicher, dass Frontend und Backend immer zur selben API-Spezifikation kompatibel sind.

### Authentifizierung über Microsoft Entra ID

FlowCore verwendet **Microsoft Entra ID** (ehemals Azure AD) für die Authentifizierung:

- **Standalone Web-Flow**: OAuth 2.0 Authorization Code Flow — Benutzer werden zur Microsoft-Anmeldeseite weitergeleitet und nach erfolgreicher Anmeldung zurück zur Anwendung.
- **Teams-SSO**: On-Behalf-Of Flow — Innerhalb von Microsoft Teams erfolgt die Anmeldung automatisch über das Teams SDK, ohne separate Login-Seite.
- **Session-Verwaltung**: Server-seitige Sessions mit sicheren Cookies (httpOnly, secure, sameSite). Keine Tokens im Frontend gespeichert. Session-Lebensdauer: 8 Stunden.

### Immutable-Revision-Modell

Jede Speicherung eines Inhalts erzeugt eine neue, unveränderliche Revision in der Datenbank. Bestehende Revisionen werden nie überschrieben. Dies gewährleistet:

- **Lückenlose Historie**: Jede Änderung ist nachvollziehbar mit Autor, Zeitpunkt und Änderungsart.
- **Revisionsstatus**: `draft` → `in_review` → `approved` → `published` → `archived`.
- **Versionslabels**: Veröffentlichte Revisionen erhalten formale Labels (z. B. „1.0", „2.1").
- **Diff-Vergleich**: Beliebige Revisionen können verglichen werden.
- **Nicht-destruktive Wiederherstellung**: Eine frühere Revision wird als Kopie in einem neuen Entwurf wiederhergestellt — die bestehende Historie bleibt intakt.

### KI-Integration über OpenAI API

Die KI-Integration basiert auf einer **RAG-Architektur** (Retrieval-Augmented Generation):

1. **Frage empfangen**: Der Benutzer stellt eine Frage.
2. **Quellensuche**: Relevante Wiki-Inhalte werden via PostgreSQL-Volltextsuche gefunden; optional auch Konnektoren und Websuche.
3. **Kontextanreicherung**: Gefundene Snippets werden als strukturierter Kontext aufbereitet.
4. **LLM-Aufruf**: Das KI-Modell (GPT-5.2, GPT-5 Mini oder GPT-5 Nano) generiert eine Antwort.
5. **Streaming**: Die Antwort wird in Echtzeit per Server-Sent Events (SSE) an das Frontend gestreamt.

Die KI ist rollenbasiert — Betrachter sehen nur veröffentlichte Quellen, Editoren können optional Entwürfe einbeziehen.

### Microsoft Teams Integration

FlowCore kann als **Tab-App in Microsoft Teams** eingebettet werden:

- **SSO**: Nahtlose Anmeldung über den On-Behalf-Of Flow — kein separater Login nötig.
- **Kontextweitergabe**: Team, Kanal und Benutzersprache werden automatisch übergeben.
- **Vollständige Funktionalität**: Alle Wiki-Funktionen stehen innerhalb von Teams zur Verfügung.
- **Responsives Layout**: Die Oberfläche passt sich an die Tab-Größe in Teams an.

### SharePoint-Anbindung

FlowCore integriert sich mit **Microsoft SharePoint** über die Microsoft Graph API:

- **Quellsysteme**: SharePoint-Sites, Bibliotheken und Ordner als Referenzquellen anbinden. Inhalte können synchronisiert und als Kontext für die KI verwendet werden.
- **Medienspeicher**: Hochgeladene Dateien (Bilder, Dokumente, Videos) können direkt in SharePoint-Bibliotheken gespeichert werden.
- **SharePoint-Picker**: Dreistufiger Browser (Site → Bibliothek → Ordner/Datei) für die komfortable Auswahl von SharePoint-Inhalten.

### Sicherheitsmaßnahmen

| Maßnahme | Umsetzung |
|:---------|:----------|
| **Helmet** | HTTP-Security-Header (Content-Security-Policy, X-Frame-Options etc.) |
| **Rate-Limiting** | Schutz der Auth-Endpunkte vor Brute-Force-Angriffen |
| **RBAC** | Mehrstufige rollenbasierte Zugriffskontrolle mit Backend-Durchsetzung |
| **Vier-Augen-Prinzip** | Autor darf eigene Inhalte nicht prüfen/veröffentlichen |
| **Audit-Trail** | Lückenlose Protokollierung aller sicherheitsrelevanten Aktionen |
| **Eingabevalidierung** | Zod-Schema-Validierung aller eingehenden Requests |
| **SQL-Injection-Schutz** | Parametrisierte Queries über Drizzle ORM |
| **XSS-Schutz** | React-Escaping und Content-Security-Policy |
| **CSRF-Schutz** | OAuth state-Parameter und sameSite-Cookies |
| **Transportverschlüsselung** | HTTPS/TLS für alle Kommunikation |
| **Session-Sicherheit** | httpOnly- und secure-Cookies, 8-Stunden-Lebensdauer |
| **Secrets-Management** | Geheimnisse nur als Umgebungsvariablen, nie im Code |
| **Soft-Delete** | Gelöschte Daten bleiben physisch erhalten für Audit-Nachvollziehbarkeit |

---

*FlowCore — Prozess-Wiki des Bildungscampus Backnang*
