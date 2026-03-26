# UAT-Protokoll – Benutzerakzeptanztest

## Überblick

Dieses Protokoll definiert die Testszenarien, Pilotgruppen und Abnahmekriterien für den Benutzerakzeptanztest (UAT) von FlowCore.

## Pilotgruppen

| Gruppe | Rollen | Teilnehmer | Zeitraum |
|---|---|---|---|
| Gruppe A: Prozessverantwortliche | Process Manager, Editor | 3–5 Personen | Woche 1–2 |
| Gruppe B: Fachexperten | Editor, Reviewer | 5–8 Personen | Woche 2–3 |
| Gruppe C: Allgemeine Nutzer | Viewer | 10–15 Personen | Woche 3–4 |

## Testszenarien

### Szenario 1: Anmeldung und Navigation
| Schritt | Aktion | Erwartetes Ergebnis | Status |
|---|---|---|---|
| 1.1 | Wiki über Browser öffnen | Automatische SSO-Anmeldung | ☐ |
| 1.2 | Wiki über Teams-Tab öffnen | Automatische Teams-SSO-Anmeldung | ☐ |
| 1.3 | In der Baumstruktur navigieren | Seiten korrekt angezeigt | ☐ |
| 1.4 | Suche verwenden | Relevante Ergebnisse angezeigt | ☐ |

### Szenario 2: Inhalt erstellen (Editor-Rolle)
| Schritt | Aktion | Erwartetes Ergebnis | Status |
|---|---|---|---|
| 2.1 | Neue Seite vom Typ "Verfahrensanweisung" erstellen | Seite mit Prozess-ID angelegt | ☐ |
| 2.2 | Text mit Formatierung eingeben | Formatierungen korrekt dargestellt | ☐ |
| 2.3 | Tabelle einfügen | Tabelle korrekt dargestellt | ☐ |
| 2.4 | Bild hochladen | Bild in Medienbibliothek und auf Seite | ☐ |
| 2.5 | Tags zuweisen | Tags gespeichert und suchbar | ☐ |
| 2.6 | Revision erstellen | Revision in Versionshistorie sichtbar | ☐ |

### Szenario 3: Review-Workflow (Reviewer/Approver-Rolle)
| Schritt | Aktion | Erwartetes Ergebnis | Status |
|---|---|---|---|
| 3.1 | Offene Reviews in "Meine Aufgaben" sehen | Ausstehende Reviews gelistet | ☐ |
| 3.2 | Änderungen im Diff-View prüfen | Unterschiede klar markiert | ☐ |
| 3.3 | Revision genehmigen | Status wechselt zu "genehmigt" | ☐ |
| 3.4 | Revision veröffentlichen | Status wechselt zu "veröffentlicht" | ☐ |

### Szenario 4: Suche und Entdeckung (Viewer-Rolle)
| Schritt | Aktion | Erwartetes Ergebnis | Status |
|---|---|---|---|
| 4.1 | Volltextsuche nach Fachbegriff | Relevante Seiten gefunden | ☐ |
| 4.2 | Glossar durchsuchen | Begriffe mit Definitionen angezeigt | ☐ |
| 4.3 | Verwandte Seiten ansehen | Backlinks und Vorwärtslinks korrekt | ☐ |
| 4.4 | Seite in Teams teilen | Deep Link funktioniert | ☐ |

### Szenario 5: Qualitäts-Dashboard (Process Manager-Rolle)
| Schritt | Aktion | Erwartetes Ergebnis | Status |
|---|---|---|---|
| 5.1 | Dashboard öffnen | KPI-Kacheln mit Daten angezeigt | ☐ |
| 5.2 | Wartungshinweise prüfen | Handlungsbedarf identifizierbar | ☐ |
| 5.3 | Duplikate-Tab prüfen | Potenzielle Dopplungen gelistet | ☐ |
| 5.4 | Prozessübersicht ansehen | Qualität pro Prozess aufgeschlüsselt | ☐ |

### Szenario 6: Administration (Admin-Rolle)
| Schritt | Aktion | Erwartetes Ergebnis | Status |
|---|---|---|---|
| 6.1 | Benutzer auflisten | Alle Benutzer mit Rollen sichtbar | ☐ |
| 6.2 | Rolle zuweisen | Rolle gespeichert, Berechtigungen aktiv | ☐ |
| 6.3 | Audit-Log prüfen | Aktionen nachvollziehbar protokolliert | ☐ |

## Feedback-Erfassung

### Feedback-Formular (pro Testperson)
- **Name**: ___
- **Rolle**: ___
- **Datum**: ___
- **Bewertung** (1–5): ___

| Kriterium | Bewertung (1–5) | Kommentar |
|---|---|---|
| Benutzerfreundlichkeit | | |
| Ladezeiten | | |
| Suchqualität | | |
| Editor-Funktionalität | | |
| Navigation/Struktur | | |
| Teams-Integration | | |
| Gesamteindruck | | |

### Offene Fragen
1. Was hat besonders gut funktioniert?
2. Was war schwierig oder unklar?
3. Welche Funktionen fehlen?
4. Würden Sie das Wiki regelmäßig nutzen?

## Go/No-Go-Kriterien

### Go-Kriterien (alle müssen erfüllt sein)
- [ ] Alle kritischen Testszenarien bestanden (1.x, 2.x, 3.x)
- [ ] Durchschnittliche Benutzerbewertung ≥ 3.5 / 5
- [ ] Keine ungeklärten Datenverlust-Risiken
- [ ] SSO funktioniert zuverlässig (Browser + Teams)
- [ ] Alle Seitentypen funktionsfähig
- [ ] Suchfunktion liefert relevante Ergebnisse

### No-Go-Kriterien (eines genügt für Verschiebung)
- Kritischer Datenverlust während der Tests
- SSO-Anmeldung scheitert für > 10 % der Testpersonen
- Antwortzeiten > 5 Sekunden für Standardoperationen
- Berechtigungslecks (Viewer kann schreiben, etc.)

## Zeitplan

| Phase | Dauer | Aktivitäten |
|---|---|---|
| Vorbereitung | 1 Woche | Pilotinhalte migrieren, Testkonten einrichten |
| Pilotphase A | 2 Wochen | Prozessverantwortliche testen |
| Pilotphase B | 2 Wochen | Fachexperten testen |
| Pilotphase C | 1 Woche | Allgemeine Nutzer testen |
| Auswertung | 1 Woche | Feedback analysieren, Bugs fixen |
| Abnahme | — | Go/No-Go-Entscheidung |

## Entwicklungsvalidierung (Pre-UAT, 2026-03-26)

Automatisierte E2E-Tests als Baseline vor Pilot-UAT:
- 81 E2E-Tests bestanden (62 Basis + 19 RBAC-Sicherheitstests)
- Typecheck, Lint, No-Hardcode-Check, Docs-Check bestanden
- Backup/Restore-Drill erfolgreich (2s Wiederherstellung, Datenintegrität verifiziert)
- Performance-Baseline: alle Endpunkte < 50ms (2.837 Knoten)
- Security Headers aktiv, Rate Limiting funktional

Status: Bereit für Pilotgruppe A (Prozessverantwortliche)

## Ergebnis

| Datum | Entscheidung | Begründung |
|---|---|---|
| _nach UAT-Durchführung einzutragen_ | ☐ Go / ☐ No-Go | _nach UAT-Durchführung einzutragen_ |
