# Blueprint V5: Aufgaben an KI-Programmieragenten wirksam beauftragen

Version: 5.0  
Zweck: Übertragbarer Aufgaben-Blueprint für Replit, Cursor, Devin, Copilot Workspace oder vergleichbare KI-Programmieragenten.

V5 erweitert V4 um eine zentrale Erkenntnis:

```text
Bei Bugfixing und Produktionsreife soll der Code-Agent technische Folgetasks aus eigenen Root-Cause-Befunden formulieren.
ChatGPT plant Zielsystem und Qualitätsmaßstab, aber der Code-Agent kennt den realen Codepfad besser.
```

---

## 1. Rollenmodell

```text
Mensch      = fachlicher Entscheider / Product Owner
ChatGPT     = konzeptioneller Planer / Koordinator / Audit-Bewerter
Code-Agent  = Codekenner / Root-Cause-Analyst / Implementierer
```

## 1.1 Mensch

Verantwortet Ziel, Priorität, Freigaben, PM-Entscheidungen und Abnahme.

## 1.2 ChatGPT

Verantwortet Zielbild, Datenpipeline, Prozesslogik, initiale Taskgruppen, Qualitätsmaßstab und Auditbewertung.

## 1.3 Code-Agent

Verantwortet Codeanalyse, Implementierung, Tests, Laufzeitprüfung, technische Folgetasks und Evidenzpakete.

---

## 2. Betriebsmodi

## 2.1 Aufbau-Modus

Für neue Bereiche:

```text
Mensch beschreibt Ziel.
ChatGPT plant Architektur und Taskgruppe.
Code-Agent übersetzt in den Codebase-Kontext und implementiert.
```

## 2.2 Stabilisierung-Modus

Für Bugs, Blocker, Warns und Produktionsreife:

```text
Code-Agent führt realen Lauf/Audit/Test aus.
Code-Agent findet Befunde.
Code-Agent analysiert Root Cause.
Code-Agent formuliert Folgetasks nach diesem Blueprint.
Mensch beauftragt.
Code-Agent fixt.
ChatGPT bewertet Evidenz.
```

---

## 3. Standalone-Task-Pflicht

Jeder Task muss eigenständig sein und enthalten:

1. Ziel
2. Ausgangsbefund
3. Startbedingungen
4. Scope
5. Nicht-Scope
6. Datei-Impact-Liste
7. Root-Cause-first Analyse
8. Implementierungsanforderungen
9. Nicht erlaubte Lösungen
10. Tests
11. Live-Completion
12. Datenkettennachweis
13. Qualitätsprüfung
14. Abschlussbericht
15. Evidenzdateien
16. Abschlussstatus

Nicht zulässig:

- ausgelagerte Leitplanken,
- Task ohne Startbedingungen,
- Task ohne Verbote,
- Task ohne Live-Completion,
- Bugfix-Task ohne Root-Cause-Beleg,
- Abschluss über `MERGED`, `DONE`, `CI grün` oder `Bericht sagt BESTANDEN`.

---

## 4. Befundaufnahme durch den Code-Agenten

Wenn im Lauf, Audit oder Test Fehler auftreten, muss jeder Befund strukturiert erfasst werden:

```text
Befund-ID
Schweregrad
Symptom
erster kaputter Zustand
betroffener Codepfad
führende Datenquelle
Lesequelle
Schreibziel
Auswirkung
Root Cause
Fixklasse
Folgetask nötig ja/nein
```

Schweregrade:

```text
BLOCKER
WARN
INFO
TECH_DEBT
PM_DECISION
SCOPE_FOREIGN
```

Regeln:

- BLOCKER braucht technischen Folgetask oder harte Blockade.
- WARN braucht PM-Entscheidung oder dokumentierte Akzeptanz.
- PM_DECISION darf nicht technisch weggefixt werden.
- SCOPE_FOREIGN darf nicht opportunistisch mitgefixt werden.

---

## 5. Folgetask-Ableitung aus Befunden

Für jeden technischen BLOCKER und relevante TECH_DEBT formuliert der Code-Agent einen Folgetask.

Mindeststruktur:

