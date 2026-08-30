#!/bin/bash
# Agenten-Inventur — was auf DIESER Maschine tatsaechlich vorhanden ist.
#
# ─── WARUM ES DIESES SKRIPT GIBT ─────────────────────────────────────────────────────────────
#
# Am 28.08.2026 wurde der Kernvertrag v2.9 in zehn Repositorien verteilt und mit
# "10 von 10 byte-identisch" abgeschlossen. Gemessen wurde ausschliesslich GitHub. Auf einer
# der vier Maschinen war Claude Code nie installiert — kein node, keine Sitzung, kein Klon,
# nicht einmal ein GitHub-Schluessel. Der Standard lag also vollstaendig vor und wurde von
# niemandem gelesen. Aufgefallen ist es dem Betreiber, nicht dem Architekten.
#
# Die Regel dagegen steht in Paragraph 5 des Kernvertrags: Eine Verteilung ist erst fertig,
# wenn sie BEIM VERBRAUCHER gemessen wurde. Dieses Skript ist die Messung. Es beantwortet die
# Frage, die vor jedem "ausgerollt" zu stellen ist: Wer liest das hier, und welchen Stand
# sieht er?
#
# ─── EIGENSCHAFTEN ───────────────────────────────────────────────────────────────────────────
#
# REIN LESEND. Kein sudo, keine Installation, keine Aenderung. Auf PROD-Maschinen unbedenklich.
# FAIL-CLOSED. Was nicht ermittelbar ist, erscheint als UNBEKANNT — nie als "ok". Ein fehlendes
#   Werkzeug ist ein BEFUND, kein Fehler: das Skript endet mit Exit 0 und meldet den Zustand.
# OHNE SECRETS. Schluesseldateien werden nur namentlich genannt, nie ausgegeben.
#
# ─── BEDIENUNG ───────────────────────────────────────────────────────────────────────────────
#
#   bash agenten-inventur.sh
#
# Ohne Kopie auf der Maschine, direkt aus einer SSH-Sitzung:
#   bash <(curl -fsSL <roh-url>)      # nur aus vertrauenswuerdiger Quelle
#
# Die Ausgabe gehoert in `server-register.md` der Zentrale (Abschnitt "Maschinen und
# Arbeitswege"), mit Datum. Ein Eintrag ohne Datum gilt als ungeprueft.

set -uo pipefail        # bewusst OHNE -e: ein fehlendes Werkzeug ist ein Befund, kein Abbruch

unbekannt="UNBEKANNT"
# Abweichungen vom Soll (rules/agenten-arbeitsplatz.md, A1-A8). Eine Bestandsaufnahme
# beschreibt, was ist — erst ein Soll macht aus einem Unterschied eine Abweichung.
ABW=()
abw() { ABW+=("$1"); }
hat() { command -v "$1" >/dev/null 2>&1; }
zeile() { printf '%-22s %s\n' "$1" "$2"; }

echo
echo "════════════════════════════════════════════════════════════════════════"
echo "  AGENTEN-INVENTUR   $(date '+%d.%m.%Y %H:%M %Z')"
echo "════════════════════════════════════════════════════════════════════════"
echo

# ── 1. Maschine ─────────────────────────────────────────────────────────────────────────────
echo "── Maschine ────────────────────────────────────────────────────────────"
zeile "Hostname" "$(hostname 2>/dev/null || echo "$unbekannt")"
zeile "IP" "$(hostname -I 2>/dev/null | tr -s ' ' | sed 's/ $//' || echo "$unbekannt")"
if [ -r /etc/os-release ]; then
  zeile "System" "$(. /etc/os-release 2>/dev/null && echo "${PRETTY_NAME:-$unbekannt}")"
else
  zeile "System" "$unbekannt"
fi
zeile "Angemeldet als" "$(id -un 2>/dev/null || echo "$unbekannt")"
echo

