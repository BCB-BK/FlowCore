# Regel: Der Agenten-Arbeitsplatz — Soll-Zustand jeder Maschine (universell)

**Gilt ab Standard v2.12 (30.08.2026) auf jeder Maschine, auf der ein Agent arbeitet.**

## Warum es diese Regel gibt

Am 30.08.2026 waren zum ersten Mal alle vier Maschinen gemessen. Das Ergebnis war ernüchternd:
**drei Maschinen, drei verschiedene Installationswege für dasselbe Werkzeug**, eine Maschine, auf
der der Agent GitHub gar nicht erreicht, ein Autosync auf genau einer von vier — und von vier
Projekten meldet **eines** die Berichte, die der Standard von allen verlangt.

Nichts davon war beschlossen. Es ist gewachsen, weil jede Maschine einzeln eingerichtet wurde
und niemand einen Soll-Zustand aufgeschrieben hat, gegen den sich Abweichung überhaupt erkennen
ließe. Eine Bestandsaufnahme beschreibt, was ist. **Erst ein Soll macht aus einem Unterschied
eine Abweichung.**

## Der Soll-Zustand — acht Punkte

| # | Soll | Prüfbar mit |
|---|---|---|
| **A1** | **Claude Code global installiert**: `sudo npm install -g @anthropic-ai/claude-code`. Ein Aktualisierungsweg je Maschine, unabhängig von der Zahl der Agenten-Benutzer | `command -v claude` liegt **nicht** unter `$HOME` |
| **A2** | **Aktuelle Version**, über alle Maschinen gleich | `claude --version` |
| **A3** | **Der Agent läuft als Eigentümer des DEV-Checkouts** — nicht als root, nicht als ein zweiter Benutzer, dem die Dateien nicht gehören | `stat -c %U <checkout>` = Agenten-Benutzer |
| **A4** | **Dauerhafte tmux-Sitzung mit dem Namen `claude`** — überall gleich benannt, damit `tmux attach -t claude` auf jeder Maschine funktioniert | `tmux ls` |
| **A5** | **Arbeitsverzeichnis ist der DEV-Checkout**, wie in der `CLAUDE.md` des Repos deklariert. Nie ein PROD-Checkout, nie ein Zweitklon im Home | Deklaration ↔ Inventur |
| **A6** | **Der Agenten-Benutzer erreicht GitHub selbst** und kann auf den Arbeitsbranch pushen. Ein Agent, der für jeden Pull `sudo` braucht, arbeitet nicht frei | `ssh -T git@github.com` als Agenten-Benutzer |
| **A7** | **`onecampus-autosync.timer` aktiv** — sonst veraltet der Standard im Checkout unbemerkt | `systemctl is-active onecampus-autosync.timer` |
| **A8** | **Das Projekt meldet Berichte** nach `rules/berichtswesen.md` — `betrieb` täglich, `arbeit` bei jeder Änderung | Einträge unter `berichte/<quelle>/` in der Zentrale |

## Was ausdrücklich **nicht** vorgeschrieben ist

Der **Pfad** des DEV-Checkouts und der **Name** des Agenten-Benutzers. Beide unterscheiden sich
legitim je Maschine (`/var/www/plato-dev` mit `plato`, `/srv/website-hosting/vhosts/dev.ehip.eu/htdocs`
mit `claudeadmin`). Einheitlich ist die **Regel**, nicht der Wert — und beide Werte gehören ins
Server-Register, damit man sie nicht erraten muss.

## Abweichung ist zulässig — Verschweigen nicht

Eine Maschine darf vom Soll abweichen, wenn es einen Grund gibt. Dann steht der Grund im
Server-Register neben der Zeile. **Eine unausgewiesene Abweichung ist der Fehler**, nicht die
Abweichung selbst — genau wie bei den Repo-Regeln (`rules/technik-gedaechtnis.md`).

Gemessen wird mit `.claude/guards/agenten-inventur.sh`. Das Werkzeug vergleicht gegen diese acht
Punkte und gibt am Ende einen Block **`ABWEICHUNGEN VOM SOLL`** aus. Fehlt der Block, gilt die
Maschine als konform; steht etwas darin, gehört es ins Register — mit Datum.

## Bekannter Stand bei Einführung (30.08.2026)

Keine der vier Maschinen erfüllt alle acht Punkte. Das ist der Ausgangspunkt, nicht das Ziel:

- **A1** verletzt auf `ehip1` (`~/.local/bin`) und PLATO (`~/.npm-global/bin`) — je ein eigener
  Aktualisierungsweg
- **A6** verletzt auf `ehip1`: Die Deploy-Schlüssel liegen bei root, `claudeadmin` bekommt
  `Permission denied`. Jeder Pull dort braucht `sudo`
- **A7** zum Zeitpunkt der Einführung auf keiner Maschine aktiv
- **A8** erfüllt **nur** `ehip.eu` — sieben Berichte gegenüber null bei allen anderen

Die Punkte werden nicht auf einmal geschlossen. Sie stehen als offene Punkte in
`docs/98-OFFENE-BAUSTELLEN.md` der Zentrale und werden abgearbeitet, nicht verwaltet.
