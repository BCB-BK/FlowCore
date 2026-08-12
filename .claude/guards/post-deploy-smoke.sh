#!/usr/bin/env bash
# =============================================================================
# OneCampus Post-Deploy-Smoke — macht aus "Deploy lief" ein "Anwendung läuft"
#
# Prüft nach jedem Deploy die echte Instanz per HTTP und endet mit Exit 0/1.
# Gesteuert von einer kleinen Konfigdatei je Instanz (kein Programmieren nötig):
#
#   .claude/smoke.conf
#   ------------------
#   BASE_URL=https://flowcore.onecampusgroup.de
#   HEALTH=/api/healthz
#   CHECK=/|200            # Pfad|erwarteter Status  (mehrfach erlaubt)
#   CHECK=/api/nodes|401   # geschützt: 401 ist das RICHTIGE Ergebnis
#   TIMEOUT=15             # optional, Default 15 s
#
# Aufruf:  bash .claude/guards/post-deploy-smoke.sh [pfad/zur/smoke.conf]
#
# Grundsatz: Ein gestarteter Deploy-Prozess ist kein erfolgreiches Deployment
# (Kernvertrag §5, rules/release-rollback.md). Dieses Skript liefert den Beweis.
# =============================================================================
set -uo pipefail

# Konfigurationswahl: DEV und PROD haben verschiedene URLs, liegen aber im selben
# Repo. Der Checkout weiss selbst, welche Umgebung er ist — naemlich am Branch.
# Deshalb zuerst `.claude/smoke.<branch>.conf` (z. B. smoke.dev.conf), sonst
# `.claude/smoke.conf`. So braucht der Betreiber je Instanz nichts einzustellen,
# und ein DEV-Checkout kann nicht versehentlich PROD anmessen.
if [ $# -ge 1 ]; then
  CONF="$1"
else
  BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  CONF=".claude/smoke.conf"
  [ -n "$BRANCH" ] && [ -f ".claude/smoke.${BRANCH}.conf" ] && CONF=".claude/smoke.${BRANCH}.conf"
fi
[ -f "$CONF" ] || { echo "FEHLER: $CONF fehlt. Vorlage steht im Kopf dieses Skripts." >&2; exit 2; }
echo "Smoke-Konfiguration: $CONF"

BASE_URL=""; HEALTH=""; TIMEOUT=15; CHECKS=()
while IFS= read -r line; do
  line="${line%%#*}"; line="$(echo "$line" | xargs 2>/dev/null)"; [ -z "$line" ] && continue
  case "$line" in
    BASE_URL=*) BASE_URL="${line#BASE_URL=}" ;;
    HEALTH=*)   HEALTH="${line#HEALTH=}" ;;
    TIMEOUT=*)  TIMEOUT="${line#TIMEOUT=}" ;;
    CHECK=*)    CHECKS+=("${line#CHECK=}") ;;
  esac
done < "$CONF"
[ -n "$BASE_URL" ] || { echo "FEHLER: BASE_URL fehlt in $CONF" >&2; exit 2; }

fail=0; lines=()
probe() { # probe <pfad> <erwartet>
  local path="$1" want="$2" got
  got="$(curl -sS -o /dev/null -m "$TIMEOUT" -w '%{http_code}' "${BASE_URL}${path}" 2>/dev/null)"
  if [ "$got" = "$want" ]; then lines+=("  ${path:-/} → $got ✓")
  else lines+=("  ${path:-/} → ${got:-keine Antwort} (erwartet $want) ✗"); fail=1; fi
}

[ -n "$HEALTH" ] && probe "$HEALTH" 200
for c in "${CHECKS[@]}"; do probe "${c%%|*}" "${c##*|}"; done

printf '\nSMOKE-VERDIKT  %s\n' "$BASE_URL"
printf '%s\n' "${lines[@]}"
if [ "$fail" -eq 0 ]; then
  printf 'VERDIKT: BESTANDEN — Anwendung antwortet wie erwartet\n\n'; exit 0
else
  printf 'VERDIKT: NICHT BESTANDEN — Deploy ist NICHT verifiziert.\n'
  printf 'Nächster Schritt: Logs prüfen und ggf. Rollback nach rules/release-rollback.md.\n\n'; exit 1
fi