# ── 2. Claude Code ──────────────────────────────────────────────────────────────────────────
echo "── Claude Code ─────────────────────────────────────────────────────────"
if hat claude; then
  zeile "Status" "INSTALLIERT"
  cpfad=$(command -v claude)
  zeile "Pfad" "$cpfad"
  # A1: global installiert, damit es je Maschine EINEN Aktualisierungsweg gibt
  case "$cpfad" in
    "$HOME"/*) abw "A1  Claude Code liegt benutzerlokal ($cpfad) statt global — eigener Aktualisierungsweg. Soll: sudo npm install -g @anthropic-ai/claude-code" ;;
  esac
  zeile "Version" "$(claude --version 2>/dev/null | head -1 || echo "$unbekannt")"
else
  zeile "Status" "NICHT INSTALLIERT"
  abw "A1  Claude Code ist auf dieser Maschine NICHT installiert — hier liest kein Agent den Standard"
  # Die haeufigste Ursache zuerst: Node fehlt, also kann das npm-Paket nicht laufen.
  if hat node; then
    zeile "  node" "$(node --version 2>/dev/null)  — vorhanden, Claude Code aber nicht"
  else
    zeile "  node" "FEHLT — ohne node kann Claude Code nicht laufen"
  fi
  hat npm && zeile "  npm" "$(npm --version 2>/dev/null)" || zeile "  npm" "FEHLT"
fi
echo

# ── 3. Hat hier je ein Agent gearbeitet? ────────────────────────────────────────────────────
echo "── Spuren frueherer Arbeit ─────────────────────────────────────────────"
if [ -d "$HOME/.claude" ]; then
  zeile "$(id -un) (~/.claude)" "vorhanden — hier wurde gearbeitet"
else
  zeile "$(id -un) (~/.claude)" "fehlt — dieser Benutzer hat hier NIE gearbeitet"
fi
# Fremde Homes sind ohne sudo nicht lesbar. Das wird als UNBEKANNT gemeldet, nicht geraten.
for h in /home/*/; do
  u=$(basename "$h")
  [ "$u" = "$(id -un)" ] && continue
  if [ -r "$h" ]; then
    [ -d "$h/.claude" ] && zeile "$u (~/.claude)" "vorhanden" || zeile "$u (~/.claude)" "fehlt"
  else
    zeile "$u (~/.claude)" "$unbekannt — Home ohne sudo nicht lesbar"
  fi
done
echo

# ── 4. Laufende Sitzungen ───────────────────────────────────────────────────────────────────
echo "── tmux-Sitzungen ──────────────────────────────────────────────────────"
if hat tmux; then
  s=$(tmux ls 2>&1)
  # Drei Formulierungen fuer denselben Zustand — je nach tmux-Version und ob je ein
  # Server lief. Die dritte ("error connecting to ...") fehlte in der ersten Fassung und
  # wurde bei der Gegenprobe am 28.08.2026 gefunden.
  if echo "$s" | grep -q 'no server running\|no sessions\|error connecting'; then
    zeile "Sitzungen" "keine laufende Sitzung"
    abw "A4  Keine dauerhafte tmux-Sitzung. Soll: eine Sitzung namens claude (tmux new -s claude)"
  else
    echo "$s" | sed 's/^/                       /'
    echo "$s" | grep -q '^claude:' || abw "A4  tmux laeuft, aber keine Sitzung heisst claude — auf jeder Maschine gleich benennen"
  fi
else
  zeile "tmux" "NICHT INSTALLIERT — eine dauerhafte Agenten-Sitzung ist so nicht moeglich"
fi
echo

# ── 5. Git-Checkouts und gesehener Standardstand ────────────────────────────────────────────
echo "── Git-Checkouts und Standardstand ─────────────────────────────────────"
# Getrennt ausgewiesen: Checkouts MIT Standard (das ist die eigentliche Frage) und die
# uebrigen (Werkzeuge wie nvm/rbenv, nur zur Vollstaendigkeit gezaehlt).
# SUCHTIEFE 6, nicht 4. Erster Realeinsatz auf ehip1 am 28.08.2026: Die Inventur meldete
# genau EINEN Checkout und uebersah den DEV-Checkout, der zwei Zeilen zuvor frisch gezogen
# worden war — er liegt unter /srv/website-hosting/vhosts/dev.ehip.eu/htdocs/.git, also auf
# Ebene 5. Mit PROD und www2 fehlten drei von vier. Das Werkzeug hat den Gegenstand uebersehen,
# fuer den es gebaut wurde. Die Gegenprobe im Entwicklungscontainer konnte das nicht zeigen:
# dort liegen die Verzeichnisse flacher. Lehre (Kernvertrag Paragraph 5): Die Gegenprobe gehoert
# in die Umgebung, in der gemessen wird.
# Entdoppelung ueber ALLE Wurzeln, nicht je Wurzel. Auf PLATO am 30.08.2026 erschienen vier
# Checkouts doppelt, weil $HOME (/home/plato) unterhalb von /home liegt und beide Wurzeln
# durchsucht werden. In der Entwicklungsumgebung faellt das nicht auf: dort ist $HOME=/root,
# also ausserhalb von /home. Vierter Fehler aus vierter Zielumgebung — dieselbe Lehre.
TIEFE=6
WURZELN=("$HOME" /home /var/www /srv /opt)
zeile "Suchbereich" "Tiefe $TIEFE unter: ${WURZELN[*]}"
mit=0; ohne=0; verweigert=0; sonstige=""
alle=$(for w in "${WURZELN[@]}"; do
         [ -d "$w" ] && find "$w" -maxdepth "$TIEFE" -name .git -type d 2>/dev/null
       done | sort -u)
