#!/usr/bin/env bash
# =============================================================================
# bericht-melden.sh — Standardwerkzeug des OneCampus-Berichtswesens (v2.11)
#
# Nimmt den INHALT eines Berichts auf stdin und erledigt alles Drumherum:
# Kopfsatz, Dateiname, Ablage im Repo BCB-BK/ocg-architekt, Nachtragsregel,
# Commit und Push. Ein Projekt liefert nur, was es gemessen hat.
#
# WARUM ZENTRAL: Jede Ablage, die jedes Projekt selbst baut, weicht ab - und
# eine Ablage, die je Quelle anders aussieht, ist maschinell wertlos. Die
# Mechanik gehoert deshalb ins Standardpaket, die Messung ins Projekt.
#
# AUFRUF
#   messen.sh | bericht-melden.sh --quelle ehip.eu --art betrieb \
#       --status ok --befunde 0 [--erzeugt-von "scripts/x.sh"] \
#       [--stufen "prod, stage, dev"] [--datum 2026-08-29] \
#       [--zusatz zusatz.yml] [--trockenlauf]
#
# --zusatz  Datei mit weiteren Kopfsatz-Zeilen (z. B. der zustellung-Block).
#           Wird unveraendert vor die schliessende --- gesetzt.
# --trockenlauf  schreibt nichts, gibt den fertigen Bericht auf stdout aus.
#
# ABLAGE: $BERICHT_ABLAGE (Vorgabe: ~/.berichte-ablage/ocg-architekt).
# Existiert sie nicht, wird geklont - dafuer muss `gh` angemeldet oder ein
# Deploy-Key hinterlegt sein.
#
# NIE UEBERSCHREIBEN (Regel 1): Existiert der Bericht des Tages bereits und ist
# er committet, wird ein Abschnitt "Nachtrag <Uhrzeit>" angehaengt.
# =============================================================================
set -uo pipefail

REPO_URL="${BERICHT_REPO:-https://github.com/BCB-BK/ocg-architekt.git}"
ABLAGE="${BERICHT_ABLAGE:-$HOME/.berichte-ablage/ocg-architekt}"
BRANCH="${BERICHT_BRANCH:-claude/main}"

QUELLE=""; ART=""; STATUS=""; BEFUNDE=""; ERZEUGT=""; STUFEN=""
DATUM="$(date +%F)"; ZUSATZ=""; TROCKEN=0

while [ $# -gt 0 ]; do
  case "$1" in
    --quelle)      QUELLE="$2"; shift 2 ;;
    --art)         ART="$2"; shift 2 ;;
    --status)      STATUS="$2"; shift 2 ;;
    --befunde)     BEFUNDE="$2"; shift 2 ;;
    --erzeugt-von) ERZEUGT="$2"; shift 2 ;;
    --stufen)      STUFEN="$2"; shift 2 ;;
    --datum)       DATUM="$2"; shift 2 ;;
    --zusatz)      ZUSATZ="$2"; shift 2 ;;
    --trockenlauf) TROCKEN=1; shift ;;
    *) echo "ABBRUCH: unbekannte Option $1" >&2; exit 2 ;;
  esac
done

fehlt() { echo "ABBRUCH: --$1 fehlt" >&2; exit 2; }
[ -n "$QUELLE" ]  || fehlt quelle
[ -n "$ART" ]     || fehlt art
[ -n "$STATUS" ]  || fehlt status
[ -n "$BEFUNDE" ] || fehlt befunde

case "$ART" in
  betrieb|zustellung|arbeit|audit|vorfall) ;;
  *) echo "ABBRUCH: --art $ART ist keine der erlaubten Arten (betrieb, zustellung, arbeit, audit, vorfall)" >&2; exit 2 ;;
esac
case "$STATUS" in
  ok|hinweis|fehler) ;;
  *) echo "ABBRUCH: --status $STATUS ist keiner von ok, hinweis, fehler" >&2; exit 2 ;;
esac
case "$BEFUNDE" in
  ''|*[!0-9]*) echo "ABBRUCH: --befunde muss eine Zahl sein" >&2; exit 2 ;;
esac
case "$DATUM" in
  [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]) ;;
  *) echo "ABBRUCH: --datum muss JJJJ-MM-TT sein" >&2; exit 2 ;;
esac

# Die eine inhaltliche Pruefung, die das Werkzeug leisten kann: Ein Bericht,
# der Befunde zaehlt und trotzdem "ok" meldet, widerspricht sich selbst.
if [ "$STATUS" = ok ] && [ "$BEFUNDE" -gt 0 ]; then
  echo "ABBRUCH: status=ok bei befunde=$BEFUNDE — das widerspricht sich." >&2
  echo "         Entweder sind es keine Befunde, oder der Status ist hinweis/fehler." >&2
  exit 2
fi

INHALT="$(cat)"
[ -n "$INHALT" ] || { echo "ABBRUCH: kein Inhalt auf stdin" >&2; exit 2; }

bericht() {
  echo "---"
  echo "quelle: $QUELLE"
  echo "datum: $DATUM"
  echo "art: $ART"
  echo "status: $STATUS"
  echo "befunde: $BEFUNDE"
  [ -n "$ERZEUGT" ] && echo "erzeugt_von: $ERZEUGT"
  [ -n "$STUFEN" ] && echo "stufen: [$STUFEN]"
  [ -n "$ZUSATZ" ] && [ -f "$ZUSATZ" ] && cat "$ZUSATZ"
  echo "---"
  echo
  printf '%s\n' "$INHALT"
}

if [ "$TROCKEN" -eq 1 ]; then bericht; exit 0; fi

if [ ! -d "$ABLAGE/.git" ]; then
  mkdir -p "$(dirname "$ABLAGE")" || exit 1
  git clone -q --branch "$BRANCH" "$REPO_URL" "$ABLAGE" || {
    echo "ABBRUCH: Ablage $ABLAGE konnte nicht geklont werden (gh angemeldet? Deploy-Key?)" >&2; exit 1; }
fi

cd "$ABLAGE" || exit 1
git pull -q --ff-only 2>/dev/null
ZIEL="berichte/$QUELLE"
mkdir -p "$ZIEL"
DATEI="$ZIEL/$DATUM-$ART.md"

if [ -f "$DATEI" ] && git ls-files --error-unmatch "$DATEI" >/dev/null 2>&1; then
  { echo; echo "## Nachtrag $(date +%H:%M)"; echo; printf '%s\n' "$INHALT"; } >> "$DATEI"
  WAS="Nachtrag"
else
  bericht > "$DATEI"
  WAS="Bericht"
fi

git add "$ZIEL" >/dev/null 2>&1
if git diff --cached --quiet; then echo "Keine Aenderung — nichts zu melden."; exit 0; fi
git commit -q -m "berichte/$QUELLE: $ART $DATUM ($STATUS, $BEFUNDE Befund(e))

Automatisch gemeldet von ${ERZEUGT:-bericht-melden.sh}."
if git push -q origin "$BRANCH" 2>/dev/null; then
  echo "$WAS gemeldet: $QUELLE $DATUM $ART — status=$STATUS befunde=$BEFUNDE"
else
  echo "FEHLER: Push fehlgeschlagen — Commit liegt lokal in $ABLAGE" >&2
  exit 1
fi
