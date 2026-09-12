# Regel: Git-Sicherheit & Baseline (universell)

## Baseline vor jeder Änderung dokumentieren
Branch · Commit (`git rev-parse HEAD`) · `git status` (Arbeitsbaum) · vorhandene fremde/nicht
zugehörige Änderungen · relevante Ausgangsfehler (Tests/Lint-Baseline) · Ziel-Remote und
Deploy-Wirkung des Branches (aus der Repo-`CLAUDE.md`, nie angenommen).

## Fremde Änderungen sind unantastbar
Niemals überschreiben, zurücksetzen, stashen, „bereinigen" oder in eigene Commits aufnehmen.
Wenn fremde Änderungen den Auftrag blockieren: benennen und fragen.

## Ohne ausdrückliche, aktuelle Freigabe verboten
(zusätzlich technisch geblockt durch PreToolUse-Hook + Permission-Deny):
- `git reset --hard` · `git clean` · `git push --force` und `--force-with-lease`
- `git rebase` · `git commit --amend` · ungefragtes `git stash`
- Löschen von Branches, die nicht selbst in dieser Session angelegt wurden
- Push auf `main`/PROD-wirksame Branches (Deploy-Wirkung steht in der Repo-`CLAUDE.md`)

**Eine benannte Ausnahme beim Fortschreiben, seit v2.17:** Ein **Automatenzweig**, den
ausschließlich ein Workflow schreibt und den kein Mensch auscheckt — `claude/standard-*`
aus dem Standard-Rollout, `claude/markensystem` aus dem FlowCore-Spiegel — wird mit
`--force-with-lease` fortgeschrieben, statt bei jedem Lauf einen neuen Zweig anzulegen.
Der Sinn des Verbots ist, fremde Arbeit zu schützen; auf einem Zweig, an dem niemand
arbeitet, gibt es keine. Für jeden Branch, an dem ein Mensch arbeitet, gilt es unverändert.
Die Ausnahme steht hier, weil eine Regel, die in der Praxis umgangen wird, schlechter ist
als eine, die ihre Grenzen kennt.

## Commit-Disziplin
Vor jedem Commit den **vollständigen Diff** prüfen. Ein Commit enthält ausschließlich die
beauftragte Änderung plus zwingend zugehörige Tests und Doku. Commit-Identity:
`git config user.email noreply@anthropic.com && git config user.name Claude`;
Co-Author generisch `Co-Authored-By: Claude <noreply@anthropic.com>` + `Claude-Session:`-Zeile.
Kein Modellname in Commits, PRs, Code, Kommentaren.

## Isolation
Parallele oder größere Arbeiten in getrennten Worktrees/Arbeitsbereichen — nie zwei
Schreiber im selben Working Tree.