for wurzel in "${WURZELN[@]}"; do
  [ -d "$wurzel" ] || continue
  while IFS= read -r g; do
    d=$(dirname "$g")
    if [ -r "$d/CLAUDE-STANDARD.md" ]; then
      mit=$((mit+1))
      # Ein UNBEKANNT muss seine URSACHE nennen, sonst kostet es den Leser die Zeit, die das
      # Werkzeug sparen soll. Haeufigster Fall auf einem Mehrbenutzer-Server: Das Verzeichnis
      # gehoert einem anderen Benutzer, git verweigert mit "dubious ownership" (Fund auf dem
      # Tool-Server am 30.08.2026: /var/www/flowcore-* gehoert flowcore, gelesen wurde als campus).
      br=$(git -C "$d" rev-parse --abbrev-ref HEAD 2>/dev/null)
      if [ -z "$br" ]; then
        eig=$(stat -c '%U' "$d" 2>/dev/null || echo "?")
        if [ "$eig" != "$(id -un)" ] && [ "$eig" != "?" ]; then
          br="$unbekannt (gehoert $eig — mit 'sudo -u $eig git -C $d ...' auslesen)"
        else
          br="$unbekannt"
        fi
        sha="$unbekannt"
      else
        sha=$(git -C "$d" rev-parse --short HEAD 2>/dev/null || echo "$unbekannt")
      fi
      v=$(grep -m1 -o 'Version [0-9][0-9.]*' "$d/CLAUDE-STANDARD.md" 2>/dev/null || echo "$unbekannt")
      printf '  %s\n' "$d"
      printf '      Branch %-24s Commit %-10s %s\n' "${br%% (*}" "$sha" "$v"
      case "$br" in *"gehoert"*) printf '      %s\n' "${br#* }" ;; esac
    else
      ohne=$((ohne+1)); sonstige="${sonstige}${d} "
    fi
  done < <(printf '%s\n' "$alle" | grep -v '^$')
  find "$wurzel" -maxdepth "$TIEFE" -name .git -type d 2>&1 >/dev/null | grep -q 'Permission denied' \
    && verweigert=$((verweigert+1))
  break   # $alle enthaelt bereits alle Wurzeln entdoppelt — nur ein Durchlauf
done
# Zugriffsfehler getrennt ueber alle Wurzeln zaehlen (die Schleife oben bricht nach einem Lauf ab)
for w in "${WURZELN[@]}"; do
  [ -d "$w" ] || continue
  find "$w" -maxdepth "$TIEFE" -name .git -type d 2>&1 >/dev/null | grep -q 'Permission denied' \
    && verweigert=$((verweigert+1))
done
[ "$mit" -eq 0 ] && zeile "Ergebnis" "KEIN Checkout mit CLAUDE-STANDARD.md — hier liegt kein Standard"
[ "$ohne" -gt 0 ] && zeile "Ohne Standard" "$ohne Checkout(s): $sonstige"
[ "$verweigert" -gt 0 ] && zeile "Hinweis" "$unbekannt in Teilbaeumen — Zugriff verweigert, ohne sudo nicht vollstaendig"
echo

# ── 6. Erreicht diese Maschine GitHub? ──────────────────────────────────────────────────────
echo "── GitHub-Zugang (nur Rueckgabewert, keine Schluesselinhalte) ──────────"
if hat ssh; then
  a=$(ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new \
        -T git@github.com 2>&1)
  case "$a" in
    *successfully\ authenticated*) zeile "SSH zu GitHub" "OK — $(echo "$a" | head -1)" ;;
    *Permission\ denied*)          zeile "SSH zu GitHub" "KEIN ZUGANG (Permission denied) — kein nutzbarer Schluessel"
                                   abw "A6  $(id -un) erreicht GitHub nicht — jeder Pull braucht sudo. Ein Agent, der nicht selbst ziehen und pushen kann, arbeitet nicht frei" ;;
    *)                             zeile "SSH zu GitHub" "$unbekannt — $(echo "$a" | head -1)" ;;
  esac
  if [ -d "$HOME/.ssh" ]; then
    zeile "Schluesseldateien" "$(ls "$HOME/.ssh" 2>/dev/null | tr '\n' ' ')"
  else
    zeile "Schluesseldateien" "~/.ssh fehlt"
  fi
