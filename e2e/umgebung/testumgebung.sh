#!/usr/bin/env bash
# Baut eine Wegwerf-Testumgebung fuer die E2E-Laeufe auf und faehrt sie wieder ab.
#
# Warum eigens: Die Tests melden sich ueber den Kopfzeileneintrag
# X-Dev-Principal-Id an, den nur AUTH_DEV_MODE=true akzeptiert, und sie
# SCHREIBEN Daten (POST /content/nodes legt Seiten an). Gegen PROD oder DEV
# duerfen sie deshalb nie laufen -- und DEV auf AUTH_DEV_MODE umzustellen waere
# keine Loesung, weil dev-flowcore.onecampusgroup.de oeffentlich erreichbar ist.
#
#   ./testumgebung.sh auf    Datenbank anlegen, Schema, Seed, Testdaten, Server starten
#   ./testumgebung.sh ab     Server beenden, Datenbank loeschen
#   ./testumgebung.sh test   auf + Testlauf + ab
set -euo pipefail

DB=flowcore_e2e
PORT=${E2E_PORT:-5010}
DBUSER=${E2E_DB_USER:-flowcore_e2e}
WURZEL="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PIDDATEI=/tmp/flowcore-e2e-server.pid
PWDATEI=${E2E_PW_DATEI:-/home/flowcore/env/.pw_e2e}
export PATH=/home/flowcore/.nvm/versions/node/v24.19.0/bin:$PATH

# Eigene Rolle mit CREATEDB, aber ohne Superuser und ohne Zugriff auf
# flowcore_prod/flowcore_dev. Sie legt nur ihre eigene Wegwerf-Datenbank an --
# deshalb braucht dieses Skript kein sudo und kein Postgres-Administratorkonto.
if [ -z "${E2E_DB_PASSWORD:-}" ]; then
  [ -r "$PWDATEI" ] || { echo "Passwortdatei $PWDATEI nicht lesbar. Alternativ E2E_DB_PASSWORD setzen." >&2; exit 2; }
  E2E_DB_PASSWORD="$(cat "$PWDATEI")"
fi
export PGPASSWORD="$E2E_DB_PASSWORD"
URL="postgresql://${DBUSER}:${E2E_DB_PASSWORD}@127.0.0.1:5432/${DB}"

# Anlegen und Loeschen laufen ueber die Wartungsdatenbank 'postgres'.
verwalte() { psql -h 127.0.0.1 -U "$DBUSER" -d postgres -q -c "$1"; }

auf() {
  # Erst aufraeumen: ein Altprozess auf dem Port laesst den Start sonst
  # nach fuenf Versuchen scheitern, ohne dass der Grund im Vordergrund steht.
  if [ -f "$PIDDATEI" ]; then kill "$(cat "$PIDDATEI")" 2>/dev/null || true; rm -f "$PIDDATEI"; sleep 1; fi

  echo "[1/5] Datenbank $DB neu anlegen" >&2
  verwalte "DROP DATABASE IF EXISTS $DB;"
  verwalte "CREATE DATABASE $DB OWNER $DBUSER;"

  echo "[2/5] Schema einspielen" >&2
  ( cd "$WURZEL" && DATABASE_URL="$URL" pnpm --filter @workspace/db run push >/dev/null 2>&1 )

  echo "[3/5] Seed (Vorlagen, Seiten)" >&2
  # In ein bekanntes Verzeichnis wechseln: find scheitert sonst, wenn das
  # Arbeitsverzeichnis des Aufrufers fuer diesen Benutzer nicht lesbar ist.
  TSX=$(cd "$WURZEL" && find node_modules/.pnpm -maxdepth 6 -path "*/tsx/dist/cli.mjs" | head -1)
  [ -n "$TSX" ] || { echo "tsx nicht gefunden -- wurde pnpm install ausgefuehrt?" >&2; return 1; }
  TSX="$WURZEL/$TSX"
  ( cd "$WURZEL/lib/db" && DATABASE_URL="$URL" node "$TSX" ./src/seed.ts >/dev/null )

  echo "[4/5] Testdaten (Personen und Rollen)" >&2
  psql -h 127.0.0.1 -U "$DBUSER" -d "$DB" -q -f "$WURZEL/e2e/umgebung/testdaten.sql"

  echo "[5/5] Server auf 127.0.0.1:$PORT starten" >&2
  ( cd "$WURZEL" && NODE_ENV=production pnpm --filter @workspace/api-server run build >/dev/null 2>&1 )
  cd "$WURZEL/artifacts/api-server"
  NODE_ENV=development AUTH_DEV_MODE=true PORT="$PORT" HOST=127.0.0.1 \
    DATABASE_URL="$URL" SESSION_SECRET="e2e-nur-fuer-den-testlauf-0123456789abcdef" LOG_LEVEL=warn \
    nohup node dist/index.mjs > /tmp/flowcore-e2e-server.log 2>&1 &
  echo $! > "$PIDDATEI"
  for i in $(seq 1 20); do
    sleep 1
    if curl -sf -o /dev/null -H "X-Dev-Principal-Id: 00000000-0000-0000-0000-000000000001" \
        "http://127.0.0.1:$PORT/api/content/nodes"; then
      echo "Bereit: http://127.0.0.1:$PORT" >&2; return 0
    fi
  done
  echo "FEHLER: Server nicht erreichbar. Protokoll: /tmp/flowcore-e2e-server.log" >&2
  return 1
}

ab() {
  [ -f "$PIDDATEI" ] && kill "$(cat "$PIDDATEI")" 2>/dev/null || true
  rm -f "$PIDDATEI"
  verwalte "DROP DATABASE IF EXISTS $DB;" || true
  echo "Testumgebung abgeraeumt." >&2
}

case "${1:-}" in
  auf)  auf ;;
  ab)   ab ;;
  test) auf; ( cd "$WURZEL/e2e" && E2E_BASE_URL="http://127.0.0.1:$PORT" pnpm exec playwright test "${@:2}" ) || ergebnis=$?; ab; exit "${ergebnis:-0}" ;;
  *)    echo "Aufruf: $0 auf|ab|test" >&2; exit 2 ;;
esac
