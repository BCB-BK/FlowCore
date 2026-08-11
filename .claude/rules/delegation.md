# Regel: Delegation & Orchestrierung (universell, Details zu Kernvertrag §11)

## Wann delegieren — und wann nicht

| Delegieren an Subagent | Selbst erledigen |
|---|---|
| Breite Codebase-Erkundung („wo wird X gelesen/geschrieben?") | Kleinstfixes (Delegation kostet mehr als sie bringt) |
| Loganalyse, große Ausgaben verdichten | Arbeit, für die der Auftrag noch unklar ist — erst klären (§2) |
| Recherche (Doku, Bibliotheken, Vorgehensweisen) | Gleichzeitige Schreibarbeit an derselben oder einer Hotspot-Datei |
| Gleichartige Änderung über viele Dateien (parallelisierbar, disjunkt) | Entscheidungen: Zielabgleich, Freigaben, Betreiber-Kommunikation |
| Unabhängige Prüfung (Wächter §8) | Alles, was Kontext aus dem laufenden Gespräch braucht, der nicht im Auftrag steht |

**Parallelität nur bei disjunkten Dateien.** Die Hotspot-Liste der Repo-`CLAUDE.md` ist
bindend: dort arbeitet immer nur ein Agent. Bei größeren parallelen Arbeiten getrennte
Worktrees nutzen (`rules/git-sicherheit.md`).

## Auftragsschema an einen Subagent

Ein Subagent hat **keinen** Zugriff auf den laufenden Gesprächskontext, **kann nicht
zurückfragen** und lädt die `CLAUDE.md` nicht zuverlässig mit. Der Auftrag enthält deshalb:

1. **Ziel in einem Satz** — was soll am Ende feststehen?
2. **Umfang und Grenzen** — welche Pfade/Dateien, was ausdrücklich nicht.
3. **Geltende Regeln** — die für diesen Auftrag relevanten Punkte im Klartext mitgeben
   (z. B. „read-only", „keine Pushes", „Secrets nie ausgeben", Tier-Beschränkung).
4. **Erwartetes Rückgabeformat** (s. u.) und die Abnahmekriterien.
5. **Was bei Unklarheit gilt** — „im Zweifel Befund melden statt raten" (nie raten lassen).

## Rückgabeformat: Dossier statt Prosa

Verbindlich für jeden Subagenten-Bericht:

```
ERGEBNIS: <ein Satz>
BELEGE:
- <datei:zeile> — <Fund> — <warum relevant>
- <kommando> → <Exit-Code / zitierte Ausgabezeile>
OFFEN/UNSICHER: <was nicht verifiziert werden konnte und warum>
```

Reviewer liefern zusätzlich `VERDIKT:` + `FIX-AUFTRÄGE:` (Format in den Agent-Dateien).
Ein Bericht ohne Fundstellen oder ohne Belege ist unbrauchbar und wird nicht übernommen —
er wird neu beauftragt oder selbst nachgeprüft.

## Umgang mit den Ergebnissen

- **Subagent-Berichte sind Hinweise, keine Nachweise.** Belastbar werden sie erst durch
  deterministische Guards, reale Tests oder den Wächter (§8).
- **Stichprobenpflicht:** Bei substanziellen Änderungen sieht der Orchestrator den Diff selbst
  — Rohdaten bleiben draußen, das Ergebnis nicht.
- **Widersprüche zwischen Subagenten** werden nicht gemittelt, sondern aufgelöst (nachprüfen,
  wer recht hat) oder als offener Punkt gemeldet.

## Modell- und Effort-Wahl

Je Aufruf **bewusst wählen und kurz begründen** — nie dem Zufall überlassen:
urteilslastige Arbeit (Architektur, Review, Debugging, Sicherheitsanalyse) auf das stärkste
verfügbare Modell mit hohem Effort; mechanische Arbeit (gerichtete Edits, Verifikation,
Scouting, Formatierung) auf ein schlankeres/schnelleres. Konkrete Modellnamen stehen
absichtlich **nicht** in dieser Regel — sie ändern sich schneller als das Regelwerk.

## Kosten- und Nutzen-Realität

Jeder Subagent liest sich neu ein: Delegation kostet Zeit und Token. Sie lohnt, wenn sie
**Rohdaten aus dem Hauptkontext hält** oder **echte Parallelität** bringt — nicht als
Selbstzweck. Im Zweifel: eine Aufgabe, ein Agent, klarer Auftrag.
