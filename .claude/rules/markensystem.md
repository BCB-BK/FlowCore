# Regel: Marken-, Ton- und Bildregeln kommen aus FlowCore (universell)

**Gilt ab Standard v2.17 (11.09.2026) in jedem Repo, das den OneCampus-Standard trägt.**

## Die eine Quelle

**FlowCore ist die führende Quelle für alles, was Marke, Tonalität, Ansprache und
Bildsprache betrifft.** Redigiert und freigegeben wird dort, im Wiki, von Menschen mit
Namen und Verantwortung. Die Content-API liefert **nur veröffentlichte Stände** — was in
Arbeit oder in Prüfung ist, verlässt FlowCore nicht.

Das ist eine Betreiber-Entscheidung vom 09.09.2026. Die Alternative — je Marke ein Repo
oder alles in der Zentrale — scheiterte an derselben Frage: Der gemeine Mitarbeiter kann
ein Git-Repository nicht lesen. FlowCore kann er lesen. Dossier:
`docs/auftraege/markensystem-bewertung-und-ssot-2026-09-09.md` der Zentrale.

## Zwei Lesewege, und welcher wann gilt

| Wo die Sitzung läuft | Weg | Warum |
|---|---|---|
| **Auf einer Maschine** (`ehip1`, `aos1`, `delst1`, Tool-Server) | MCP-Werkzeug `flowcore` — fragen statt blättern, Volltextsuche über den ganzen freigegebenen Ausschnitt | Die Maschine erreicht die API — **noch Hypothese**, siehe unten |
| **In einer Cloud-Sitzung** (claude.ai/code) | `markensystem/` im Repo lesen | Die Cloud-Sitzung erreicht **keine** unserer Domänen |

Der zweite Fall ist kein Randfall. Gemessen am 11.09.2026 aus einer Cloud-Sitzung:
`gateway answered 403 to CONNECT` für `flowcore.onecampusgroup.de:443` — die Netzrichtlinie
der Anthropic-Umgebung sperrt jede unserer Adressen. Ein Agent, der Markenregeln nur live
abrufen kann, arbeitet dort ohne sie, ohne es zu merken. Deshalb der Spiegel.

**Der SessionStart-Hook sagt in der ersten Zeile, wo du bist** (`wo-laeuft-diese-sitzung.sh`).
Danach richtet sich der Weg — nicht nach Vermutung.

**Was am MCP-Server belegt ist und was nicht (12.09.2026).** Gemessen in einer echten
Claude-Code-Sitzung, nicht im Nachbau: Der Server wird geladen, seine fünf Werkzeuge
erscheinen, und `flowcore_freigabe` antwortet in der Cloud mit

> *FlowCore nicht erreichbar — Tunnel connection failed: 403 Forbidden. […] dort ist der
> Spiegel unter markensystem/ der Weg.*

Damit sind Ladeweg, Protokoll und Fehlerverhalten belegt — und zwar in der Richtung, die
zählt: Der Agent bleibt nicht ratlos stehen, sondern erfährt, wohin er stattdessen greift.
**Offen bleibt allein, dass der Server auf einer Maschine echte Daten liefert.** Das ist
eine Aussage über den Netzzugang dort und wird erst beim ersten Lauf auf `ehip1`, `aos1`,
`delst1` oder dem Tool-Server zur Tatsache (§5: Maschinenfakten kommen von der Maschine).

## Der Spiegel ist abgeleitet, nicht gepflegt

`markensystem/` wird stündlich von einem GitHub-Runner neu geschrieben
(`.github/workflows/markensystem-spiegeln.yml`). Jede Datei trägt im Kopf, aus welcher
FlowCore-Seite sie stammt, wann sie geholt wurde und welchen `inhalts_hash` FlowCore dafür
führt.

- **Nie von Hand bearbeiten.** Die Änderung ist beim nächsten Lauf weg — und das ist
  richtig so. Wer sie behalten will, ändert die Seite in FlowCore.
