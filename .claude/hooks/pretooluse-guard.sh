#!/usr/bin/env bash
# =============================================================================
# OneCampus PreToolUse-Guard — blockt destruktive/PROD-wirksame Kommandos hart.
# Registriert als PreToolUse-Hook (matcher: Bash) in .claude/settings.json.
# Liest den Tool-Aufruf als JSON von stdin; Exit 2 = blockieren (Meldung auf
# stderr geht an den Agenten), Exit 0 = durchlassen.
# Freigabe-Mechanik: Der Betreiber kann einen Lauf gezielt erlauben, indem er
# die Datei .claude/ALLOW-DANGEROUS (im Repo-Root) anlegt; sie gilt EINMAL und
# wird vom Guard verbraucht (gelöscht). So bleibt jede Ausnahme eine bewusste,
# sichtbare Einzelentscheidung.
# =============================================================================
set -euo pipefail
INPUT="$(cat)"
CMD_ROH="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"

# --- Heredoc-Inhalte sind Daten, nicht Kommandos (v2.16) --------------------
# Wer eine Konfigurationsdatei schreibt, die Sperrmuster BENENNT, loeste bisher
# einen Fehlalarm aus: `cat > settings.json <<EOF ... "git push --force" ... EOF`
# wurde blockiert, obwohl nichts ausgefuehrt wird. Dieselbe Fehlerklasse wie ein
# Wachalarm auf der falschen Adresse — und sie kostet genau die Reibung, die
# diese Fassung abschaffen soll. (Aufgetreten 10.09.2026 beim Schreiben der
# neuen settings-Vorlage: der Guard blockierte sein eigenes Regelwerk.)
#
# Ausgeklammert wird der Rumpf NUR, wenn das Kommando vor dem Heredoc in eine
# DATEI schreibt (cat/tee/Umleitung). Geht der Heredoc an einen Interpreter
# (bash, sh, python, psql ...), bleibt er vollstaendig in der Pruefung — dort
# ist er auszufuehrender Code, keine Datei.
CMD="$(printf '%s' "$CMD_ROH" | awk '
  BEGIN { in_h = 0 }
  in_h == 1 { s = $0; sub(/^[ \t]+/, "", s); if (s == ende) { in_h = 0 } next }
  {
    zeile = $0
    if (match(zeile, /<<-?[ ]*[A-Za-z_'"'"'"][A-Za-z0-9_'"'"'"]*/)) {
      kopf = substr(zeile, 1, RSTART - 1)
      rest = substr(zeile, RSTART + RLENGTH)
      # Der ZEILENREST hinter der Marke gehoert zur Pruefung — dort steht bei
      # `cat <<EOF | bash` der Interpreter und bei `cat <<EOF > ziel && kommando`
      # das eigentliche Kommando. Ihn wegzuwerfen war eine Luecke, durch die jede
      # Sperre umgangen werden konnte (Waechter-Befund 10.09.2026, K2/K7).
      ohne_marke = kopf rest
      schreibt = (ohne_marke ~ /(^|[|;&[:space:]])(cat|tee)([[:space:]]|$)/) || (ohne_marke ~ />[[:space:]]*[^&[:space:]]/)
      interpreter = (ohne_marke ~ /(^|[|;&[:space:]])(bash|sh|zsh|python3?|perl|ruby|node|psql|mysql)([[:space:]]|$)/)
      if (schreibt && !interpreter) {
        marke = substr(zeile, RSTART, RLENGTH)
        sub(/^<<-?[ ]*/, "", marke); gsub(/['"'"'"]/, "", marke)
        ende = marke; in_h = 1
        print ohne_marke
        next
      }
    }
    print zeile
  }')"
[ -z "$CMD" ] && CMD="$CMD_ROH"
[ -n "$CMD" ] || exit 0

ALLOW_FILE="$(pwd)/.claude/ALLOW-DANGEROUS"
if [ -f "$ALLOW_FILE" ]; then rm -f "$ALLOW_FILE"; exit 0; fi

