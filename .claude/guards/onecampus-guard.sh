#!/usr/bin/env bash
# =============================================================================
# OneCampus Abschluss-Guard — einheitlich für ALLE Repos (Standard v2.3)
#
# Zweck: EINE Abschlussprüfung, die überall läuft — unabhängig davon, ob im Repo
# schon Werkzeuge existieren. Bringt Mindestprüfungen selbst mit (D1–D3) und
# nutzt zusätzlich, was das Repo bietet (D0, D4). Gibt ein Verdikt mit Zahlen
# aus und endet mit Exit 0 (BESTANDEN) oder 1 (NICHT BESTANDEN).
#
# Aufruf im Repo-Wurzelverzeichnis:  bash .claude/guards/onecampus-guard.sh
# Optionen:  --quick   nur D1–D3 (schnell, ohne Tests/Builds)
#            --base X  Vergleichsbasis für den Diff (Default: HEAD)
#
# Grundsatz (Kernvertrag §5): Was nicht geprüft werden konnte, wird als "n/v"
# ausgewiesen — niemals als bestanden behauptet. Fehlende Werkzeuge landen als
# offener Punkt in docs/98-OFFENE-BAUSTELLEN.md, damit die Lücke sichtbar bleibt.
# =============================================================================
set -uo pipefail

QUICK=0; BASE="HEAD"
while [ $# -gt 0 ]; do
  case "$1" in
    --quick) QUICK=1 ;;
    --base)  shift; BASE="${1:-HEAD}" ;;
  esac; shift
done

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "FEHLER: kein git-Repo." >&2; exit 1; }
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT"
REPO="$(basename "$ROOT")"; SHA="$(git rev-parse --short HEAD 2>/dev/null || echo '—')"

# NV: STRUKTURELLE Lücken des Repos (fehlendes Skript, fehlende Guards) — sie werden in
# docs/98-OFFENE-BAUSTELLEN.md fortgeschrieben, damit sie nicht in Vergessenheit geraten.
# NICHT hierher gehören vorübergehende Zustände der Umgebung (z. B. nicht installierte
# Abhaengigkeiten in einem frischen Checkout): Die stehen als "n/v" im Verdikt, wo sie
# hingehoeren. Wuerde der Guard sie eintragen, verschmutzte er die Dauer-Dokumentation
# jedes Repos mit einer Eigenschaft des gerade benutzten Rechners (Fund 12.08.2026).
FAIL=0; NV=()
d0=""; d1=""; d2=""; d3=""; d4=""

# --- Diff-Umfang bestimmen: geänderte + neue Dateien (ohne Löschungen) -------
mapfile -t CHANGED < <(
  { git diff --name-only --diff-filter=d "$BASE" 2>/dev/null
    git ls-files --others --exclude-standard; } | sort -u | grep -v '^$' || true
)
COUNT=${#CHANGED[@]}

# --- Paketmanager / Sprache erkennen ----------------------------------------
PM=""; [ -f pnpm-lock.yaml ] && PM="pnpm"; [ -z "$PM" ] && [ -f package-lock.json ] && PM="npm"
[ -z "$PM" ] && [ -f package.json ] && PM="npm"
PHP=0; [ -f composer.json ] && PHP=1
# Ohne installierte Abhaengigkeiten koennen Repo-Werkzeuge nicht laufen. Das ist
# KEIN Fehler der Aenderung, sondern ein nicht pruefbarer Zustand — sonst meldet
# der Guard auf jedem frischen Checkout falschen Alarm (Fund 11.08.2026).
DEPS=1; { [ -f package.json ] && [ ! -d node_modules ]; } && DEPS=0

join() { local sep=" · " out=""; for x in "$@"; do out="${out:+$out$sep}$x"; done; printf '%s' "$out"; }
has_script() { [ -f package.json ] && node -e "process.exit(require('./package.json').scripts?.['$1']?0:1)" 2>/dev/null; }
# Namensvarianten: Die Repos benennen dieselbe Pruefung unterschiedlich — `typecheck`
# (FlowCore, Research, Vault, Website) heisst anderswo `check` (ASOS, belege, PLATO:
# jeweils `tsc`), `test` heisst bei PLATO `test:server` (vitest). Ohne diese Liste
# behauptete der Guard "Skript fehlt", obwohl die Pruefung existiert — und schriebe
# diese Falschaussage dauerhaft in die offenen Punkte (Fund 12.08.2026).
# Erste gefundene Variante gewinnt; der tatsaechlich gelaufene Name steht im Verdikt.
finde_script() { # finde_script <dimension> -> gibt Skriptnamen aus oder nichts
  local kandidaten="" s
  case "$1" in
    typecheck) kandidaten="typecheck check check:types tsc types" ;;
    lint)      kandidaten="lint lint:check eslint" ;;
    test)      kandidaten="test test:server test:unit tests" ;;
  esac
  for s in $kandidaten; do has_script "$s" && { printf '%s' "$s"; return 0; }; done
  return 1
}
run_script() { # run_script <name> -> setzt RES ("✓"/"✗"), gibt Ausgabe in $OUT
  OUT="$($PM run "$1" 2>&1)"; if [ $? -eq 0 ]; then RES="✓"; else RES="✗"; FAIL=1; fi
}

