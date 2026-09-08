#!/usr/bin/env bash
# =============================================================================
# OneCampus Abschluss-Guard — einheitlich für ALLE Repos (Standard v2.6)
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
# ausgewiesen — niemals als bestanden behauptet. Fehlende Werkzeuge stehen als Zeile
# "OFFEN (n/v)" im Verdikt (seit v2.14 nicht mehr in docs/98-OFFENE-BAUSTELLEN.md).
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

# NV: STRUKTURELLE Lücken des Repos (fehlendes Skript, fehlende Guards) — sie erscheinen
# als Zeile "OFFEN (n/v)" im Verdikt und werden in jeder Abschlussantwort zitiert (v2.14).
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
# Namensvarianten: Die Repos benennen dieselbe Pruefung unterschiedlich — was hier
# `typecheck` heisst, laeuft anderswo als `check` (jeweils `tsc`), und `test` heisst in
# einem der Tool-Repos `test:server` (vitest). Ohne diese Liste behauptete der Guard
# "Skript fehlt", obwohl die Pruefung existiert — und schriebe diese Falschaussage
# dauerhaft in die offenen Punkte (Fund 12.08.2026).
# KEINE PROJEKTNAMEN in dieser Datei: Sie wird in ALLE Repos verteilt, auch in das
# oeffentliche Website-Repo, das interne Werkzeugnamen per Test verbietet
# (`tests/payload/unit/interne-begriffe.test.ts`). Ein Name im Kommentar laesst dort
# die CI rot werden — belegt am 28.08.2026.
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

