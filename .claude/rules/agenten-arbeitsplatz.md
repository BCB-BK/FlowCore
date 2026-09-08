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
| **A1** | **Claude Code über den nativen Installer**: `curl -fsSL https://claude.ai/install.sh \| bash`. Er braucht **kein Node.js** und **aktualisiert sich selbst im Hintergrund** — damit ist A2 (gleiche Version überall) technisch gelöst statt verwaltet. Die Binärdatei liegt bewusst unter `~/.local/bin/claude`; das ist beim nativen Weg der vorgesehene Ort, kein Mangel | `claude --version` läuft · `claude doctor` meldet den Installationsweg |
| **A2** | **Aktuelle Version**, über alle Maschinen gleich — beim nativen Weg von selbst; ein Rückstand ist dann ein Befund über die Maschine (kein Netz, Installer blockiert), nicht über die Pflege | `claude --version` |
| **A3** | **Der Agent läuft als Eigentümer des DEV-Checkouts** — nicht als root, nicht als ein zweiter Benutzer, dem die Dateien nicht gehören | `stat -c %U <checkout>` = Agenten-Benutzer |
| **A4** | **Dauerhafte tmux-Sitzung mit dem Namen `claude`** — überall gleich benannt, damit `tmux attach -t claude` auf jeder Maschine funktioniert | `tmux ls` |
| **A5** | **Arbeitsverzeichnis ist der DEV-Checkout**, wie in der `CLAUDE.md` des Repos deklariert. Nie ein PROD-Checkout, nie ein Zweitklon im Home | Deklaration ↔ Inventur |
| **A6** | **Der Agenten-Benutzer erreicht GitHub selbst** und kann auf den Arbeitsbranch pushen. Ein Agent, der für jeden Pull `sudo` braucht, arbeitet nicht frei | `ssh -T git@github.com` als Agenten-Benutzer |
| **A7** | **`onecampus-autosync.timer` aktiv** — sonst veraltet der Standard im Checkout unbemerkt | `systemctl is-active onecampus-autosync.timer` |
| **A8** | **Das Projekt meldet Berichte** nach `rules/berichtswesen.md` — `betrieb` täglich, `arbeit` bei jeder Änderung | Einträge unter `berichte/<quelle>/` in der Zentrale |

**Korrektur vom 08.09.2026 — A1 verlangte den falschen Weg.** Bis heute stand hier
`sudo npm install -g`, mit der Begründung „ein Aktualisierungsweg je Maschine". Gemessen an
zwei Maschinen am selben Tag: Auf `aos1` läuft Claude Code 2.1.252, obwohl `node` und `npm` dort
**gar nicht installiert** sind; auf `delst1` brachte `curl -fsSL https://claude.ai/install.sh | bash`
in einem Schritt 2.1.263. Der native Installer lädt eine eigenständige Binärdatei und hält sie
selbst aktuell. Die alte Regel hätte auf beiden Maschinen erst Node.js verlangt — für nichts.
Damit ist auch die Bewertung „A1 verletzt auf `ehip1` (`~/.local/bin`)" hinfällig: Genau dort
gehört sie beim nativen Weg hin. Was bleibt, ist die eigentliche Absicht der Regel — **ein** Weg
je Maschine, nicht drei verschiedene.

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

- **A1** ~~verletzt auf `ehip1` (`~/.local/bin`)~~ **— diese Bewertung ist hinfällig seit
  08.09.2026** (Korrektur oben): `~/.local/bin` ist der Ort des nativen Installers und damit das
  Soll. Verletzt bleibt PLATO (`~/.npm-global/bin`) — npm-Weg, braucht Node.js und Handarbeit
- **A6** verletzt auf `ehip1`: Die Deploy-Schlüssel liegen bei root, `claudeadmin` bekommt
  `Permission denied`. Jeder Pull dort braucht `sudo`
- **A7** zum Zeitpunkt der Einführung auf keiner Maschine aktiv
- **A8** erfüllt **nur** `ehip.eu` — sieben Berichte gegenüber null bei allen anderen

Die Punkte werden nicht auf einmal geschlossen. Sie stehen als offene Punkte in
`docs/98-OFFENE-BAUSTELLEN.md` der Zentrale und werden abgearbeitet, nicht verwaltet.