# --- D0: Werkzeuge des Repos (typecheck/lint/test) ---------------------------
if [ "$QUICK" -eq 1 ]; then
  d0="übersprungen (--quick)"
else
  parts=()
  for dim in typecheck lint test; do
    s="$(finde_script "$dim")" || s=""
    # Anzeigename: bei abweichendem Skriptnamen beide nennen, damit nachvollziehbar
    # bleibt, WAS gelaufen ist (z. B. "typecheck(check) ✓").
    name="$dim"; [ -n "$s" ] && [ "$s" != "$dim" ] && name="$dim($s)"
    if [ -n "$s" ] && [ "$DEPS" -eq 1 ]; then
      run_script "$s"; parts+=("$name $RES")
    elif [ -n "$s" ]; then
      parts+=("$name n/v — Abhaengigkeiten fehlen")   # vorübergehend, kein Eintrag in die offenen Punkte
    else
      parts+=("$dim n/v"); NV+=("$dim-Skript fehlt (D0 nicht prüfbar)")
    fi
  done
  [ "$PHP" -eq 1 ] && [ -f vendor/bin/phpstan ] && { vendor/bin/phpstan analyse -q >/dev/null 2>&1 && parts+=("phpstan ✓") || { parts+=("phpstan ✗"); FAIL=1; }; }
  d0="$(join "${parts[@]}")"
fi

# --- D1: Secrets (Guard-eigen, fail-closed) ----------------------------------
# Ausnahmen: Manche Repos tracken legitime VORLAGEN (z. B. `_dev/.env.prod` als
# Muster zum Kopieren). Statt das Suchmuster global aufzuweichen — was die Pruefung
# ueberall entwerten wuerde — traegt das jeweilige Repo solche Pfade in
# `.claude/guard-ausnahmen.conf` ein, je Zeile EIN Glob mit PFLICHT-Begruendung:
#     _dev/.env.prod   # Upstream-Vorlage, nur Platzhalter
# Ohne Begruendung gilt der Eintrag NICHT (eine unbegruendete Ausnahme ist keine).
# Die Anzahl erscheint im Verdikt — freigestellt heisst sichtbar, nicht verschwunden.
AUSN=(); AUSN_OHNE_GRUND=0
if [ -f .claude/guard-ausnahmen.conf ]; then
  while IFS= read -r line; do
    case "$line" in ''|'#'*) continue;; esac
    glob="${line%%#*}"; grund="${line#*#}"
    glob="$(echo "$glob" | xargs 2>/dev/null)"          # Rand-Leerzeichen entfernen
    [ -n "$glob" ] || continue
    if [ "$grund" = "$line" ] || [ -z "$(echo "$grund" | xargs 2>/dev/null)" ]; then
      AUSN_OHNE_GRUND=$((AUSN_OHNE_GRUND+1)); continue
    fi
    AUSN+=("$glob")
  done < .claude/guard-ausnahmen.conf
