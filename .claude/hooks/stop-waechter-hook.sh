#!/usr/bin/env bash
# =============================================================================
# OneCampus Stop-Hook — erzwingt das Wächter-Protokoll (Skill `waechter`).
# Registriert als Stop-Hook in .claude/settings.json. Blockiert das Beenden
# der Session (Exit 2, Meldung auf stderr geht an den Agenten), wenn die
# Session Code verändert hat, aber kein frisches Wächter-Verdikt mit
# FREIGABE-EMPFEHLUNG vorliegt.
# Durchlass: kein git-Repo · kein Diff · gültiger Marker · Betreiber-Skip
# (.claude/WAECHTER-SKIP, gilt einmal, wird verbraucht) · stop_hook_active
# (Schleifenschutz: wir haben diesen Stop bereits einmal blockiert).
# =============================================================================
set -uo pipefail
INPUT="$(cat)"

# Schleifenschutz: Wenn dieser Stop bereits aus einem Stop-Hook heraus
# fortgesetzt wurde, nicht erneut blockieren (sonst Endlosschleife).
if printf '%s' "$INPUT" | jq -e '.stop_hook_active == true' >/dev/null 2>&1; then exit 0; fi

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
ROOT="$(git rev-parse --show-toplevel)"

# Betreiber-Skip: einmalig, wird verbraucht.
if [ -f "$ROOT/.claude/WAECHTER-SKIP" ]; then rm -f "$ROOT/.claude/WAECHTER-SKIP"; exit 0; fi

# Hat die Session Code verändert? (uncommitted ODER committete Änderungen —
# letztere erkennen wir daran, dass der Marker einen anderen HEAD nennt.)
# Marker-Datei zählt nicht als Code-Änderung.
DIRTY="$(git status --porcelain -uall 2>/dev/null | grep -v 'waechter-verdikt\.json' | head -1)"
HEAD="$(git rev-parse HEAD 2>/dev/null || echo none)"
MARKER="$ROOT/.claude/waechter-verdikt.json"

if [ -z "$DIRTY" ]; then
  # Arbeitsbaum sauber: Nur blockieren, wenn ein Marker existiert, der einen
  # ÄLTEREN HEAD nennt UND kein Freigabe-Verdikt trägt (heißt: es wurde
  # committet, ohne dass die letzte Runde freigegeben war). Ohne Marker und
  # ohne Diff gehen wir von einer Nicht-Code-Session aus → Durchlass.
  [ -f "$MARKER" ] || exit 0
  MV="$(jq -r '.verdict // empty' "$MARKER" 2>/dev/null)"
  MH="$(jq -r '.head // empty' "$MARKER" 2>/dev/null)"
  # Blockieren nur, wenn NACH einem nicht freigegebenen Review committet wurde
  # (Marker nennt älteren HEAD und trägt keine Freigabe). Reverte/Nicht-Code → Durchlass.
  if [ "$MV" != "FREIGABE-EMPFEHLUNG" ] && [ -n "$MH" ] && [ "$MH" != "$HEAD" ]; then
    echo "WÄCHTER-BLOCK: Es wurde committet, aber das letzte Wächter-Verdikt ($MV) ist keine FREIGABE-EMPFEHLUNG. Skill 'waechter' ausführen: ein Reviewer, eine Nachbesserung, dann Verdikt-Marker und Commit (v2.14). Betreiber-Ausnahme: Datei .claude/WAECHTER-SKIP anlegen." >&2
    exit 2
  fi
  exit 0
fi

# Es gibt uncommitted Änderungen → gültiger, frischer Marker nötig.
# Der Marker selbst ist von der Hash-Berechnung ausgeschlossen (er würde sonst
# genau den Zustand verändern, den er bestätigt) — identisch im Skill definiert.
CUR_HASH="$({ git rev-parse HEAD 2>/dev/null; git status --porcelain -uall | grep -v 'waechter-verdikt\.json'; git diff HEAD -- ':(exclude).claude/waechter-verdikt.json'; git ls-files --others --exclude-standard -z | grep -zv 'waechter-verdikt.json' | sort -z | xargs -0r sha256sum; } | sha256sum | cut -d' ' -f1)"
if [ -f "$MARKER" ]; then
  MV="$(jq -r '.verdict // empty' "$MARKER" 2>/dev/null)"
  MD="$(jq -r '.diffHash // empty' "$MARKER" 2>/dev/null)"
  if [ "$MV" = "FREIGABE-EMPFEHLUNG" ] && [ "$MD" = "$CUR_HASH" ]; then exit 0; fi
fi

echo "WÄCHTER-BLOCK: Diese Session hat Code verändert, aber es liegt kein frisches Wächter-Verdikt mit FREIGABE-EMPFEHLUNG für den aktuellen Stand vor. Jetzt den Skill 'waechter' ausführen: (1) Auftragskarte+Diff+Nachweise an den EINEN Subagent architecture-reviewer übergeben (kein zweiter Reviewer), (2) unerfüllte Kriterien beheben (höchstens eine Nachbesserung, dann offene Kriterien an den Betreiber), (3) bei ERFÜLLT .claude/waechter-verdikt.json mit head/diffHash/verdict schreiben — die exakte diffHash-Formel steht im Skill waechter (Abschnitt Verdikt-Marker). Betreiber-Ausnahme: Datei .claude/WAECHTER-SKIP anlegen (gilt einmal)." >&2
exit 2