block() { echo "GUARD-BLOCK: $1 — verboten ohne ausdrückliche Betreiber-Freigabe (Regel: standards/rules/git-sicherheit.md bzw. umgebungen-migrationen.md). Freigabeweg: Betreiber legt .claude/ALLOW-DANGEROUS an (gilt für genau einen Aufruf)." >&2; exit 2; }

case "$CMD" in
  *"git push"*--force*|*"git push"*-f\ *|*"git push"*-f) block "git push --force" ;;
esac
echo "$CMD" | grep -qE 'git\s+reset\s+--hard'        && block "git reset --hard"
echo "$CMD" | grep -qE 'git\s+clean(\s|$)'           && block "git clean"
echo "$CMD" | grep -qE 'git\s+rebase(\s|$)'          && block "git rebase"
echo "$CMD" | grep -qE 'git\s+commit\s+.*--amend'    && block "git commit --amend"
echo "$CMD" | grep -qE 'git\s+stash(\s|$)'           && block "git stash"
echo "$CMD" | grep -qE 'git\s+branch\s+(-D|-d|--delete)' && block "Branch löschen"

# --- Push-Ziel: Deklaration schlaegt Namensraten -----------------------------
# Frueher galt jeder Push mit "main"/"master" im Kommando als PROD-wirksam. Der
# Branch-NAME ist dafuer aber nur ein Indiz: trk17-columns-bundle etwa hat
# `master` als einzigen Branch und KEINE Laufzeitwirkung (die EHiP-Website bindet
# das Bundle aus einer Composer-path-Kopie im eigenen Repo ein, nicht von dort).
# Massgeblich ist deshalb die Deklaration des Repos:
#     .claude/prod-branches.conf   — ein Branchname je Zeile, Kommentar nach #,
#                                    "KEINE" wenn kein Branch PROD-wirksam ist.
# FEHLT die Datei, bleibt es beim alten, strengen Verhalten — fail-closed. Wer
# nichts deklariert, bekommt die Sperre. Die Aenderung ersetzt Raten durch Wissen,
# nicht Sperre durch Freibrief. (Fund 13.08.2026)
#
# EHRLICHE GRENZE: Diese Datei liegt im Repo und ist damit vom Agenten schreibbar
# — wie der Waechter-Marker schuetzt sie den Prozessschritt, nicht gegen boesen
# Willen. Sie ist versioniert und im Diff sichtbar; eine Aenderung daran ist
# reviewpflichtig wie Code (Kernvertrag §10).
if echo "$CMD" | grep -qE 'git[[:space:]]+push'; then
  # Fuehrt das Kommando selbst in ein Verzeichnis (cd X && git push …), gilt dessen
  # Deklaration — sonst die des Sitzungsverzeichnisses. Ohne das griffe bei einem
  # repo-uebergreifenden Rollout immer die Konfiguration des falschen Repos.
  REPO_DIR="$(pwd)"
  CD_ZIEL="$(printf '%s' "$CMD" | sed -nE 's/^[[:space:]]*cd[[:space:]]+([^&;|]+).*/\1/p' | head -1 | xargs 2>/dev/null || true)"
  [ -n "$CD_ZIEL" ] && [ -d "$CD_ZIEL/.claude" ] && REPO_DIR="$CD_ZIEL"
  CONF="$REPO_DIR/.claude/prod-branches.conf"

  if [ -f "$CONF" ]; then
    while IFS= read -r zeile || [ -n "$zeile" ]; do
      zeile="${zeile%%#*}"; zeile="$(echo "$zeile" | xargs 2>/dev/null)"
      [ -z "$zeile" ] && continue
      [ "$zeile" = "KEINE" ] && continue
      if echo "$CMD" | grep -qE "git[[:space:]]+push.*[^[:alnum:]_-]${zeile}([^[:alnum:]_/-]|\$)"; then
        block "Push auf '$zeile' — laut ${CONF#"$REPO_DIR"/} PROD-wirksam"
      fi
    done < "$CONF"
  else
    echo "$CMD" | grep -qE 'git[[:space:]]+push.*[^[:alnum:]_-](main|master)([^[:alnum:]_/-]|$)' \
      && block "Push auf main/master (PROD-wirksam angenommen — dieses Repo hat keine .claude/prod-branches.conf)"
  fi