fi
ist_ausgenommen() { # ist_ausgenommen <pfad>
  local f="$1" g
  for g in ${AUSN[@]+"${AUSN[@]}"}; do
    # shellcheck disable=SC2053  — Glob-Vergleich ist hier beabsichtigt
    [[ "$f" == $g ]] && return 0
  done
  return 1
}

sec=0
# 1a) getrackte .env-Dateien
mapfile -t ENVALLE < <(git ls-files | grep -E '(^|/)\.env(\..*)?$' | grep -v '\.example$' || true)
ENVTRACKED=(); AUSN_TREFFER=0
for f in ${ENVALLE[@]+"${ENVALLE[@]}"}; do
  if ist_ausgenommen "$f"; then AUSN_TREFFER=$((AUSN_TREFFER+1)); else ENVTRACKED+=("$f"); fi
done
# 1b) Secret-Muster in geänderten/neuen Dateien (Textdateien, ohne Lockfiles/vendor)
PATTERNS='(AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|(password|passwd|secret|api[_-]?key|token)[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"'$\{][^"'"'"']{7,}["'"'"'])'
HITS=""
for f in "${CHANGED[@]}"; do
  case "$f" in *lock*|vendor/*|node_modules/*|*.min.*|*.svg|*.png|*.jpg|*.pdf|*.zip) continue;; esac
  [ -f "$f" ] || continue
  ist_ausgenommen "$f" && { AUSN_TREFFER=$((AUSN_TREFFER+1)); continue; }
  file --mime "$f" 2>/dev/null | grep -q 'charset=binary' && continue
  h="$(grep -nEi "$PATTERNS" "$f" 2>/dev/null | grep -viE '(example|dummy|placeholder|dein-|<your|xxx|\*\*\*)' | head -3)"
  [ -n "$h" ] && { HITS="${HITS}\n  $f: $(echo "$h" | head -1 | cut -c1-90)"; sec=$((sec+1)); }
done
ausn_txt=""
[ "$AUSN_TREFFER" -gt 0 ] && ausn_txt=" · $AUSN_TREFFER dokumentierte Ausnahme(n)"
if [ "$AUSN_OHNE_GRUND" -gt 0 ]; then
  # Eine Ausnahme ohne Begruendung wird nicht angewandt UND nicht verschwiegen.
  ausn_txt="$ausn_txt · $AUSN_OHNE_GRUND Ausnahme(n) OHNE Begründung — unwirksam"
fi
if [ "${#ENVTRACKED[@]}" -gt 0 ] || [ "$sec" -gt 0 ]; then
  d1="$sec Fund(e) im Diff · ${#ENVTRACKED[@]} getrackte .env$ausn_txt  ✗"; FAIL=1
  for f in ${ENVTRACKED[@]+"${ENVTRACKED[@]}"}; do HITS="${HITS}\n  getrackte .env: $f"; done
else
  d1="0 Funde in $COUNT Datei(en) · keine .env getrackt$ausn_txt  ✓"
fi

# --- D2: Hygiene (Debug-Reste, große Binärdateien) ---------------------------
dbg=0; big=0
for f in "${CHANGED[@]}"; do
  case "$f" in vendor/*|node_modules/*|*.min.*|*test*|*spec*|*.md) ;; esac
  [ -f "$f" ] || continue
  sz=$(stat -c%s "$f" 2>/dev/null || echo 0); [ "$sz" -gt 5242880 ] && big=$((big+1))
  case "$f" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
      case "$f" in *test*|*spec*|*scripts/*) continue;; esac
      grep -qE '(^|[^.\w])(console\.log|debugger)\b' "$f" 2>/dev/null && dbg=$((dbg+1)) ;;
    *.php)
      grep -qE '(^|[^\w])(var_dump|dd|dump)\(' "$f" 2>/dev/null && dbg=$((dbg+1)) ;;
  esac
done
if [ "$dbg" -gt 0 ] || [ "$big" -gt 0 ]; then
  d2="$dbg Debug-Rest(e) · $big Datei(en) >5 MB  ⚠"   # Warnung, kein harter Fehler
else
  d2="0 Debug-Reste · 0 große Binärdateien  ✓"
fi

# --- D3: Doku-Frische (Code geändert ⇒ Doku/Changelog berührt?) --------------
code=0; docs=0
for f in "${CHANGED[@]}"; do
  # Die Offene-Punkte-Datei schreibt dieser Guard selbst — sie ist kein Doku-Nachweis
  # fuer die Aenderung (sonst bestaetigt der Guard sich selbst).
  case "$f" in *98-OFFENE-BAUSTELLEN.md) continue;; esac
  case "$f" in
    *.md|docs/*) docs=$((docs+1)) ;;
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.php|*.sql|*.yml|*.yaml|*.sh) code=$((code+1)) ;;
  esac
done
if [ "$code" -eq 0 ]; then d3="keine Code-Änderung — n/a  ✓"
elif [ "$docs" -gt 0 ]; then d3="$code Code- / $docs Doku-Datei(en)  ✓"
else d3="$code Code-Datei(en), aber KEINE Doku berührt  ⚠"; fi

# --- D4: Repo-eigene Guards (falls vorhanden) --------------------------------
if [ "$QUICK" -eq 1 ]; then
  d4="übersprungen (--quick)"
else
  extra=()
  for s in validate task-completion-audit no-hardcode-check docs:check; do
    has_script "$s" && [ "$DEPS" -eq 1 ] && { run_script "$s"; extra+=("$s $RES"); }
  done
  if [ "${#extra[@]}" -gt 0 ]; then d4="$(join "${extra[@]}")"
  elif [ "$DEPS" -eq 0 ]; then d4="n/v — Abhaengigkeiten nicht installiert"
  else d4="keine repo-eigenen Guards vorhanden — n/v"; NV+=("keine repo-eigenen Guards (D4 nicht prüfbar)"); fi
fi

# --- Offene Punkte fortschreiben (Lücken bleiben sichtbar) -------------------
if [ "${#NV[@]}" -gt 0 ]; then
  OPEN="docs/98-OFFENE-BAUSTELLEN.md"; mkdir -p docs
  [ -f "$OPEN" ] || printf '# Offene Baustellen\n\n' > "$OPEN"
  # Endet die Datei ohne Zeilenumbruch, klebte der Eintrag bisher an die letzte Zeile
  # und war dort praktisch unsichtbar (Fund 12.08.2026, PLATO).
  [ -s "$OPEN" ] && [ "$(tail -c1 "$OPEN" | od -An -c | tr -d ' ')" != '\n' ] && printf '\n' >> "$OPEN"
  for n in "${NV[@]}"; do
    grep -qF "$n" "$OPEN" 2>/dev/null || echo "- [ ] Guard-Befund: $n (automatisch eingetragen)" >> "$OPEN"
  done
fi

# --- Verdikt -----------------------------------------------------------------
printf '\nGUARD-VERDIKT  %s @ %s\n' "$REPO" "$SHA"
printf 'D0 Werkzeuge   %s\n' "$d0"
printf 'D1 Secrets     %s\n' "$d1"
[ -n "$HITS" ] && printf '%b\n' "$HITS"
printf 'D2 Hygiene     %s\n' "$d2"
printf 'D3 Doku        %s\n' "$d3"
printf 'D4 Repo-Guards %s\n' "$d4"
if [ "$FAIL" -eq 0 ]; then printf 'VERDIKT: BESTANDEN\n\n'; exit 0
else printf 'VERDIKT: NICHT BESTANDEN\n\n'; exit 1; fi