# --- D5: Abloese-Hinweise beidseitig? (Dokumenten-Hygiene, ab v2.5) --------
# Anlass (27.08.2026): In einem Repo lagen drei Dokumente zur selben Entscheidung
# nebeneinander. Das NEUE nannte korrekt "Loest ab: X" — das abgeloeste X trug keinen
# Hinweis darauf. Eine Session las X, hielt es fuer gueltig und berichtete einen falschen
# Befund. Nur das neue Dokument zu kennzeichnen genuegt nicht: Gelesen wird, was die Suche
# zuerst findet, nicht das Dokument, das die Abloesung erklaert.
# Diese Pruefung ist deterministisch: Nennt ein geaendertes Dokument eine Abloesung, muss
# das genannte Ziel den Gegenhinweis tragen.
# WARNUNG, kein harter Fehler — Altbestand soll sichtbar werden, nicht ganze Repos blockieren.
d5_treffer=0; d5_offen=0; d5_unaufloesbar=0; D5HITS=""
# Doppelpunkt ist PFLICHT: "ersetzt" ist gewoehnliche deutsche Prosa ("Klicks ersetzt
# durch ..."), "Ersetzt:" dagegen eine Metadatenzeile. Ohne diese Verschaerfung erzeugt
# der Guard Muell-Ziele wie 'Klicks' oder '|' (Fund 27.08.2026, erster Realtest).
ABL_NENNT='([Ll]öst ab|[Ll]oest ab|[Ee]rsetzt|[Ss]upersedes)[[:space:]]*\**[[:space:]]*:[[:space:]]*\**[[:space:]]*'
ABL_TRAEGT='([Aa]bgelöst durch|[Aa]bgeloest durch|[Ss]uperseded by|veraltet|überholt|ueberholt)'
for f in "${CHANGED[@]}"; do
  case "$f" in *.md) ;; *) continue;; esac
  [ -f "$f" ] || continue
  ist_ausgenommen "$f" && continue
  # Zieldokument aus der Nennung ziehen: Backtick-Pfad, *.md-Name oder Kennung (z. B. TR-ADR-001)
  while IFS= read -r ziel; do
    [ -n "$ziel" ] || continue
    # Ziel muss wie ein Dokumentbezug aussehen: Dateiname, Pfad oder Kennung (TR-ADR-001).
    # Alles andere ist ein Prosa-Fehltreffer und wird still verworfen — ein Guard, der
    # Rauschen meldet, wird weggeklickt und schuetzt dann gar nichts mehr.
    # Mindestlaenge und ein Buchstabe sind Pflicht: Ein Dokument, das die Muster selbst
    # BESCHREIBT ("Löst ab: / Ersetzt: / Supersedes:"), erzeugte sonst das Ziel '/'
    # (Fund 27.08.2026 im eigenen Repo — der Guard meldete sich selbst).
    case "$ziel" in
      ?|??) continue ;;
      *[A-Za-z]*) ;;
      *) continue ;;
    esac
    case "$ziel" in
      *.md|*/*) ;;
      *[A-Za-z][-_][A-Za-z0-9]*) ;;
      *) continue ;;
    esac
    d5_treffer=$((d5_treffer+1))
    # Kandidaten suchen: exakter Pfad, Dateiname, oder Kennung im Dateinamen (klein geschrieben)
    kand=""
    [ -f "$ziel" ] && kand="$ziel"
    [ -z "$kand" ] && kand="$(find . -path ./node_modules -prune -o -type f -name "$(basename "$ziel")" -print 2>/dev/null | head -1)"
    [ -z "$kand" ] && kand="$(find . -path ./node_modules -prune -o -type f -iname "*$(echo "$ziel" | tr 'A-Z' 'a-z' | tr -d ' ')*.md" -print 2>/dev/null | head -1)"
    if [ -z "$kand" ]; then
      d5_unaufloesbar=$((d5_unaufloesbar+1))
      D5HITS="${D5HITS}\n  $f nennt Ablösung von '$ziel' — Zieldokument nicht auffindbar (nicht auflösbar)"
    elif ! grep -qEi "$ABL_TRAEGT" "$kand" 2>/dev/null; then
      d5_offen=$((d5_offen+1))
      D5HITS="${D5HITS}\n  ${kand#./} trägt KEINEN Ablöse-Hinweis, obwohl ${f} es ablöst"
    fi
  # Nur die Kennung/den Dateinamen nehmen, nicht den erklaerenden Folgetext:
  # "TR-ADR-001 (Cookiebot als zentrale CMP)" -> "TR-ADR-001". Ohne das wird das Ziel
  # unauffindbar und der Guard meldet faelschlich "nicht aufloesbar" (Fund 27.08.2026).
  done < <(grep -hoEi "$ABL_NENNT[^,;.()]*" "$f" 2>/dev/null \
            | sed -E "s/$ABL_NENNT//I" | tr -d '`*' | awk '{print $1}' | grep -v '^$' | head -5)
done
if [ "$d5_treffer" -eq 0 ]; then d5="keine Ablöse-Erklärung im Diff — n/a  ✓"
elif [ "$d5_offen" -eq 0 ] && [ "$d5_unaufloesbar" -eq 0 ]; then d5="$d5_treffer Ablösung(en), Gegenhinweis überall vorhanden  ✓"
else d5="$d5_treffer Ablösung(en) · $d5_offen ohne Gegenhinweis · $d5_unaufloesbar nicht auflösbar  ⚠"; fi

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

# --- D6: Grunddeklaration der Repo-CLAUDE.md (ab v2.6) ----------------------
# Kernvertrag Paragraf 6 verlangt: "Branch <-> Umgebung <-> DB <-> Deploy-Wirkung und das
# Tier (A/B/C) stehen ausformuliert in der Repo-CLAUDE.md." Beim Vollabgleich am 27.08.2026
# zeigte sich: Ausgerechnet das Repo mit dem groessten Kontrollapparat (710 Hook-Zeilen,
# 24 CI-Workflows) hatte weder Umgebungstabelle noch Tier-Block — und zwei weitere Repos
# trugen nur einen Platzhalter "noch nicht erhoben". Ein Agent arbeitet dort blind an
# unbekannter Deploy-Wirkung. Das ist deterministisch pruefbar, also gehoert es in die
# Maschine statt in eine Regel, an die sich jemand erinnern muss.
# WARNUNG, kein harter Fehler: Der Befund soll sichtbar werden, nicht die Arbeit blockieren.
d6=""
if [ -f CLAUDE.md ]; then
  fehlt=()
  grep -qE 'Tier [ABC]' CLAUDE.md || fehlt+=("Tier-Block")
  grep -qiE '^\|[[:space:]]*(PROD|DEV|TEST|WWW2|Umgebung|Arbeitsbranch)' CLAUDE.md || fehlt+=("Umgebungstabelle")
  grep -qiE 'noch nicht erhoben' CLAUDE.md && fehlt+=("nur Platzhalter statt Steckbrief")
  [ -f .claude/prod-branches.conf ] || fehlt+=("prod-branches.conf")
  if [ "${#fehlt[@]}" -eq 0 ]; then d6="Tier · Umgebungen · PROD-Branches deklariert  ✓"
  else d6="$(join "${fehlt[@]}") fehlt  ⚠"; NV+=("Grunddeklaration unvollständig: $(join "${fehlt[@]}") (Kernvertrag §6)"); fi
else
  d6="keine CLAUDE.md — n/v"; NV+=("keine Repo-CLAUDE.md vorhanden (Kernvertrag §6)")
fi

# --- Offene Punkte: seit v2.14 NICHT mehr in 98 geschrieben ----------------------
# Bis v2.13 hängte der Guard jeden n/v-Befund an docs/98-OFFENE-BAUSTELLEN.md an.
# Folge: Automatikzeilen in leeren Repos, und 98 wurde zum Parkplatz (Betreiber
# 08.09.2026). Lücken bleiben sichtbar — im Verdikt-Block unten (Zeile OFFEN),
# in jeder Abschlussantwort zitiert. Wer sie schließen will, trägt das Werkzeug ein.

# --- Verdikt -----------------------------------------------------------------
printf '\nGUARD-VERDIKT  %s @ %s\n' "$REPO" "$SHA"
printf 'D0 Werkzeuge   %s\n' "$d0"
printf 'D1 Secrets     %s\n' "$d1"
[ -n "$HITS" ] && printf '%b\n' "$HITS"
printf 'D2 Hygiene     %s\n' "$d2"
printf 'D3 Doku        %s\n' "$d3"
printf 'D4 Repo-Guards %s\n' "$d4"
printf 'D5 Doku-Ablösung %s\n' "$d5"
printf 'D6 Deklaration %s\n' "$d6"
if [ "${#NV[@]}" -gt 0 ]; then printf 'OFFEN (n/v)    %s\n' "$(join "${NV[@]}")"; fi
[ -n "$D5HITS" ] && printf '%b\n' "$D5HITS"
if [ "$FAIL" -eq 0 ]; then printf 'VERDIKT: BESTANDEN\n\n'; exit 0
else printf 'VERDIKT: NICHT BESTANDEN\n\n'; exit 1; fi
