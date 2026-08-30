#!/usr/bin/env bash
# =============================================================================
# OneCampus — Standard-Autosync, universell (einmalig als root/sudo ausführen)
#
# ─── WARUM ES DIESE ZWEITE FASSUNG GIBT ─────────────────────────────────────
#
# `02-standard-autosync.sh` löst dasselbe Problem, trägt aber die Checkout-Liste
# des Tool-Servers fest im Code (`/opt/onecampus/toolumzug:campus …`). Sie ist
# damit nur dort brauchbar — und genau deshalb saß `/srv/website-hosting` auf
# `ehip1` wochenlang auf Standard v2.3, während die Zentrale bei v2.11 stand:
# Dort zog schlicht nichts.
#
# Diese Fassung findet die Checkouts selbst. Sie ist auf jeder der vier
# Maschinen lauffähig, ohne vorher zu wissen, was dort liegt.
#
# ─── DIE SPERRE, DIE NICHT VERHANDELBAR IST ─────────────────────────────────
#
# Ein Automatismus, der in einen PROD-Checkout zieht, hebelt Kernvertrag §6 aus:
# PROD nur gegen vollständige Änderungsliste UND ausdrückliche Freigabe. Deshalb
# liest dieses Skript je Checkout dessen `.claude/prod-branches.conf` und lässt
# ihn in Ruhe, sobald der ausgecheckte Branch dort steht. Auf PLATO betrifft das
# `/var/www/plato-prod` (`main`), auf `ehip1` die vhosts von `ehip.eu` und
# `www2.ehip.eu`.
#
# FAIL-CLOSED: Fehlt die Deklaration, gilt der Checkout als PROD-verdächtig und
# wird übersprungen — lieber nicht gezogen als ungefragt PROD angefasst.
#
# ─── WEITERE LEITPLANKEN ────────────────────────────────────────────────────
#
# * Nur `pull --ff-only`. Niemals reset, stash, clean, merge (rules/git-sicherheit.md).
# * Schmutziger Arbeitsbaum ⇒ überspringen und melden, nie "reparieren".
# * Jeder Pull läuft als EIGENTÜMER des Checkouts, nicht als root.
# * Idempotent: kann gefahrlos mehrfach laufen.
#
# ─── WARUM ES HIER LIEGT UND NICHT IN server/ ───────────────────────────────
#
# Erste Fassung lag als `server/04-autosync-universell.sh` in ocg-architekt — und
# war damit auf keiner Maschine erreichbar, denn `server/` wird nicht verteilt.
# Auf `ehip1` gibt es ueberhaupt keinen Checkout dieses Repos; der Aufruf
# scheiterte dort mit "No such file or directory". Das war zum dritten Mal
# dasselbe Muster: ein Werkzeug, das nur in der Zentrale liegt, laeuft nicht
# dort, wo es gebraucht wird (Kernvertrag §5).
#
# `standards/werkzeuge/` wird von `sync-standard.sh` nach `<repo>/.claude/werkzeuge/`
# ausgeliefert. Damit liegt dieses Skript in JEDEM Checkout auf JEDER Maschine.
#
# AUFRUF auf einer beliebigen Maschine, aus einem beliebigen Checkout:
#   sudo bash .claude/werkzeuge/autosync-installieren.sh
#
# Prüfen:  systemctl status onecampus-autosync.timer
#          journalctl -u onecampus-autosync -n 40
# =============================================================================
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "FEHLER: als root/sudo ausführen." >&2; exit 1; }

SYNC=/opt/onecampus/autosync.sh
install -d -m 755 /opt/onecampus

cat > "$SYNC" <<'INNEN'
#!/usr/bin/env bash
# Vom systemd-Timer als root gestartet. Findet Checkouts mit CLAUDE-STANDARD.md,
# überspringt PROD-Branches und schmutzige Arbeitsbäume, zieht den Rest per
# Fast-Forward als Eigentümer. Meldet jede Entscheidung mit Begründung.
set -uo pipefail
TIEFE=6
WURZELN=(/home /var/www /srv /opt)

