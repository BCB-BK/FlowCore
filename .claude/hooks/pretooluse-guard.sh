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
CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"
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
echo "$CMD" | grep -qE 'git\s+push\s+.*\b(main|master)\b' && block "Push auf main/master (PROD-wirksam)"
echo "$CMD" | grep -qiE '\b(drop\s+(database|table|schema)|truncate\s+table)\b' && block "destruktives SQL (DROP/TRUNCATE)"
echo "$CMD" | grep -qE 'drizzle-kit\s+push.*--force|db\s+push-force|push-force' && block "Schema-Push --force (löscht undeklarierte Tabellen)"
echo "$CMD" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+(/|/var/www|/opt|/home)($|[^a-zA-Z0-9_-])' && block "rekursives Löschen an Systempfaden"
echo "$CMD" | grep -qE '(cat|less|grep|scp|curl.*-d.*@).*\.env(\s|$)' && block "Auslesen/Versenden einer .env (Secrets)"
echo "$CMD" | grep -qE 'pg_restore.*(prod|_prod)|psql.*_prod.*-f' && block "Restore/SQL-Datei gegen eine PROD-DB"
exit 0