else
  zeile "ssh" "NICHT VORHANDEN"
fi
echo

# ── 7. Container ────────────────────────────────────────────────────────────────────────────
echo "── Container ───────────────────────────────────────────────────────────"
if hat docker; then
  if docker ps --format '{{.Names}}  {{.Status}}' >/dev/null 2>&1; then
    n=$(docker ps -q 2>/dev/null | wc -l)
    zeile "Laufend" "$n"
    docker ps --format '  {{.Names}}  ({{.Status}})' 2>/dev/null
    kr=$(docker ps --filter health=unhealthy --format '{{.Names}}' 2>/dev/null)
    [ -n "$kr" ] && echo "  ⚠ UNHEALTHY: $kr"
  else
    zeile "docker" "$unbekannt — vorhanden, aber nicht abfragbar (Rechte?)"
  fi
else
  zeile "docker" "nicht vorhanden"
fi
echo

# ── 8. Autosync (A7) ────────────────────────────────────────────────────────────────────────
echo "── Standard-Autosync ───────────────────────────────────────────────────"
if hat systemctl; then
  st=$(systemctl is-active onecampus-autosync.timer 2>/dev/null || echo inactive)
  if [ "$st" = "active" ]; then
    zeile "onecampus-autosync" "aktiv — $(systemctl show -p NextElapseUSecRealtime --value onecampus-autosync.timer 2>/dev/null | head -1)"
  else
    zeile "onecampus-autosync" "NICHT AKTIV ($st)"
    abw "A7  Autosync-Timer laeuft nicht — der Standard veraltet im Checkout unbemerkt. Abhilfe: sudo bash .claude/werkzeuge/autosync-installieren.sh"
  fi
  alt_t=$(systemctl is-active onecampus-standard-sync.timer 2>/dev/null || echo inactive)
  [ "$alt_t" = "active" ] && zeile "  Vorgaenger" "onecampus-standard-sync.timer laeuft noch — nach der Umstellung abschalten"
else
  zeile "systemd" "$unbekannt — Timer nicht pruefbar"
fi
echo

# ── Verdikt und Abweichungen vom Soll ───────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════════════════"
if hat claude; then
  if [ -d "$HOME/.claude" ]; then
    echo "  VERDIKT: Agent einsatzbereit und hier bereits benutzt."
  else
    echo "  VERDIKT: Agent installiert, aber von $(id -un) hier noch nie benutzt."
  fi
else
  echo "  VERDIKT: KEIN AGENT AUF DIESER MASCHINE."
  echo "           Ein hier abgelegter Standard wird von niemandem gelesen."
fi
echo "  Diese Ausgabe gehoert mit Datum in server-register.md der Zentrale."
echo "════════════════════════════════════════════════════════════════════════"
echo

# Der eigentliche Zweck: nicht beschreiben, sondern gegen den Soll-Zustand messen.
# Soll = rules/agenten-arbeitsplatz.md, Punkte A1-A8.
if [ "${#ABW[@]}" -eq 0 ]; then
  echo "ABWEICHUNGEN VOM SOLL: keine (geprueft: A1 A4 A6 A7)"
else
  echo "ABWEICHUNGEN VOM SOLL  (${#ABW[@]}) — Soll: .claude/rules/agenten-arbeitsplatz.md"
  for a in "${ABW[@]}"; do echo "  · $a"; done
  echo
  echo "  Abweichung ist zulaessig, Verschweigen nicht: Jede Zeile gehoert mit Begruendung"
  echo "  ins server-register.md der Zentrale — oder sie wird behoben."
fi
echo "NICHT MASCHINELL PRUEFBAR (von Hand gegen das Register): A2 Versionsgleichheit ueber alle"
echo "  Maschinen · A3 Eigentuemer = Agenten-Benutzer · A5 Arbeitsverzeichnis = deklarierter"
echo "  DEV-Checkout · A8 meldet dieses Projekt taeglich Berichte?"
echo
exit 0
