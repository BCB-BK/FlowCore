# FlowCore – Taskpaket für neues Freigabe-, Arbeitskopie- und Versionierungssystem

## Zielbild
In FlowCore darf **nie direkt auf der Live-Seite bearbeitet** werden. Jede inhaltliche Änderung läuft künftig über eine **Arbeitskopie** mit anschließendem **Review- und Freigabeprozess**. Erst nach Genehmigung wird die Arbeitskopie als neue offizielle Version veröffentlicht.

Das aktuelle Modell ist fachlich nah dran, aber an einem zentralen Punkt falsch: Die aktuelle Arbeitsrevision hängt heute bereits direkt am Node (`current_revision_id`) und der UI-Flow arbeitet mit einem normalen **Bearbeiten**-Modus. Das ist für ein professionelles Wissensmanagement zu offen und zu fehleranfällig.

---

## Harte Zielregeln

1. **Keine Direktbearbeitung der Live-Seite.**
2. **Der Button „Bearbeiten“ entfällt vollständig.**
3. Stattdessen gibt es: **„Arbeitskopie erstellen“** bzw. **„Änderung starten“**.
4. Pro Seite ist standardmäßig **genau eine aktive Arbeitskopie** gleichzeitig erlaubt.
5. Solange eine Arbeitskopie offen ist, ist die Seite sichtbar als **„In Bearbeitung“** markiert.
6. Für alle Betrachter sichtbar: **dass** eine Arbeitskopie existiert und **wer** sie geöffnet hat.
7. Die Live-Seite bleibt bis zur Freigabe **unverändert sichtbar**.
8. Editoren arbeiten ausschließlich auf der Arbeitskopie.
9. Nach Abschluss sendet der Editor die Arbeitskopie in den Review.
10. Prozessmanager/Genehmiger sehen einen **echten Änderungsvergleich alt vs. neu** – fokussiert auf die geänderten Felder/Blöcke.
11. Vor finaler Freigabe wird eine **automatische KI-Änderungszusammenfassung** erzeugt, editierbar angezeigt und dann mit der Version gespeichert.
12. Erst die Freigabe publiziert die Arbeitskopie als neue offizielle Version.
13. Jede veröffentlichte Version bleibt vollständig nachvollziehbar.

---

## Fachliches Sollmodell

### A. Live-Version
Die aktuell veröffentlichte, für Leser sichtbare Version.

### B. Arbeitskopie
Ein isolierter Bearbeitungsstand auf Basis der aktuellen Live-Version oder einer anderen zulässigen Basisrevision.

### C. Review-Paket
Das eingereichte Änderungspaket aus Arbeitskopie + Änderungsmetadaten + Diff + KI-Zusammenfassung.

### D. Veröffentlichte Version
Die genehmigte neue offizielle Version mit Versionsnummer, Freigabezeitpunkt, Genehmiger und Änderungszusammenfassung.

---

# Cluster A – Architekturwechsel vom Direktedit auf Arbeitskopien

## Task A1 – Zustandsmodell neu definieren

### Beschreibung
Replit soll das Revisionsmodell so umbauen, dass Live-Version und Arbeitskopie sauber getrennt sind.

### Technische Anweisung
- Das bisherige Verhalten, dass `createRevision()` sofort `content_nodes.current_revision_id` umhängt, ist zu entfernen.
- Der Node braucht künftig eine klare Trennung zwischen:
  - `published_revision_id` = einzige Live-Version
  - `active_working_copy_id` = aktuelle offene Arbeitskopie
- Optional zusätzlich:
  - `editing_state` = `idle | in_edit | in_review | blocked`
  - `working_copy_owner_id`
  - `working_copy_opened_at`
  - `working_copy_submitted_at`
- Alternative sauberer Ansatz: neue Tabelle `content_working_copies` statt Feldballung im Node.
- Bevorzugte Lösung: **eigene Tabelle `content_working_copies`**, damit Arbeitskopie fachlich nicht mit finaler Revision vermischt wird.

