# Berichtswesen — jedes Projekt meldet in die gemeinsame Ablage

**Gilt ab Standard v2.11 (29.08.2026) in jedem Repo, das den OneCampus-Standard trägt.**

## Warum

Berichte entstanden bisher dort, wo sie anfielen — in Logdateien auf der jeweiligen
Maschine. Der Beleg dafür ist teuer bezahlt: Das Drift-Protokoll auf `ehip1` meldete ab
dem 21.08.2026 **täglich**, dass ein Deploy-Blocker den gesamten Relaunch aufhielt. Bis
zum 29.08. hat dort niemand hineingesehen. Acht Tage Stillstand, sauber protokolliert
und ungelesen.

Ein Bericht, den niemand liest, ist kein Bericht. Deshalb liegen sie an **einer** Stelle:
`BCB-BK/ocg-architekt` → `berichte/`. Dort greift der Architektur-Agent ohnehin zu.

## Pflicht

| | |
|---|---|
| **Wohin** | `berichte/<quelle>/<JJJJ-MM-TT>-<art>.md` im Repo `BCB-BK/ocg-architekt` |
| **Quelle** | Domäne kleingeschrieben ohne `www.` (`ehip.eu`), sonst der Repo-Name (`flowcore`) |
| **Wie oft** | `betrieb` täglich · `zustellung` täglich, sofern das Projekt Daten übergibt · `arbeit` bei jeder Änderung · `vorfall` sofort |
| **Womit** | `.claude/werkzeuge/bericht-melden.sh` — das Standardwerkzeug erledigt Kopfsatz, Ablage, Nachtragsregel und Push |
| **Verbindlich** | Die Systematik in `berichte/README.md` des Zielrepos. Sie ist die Quelle, nicht diese Datei |

## Was ein Bericht mindestens enthält

Jeder beginnt mit dem Kopfsatz — **das ist der Teil, den der Agent auswertet**:

```yaml
---
quelle: <domäne-oder-repo>
datum: <JJJJ-MM-TT>
art: betrieb | zustellung | arbeit | audit | vorfall
status: ok | hinweis | fehler
befunde: <zahl>
erzeugt_von: <skript, sitzung oder person>
stufen: [prod, stage, dev]
---
```

`status` ist der **schärfste** Wert im Bericht: ein einziger Fehler macht den ganzen
Bericht zu `fehler`. `befunde: 0` und `status: ok` müssen zusammenpassen.

## Vier Regeln

1. **Nie überschreiben.** Stellt sich etwas als falsch heraus, kommt ein Abschnitt
   „Nachtrag" mit Uhrzeit darunter — der ursprüngliche Text bleibt stehen. Ein
   korrigierter Bericht, dem man die Korrektur nicht ansieht, ist wertlos.
2. **Keine Geheimnisse.** Keine Zugangsdaten, Schlüssel, Zahlungsdaten, Klarnamen von
   Interessenten oder Bewerbern. Bezug auf einen Vorgang über die Vorgangsnummer.
3. **Zahlen statt Adjektive.** „10 von 10 Seiten mit 200" statt „läuft gut".
4. **Was offen ist, steht drin** — auch das, was der Berichtende selbst nicht geschafft
   hat. Ein Bericht ist keine Leistungsschau.

## Übergibt das Projekt Daten an ein Fremdsystem?

Dann ist `zustellung` **Pflicht**, und zwar inklusive der **Fehlschläge**. Begründung:
Sobald es keinen zweiten Weg mehr gibt (kein Mailversand als Rückfallebene), ist eine
nicht zugestellte Übergabe nicht „verspätet", sondern **verloren** — es sei denn, jemand
merkt es und sendet nach.

Erfasst gehören: eingereicht, übergeben, fehlgeschlagen, **offen gesamt** (auch ältere),
älteste offene Meldung, Ursachen je HTTP-Code und der Zustand der Gegenstelle. `offen
gesamt` ist bewusst getrennt von `fehlgeschlagen` — der Tagesbericht darf nicht grün
aussehen, nur weil heute nichts Neues dazukam.

## Kein Bericht ist auch ein Befund

Wer die Reihe liest, achtet auf **Lücken**. Ein Projekt, das drei Tage nichts meldet, ist
entweder still oder kaputt — und beides muss auffallen. Deshalb ist die tägliche Meldung
auch dann fällig, wenn nichts passiert ist.

## Durchsetzung

Owner: Architektur (ocg-architekt). Geltungsbereich: alle Repos mit OneCampus-Standard.
Durchsetzungsform: Werkzeug im Standardpaket (`bericht-melden.sh`) plus Sichtprüfung der
Lücken durch den Architektur-Agenten. Überprüfungstermin: mit dem nächsten Standard-Review.

**Maschine vor Regel (Kernvertrag §10):** Die Meldung gehört in einen Zeitplan des
Projekts, nicht in die Erinnerung eines Menschen.
