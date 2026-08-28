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
  zeile "Pfad" "$(command -v claude)"
  zeile "Version" "$(claude --version 2>/dev/null | head -1 || echo "$unbekannt")"
else
  zeile "Status" "NICHT INSTALLIERT"
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
  else
    echo "$s" | sed 's/^/                       /'
  fi
else
  zeile "tmux" "NICHT INSTALLIERT — eine dauerhafte Agenten-Sitzung ist so nicht moeglich"
fi
echo

# ── 5. Git-Checkouts und gesehener Standardstand ────────────────────────────────────────────
echo "── Git-Checkouts und Standardstand ─────────────────────────────────────"
# Getrennt ausgewiesen: Checkouts MIT Standard (das ist die eigentliche Frage) und die
# uebrigen (Werkzeuge wie nvm/rbenv, nur zur Vollstaendigkeit gezaehlt).
mit=0; ohne=0; verweigert=0; sonstige=""
for wurzel in "$HOME" /home /var/www /srv /opt; do
  [ -d "$wurzel" ] || continue
  while IFS= read -r g; do
    d=$(dirname "$g")
    if [ -r "$d/CLAUDE-STANDARD.md" ]; then
      mit=$((mit+1))
      br=$(git -C "$d" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "$unbekannt")
      sha=$(git -C "$d" rev-parse --short HEAD 2>/dev/null || echo "$unbekannt")
      v=$(grep -m1 -o 'Version [0-9][0-9.]*' "$d/CLAUDE-STANDARD.md" 2>/dev/null || echo "$unbekannt")
      printf '  %s\n' "$d"
      printf '      Branch %-24s Commit %-10s %s\n' "$br" "$sha" "$v"
    else
      ohne=$((ohne+1)); sonstige="${sonstige}${d} "
    fi
  done < <(find "$wurzel" -maxdepth 4 -name .git -type d 2>/dev/null | sort -u)
  find "$wurzel" -maxdepth 4 -name .git -type d 2>&1 >/dev/null | grep -q 'Permission denied' \
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
    *Permission\ denied*)          zeile "SSH zu GitHub" "KEIN ZUGANG (Permission denied) — kein nutzbarer Schluessel" ;;
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

# ── Verdikt ─────────────────────────────────────────────────────────────────────────────────
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
exit 0