### Empfohlenes Datenmodell
Tabelle `content_working_copies`:
- `id`
- `node_id`
- `base_revision_id`
- `status` (`draft`, `submitted`, `in_review`, `changes_requested`, `approved_for_publish`, `cancelled`)
- `title`
- `content`
- `structured_fields`
- `editor_snapshot`
- `change_type`
- `author_id`
- `created_at`
- `updated_at`
- `submitted_at`
- `locked_by`
- `last_ai_summary`
- `last_manual_summary`
- `reviewer_id`
- `approver_id`
- `diff_cache`

### Definition of Done
- Live-Version und Arbeitskopie sind technisch sauber getrennt.
- Eine neue Bearbeitung verändert **nicht** mehr die Live-Anzeige.
- Die DB-Struktur ist migriert.
- Bestehende Daten werden sauber migriert.
- Architekturentscheidung in Doku/ADR dokumentiert.

---

## Task A2 – Revisionsbegriff fachlich bereinigen

### Beschreibung
Der Begriff „Revision“ ist aktuell überladen. Künftig muss fachlich sauber getrennt werden zwischen:
- Arbeitskopie
- Review-Fassung
- veröffentlichter Version

### Technische Anweisung
- `content_revisions` wird nur noch für **historische veröffentlichte oder historisierte Review-Stände** genutzt.
- Offene Bearbeitungen laufen primär über `content_working_copies`.
- Beim Freigeben wird aus der Arbeitskopie eine neue Revision/Version erzeugt.
- Eventuell können Review-Snapshots ebenfalls in `content_revisions` persistiert werden, aber **nicht** als aktive Live-Inhalte.

### Definition of Done
- Begrifflichkeiten in Backend, API, UI und Doku konsistent.
- Kein API-Endpunkt verwendet „Revision“, wenn eigentlich „Arbeitskopie“ gemeint ist.
- UI spricht für offene Änderungen nur noch von Arbeitskopie / Änderung / Review.

---

# Cluster B – Neuer UX-Flow für Seitenbearbeitung

## Task B1 – „Bearbeiten“-Button vollständig ersetzen

### Beschreibung
Der Button „Bearbeiten“ auf der Node-Detail-Seite ist fachlich falsch und muss ersetzt werden.

### Neue Buttons
Abhängig vom Zustand:
- **Arbeitskopie erstellen**
- **Arbeitskopie fortsetzen**
- **In Review**
- **Änderung zurückgezogen**
- **Änderung übernehmen** (nur Genehmiger/Prozessmanager im Review-Kontext)

### Technische Anweisung
- Entferne den generischen Button „Bearbeiten“ aus `NodeDetail.tsx`.
- Ersetze den Toggle `Bearbeiten/Vorschau` im Live-Kontext.
- Editing ist nur erlaubt, wenn eine Arbeitskopie aktiv geladen wurde.
- Die Live-Seite bleibt grundsätzlich im Anzeigemodus.

### Definition of Done
- Auf der Live-Seite gibt es keinen Direktedit mehr.
- Bearbeitung startet ausschließlich über Arbeitskopie-Flow.
- Rollenabhängige Buttons sind sauber umgesetzt.

---

## Task B2 – Sichtbarer Status „In Bearbeitung“ auf Seitenebene

### Beschreibung
Wenn eine Arbeitskopie existiert, muss das für alle Betrachter sichtbar sein.

### UI-Anforderungen
Sichtbar im Header:
- Badge: `In Bearbeitung`
- Text: `Arbeitskopie geöffnet von Tobias Wenninger am 26.03.2026, 14:35`
- optional Tooltip mit Status:
  - Entwurf
  - Eingereicht
  - In Prüfung
  - Änderungswunsch

### Technische Anweisung
- Ergänze Page Header um `WorkingCopyStatusBanner`.
- Banner muss für Viewer sichtbar sein.
- Rollen mit Editierrecht sehen zusätzlich Aktionsbuttons.
- Die Live-Seite bleibt trotzdem lesbar.