fi
# ---------------------------------------------------------------------------
# PROD-SCHUTZ (v2.16, Betreiber-Anordnung 10.09.2026)
#
# Die Anordnung lautet: auf DEV und der Freigabestufe arbeitet der Agent frei,
# ohne Nachfrage; auf PROD liest er frei; auf PROD SCHREIBT er nur nach
# ausdruecklicher Anweisung. Die Permissions erlauben deshalb breit — und die
# einzige verbleibende Sperre steht hier. Sie muss entsprechend scharf sein.
#
# Gesperrt wird ausschliesslich SCHREIBEN, NEUSTARTEN und LOESCHEN an einem
# deklarierten PROD-Ziel. Jede lesende Operation laeuft durch: cat, grep, less,
# find, psql mit SELECT, docker logs, systemctl status, git log — alles frei,
# auch gegen PROD.
#
# Was PROD ist, steht in .claude/prod-schutz.conf (Vorlage:
# standards/settings/prod-schutz.vorlage.conf). Fehlt die Datei, gelten
# konservative Standardmuster — fail-closed, wie bei prod-branches.conf.
PROD_CONF="$(pwd)/.claude/prod-schutz.conf"
ALLOW_PROD="$(pwd)/.claude/ALLOW-PROD"

# Sammelt die PROD-Ziele als Regex-Alternativen ein.
#
# FAIL-CLOSED, UND ZWAR AN DER RICHTIGEN STELLE (korrigiert 10.09.2026):
# Eine Datei, die nur Kommentare enthaelt — genau das ist die ausgelieferte leere
# Vorlage — lieferte bisher eine leere Musterliste, und die schaltete den PROD-Block
# komplett ab. Der Zustand "Datei da, aber nichts eingetragen" war damit UNSICHERER
# als "gar keine Datei". Das ist die Umkehrung dessen, was fail-closed heisst, und
# es war in sechs Repos wirksam, nachdem der v2.16-Rollout die leere Vorlage
# verteilt hatte (Waechter-Befund K4b).
# Jetzt gilt: Nur ein ausdrueckliches `KEINE` schaltet den Schutz ab. Fehlt die
# Datei ODER steht nichts darin, greifen die konservativen Standardmuster.
STANDARDMUSTER() { printf '%s\n' '[a-zA-Z0-9_./-]*[-_]prod' '/var/www/[a-zA-Z0-9_-]*-prod'; }

