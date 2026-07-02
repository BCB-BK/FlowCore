## Zusatz V4: Live-Completion, Existing-Implementation-Verifikation und Evidenzpaket und harte Abschlusslogik

Dieser Auftrag gilt nicht als abgeschlossen, wenn nur Code, Unit-Tests, Typecheck, Lint, CI, Mock-Tests, Dokumentation, vorhandene Dateien, vorhandene Auditberichte oder ein Toolstatus wie `MERGED`, `done`, `completed` oder `alle Checks grün` vorliegen.

Wenn Code oder Berichte bereits existieren, muss der Agent zuerst nachweisen, dass die vorhandene Implementierung im aktuellen Codebestand wirklich aktiv ist und im realen Workflow wirkt. `Bereits implementiert` ist kein Abschlussgrund.

Der Agent muss zuerst die Root Cause im realen Workflow belegen, dann minimal-invasiv innerhalb des Scopes fixen oder die vorhandene Implementierung evidenzbasiert verifizieren und anschließend im real vorgesehenen DEV-/Staging-/Test-Workflow nachweisen, dass die Änderung tatsächlich wirkt.

Nicht erlaubt:

- Validatoren abschwächen,
- Severity-Level senken,
- Pflichtfelder optional machen,
- Fehler ausblenden,
- Dummy-Daten erzeugen,
- direkte DB-/Mapping-Manipulation zur Herstellung eines Erfolgszustands,
- manuelles Statuspatching,
- Tests entfernen oder lockern,
- Hardcodings,
- Frontend-Kosmetik statt Datenfix,
- Silent-Fallbacks,
- Wrapper-only-Fixes ohne Produktivpfadbindung,
- vorhandene Dateien oder `MERGED` als Erfolgsnachweis verwenden,
- spätere Audits als Ersatz für die eigene Abschlussvalidierung verwenden,
- oberflächliche Berichte ohne technische Belegdateien liefern.

Wenn die Live-Validierung fehlschlägt, muss der Agent innerhalb des Scopes maximal 2 Fix-/Validierungszyklen durchführen. Wenn der Fehler außerhalb des Scopes liegt oder danach weiter besteht, muss der Agent stoppen und einen harten Status vergeben.

Zulässige Abschlussstatus:

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

Der Abschlussbericht muss technisch tiefgehend sein und enthalten:

1. Root Cause
2. betroffene Datenkette
3. Datei-Impact-Liste
3. Existing-Implementation-Verifikation, falls Code/Tests/Berichte bereits vorhanden waren
5. Implementierung
6. geänderte Dateien mit kurzer technischer Erklärung
7. Tests
8. Live-Wirksamkeitsmatrix
9. Datenkettennachweis
10. Qualitätsprüfung
11. UI/API/DB/Audit-Abgleich, soweit relevant
12. Evidenzdateien / technische Prüfdateien
13. offene Risiken
14. Abschlussstatus nach harter Taxonomie

Ein Task ist nur `BESTANDEN`, wenn der reale Workflow validiert wurde, der ursprüngliche Fehler real nicht mehr auftritt, die Datenkette vollständig nachgewiesen ist, DB/API/UI/Audit konsistent sind und keine Qualitätsabsenkung oder künstliche Erfolgsherstellung erfolgt ist und die relevanten Belegdateien vorhanden sind.


Wenn dieser Auftrag der letzte Task einer Taskgruppe ist, muss zusätzlich eine finale ZIP-Datei als Download-Artefakt erzeugt werden. Diese ZIP muss alle Abschluss-/Auditberichte der Taskgruppe sowie alle für eine externe technische Prüfung notwendigen Dateien enthalten, insbesondere geänderte Programmdateien, Testdateien, Skripte, Migrationen, Fixtures, API-/DB-/UI-/Log-/Export-Nachweise, Screenshots, HTML-/DOM-Nachweise, xAPI-/JSON-/CSV-/Markdown-Ausgaben, Run-/Gate-/Token-/Cost-Reports sowie eine `MANIFEST.md` mit Dateierklärung.

Fehlt diese ZIP oder ist sie unvollständig, ist die Taskgruppe nicht `BESTANDEN`.