### Definition of Done
- Offene Arbeitskopie ist systemweit sichtbar.
- Benutzer sehen klar, wer aktuell daran arbeitet.
- Statuswechsel werden ohne Reload sauber aktualisiert.

---

## Task B3 – Konfliktregel: nur eine offene Arbeitskopie pro Seite

### Beschreibung
Für den Standardbetrieb darf pro Seite nur eine offene Arbeitskopie gleichzeitig existieren.

### Technische Anweisung
- Beim Start einer Bearbeitung prüfen:
  - existiert offene Arbeitskopie?
- Falls ja:
  - Autor selbst → „Arbeitskopie fortsetzen“
  - anderer Nutzer → keine neue Arbeitskopie, nur Hinweis anzeigen
- Optional Admin-Ausnahme später per Feature Flag.

### Definition of Done
- Keine parallelen konkurrierenden offenen Arbeitskopien.
- Server-seitige Sperrlogik vorhanden.
- UI kommuniziert den Zustand verständlich.

---

# Cluster C – Arbeitskopie-Editor professionell aufsetzen

## Task C1 – Arbeitskopie als eigener Bearbeitungsraum

### Beschreibung
Der Editor soll nicht auf der Live-Seite „umgeschaltet“ werden, sondern in einem klaren Bearbeitungskontext arbeiten.

### Technische Anweisung
- Öffne Arbeitskopie in separatem Bearbeitungsmodus oder eigener Route, z. B.:
  - `/nodes/:id/edit-working-copy/:workingCopyId`
- Zeige deutlich an:
  - Basierend auf Version X.Y
  - Arbeitskopie von Benutzer Z
  - autosaved / nicht eingereicht / Entwurf
- Editor, Metadaten und strukturierte Felder arbeiten ausschließlich auf der Arbeitskopie.
- Block-Editor, Bilder, Videos, Embeds, Anhänge etc. bleiben vollständig nutzbar.

### Definition of Done
- Kein Mischzustand zwischen Live-Ansicht und Bearbeitung.
- Der Bearbeitungsraum ist klar als Arbeitskopie erkennbar.
- Autosave speichert in Arbeitskopie, nicht in Live-Revisionshistorie.

---

## Task C2 – Abschlussdialog „Änderung einreichen“

### Beschreibung
Wenn der Editor fertig ist, schließt er die Bearbeitung nicht durch direktes Speichern ab, sondern durch Einreichung.

### Inhalt des Abschlussdialogs
- Änderungstyp: redaktionell / minor / major / regulatorisch / strukturell
- KI-generierte Kurzbeschreibung der Änderung
- editierbares Feld für manuelle Ergänzung
- optional Kommentar an Prozessmanager
- optional Auswahl Review-Zuständiger (wenn nicht automatisch)

### Technische Anweisung
- Neuer Dialog statt bisherigem simplen Review-Submit.
- Vor dem Submit automatisch Diff berechnen.
- Auf Basis des Diffs KI-Zusammenfassung anfordern.
- KI-Text muss editierbar sein.
- Danach Submit der Arbeitskopie in Review-Queue.

### Definition of Done
- Arbeitskopie kann professionell eingereicht werden.
- KI-Zusammenfassung wird erzeugt und editierbar angezeigt.
- Kein Submit ohne valide Arbeitskopie.

---

# Cluster D – Review- und Freigabeprozess neu bauen

## Task D1 – Review-Queue auf Arbeitskopien umstellen

### Beschreibung
Der Review-Prozess darf nicht mehr auf beliebigen Revisionen operieren, sondern auf Arbeitskopien.

### Technische Anweisung
- Neue Endpunkte, z. B.:
  - `POST /working-copies/:id/submit`
  - `POST /working-copies/:id/return-for-changes`
  - `POST /working-copies/:id/approve`
  - `POST /working-copies/:id/publish`
  - `POST /working-copies/:id/cancel`