prod_muster() {
  if [ -f "$PROD_CONF" ]; then
    gefunden="$(awk '''{ sub(/#.*/, ""); gsub(/^[ \t]+|[ \t]+$/, "") }
          $1 == "KEINE" { print "__KEINE__"; next }
          $1 ~ /^(PFAD|DB|HOST|DIENST)$/ && $2 != "" { print $2 }''' "$PROD_CONF")"
    if [ -n "$gefunden" ]; then
      printf '%s\n' "$gefunden"
      # Die Deklaration ERWEITERT die Standardmuster, sie ersetzt sie nicht
      # (korrigiert 10.09.2026). Vorher galt: sobald ein Repo eigene Werte hatte,
      # fielen die Standardmuster weg — und damit alles, was die Deklaration nicht
      # aufzaehlt. Gemessen an FlowCore: deklariert war `PFAD /var/www/flowcore-prod`,
      # geaendert wurde `/etc/nginx/sites-available/flowcore-prod`, also die
      # Konfiguration, die die Produktion ueberhaupt erst ausliefert. Eine
      # Deklaration ist nie vollstaendig — vhosts, Units, Zertifikate und
      # Sicherungskopien liegen ausserhalb des Anwendungspfads. `KEINE` bleibt der
      # einzige Weg, den Schutz abzuschalten.
      STANDARDMUSTER
    else
      echo "GUARD-HINWEIS: .claude/prod-schutz.conf enthaelt keine Wertzeile — es gelten die konservativen Standardmuster. Bitte die PROD-Ziele dieses Repos eintragen (Vorlage: standards/prod-schutz/ in ocg-architekt)." >&2
      STANDARDMUSTER
    fi
  else
    STANDARDMUSTER
  fi
}

MUSTER="$(prod_muster)"

# --- Ein Kommando, viele Kommandos (v2.16, korrigiert 10.09.2026) ------------
# Die Pruefung lief bisher ueber den GESAMTEN Kommandostring. Bei einem
# zusammengesetzten Kommando fuehrt das in die Irre, und zwar messbar:
#
#   sudo -n cp /etc/nginx/sites-available/flowcore-prod \
#              /etc/nginx/sites-available/flowcore-prod.vor-cache | tail -1 \
#     && echo "Sicherung ok"
#
# Die Richtungspruefung von `cp` nimmt "das letzte Argument". Ueber den ganzen
# String ist das `ok"` — aus dem `echo` am Ende. Ergebnis: Das Umschreiben der
# nginx-Konfiguration, die die Produktion ausliefert, lief ungebremst durch
# (gemessen 10.09.2026 am realen Kommando aus der FlowCore-Sitzung).
#
# Deshalb wird an den Shell-Trennern zerlegt und JEDES Teilkommando einzeln
# geprueft — dieselbe Zerlegung, die Claude Code fuer seine eigenen Regeln
# vornimmt. Das Gesamtkommando bleibt ZUSAETZLICH in der Pruefung: Zerlegen
# darf Treffer nur hinzufuegen, nie welche verlieren (fail-closed).
pruefe_teil() {
  TEIL="$1"
  [ -n "$TEIL" ] || return 0
  TRIFFT_PROD=0
  while IFS= read -r ziel; do
  [ -z "$ziel" ] && continue
  if printf '%s' "$TEIL" | grep -qE -- "(^|[^A-Za-z0-9._-])${ziel}([^A-Za-z0-9._-]|\$)"; then
    TRIFFT_PROD=1; break
  fi
  done <<EOF
$MUSTER
EOF

if [ "$TRIFFT_PROD" = "1" ]; then
  # Schreibende Muster. Bewusst eng gefasst: Was hier nicht steht, laeuft durch.
  SCHREIBEND=""
  printf '%s' "$TEIL" | grep -qiE '\b(insert[[:space:]]+into|update[[:space:]]+[a-z_"]+[[:space:]]+set|delete[[:space:]]+from|alter[[:space:]]+(table|database)|create[[:space:]]+(table|database|index)|grant|revoke)\b' \
    && SCHREIBEND="schreibendes SQL"
  # Kopierwerkzeuge: Bei `cp`, `rsync` und `install` entscheidet das LETZTE
  # Argument, ob geschrieben wird. `cp <prod>/datei /tmp/` ist eine Analyse und
  # laeuft durch; `cp /tmp/datei <prod>/` ist ein PROD-Schreibzugriff. Ohne diese
  # Unterscheidung waere jedes Herauskopieren zur Untersuchung gesperrt — dieselbe
  # Reibung wie bei der Umleitung nach /tmp (Waechter-Hinweis 10.09.2026).
  if printf '%s' "$TEIL" | grep -qE '(^|[^a-zA-Z0-9_-])(cp|rsync|install)[[:space:]]'; then
    # Umleitungen sind keine Argumente. `cp a b 2>&1` endete sonst bei `2>&1`
  # statt bei `b` — und genau daran lief das nginx-Kommando aus der
  # FlowCore-Sitzung vorbei (gemessen 10.09.2026).
  # `cp -t <ziel> <quelle>` und `install -t` drehen die Reihenfolge um: Das Ziel
  # steht als Optionsargument vorn, das letzte Argument ist die QUELLE. Die
  # Heuristik "letztes Argument ist das Ziel" laeuft daran vorbei — in HEAD wie in
  # der ersten Fassung dieser Korrektur (Waechter-Hinweis 10.09.2026).
  #
  # NUR fuer cp und install. `rsync -t` ist etwas voellig anderes: dort heisst -t
  # `--times` und nimmt KEIN Argument. Wer die Option mitliest, haelt die QUELLE
  # fuer das Ziel und sperrt damit `rsync -t <prod>/app.js /tmp/` — reines Lesen
  # von PROD, also genau das, was frei sein muss. Dieselbe Fehlerklasse wie K5,
  # nur an einer anderen Option (Waechter-Befund Runde 2, 10.09.2026).
  letztes=""
  if printf '%s' "$TEIL" | grep -qE '(^|[^a-zA-Z0-9_-])(cp|install)[[:space:]]'; then
    letztes="$(printf '%s' "$TEIL" | grep -oE -- '-(-target-directory=|t[[:space:]]+)[^[:space:]]+' \
      | sed -E 's/^--target-directory=|^-t[[:space:]]+//' | head -1 || true)"
  fi
  if [ -z "$letztes" ]; then
    # Ein angehaengter Kommentar ist kein Argument. `cp neu.js <prod>/app.js
    # # vor dem Deploy` galt sonst als "Ziel = Deploy" und lief durch — die
    # billigste denkbare Umgehung der PROD-Sperre (Waechter-Befund 10.09.2026,
    # G1). Abgeschnitten wird nur fuer die ZIELermittlung; fuer die Frage, ob das
    # Kommando ueberhaupt ein PROD-Ziel beruehrt, bleibt der Text vollstaendig —
    # ein Kommentar, der einen PROD-Namen nennt, macht die Pruefung strenger,
    # nicht laxer.
    letztes="$(printf '%s' "$TEIL" \
      | sed -E 's/(^|[[:space:]])#.*$//' \
      | sed -E 's/[0-9]*(>>?|<)[[:space:]]*&?[^[:space:]]*//g' \
      | awk '{ for (i = NF; i >= 1; i--) if ($i !~ /^-/) { print $i; exit } }' || true)"
  fi
    if [ -n "$letztes" ]; then
      while IFS= read -r m; do
        [ -z "$m" ] && continue
        # Beim ZIEL ist die hintere Grenze um EIN Zeichen weiter als sonst: Der
        # Punkt zaehlt hier als Grenze, `_` und `-` nicht. Das trennt die beiden
        # Faelle, die sonst kollidieren:
        #   `<prod>/app.js.bak`, `<prod>.vor-cache` -> Punkt  -> PROD, blockt
        #   `/tmp/ehip_main_contao_dev.sql`         -> `_`    -> DEV, laeuft
        # Ohne den Punkt fiele jede Sicherungskopie neben der PROD-Datei durch;
        # ohne die Grenze traefe jeder DEV-Name, der einen PROD-Namen verlaengert
        # — und `ehip_main_contao_dev` neben `ehip_main_contao` steht so in den
        # mitgelieferten Konfigurationen. Beide Richtungen sind Waechter-Befunde
        # vom 10.09.2026 (Suffix-Sicherung bzw. K5).
        printf '%s' "$letztes" | grep -qE -- "(^|[^A-Za-z0-9._-])${m}([^A-Za-z0-9_-]|\$)" \
          && { SCHREIBEND="Kopieren in ein PROD-Ziel"; break; }
      done <<KOPIERENDE
$MUSTER
KOPIERENDE
    fi
  fi
  # Loeschen, Verschieben und Rechteaenderung treffen IMMER das genannte Ziel —
  # hier gibt es keine harmlose Richtung.
  printf '%s' "$TEIL" | grep -qE '(^|[^a-zA-Z0-9_-])(rm|mv|chmod|chown|truncate|dd)[[:space:]]' \
    && SCHREIBEND="${SCHREIBEND:-Dateiaenderung}"
  printf '%s' "$TEIL" | grep -qE 'sed[[:space:]]+(-[a-zA-Z]*i|--in-place)' \
    && SCHREIBEND="${SCHREIBEND:-Textersetzung in Datei (sed -i)}"
  # Umleitung und tee: NUR sperren, wenn das ZIEL ein PROD-Ziel ist. Sonst
  # blockiert eine Analyse wie `grep /var/www/x-prod/log > /tmp/auswertung`
  # — Lesen von PROD, Schreiben nach /tmp. Genau die Reibung, die diese
  # Fassung abschaffen soll (Waechter-Hinweis 10.09.2026).
  # `|| true`: grep ohne Treffer liefert Exit 1 — unter `set -e` bricht die
  # Kommandosubstitution sonst das ganze Skript ab, und ein abgebrochener Guard
  # prueft gar nichts mehr. (Gefunden in der Gegenprobe 10.09.2026: drei Faelle
  # endeten mit Exit 1 statt 0 oder 2.)
  ZIELE="$(printf '%s' "$TEIL" \
    | grep -oE '(>>?[[:space:]]*|[[:space:]]tee[[:space:]]+(-a[[:space:]]+)?)[^[:space:];|&)]+' 2>/dev/null \
    | sed -E 's/^(>>?[[:space:]]*|[[:space:]]tee[[:space:]]+(-a[[:space:]]+)?)//' || true)"
  if [ -z "$SCHREIBEND" ] && [ -n "$ZIELE" ]; then
    while IFS= read -r ziel; do
      [ -z "$ziel" ] && continue
      while IFS= read -r m; do
        [ -z "$m" ] && continue
        printf '%s' "$ziel" | grep -qE -- "$m" && { SCHREIBEND="Umleitung in eine PROD-Datei"; break; }
      done <<MUSTERENDE
$MUSTER
MUSTERENDE
      [ -n "$SCHREIBEND" ] && break
    done <<ZIELENDE
$ZIELE
ZIELENDE
  fi
  printf '%s' "$TEIL" | grep -qE 'systemctl[[:space:]]+(restart|stop|start|reload|disable|enable)' \
    && SCHREIBEND="${SCHREIBEND:-Dienst neu starten oder abschalten}"
  # Zwei Bedingungen statt eines Musters: `docker compose -f <datei> restart`
  # haelt das Verb nicht direkt hinter `compose` — das alte Muster lief daran
  # vorbei (Waechter-Befund 10.09.2026, K3).
  if printf '%s' "$TEIL" | grep -qE '(^|[|;&[:space:]])docker([[:space:]]+compose)?[[:space:]]' \
     && printf '%s' "$TEIL" | grep -qE '[[:space:]](up|down|restart|stop|rm|kill)([[:space:]]|$)'; then
    SCHREIBEND="${SCHREIBEND:-Container neu starten oder entfernen}"
  fi
  printf '%s' "$TEIL" | grep -qE 'git[[:space:]]+(checkout|switch|pull|merge|reset|apply|restore)' \
    && SCHREIBEND="${SCHREIBEND:-Arbeitsbaum aendern}"
  # Schreibende HTTP-Methoden gegen einen deklarierten PROD-HOST. Ohne diese
  # Zeile liefe `curl -X POST https://prod/api` durch, solange keine Umleitung
  # im Kommando steht (Waechter-Hinweis 10.09.2026).
  printf '%s' "$TEIL" | grep -qE '(-X|--request)[[:space:]]+(POST|PUT|PATCH|DELETE)' \
    && SCHREIBEND="${SCHREIBEND:-schreibender HTTP-Aufruf}"
  # Weitere Schreibwege, die der Waechter am 10.09.2026 als offen benannt hat.
  printf '%s' "$TEIL" | grep -qE '(psql|mysql)[^|;&]*<[[:space:]]*[^[:space:];|&]+' \
    && SCHREIBEND="${SCHREIBEND:-SQL-Datei einspielen}"

  if [ -n "$SCHREIBEND" ]; then
    if [ -f "$ALLOW_PROD" ]; then
      mkdir -p "$(pwd)/.claude" 2>/dev/null || true
      printf '%s | %s | %s\n' "$(date -Iseconds)" "$SCHREIBEND" "$TEIL" \
        >> "$(pwd)/.claude/prod-zugriffe.log" 2>/dev/null || true
      echo "PROD-ZUGRIFF (freigegeben durch .claude/ALLOW-PROD): $SCHREIBEND — protokolliert in .claude/prod-zugriffe.log" >&2
    else
      echo "GUARD-BLOCK: $SCHREIBEND an einem PROD-Ziel — laut .claude/prod-schutz.conf ist das Produktion. Lesen ist frei; Schreiben braucht nach Kernvertrag §6 eine ausdrueckliche Anweisung des Betreibers. Freigabeweg: .claude/ALLOW-PROD anlegen (erste Zeile: Auftrag und Datum), gilt fuer die Sitzung, jede Aktion wird protokolliert, nach der Aufgabe loeschen." >&2
      exit 2
    fi
  fi
  fi
}

if [ -n "$MUSTER" ] && ! printf '%s' "$MUSTER" | grep -qx '__KEINE__'; then
  pruefe_teil "$CMD"
  # Die Schleife laeuft hinter einer Pipe, also in einer Subshell — ihr `exit 2`
  # beendet nur diese. Deshalb wird der Ausstieg am Exit-Code der Gruppe
  # abgefangen und hier wiederholt. Ohne das liefe ein geblocktes Teilkommando
  # durch, und die Zerlegung waere schlimmer als keine.
  printf '%s' "$CMD" | tr '\n' ';' | sed -E 's/(\|\||&&|\|&|[;|&])/\n/g' | {
    # `|| [ -n "$teil" ]` ist hier kein Schoenheitsfehler, sondern die halbe
    # Sperre: Die Eingabe endet OHNE Zeilenumbruch, `read` liefert dafuer Exit 1,
    # und der Rumpf lief fuer das LETZTE Segment nie. Damit war genau der Fall
    # blind, fuer den die Zerlegung gebaut wurde — ein angehaengter Kommentar
    # genuegte: `cp neu.js /var/www/<prod>/app.js # vor dem Deploy` kam durch,
    # weil die Gesamtpruefung `Deploy` fuer das Kopierziel hielt und die Schleife
    # das einzige (= letzte) Segment nie ansah. (Waechter-Befund 10.09.2026, K6.)
    while IFS= read -r teil || [ -n "$teil" ]; do
      teil="$(printf '%s' "$teil" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
      [ -z "$teil" ] && continue
      pruefe_teil "$teil"
    done
  } || exit 2
fi

echo "$CMD" | grep -qiE '\b(drop\s+(database|table|schema)|truncate\s+table)\b' && block "destruktives SQL (DROP/TRUNCATE)"
echo "$CMD" | grep -qE 'drizzle-kit\s+push.*--force|db\s+push-force|push-force' && block "Schema-Push --force (löscht undeklarierte Tabellen)"
echo "$CMD" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+(/|/var/www|/opt|/home)($|[^a-zA-Z0-9_-])' && block "rekursives Löschen an Systempfaden"
echo "$CMD" | grep -qE '(cat|less|grep|scp|curl.*-d.*@).*\.env(\s|$)' && block "Auslesen/Versenden einer .env (Secrets)"
echo "$CMD" | grep -qE 'pg_restore.*(prod|_prod)|psql.*_prod.*-f' && block "Restore/SQL-Datei gegen eine PROD-DB"
exit 0