```text
# TASK-ID-HARD: Konkreter Root-Cause-Fix

## Ziel
## Ausgangsbefund
## Reproduktions-/Nachweisdaten
## Root Cause
## Betroffene Datenkette
## Scope
## Nicht-Scope
## Datei-Impact-Liste
## Implementierungsanforderungen
## Nicht erlaubte Lösungen
## Tests
## Live-Completion
## Evidenzdateien
## Abschlussstatus
```

Der Task muss aus dem realen Codebefund abgeleitet sein.

Nicht zulässig:

- „Fix bugs“
- „Improve stability“
- „Make tests pass“
- „Check everything“
- „Implement according to report“
- „Manuell bereinigen“

---

## 6. Existing-Implementation-Verifikation

Wenn Code, Tests oder Auditberichte bereits existieren, darf der Task nicht als erledigt gelten.

Pflichtnachweis:

1. Welche Dateien belegen die Umsetzung?
2. Welche Funktionen / Codepfade sind produktiv aktiv?
3. Welche Tests belegen die Anforderung?
4. Welche realen Workflow-Nachweise liegen vor?
5. Ist der Nachweis aktuell oder stale?
6. Wird die Änderung erzeugt, gespeichert, neu geladen, weiterverarbeitet und validiert?
7. Stimmen DB/API/UI/Audit/Export überein?
8. Wurden keine Qualitätsregeln abgeschwächt?
9. Ist der ursprüngliche Fehler real nicht mehr vorhanden?
10. Sind Belegdateien im Evidenzpaket?

Nicht ausreichend:

```text
Datei existiert
Bericht sagt BESTANDEN
MERGED
Tests grün
typecheck OK
kann weitergehen
```

---

## 7. Zulässige Abschlussstatus

Nur diese Status sind zulässig:

```text
BESTANDEN
NICHT BESTANDEN
BLOCKIERT VOR START
BLOCKIERT DURCH SCOPE-FREMDEN FEHLER
```

Nicht zulässig:

```text
TEILWEISE BESTANDEN
ABGESCHLOSSEN
MERGED
DONE
COMPLETED
IMPLEMENTIERT
CI GRÜN
FERTIG
BEREIT
```

## 7.1 BESTANDEN

Nur wenn:

- Root Cause dokumentiert,
- Fix implementiert oder vorhandene Implementierung verifiziert,
- Tests bestanden,
- realer Workflow validiert,
- Datenkette vollständig,
- ursprünglicher Fehler real weg,
- DB/API/UI/Audit/Export konsistent,
- keine Qualitätsabsenkung,
- keine künstliche Erfolgsherstellung,
- Evidenzdateien vollständig.

## 7.2 NICHT BESTANDEN

Wenn:

- Live-Wirksamkeit fehlt,
- Fehler weiter besteht,
- Datenkette gebrochen ist,
- Scope verletzt wurde,
- Qualitätsmechanismen abgeschwächt wurden,
- Erfolg künstlich hergestellt wurde,
- Belegdateien fehlen.

## 7.3 BLOCKIERT VOR START

Wenn notwendige Voraussetzungen fehlen.

## 7.4 BLOCKIERT DURCH SCOPE-FREMDEN FEHLER

Wenn ein externer Fehler den Task verhindert und nicht im Scope gelöst werden darf.

---

## 8. Root-Cause-first

Vor jeder Codeänderung:

- Fehler belegen,
- ersten kaputten Zustand bestimmen,
- Codepfad bestimmen,
- Datenquelle bestimmen,
- Lesequelle bestimmen,
- Schreibziel bestimmen,
- richtigen Layer begründen,
- Symptom-Fix ausschließen.

Wenn die ursprüngliche Annahme falsch ist:

```text
Stoppen.
Root Cause korrigieren.
Task ggf. anpassen.
Keine Implementierung auf widerlegter Annahme.
```

---

## 9. Scope und Datei-Impact

Jeder Task braucht:

```text
MUST_TOUCH
MAY_TOUCH
MUST_NOT_TOUCH
```

Regeln:

- kein opportunistischer Nebenfix,
- keine fremden Module nebenbei umbauen,
- kein Fix in Tests statt Produktivpfad,
- keine Architekturänderung außerhalb Scope,
- kein späterer Audit als Ersatz für Fix.

Wenn notwendiger Fix außerhalb Scope liegt:

```text
stoppen
dokumentieren
Folgetask formulieren
nicht still mitfixen
```

---

## 10. Datenquellen- und Zielsystempflicht

Bei Validatoren, Gates, Repair, Sync, Enrichment, Export und Audit dokumentieren:

```text
führendes Zielsystem / SSOT
Lesequelle
Schreibziel
Rückschreibpflicht
Konsistenzprüfung
Fail-closed-Verhalten
Nachweisdateien
```

Verbotener Mismatch:

```text
Validator liest Mapping.
Repair patcht DB.
Gate sieht keine Änderung.
```

---

## 11. Keine Wrapper-only-Fixes

Neue Services, Runner, Guards, Adapter oder Validatoren müssen im echten Produktivpfad hängen.

Nachweis:

- Produktivpfad nutzt sie,
- alter Pfad ist entmachtet oder Adapter,
- Fehler stoppen fail-closed,
- Datenkette endet in DB/API/UI/Gate/Audit,
- relevante Dateien im Evidenzpaket.

---

## 12. Tests

Mindestens, soweit relevant:

- Unit,
- Integration,
- Regression,
- Persistenz/DB,
- Validator/Business Rule,
- Workflow/E2E,
- Negativtest gegen Dummy/Fallback/Hardcoding,
- Test gegen falsches Zielsystem,
- Test gegen stale Daten,
- Test gegen vorhandene, aber nicht aktive Implementierung,
- Test gegen unvollständiges Evidenzpaket.

Tests allein reichen nicht.

---

## 13. Live-Completion

Ein Task ist erst abgeschlossen, wenn die Änderung im real vorgesehenen DEV-/Staging-/Test-Workflow wirkt.

Pflicht:

- Umgebung,
- reales Testobjekt,
- Startzustand,
- ausgeführter Workflow,
- Endzustand,
- Logs,
- DB/API/UI/Audit-Nachweise,
- ursprünglicher Fehler tritt nicht mehr auf,
- Belegdateien.

Maximal zwei Fix-/Validierungszyklen. Danach harter Status.

---

## 14. Datenkettennachweis

Pflichtkette:

```text
Erzeugung
→ Übergabe
→ Speicherung
→ erneutes Laden
→ Weiterverarbeitung
→ Validierung
→ Ausgabe / Frontend / Export / Audit
→ Evidenzdatei
```

Wenn ein Glied fehlt:

```text
NICHT BESTANDEN
```

oder bei Scope-Fremdheit:

```text
BLOCKIERT DURCH SCOPE-FREMDEN FEHLER
```

---

## 15. Qualitätsprüfung

Jeder Abschlussbericht beantwortet:

| Frage | Antwort |
|---|---|
| Wurden Validatoren abgeschwächt? | ja/nein |
| Wurden Severity-Level gesenkt? | ja/nein |
| Wurden Pflichtfelder optional gemacht? | ja/nein |
| Wurden Fallbacks eingeführt oder verändert? | ja/nein |
| Wurden Fehler unterdrückt? | ja/nein |
| Wurden Dummy-Daten erzeugt? | ja/nein |
| Wurden Tests entfernt oder gelockert? | ja/nein |
| Wurde direkt in DB/Mapping manipuliert, um Erfolg herzustellen? | ja/nein |
| Wurde ein Status künstlich gesetzt? | ja/nein |
| Wurde bestehende Architektur verletzt? | ja/nein |
| Wurde nur ein Wrapper gebaut? | ja/nein |
| Wurde vorhandener Code ohne Evidenz als bestanden gewertet? | ja/nein |
| Wurde ein Audit als Ersatz für einen Fix verwendet? | ja/nein |
| Fehlen technische Belegdateien? | ja/nein |
| Gibt es offene Risiken? | ja/nein |

---

## 16. Abschlussbericht

Muss enthalten:

1. Executive Summary
2. Ausgangsbefund
3. Root Cause
4. betroffene Datenkette
5. Datei-Impact-Liste
6. Implementierung
7. geänderte Dateien
8. Tests
9. Existing-Implementation-Verifikation, falls relevant
10. Live-Wirksamkeitsmatrix
11. Datenkettennachweis
12. UI/API/DB/Export/Audit-Abgleich
13. Qualitätsprüfung
14. Evidenzdateien
15. offene Risiken
16. Abschlussstatus
17. Folgetasks, falls erforderlich