- Bisherige `review.ts` Logik refactoren, nicht nur patchen.
- `my-work` und Prozessmanager-Dashboard auf Working-Copy-Tasks umbauen.

### Definition of Done
- Review-Workflow basiert vollständig auf Arbeitskopien.
- Aufgabenlisten zeigen die richtigen Objekte.
- Keine Freigabeaktion arbeitet direkt auf Live-Revisionen.

---

## Task D2 – Prozessmanager-Ansicht „Änderungen prüfen“

### Beschreibung
Der Prozessmanager braucht eine fokussierte Prüfoberfläche.

### Muss anzeigen
- Live-Version links / Arbeitskopie rechts oder Diff-only-Modus
- Nur geänderte Felder und Blöcke prominent
- Metadatenänderungen separat
- Strukturänderungen separat
- Medienänderungen separat
- KI-Änderungszusammenfassung
- Kommentar des Editors
- Freigabeentscheidungen

### Technische Anweisung
- Neue Komponente `WorkingCopyReviewScreen`.
- Drei Ansichten:
  - `Nur Änderungen`
  - `Vorher/Nachher`
  - `Komplette Arbeitskopie`
- Field-level Diff und Block-level Diff einbauen.
- Unveränderte Abschnitte standardmäßig einklappen.

### Definition of Done
- Prozessmanager erkennt Änderungen sofort.
- Vergleich ist nicht nur technisch, sondern fachlich lesbar.
- Nur geänderte Felder stehen im Fokus.

---

## Task D3 – Prozessmanager darf vor Freigabe selbst nachbearbeiten

### Beschreibung
Der Prozessmanager soll Änderungen direkt in der Arbeitskopie nachziehen können, ohne den Flow zu verlassen.

### Technische Anweisung
- Im Review-Screen Button `Arbeitskopie bearbeiten` für berechtigte Rollen.
- Änderungen des Prozessmanagers werden protokolliert.
- Audit-Trail muss unterscheiden:
  - ursprünglicher Editor
  - Review-Anpassung durch Prozessmanager
- Optional Inline-Kommentar „Anpassung im Review vorgenommen“.

### Definition of Done
- Prozessmanager kann finalisieren, ohne Medienbruch.
- Alle Anpassungen sind auditierbar.
- Ownership bleibt nachvollziehbar.

---

## Task D4 – Veröffentlichungslogik korrekt abschließen

### Beschreibung
Erst die Freigabe/Veröffentlichung erzeugt die neue offizielle Version.

### Technische Anweisung
- Bei Publish:
  1. Arbeitskopie final einfrieren
  2. neue `content_revision` erzeugen
  3. Versionnummer vergeben
  4. `published_revision_id` am Node umhängen
  5. vorherige Live-Version auf `archived`
  6. Arbeitskopie auf `published_from_working_copy` oder `closed`
  7. Audit-Events schreiben
- Versionsnummernschema definieren:
  - automatisch Vorschlag
  - final editierbar für Genehmiger
- Keine Veröffentlichung ohne gespeicherte Summary.

### Definition of Done
- Live-System aktualisiert sich erst bei Publish.
- Historie bleibt sauber linear nachvollziehbar.
- Arbeitskopie ist nach Publish abgeschlossen.

---

# Cluster E – Diff, Änderungsanzeige und KI-Zusammenfassung

## Task E1 – Änderungsanzeige professionell machen

### Beschreibung
Die bisherige Diff-Funktion muss fachlich viel stärker werden.

### Erwartete Darstellung
- Gelöschte Inhalte rot / durchgestrichen
- Neue Inhalte grün oder hervorgehoben
- Geänderte Felder gruppiert nach:
  - Metadaten
  - Seiteneigenschaften
  - strukturierte Felder
  - Block-Inhalte
  - Medien
  - Relationen/Tags
- Nur geänderte Felder standardmäßig sichtbar

