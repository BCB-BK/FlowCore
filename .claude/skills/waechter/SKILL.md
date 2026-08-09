---
name: waechter
description: Pflicht-Abschlussprotokoll nach JEDER Code-Änderung — unabhängiges Review im frischen Kontext, Fix-Kreislauf (max. 2 Runden), Verdikt-Marker für den Stop-Hook. Ohne FREIGABE-EMPFEHLUNG des Wächters gibt es kein BESTANDEN.
---

# Wächter — erzwungener Review-Fix-Kreislauf

## Wann
Nach **jeder** Code-Änderung, vor jeder Statusmeldung — ausnahmslos (Betreiber-Entscheidung
07.08.2026: Modus „immer"). Reine Lese-/Recherche-Sessions ohne Diff sind nicht betroffen.

## Ablauf

1. **Übergabepaket bauen:** Auftrag (Originalwortlaut) · vollständiger Diff (`git diff` +
   neue Dateien) · erbrachte Nachweise (Guard-/Test-Ausgaben, Doku-Änderungen) ·
   Selbsteinstufung klein/standard/kritisch.
2. **Reviewer spawnen:** Subagent `architecture-reviewer` (frischer Kontext, read-only) mit
   dem Übergabepaket. Bei Security-Triggern (Auth/AuthZ, personenbezogene Daten, Uploads,
   externe APIs, Zahlungen, Mandanten, Prod-Daten) **zusätzlich** `security-reviewer`.
3. **Verdikt verarbeiten:**
   - `FREIGABE-EMPFEHLUNG` → Marker schreiben (s. u.), Abschluss nach DoD §7 fortsetzen.
   - `NACHARBEIT NÖTIG` / `ABLEHNUNG` → die nummerierten **FIX-AUFTRÄGE vollständig**
     abarbeiten; jeder Fix referenziert die Befund-Nr. Danach zurück zu Schritt 1
     (neues Review über den aktualisierten Diff).
4. **Rundengrenze: maximal 2 Fix-Runden.** Steht danach keine Freigabe → **Eskalation an den
   Betreiber:** offene Befunde (Nr. · Fundstelle · Schwere · warum ungelöst) + eigene
   Empfehlung + Statusmeldung aus der Vierer-Ontologie (i. d. R. `NICHT BESTANDEN` oder
   `BLOCKIERT …`). Kein weiteres eigenmächtiges Iterieren — verhindert Kostenspiralen
   und Verschlimmbesserung.

## Verdikt-Marker (Anker für den Stop-Hook)

Nach jedem Review-Durchgang schreibt der **Implementierer** (der Reviewer bleibt read-only)
die Datei `.claude/waechter-verdikt.json` im Repo-Root:

```json
{ "head": "<git rev-parse HEAD>", "diffHash": "<sha256 über git diff HEAD + status>",
  "verdict": "FREIGABE-EMPFEHLUNG", "runde": 1,
  "reviewer": "architecture-reviewer[+security-reviewer]", "zeit": "<ISO-Zeit>" }
```

`diffHash` erzeugen mit (Marker selbst ist ausgeschlossen — er darf den Zustand, den er
bestätigt, nicht verändern; exakt dieselbe Formel nutzt der Stop-Hook):
```bash
{ git rev-parse HEAD; \
  git status --porcelain -uall | grep -v 'waechter-verdikt\.json'; \
  git diff HEAD -- ':(exclude).claude/waechter-verdikt.json'; \
  git ls-files --others --exclude-standard -z | grep -zv 'waechter-verdikt.json' | sort -z | xargs -0r sha256sum; \
} | sha256sum
```
Die Datei ist **gitignored zu halten** (Session-Artefakt, kein Repo-Inhalt) und wird nur mit
dem **tatsächlichen** Reviewer-Verdikt geschrieben — einen Marker ohne echtes Review zu
erzeugen ist Vertragsbruch der schwersten Klasse (§10: Umgehung von Guards).

## Betreiber-Override

Nur der Betreiber kann den Wächter für einen Task aussetzen — durch expliziten Satz im Chat
(„Wächter für diesen Task überspringen, Grund: …") oder die Einmal-Datei
`.claude/WAECHTER-SKIP`. Der Override wird in der Abschluss-Antwort sichtbar ausgewiesen.

## Ergebnis in der Abschluss-Antwort

Immer ausweisen: Verdikt(e) + Runde(n) · abgearbeitete Fix-Aufträge (Nr.) · ggf. offene
Befunde/Eskalation · ob Override genutzt wurde.