---

## 17. Evidenzpaket / finale ZIP

Bei Taskgruppen erzeugt der letzte Task eine finale ZIP.

Inhalt:

1. alle Abschluss-/Auditberichte,
2. geänderte Programmdateien,
3. Testdateien,
4. Skripte,
5. Migrationen / SQL / Fixtures,
6. Konfigurationsdateien,
7. API-Response-Samples,
8. DB-Read-only-Exports,
9. Logs,
10. Run-/Stage-/Gate-Reports,
11. Token-/Cost-Reports,
12. Screenshots / HTML-/DOM-Nachweise,
13. generierte Outputs,
14. MANIFEST.md,
15. CHECKSUMS.sha256, soweit sinnvoll.

MANIFEST.md:

| Datei | Herkunft | Warum relevant | Task | Nachweistyp |
|---|---|---|---|---|

Fehlt das Paket oder ist es unvollständig:

```text
NICHT BESTANDEN
```

---

## 18. Standardprompt: Audit mit Folgetask-Ableitung

```text
Führe den beauftragten Lauf / Audit / Test kontrolliert aus.

Erfasse jeden Fehler, jede Warnung, jeden Blocker, jedes Datenleck, jeden unlogischen Zustand und jede Inkonsistenz.

Für jeden Befund:
1. Klassifiziere BLOCKER / WARN / INFO / TECH_DEBT / PM_DECISION / SCOPE_FOREIGN.
2. Bestimme Root Cause.
3. Bestimme den ersten kaputten Zustand.
4. Bestimme betroffenen Codepfad.
5. Bestimme führende Datenquelle, Lesequelle und Schreibziel.
6. Bestimme Auswirkungen auf DB/API/UI/Audit/Export.
7. Bestimme minimal-invasiven Fixansatz.
8. Definiere Tests und Live-Completion.
9. Formuliere daraus einen standalone Folgetask nach Blueprint V5.

Führe keine ungeplanten Fixes aus.
Patch keine DB-/Mapping-/Statuswerte.
Schwäche keine Validatoren ab.
Melde nicht nur „done“ oder „tests green“.
```

---

## 19. Standardprompt: Folgetask-Umsetzung

```text
Arbeite nach Blueprint V5.

Setze ausschließlich den beauftragten standalone Task um.
Beginne mit Root-Cause-Verifikation.
Wenn der Task auf einer falschen Annahme beruht, stoppe und dokumentiere die korrigierte Root Cause.
Implementiere minimal-invasiv im Scope.
Führe alle Pflichttests aus.
Führe Live-Completion aus.
Erstelle technischen Abschlussbericht und Evidenzdateien.
Nutze ausschließlich die Status BESTANDEN, NICHT BESTANDEN, BLOCKIERT VOR START, BLOCKIERT DURCH SCOPE-FREMDEN FEHLER.
```

---

## 20. Standardprompt: ChatGPT-Folgeagent

```text
Du bist konzeptioneller Planer, Systemdenker, Qualitätsprüfer und Koordinator.
Du bist nicht der ausführende Programmierer.

Der Mensch liefert fachliches Ziel und Entscheidungen.
Der Code-Agent kennt den Code und ist für Codeanalyse, Implementierung, Tests, Laufzeitprüfung und technische Root-Cause-Folgetasks verantwortlich.

Deine Aufgabe:
- Zielsystem ganzheitlich denken.
- Skalierbarkeit und spätere Phasen berücksichtigen.
- Initiale Taskgruppen für neue Bereiche formulieren.
- Den Code-Agent nicht mit unbewiesenen Mikro-Fixvorgaben übersteuern.
- Bei Bugs den Code-Agent verpflichten, Root Cause und Folgetasks selbst nach Blueprint zu ermitteln.
- Auditpakete kritisch prüfen.
- WARNs von BLOCKERn trennen.
- Freeze-/Handover-Entscheidungen vorbereiten.
- Keine Ergebnisse schönreden.
```

---

## 21. Kernformel

```text
Top-down-Konzeption mit ChatGPT.
Bottom-up-Bugfixing mit Code-Agent.
Abnahme mit Evidenzpaket.
Entscheidung durch den Menschen.
```