### Technische Anweisung
- Bestehende `RevisionDiffView` nicht nur weiterverwenden, sondern auf Working-Copy-Diff umbauen.
- Für strukturierte Felder key-based Diff.
- Für Editor-Inhalte blockbasierter Diff statt nur JSON-Rohvergleich.
- Medien-Diff: hinzugefügt / entfernt / ersetzt.

### Definition of Done
- Änderungsansicht ist für Fachanwender verständlich.
- Nur relevante Änderungen dominieren die Ansicht.
- Der Prozessmanager braucht keine manuelle Textbeschreibung mehr, um Änderungen zu verstehen.

---

## Task E2 – KI-Zusammenfassung der Änderungen automatisieren

### Beschreibung
Vor Freigabe soll die KI aus dem Diff eine professionelle Kurzbeschreibung generieren.

### Sollausgabe
- 2–3 Sätze
- sachlich, präzise
- keine Halluzinationen
- nur tatsächlich geänderte Inhalte
- optional zusätzlich Stichpunktliste

### Technische Anweisung
- Neuer Server-Service `generateChangeSummaryFromDiff()`.
- Input:
  - alter Stand
  - neuer Stand
  - changed fields
  - change type
- Output speichern in Arbeitskopie.
- Prozessmanager sieht den Text vor Freigabe und kann ihn editieren.
- Finaler Text wird mit der veröffentlichten Version gespeichert.

### Definition of Done
- Änderungszusammenfassung wird automatisch erzeugt.
- Text ist vor Publish editierbar.
- Finaler Text erscheint in Versionshistorie.

---

# Cluster F – Neue Rollenlogik und Aufgabensteuerung

## Task F1 – Workflow-Rollen präzisieren

### Beschreibung
Die bisherige Rollenlogik muss auf den neuen Arbeitskopienfluss abgestimmt werden.

### Fachliche Rollenlogik
- **Viewer**: Live-Seite sehen, Bearbeitungsstatus sehen
- **Editor**: Arbeitskopie anlegen, bearbeiten, einreichen
- **Process Manager / Reviewer**: prüfen, kommentieren, zurückgeben, ggf. selbst editieren
- **Approver**: final freigeben/publizieren
- **Admin**: eingreifen, entsperren, umhängen, wiederherstellen

### Technische Anweisung
- Neue Permissions prüfen/ergänzen:
  - `create_working_copy`
  - `edit_working_copy`
  - `submit_working_copy`
  - `review_working_copy`
  - `amend_working_copy_in_review`
  - `publish_working_copy`
  - `cancel_working_copy`
  - `force_unlock_working_copy`
- Bestehende Permissions nicht stillschweigend überladen.

### Definition of Done
- Rollen und Rechte sind mit dem neuen Workflow konsistent.
- UI-Aktionen richten sich exakt nach Permissions.

---

## Task F2 – Meine Aufgaben / Prozessmanager-Dashboard umbauen

### Beschreibung
Die Aufgabenansicht muss die neue Logik sauber widerspiegeln.

### Benötigte Listen
**Für Editor:**
- Meine offenen Arbeitskopien
- Von mir eingereichte Änderungen
- Zurückgegebene Änderungen

**Für Prozessmanager/Genehmiger:**
- Eingereichte Arbeitskopien
- Überfällige Prüfungen
- Freizugebende Änderungen
- Änderungen mit Konflikten/Entsperrbedarf

### Definition of Done
- Alle Aufgabenlisten basieren auf Arbeitskopien.
- Status und Priorität sind klar.
- Deep-Link direkt in Review-Screen vorhanden.

---

# Cluster G – Versionshistorie und Darstellungslogik überarbeiten

## Task G1 – Versionshistorie fachlich sauber strukturieren

### Beschreibung
Die Versionshistorie darf nicht mehr offene Arbeitsstände und veröffentlichte Versionen visuell vermischen.

### Neue Gliederung
1. **Live-Versionen**
2. **Offene Änderung / Arbeitskopie**
3. **Historie der Review-Entscheidungen**

