---
name: waechter
description: Abschlussprüfung je AUFGABE (v2.14) — EIN Reviewer, EINE Frage („Ist der Auftrag erfüllt und belegt?“), Verdikt ERFÜLLT oder NACHBESSERN gegen die Auftragskarte, höchstens EINE Nachbesserung, dann Schluss. Letzter Schritt vor dem Commit; danach wird nichts mehr geändert.
---

# Wächter — ein Reviewer, eine Frage, eine Nachbesserung

## Wann
**Einmal am Ende jeder Aufgabe, als letzter Schritt vor dem Commit** (Kernvertrag §7/§8,
v2.14). Nicht je Commit, nicht je Zwischenstand. Reine Lese-/Recherche-Sessions ohne Diff
sind nicht betroffen.

**Nach dem Verdikt wird nichts mehr geändert außer dem Commit.** Wer nach der Freigabe noch
eine Zeile ändert — Doku, Baustellenliste, „nur kurz“ —, hat eine neue Aufgabe begonnen.
*(Auslöser: Bis v2.13 stand der Wächter als Schritt 6 vor „Befundliste + 98-Abgleich +
Commit“; jede Zeile danach machte den Marker ungültig, der Stop-Hook verlangte den Wächter
erneut, der Reviewer fand im frischen Kontext etwas Neues. Das war die Endlosschleife bei
kleinen Aufgaben.)*

## Ablauf

1. **Übergabepaket:** Auftragskarte (Skill `auftrag`, mit den Kriterien K1…Kn) ·
   vollständiger Diff (`git diff` + neue Dateien) · Nachweise (Guard-Verdikt, Testausgaben
   mit Exit-Code, Browser-Nachweis der Stufe S/M/L mit Spec-Name und Screenshots).
2. **Genau ein Reviewer:** Subagent `architecture-reviewer`, frischer Kontext, read-only.
   **Kein zweiter Reviewer, nichts parallel.** Sicherheitsfragen (Auth, personenbezogene
   Daten, Uploads, externe APIs, Zahlungen, Mandanten, Prod-Daten) sind ein **Abschnitt
   desselben Reviews** — der Reviewer prüft sie, wenn die Auftragskarte oder der Diff sie
   berührt.
3. **Verdikt verarbeiten:**
   - `ERFÜLLT` → Marker schreiben (unten), committen, pushen. **Fertig.** Hinweise des
     Reviewers sind Hinweise — sie werden in der Abschlussantwort genannt, nicht abgearbeitet.
   - `NACHBESSERN` → **nur die unerfüllten Kriterien** (Nummer aus der Karte) und die harten
     Stopps beheben. Danach **ein** zweiter Durchlauf über den aktualisierten Diff.
4. **Nach der einen Nachbesserung ist Schluss.** Steht dann noch ein Kriterium offen, geht die
   Aufgabe mit den offenen Kriterien und einer Empfehlung an den Betreiber — als Nachricht,
   nicht als Eintrag in `98-OFFENE-BAUSTELLEN.md`. **Die Aufgabe bleibt offen**, bis er
   entscheidet. Kein drittes Review, kein eigenmächtiges Weiteriterieren.

## Harte Stopps (immer Nachbesserung, unabhängig von den Kriterien)

Secret-Wert sichtbar (Diff, Log, Chat) · PROD berührt ohne ausgewiesene Freigabe ·
Unumkehrbares (Löschung, Migration ohne Backup-Nachweis) · Hook/Guard abgeschwächt.

## Verdikt-Marker (Anker für den Stop-Hook)

Nach dem Verdikt schreibt der **Implementierer** `.claude/waechter-verdikt.json` im Repo-Root:

```json
{ "head": "<git rev-parse HEAD>", "diffHash": "<sha256 über git diff HEAD + status>",
  "verdict": "FREIGABE-EMPFEHLUNG", "runde": 1,
  "reviewer": "architecture-reviewer", "zeit": "<ISO-Zeit>" }
```

`verdict` bleibt aus Kompatibilität zum Hook `FREIGABE-EMPFEHLUNG` (= `ERFÜLLT`).
`diffHash` (Marker selbst ausgeschlossen — exakt dieselbe Formel nutzt der Stop-Hook):
```bash
{ git rev-parse HEAD; \
  git status --porcelain -uall | grep -v 'waechter-verdikt\.json'; \
  git diff HEAD -- ':(exclude).claude/waechter-verdikt.json'; \
  git ls-files --others --exclude-standard -z | grep -zv 'waechter-verdikt.json' | sort -z | xargs -0r sha256sum; \
} | sha256sum
```
Die Datei ist **gitignored** (Session-Artefakt) und wird nur mit dem **tatsächlichen**
Reviewer-Verdikt geschrieben — ein Marker ohne echtes Review ist Vertragsbruch (§10).

## Betreiber-Override

Nur der Betreiber setzt den Wächter für eine Aufgabe aus — expliziter Satz im Chat oder
Einmal-Datei `.claude/WAECHTER-SKIP`. Der Override wird in der Abschlussantwort ausgewiesen.

## In der Abschlussantwort

Verdikt · Runde(n) (1 oder 2) · behobene Kriterien-Nummern · Hinweise des Reviewers (nicht
abgearbeitet, benannt) · ggf. offene Kriterien mit Empfehlung an den Betreiber.