gefunden=0; gezogen=0; uebersprungen=0

# Entdoppelt über alle Wurzeln (ein Home unterhalb von /home wird sonst doppelt gefunden).
while IFS= read -r g; do
  [ -n "$g" ] || continue
  d=$(dirname "$g")
  [ -f "$d/CLAUDE-STANDARD.md" ] || continue        # nur Repos, die den Standard tragen
  gefunden=$((gefunden+1))
  usr=$(stat -c '%U' "$d" 2>/dev/null || echo root)

  br=$(sudo -u "$usr" git -C "$d" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
  if [ -z "$br" ]; then
    echo "UEBERSPRUNGEN $d — Branch nicht lesbar (Eigentuemer $usr)"; uebersprungen=$((uebersprungen+1)); continue
  fi

  # ── PROD-Sperre (Kernvertrag §6). Fehlt die Deklaration: fail-closed. ──
  conf="$d/.claude/prod-branches.conf"
  if [ ! -f "$conf" ]; then
    echo "UEBERSPRUNGEN $d ($br) — keine prod-branches.conf, gilt als PROD-verdaechtig"
    uebersprungen=$((uebersprungen+1)); continue
  fi
  if grep -vE '^[[:space:]]*(#|$)' "$conf" | sed 's/#.*//' | tr -d '[:space:]' \
       | grep -qx "$br"; then
    echo "UEBERSPRUNGEN $d ($br) — PROD-wirksam laut Deklaration"
    uebersprungen=$((uebersprungen+1)); continue
  fi

  if [ -n "$(sudo -u "$usr" git -C "$d" status --porcelain 2>/dev/null | head -1)" ]; then
    echo "UEBERSPRUNGEN $d ($br) — Arbeitsbaum nicht sauber, kein Eingriff"
    uebersprungen=$((uebersprungen+1)); continue
  fi

  vorher=$(sudo -u "$usr" git -C "$d" rev-parse --short HEAD 2>/dev/null || echo '?')
  if out=$(sudo -u "$usr" git -C "$d" pull --ff-only -q 2>&1); then
    nachher=$(sudo -u "$usr" git -C "$d" rev-parse --short HEAD 2>/dev/null || echo '?')
    v=$(grep -m1 -o 'Version [0-9][0-9.]*' "$d/CLAUDE-STANDARD.md" 2>/dev/null || echo '?')
    if [ "$vorher" = "$nachher" ]; then
      echo "AKTUELL       $d ($br) $nachher — $v"
    else
      echo "GEZOGEN       $d ($br) $vorher -> $nachher — $v"; gezogen=$((gezogen+1))
    fi
  else
    echo "FEHLGESCHLAGEN $d ($br) — $(echo "$out" | head -1)"
    uebersprungen=$((uebersprungen+1))
  fi
done < <(for w in "${WURZELN[@]}"; do
           [ -d "$w" ] && find "$w" -maxdepth "$TIEFE" -name .git -type d 2>/dev/null
         done | sort -u)

echo "AUTOSYNC: $gefunden Checkout(s) mit Standard · $gezogen gezogen · $uebersprungen uebersprungen"
INNEN
chmod 755 "$SYNC"

cat > /etc/systemd/system/onecampus-autosync.service <<'EOF'
[Unit]
Description=OneCampus Standard-Autosync (ff-pull der Checkouts, PROD ausgenommen)
After=network-online.target
[Service]
Type=oneshot
ExecStart=/opt/onecampus/autosync.sh
EOF

cat > /etc/systemd/system/onecampus-autosync.timer <<'EOF'
[Unit]
Description=OneCampus Standard-Autosync alle 6 Stunden und beim Start
[Timer]
OnBootSec=5min
OnUnitActiveSec=6h
Persistent=true
[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now onecampus-autosync.timer

echo
echo "OK: Timer aktiv. Sofortlauf zur Kontrolle:"
echo "    sudo systemctl start onecampus-autosync && journalctl -u onecampus-autosync -n 40 --no-pager"