### Technische Anweisung
- `VersionHistoryPanel` überarbeiten.
- „Aktuell“ darf nur die veröffentlichte Live-Version kennzeichnen.
- Eine offene Arbeitskopie wird separat mit Badge gezeigt, aber nicht als normale Live-Version dargestellt.
- Im Header anzeigen:
  - Aktuelle veröffentlichte Version X.Y
  - Offene Arbeitskopie vorhanden / keine offene Arbeitskopie

### Definition of Done
- Keine Missverständnisse mehr zwischen live, draft und review.
- Historie ist für Fachanwender sofort verständlich.

---

## Task G2 – Versionseintrag professionalisieren

### Beschreibung
Jeder veröffentlichte Versionseintrag soll professionell nachvollziehbar sein.

### Muss enthalten
- Versionsnummer
- Veröffentlichungsdatum
- Autor
- Prozessmanager/Genehmiger
- Änderungstyp
- finale Änderungszusammenfassung
- Link zum Vergleich mit Vorversion
- optional Freigabekommentar

### Definition of Done
- Jede Version ist fachlich dokumentiert.
- Historie ist revisionssicher und verständlich.

---

# Cluster H – API, Events, Audit und Sperrlogik

## Task H1 – API-Endpunkte neu schneiden

### Beschreibung
Die API muss die neue Prozesslogik explizit abbilden.

### Benötigte Endpunkte
- `POST /nodes/:id/working-copies`
- `GET /nodes/:id/working-copy`
- `PATCH /working-copies/:id`
- `POST /working-copies/:id/submit`
- `POST /working-copies/:id/return-for-changes`
- `POST /working-copies/:id/approve`
- `POST /working-copies/:id/publish`
- `POST /working-copies/:id/cancel`
- `POST /working-copies/:id/unlock`
- `GET /working-copies/:id/diff`
- `POST /working-copies/:id/generate-summary`

### Definition of Done
- API entspricht dem Fachprozess.
- Keine versteckte Direktlogik mehr über alte Revision-Endpunkte.

---

## Task H2 – Audit-Log und Event-Timeline erweitern

### Beschreibung
Alle Arbeitsschritte der Arbeitskopie müssen auditierbar sein.

### Zu protokollierende Events
- Arbeitskopie erstellt
- Arbeitskopie fortgesetzt
- Arbeitskopie aktualisiert
- Arbeitskopie eingereicht
- Review geöffnet
- Review zurückgegeben
- Review geändert durch Prozessmanager
- Freigegeben
- Veröffentlicht
- Abgebrochen
- Entsperrt

### Definition of Done
- Vollständige Timeline vorhanden.
- Technische und fachliche Ereignisse sind unterscheidbar.

---

# Cluster I – UI-Feinschliff und Anwenderfreundlichkeit

## Task I1 – Seite trotz Bearbeitungsstatus lesbar halten

### Beschreibung
Die Seite darf bei offener Arbeitskopie nicht „verschwinden“ oder unklar wirken.

### UX-Regeln
- Viewer sehen immer die veröffentlichte Version.
- Zusätzlich klarer Hinweis auf offene Bearbeitung.
- Editor sieht Einstieg in seine Arbeitskopie.
- Andere Editoren sehen Sperrhinweis statt Editiermöglichkeit.

### Definition of Done
- Nutzer verstehen jederzeit, was live ist und was in Arbeit ist.

---

## Task I2 – Saubere Wortwahl im gesamten System

### Beschreibung
Die Sprache im System ist aktuell noch zu technisch gemischt.

### Verbindliche Begriffe
- **Live-Version**
- **Arbeitskopie**
- **Zur Prüfung eingereicht**
- **In Prüfung**
- **Änderung zurückgegeben**
- **Freigegeben**
- **Veröffentlicht**
- **Archiviert**

Nicht mehr prominent verwenden im UI:
- `Draft` als Primärbegriff
- `Revision` für offene Änderungen
- generisches `Bearbeiten`

