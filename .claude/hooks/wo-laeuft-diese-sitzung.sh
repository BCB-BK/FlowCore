#!/usr/bin/env bash
# =============================================================================
# SessionStart-Hook: Sagt in der ersten Zeile jeder Sitzung, WO sie läuft.
#
# WARUM (Betreiber, 08.09.2026): „Claude läuft noch immer nicht überall sauber
# auf dem Server!" — Ursache war keine Fehlkonfiguration, sondern zwei Produkte,
# die im Browser gleich aussehen: Eine über claude.ai/code gestartete Sitzung
# läuft IMMER in einer Anthropic-Cloud-Sandbox (selbst gehostete Umgebungen gibt
# es nur auf Team-/Enterprise-Plänen). Nur die CLI auf der Maschine selbst —
# im Browser sichtbar über Remote Control — arbeitet auf unseren Servern.
# Eine Cloud-Sitzung erreicht weder DEV noch PROD noch unsere Domänen.
#
# Der Hook erkennt die Sandbox an Merkmalen, die nur dort zusammen auftreten,
# und sagt es laut. Er blockiert nichts — er verhindert die Verwechslung, die
# wochenlang Zeit gekostet hat. Ausgabe geht in den Sitzungskontext.
# =============================================================================
set -uo pipefail
H="$(hostname 2>/dev/null || echo unbekannt)"
CLOUD=0
# Eindeutiges Merkmal: Die Laufzeit sagt selbst, in welcher Art Umgebung sie steckt.
# Enthält es "cloud", ist die Frage entschieden — keine Heuristik nötig.
case "${CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE:-}" in *cloud*) CLOUD=9 ;; esac
[ -d /root/.ccr ] && CLOUD=$((CLOUD+1))                                                 # Agent-Proxy der Sandbox
[ "$H" = "vm" ] && CLOUD=$((CLOUD+1))                                                   # Standard-Hostname
ip -4 addr show scope global 2>/dev/null | grep -q '192\.0\.2\.' && CLOUD=$((CLOUD+1))  # Doku-Adressbereich
# Bewusst NICHT als Merkmal: CLAUDE_CODE_REMOTE_SESSION_ID. Sie ist auch in einer
# Remote-Control-Sitzung auf einer ECHTEN Maschine gesetzt — als Merkmal erzeugte sie
# dort einen Fehlalarm (Gegenprobe 08.09.2026).

if [ "$CLOUD" -ge 2 ]; then
  cat <<'TXT'
────────────────────────────────────────────────────────────────────────────
CLOUD-SITZUNG — diese Sitzung läuft NICHT auf einer Maschine des Hauses.
Kein DEV, kein PROD, keine Deploy-Skripte, keine unserer Domänen (Egress-Sperre).
Was hier geht: Repos lesen und schreiben (GitHub), Dokumente, Analysen, Reviews.
Was NICHT geht: auf dem Server bauen, testen, deployen, Logs lesen, Dienste prüfen.
Dafür auf der Maschine `claude` in der tmux-Sitzung starten (Weg im Server-Register)
und im Browser über Remote Control zusehen. Aussagen über Server sind hier
HYPOTHESEN, bis eine Sitzung auf der Maschine sie bestätigt (Kernvertrag §5).
────────────────────────────────────────────────────────────────────────────
TXT
else
  printf 'MASCHINE: %s · Arbeitsverzeichnis: %s · Benutzer: %s\n' "$H" "$(pwd)" "$(id -un)"
  printf 'Echte Maschine. Vor Server-Aussagen das Server-Register lesen, danach fortschreiben.\n'
fi
exit 0