- **Nie als Beleg zitieren, ohne den Stand zu nennen.** Der Kopf jeder Datei enthält
  `abgerufen` und `zuletzt_geaendert`; beides gehört in die Fundstelle, wenn eine
  Entscheidung davon abhängt (§5: eine plausible Quelle ist nicht automatisch die gültige).
- **Ein leerer Spiegel ist ein Fehler, keine Aussage.** Das Werkzeug bricht ab, statt zu
  leeren; ein leeres `markensystem/` bedeutet also „nie gelaufen", nicht „keine Regeln".

## Wann du hineinsehen musst (Pflicht, nicht Kür)

Vor jeder Arbeit an **Text, Ansprache, Claims, Bildauswahl, Bildregie, Alt-Texten,
Seitentiteln, Metabeschreibungen und Kampagnenlinien**. Das gilt für Website-Repos genauso
wie für Werkzeuge mit Oberfläche — eine Fehlermeldung ist auch Ansprache.

Die Frage, die du dabei beantwortest, ist nicht „gibt es eine Regel?", sondern: **Welche
Marke, welche Stufe, welcher Kanal?** Das Markensystem ist dreistufig (Gruppe → Marke →
Kanal); die Gruppendateien binden alle Marken, die Markendateien nur ihre eigene.

Findest du zu deinem Fall nichts, steht das in der Auftragskarte — „nichts gefunden" ist
eine gültige Antwort, „nicht nachgesehen" nicht.

## Widerspruch zwischen Spiegel und Repo-Regeln

Ein Website-Repo kann eigene Sprachregeln tragen (EHiP: `gutachten-*.py`; OneCampus:
`anrede.test.ts`, `docs/vorgaben/ocg-website-ansprache-und-positivsprache.md`). Wenn eine
davon dem Markensystem widerspricht, gilt **nicht** „das Neuere gewinnt":

1. `ABWEICHUNGS-MELDUNG` im Abschlussbericht — was weicht ab, wovon, warum, Empfehlung.
2. Eintrag in `docs/98-OFFENE-BAUSTELLEN.md`.
3. **Kein eigenmächtiges Angleichen.** Ein maschineller Prüfer, der gegen die alte Regel
   grün ist, ist nach dem Angleichen grün über einem Verstoß — die teuerste Sorte Prüfung
   (§5). Erst die Prüfung umstellen, dann die Texte, und die Reihenfolge wird dokumentiert.

## Der Schlüssel

Ein Integrationsschlüssel je Repo, in FlowCore zugeschnitten (Marken, Struktur,
Seitentypen, Vertraulichkeit), hinterlegt als GitHub-Secret `FLOWCORE_API_KEY` und auf den
Maschinen als Umgebungsvariable.

**Der Schlüssel gehört nie ins Repo** — nicht in eine Datei, nicht in einen Kommentar,
nicht in ein Lauf-Protokoll. Der Name darf genannt werden, der Wert nie (Kernvertrag §6).
Wird er versehentlich sichtbar, ist er verbrannt: in FlowCore **Tauschen** erzeugt einen
neuen Wert und behält die Freigabe.

Prüfen, ob ein Zugang trägt, ohne irgendetwas zu schreiben:

```bash
FLOWCORE_API_KEY=… python3 .claude/werkzeuge/flowcore-spiegel.py --pruefe-nur
```

Steht dort `0 Seiten`, ist die **Freigabe** zu eng, nicht die Verbindung kaputt — das ist
der schnellste Weg, die beiden Fehlerbilder zu trennen.

## Durchsetzung

| | |
|---|---|
| Owner | Architektur (`ocg-architekt`) |
| Geltungsbereich | alle Repos mit OneCampus-Standard |
| Durchsetzungsform | Workflow `markensystem-spiegeln.yml` (fail-closed, Lauf wird rot) + diese Regel + MCP-Server auf den Maschinen |
| Überprüfungstermin | mit dem nächsten Standard-Review |

**Maschine vor Regel (§10):** Dass der Spiegel aktuell ist, hängt an einem Zeitplan, nicht
an jemandes Erinnerung. Dass er *gelesen* wird, hängt an dieser Regel — deshalb steht sie
in `.claude/rules/` und nicht in einem Dokument, das niemand aufschlägt.