### Definition of Done
- Wording ist konsistent und fachlich verständlich.

---

# Cluster J – Migration und Tests

## Task J1 – Datenmigration sauber planen

### Beschreibung
Bestehende Seiten und Revisionen müssen in das neue Modell migriert werden.

### Technische Anweisung
- Migrationsstrategie für bestehende `current_revision_id` entwickeln.
- Wenn offene Drafts existieren:
  - in Arbeitskopien migrieren
- Wenn keine offenen Drafts existieren:
  - `published_revision_id` bleibt maßgeblich
- Migrationsskript und Validierungsreport bauen.

### Definition of Done
- Altbestand ist konsistent migriert.
- Keine Live-Seite zeigt versehentlich Draft-Inhalte.

---

## Task J2 – E2E- und Rollentests erweitern

### Pflichttests
1. Viewer sieht nur Live-Version
2. Editor erstellt Arbeitskopie
3. Offene Arbeitskopie setzt Statusbanner
4. Zweiter Editor kann keine zweite Arbeitskopie öffnen
5. Editor reicht Änderung ein
6. Prozessmanager sieht Diff-only-Ansicht
7. Prozessmanager editiert im Review
8. Genehmiger veröffentlicht neue Version
9. Versionshistorie zeigt neue Live-Version korrekt
10. KI-Zusammenfassung wird erzeugt und gespeichert
11. Rückgabe zur Überarbeitung funktioniert sauber
12. Abbruch/Entsperren funktioniert

### Definition of Done
- Playwright-/API-Tests decken den gesamten Workflow ab.
- Keine Freigabe ohne grüne Tests.

---

# Harte Architekturentscheidung

## Empfehlung
Replit soll **nicht** versuchen, das alte Revisionsmodell nur punktuell zu patchen.

Das wäre der typische Fehler.

Der richtige Weg ist:
- **Arbeitskopie als eigenständige Fachentität** einführen
- Review und Veröffentlichung darauf aufbauen
- Live-Version strikt von Bearbeitung trennen

Alles andere führt mittelfristig zu UX-Verwirrung, Statusfehlern und inkonsistenter Historie.

---

# Priorisierte Umsetzungsreihenfolge

## Phase 1 – Fundament
1. Task A1
2. Task A2
3. Task H1
4. Task J1

## Phase 2 – UX und Workflow
5. Task B1
6. Task B2
7. Task B3
8. Task C1
9. Task C2
10. Task D1
11. Task D2
12. Task D3
13. Task D4

## Phase 3 – Transparenz und Qualität
14. Task E1
15. Task E2
16. Task F1
17. Task F2
18. Task G1
19. Task G2
20. Task H2
21. Task I1
22. Task I2
23. Task J2

---

# Zusätzliche Leitplanken für Replit

- Keine stillen Datenmodell-Hacks.
- Keine UI, die Live- und Arbeitskopie vermischt.
- Keine Veröffentlichung aus einem offenen Draft ohne expliziten Publish-Schritt.
- Keine zweite offene Arbeitskopie pro Seite ohne explizite Admin-Ausnahme.
- Keine technische Diff-Ansicht als finale UX – fachlich lesbarer Diff ist Pflicht.
- Keine KI-Zusammenfassung ohne editierbare menschliche Kontrolle.
- Jede Aktion muss auditierbar sein.
- Doku, API-Referenz, TECH-LOG, UAT-Protokoll und Admin-Handbuch mitziehen.

---

# Klare Gesamtbewertung

Deine gewünschte Logik ist richtig.

Sie ist professioneller als das aktuelle Modell, weil sie:
- Livebetrieb und Bearbeitung sauber trennt
- Governance erzwingt statt nur zu erlauben
- Review für Prozessmanager deutlich verständlicher macht
- Versionshistorie fachlich sauberer strukturiert
- Transparenz für alle Nutzer erhöht

Der entscheidende Punkt ist: **nicht „Bearbeiten“ verbessern, sondern das Bearbeitungsparadigma wechseln.**
