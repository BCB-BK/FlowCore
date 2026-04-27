# AGENTS.md — Senior-Engineer-Vertrag für KI-Agenten

> **Diese Datei ist verbindlich.** Sie wird vor jeder Sitzung geladen und gilt für jeden KI-Agenten, der in diesem Repository arbeitet (Replit Agent, Cursor, Aider, Claude Code, …). Verstöße sind kein "Fehler", sondern ein Vertragsbruch.

## Kontext

Dieses Projekt ist **FlowCore** — das produktiv eingesetzte Enterprise Wiki für Bildungscampus Backnang (Deutsch). Der Auftraggeber ist Nicht-Programmierer. Er kann Code nicht prüfen, aber Logik. Wenn der Agent oberflächlich arbeitet, fällt es ihm im operativen Betrieb auf die Füße — und kostet stundenlange Reparatur-Sitzungen.

Auslöser dieses Dokuments war der Swimlane→BPMN-Migrationsfehler (Tasks #104–#107): Der Editor wurde auf BPMN 2.0 umgestellt, aber `registry.ts`-Beschreibungstexte wurden nicht mitgepflegt — drei Follow-up-Tasks und mehrere Sitzungen nötig, um alle „Swimlane"-Texte im UI zu entfernen.

## Die acht Regeln

### R1 — Pre-Action-Audit-Pflicht

Bevor du Code an einer Schnittstelle änderst (API-Spec, DB-Schema, `registry.ts`, Build-Konfig, Deployment-Konfig, Orval-Codegen-Trigger), kartierst du:

- **Alle Schreib-Pfade** auf das betroffene Artefakt (`rg`-basiert, nicht "ich glaube").
- **Alle Trigger** (Lifecycle-Hook, `post-merge.sh`, `postinstall`, Codegen-Auslöser).
- **Alle Lesepfade** (wer importiert was?).
- **Alle ähnlich-benannten Dateien** (z. B. `registry.ts` vs. `configs.ts` vs. `types.ts` im layout-engine).

Das Audit-Ergebnis kommt **als Tabelle** in deine Antwort an den User, **bevor** du editierst. Nicht "das hab ich im Hinterkopf" — sichtbar.

**Negativ-Beispiel (was passiert ist):** Swimlane→BPMN-Umbenennung wurde im Editor (`BpmnEditor.tsx`, `GenericLayout.tsx`) umgesetzt, ohne zu prüfen, ob `registry.ts`-Beschreibungstexte ebenfalls betroffen sind.

**Positiv-Beispiel:** Audit-Tabelle (Schreibstellen, Trigger, Lesepfade, ähnlich-benannte Dateien) in der Antwort, **dann** Edit in **allen** betroffenen Dateien auf einmal.

### R2 — Empirie vor Antwort

Aussagen über Laufzeit-Verhalten sind nur erlaubt, wenn du sie empirisch verifiziert hast:

- "Es funktioniert" → **nur** nach Logs-Lesen (`refresh_all_logs`) oder E2E-Test (`runTest`).
- "PROD ist heil" → **nur** nach `fetch_deployment_logs`.
- "Der Test besteht" → **nur** nach Skript-Lauf, nicht nach Code-Review.

Verboten: Hoffnung, Plausibilität, "müsste eigentlich". Wenn du keine empirische Verifikation hast, sagst du das explizit: "Ich habe X nicht verifiziert."

**Negativ-Beispiel:** "Das BPMN-Diagramm wird vermutlich korrekt gespeichert." — keine Quelle, keine Verifikation.

**Positiv-Beispiel:** "BPMN-Speichern verifiziert via E2E-Test. Playwright-Log zeigt: Diagramm-XML persistiert, Reload zeigt dasselbe XML. Commit: `<sha>`."

### R3 — Anti-Hedge

Hedging-Sprache ist verboten für Aussagen, die empirisch verifizierbar sind:

| ❌ Verboten | ✅ Stattdessen |
|---|---|
| "Es greift vermutlich" | "Geprüft: … Beweis: Log-Zeile …" |
| "Sollte funktionieren" | "Funktioniert. Verifiziert via …" |
| "Müsste eigentlich" | "Ist. Belegt durch …" |
| "Falls noch ein anderer Mechanismus existiert" | "Audit zeigt: kein anderer Mechanismus. Geprüfte Kanäle: A, B, C." |
| "Ich denke, das" | "Geprüft: …" / "Nicht geprüft: …" |

Wenn du wirklich unsicher bist (echtes Nicht-Wissen), benenne die konkrete Wissenslücke: **"Was ich nicht weiß: X. Was ich tun müsste, um es zu wissen: Y."** Das ist OK. Vage Phrasen sind nicht OK.

### R4 — E2E statt DB-Manipulation

Wenn der User sagt "teste das Feature", heißt das:

- ✅ Browser/Frontend bedienen (über das Testing-Skill: `runTest`).
- ✅ Komplette HTTP-Request-Kette inkl. Auth, Pipeline, DB-Persistenz, Frontend-Rendering.

Nicht erlaubt:

- ❌ Direkte SQL-Queries als "Test" (das ist Inspektion, kein Test).
- ❌ Direkte API-Calls mit `curl` als alleiniger Test (umgeht Frontend-Logik).
- ❌ DB-Inserts, um einen "Erfolg" zu fingieren.

Wenn ein E2E-Test gerade nicht möglich ist (Auth blockiert, externe API down, …), erklärst du das **explizit** und schlägst einen Follow-up-Task für späteren E2E-Test vor.

### R5 — Codegen-Konsistenz vor Deploy

Vor jedem `suggest_deploy`-Vorschlag oder PROD-Deploy-Diskurs **musst** du prüfen:

1. **Orval-Codegen:** Wenn `lib/api-spec/openapi.yaml` geändert wurde → `pnpm --filter @workspace/api-client-react run codegen` ausführen. Veralteter generierter Client → Typ-Fehler im Frontend zur Laufzeit.
2. **DB-Schema-Push:** Wenn `lib/db/src/schema/` geändert wurde → `pnpm --filter @workspace/db push` ausführen. Schema-Drift → Laufzeitfehler in Produktion.
3. **TypeScript-Clean:** Alle bekannten vorbestehenden Fehler müssen explizit als "pre-existing" dokumentiert sein; neue Fehler blockieren den Deploy.

Bei Drift → kein Deploy-Vorschlag, sondern: "Codegen ist veraltet / Schema-Push fehlt — bitte erst `[Befehl]` ausführen."

**Negativ-Beispiel:** "Lass uns deployen, ich habe neue API-Routen hinzugefügt." — Orval-Codegen nicht erneut gelaufen, Frontend nutzt veraltete Hooks.

**Positiv-Beispiel:** "Neue Route `/api/releases` hinzugefügt. Orval-Codegen läuft: `lib/api-client-react/dist` aktualisiert (Diff: +3 Hooks). DB-Schema-Push läuft: 0 Schema-Änderungen (kein Drift). TypeScript: 0 neue Fehler. Deploy-bereit."

### R6 — Senior-Self-Review vor `mark_task_complete`

Vor jedem `mark_task_complete` führst du `pnpm --filter @workspace/scripts run senior-self-review` aus, **füllst die Antworten aus** und fügst sie als Markdown-Block in deine letzte User-Antwort ein. Sechs Felder:

1. **Gelesene Dateien** (Pfade).
2. **Geänderte Dateien** (Pfade + 1-Zeilen-Begründung pro Datei).
3. **Referenz-Suche** (`rg`-Befehl + Ergebnis-Zusammenfassung: was importiert/nutzt das Geänderte?).
4. **Root-Cause-Beleg** (warum ist das die Ursache und nicht ein Symptom?).
5. **Empirische Verifikation** (welche Logs/Counts/E2E-Läufe belegen den Erfolg?).
6. **Floskel-Selbstkritik** (welche Hedging-Phrase in meiner Antwort hätte ein Skeptiker bemängelt? Wenn keine: "Keine Hedging-Phrase verwendet.").

Ohne diesen Block ist die Aufgabe nicht "fertig". Punkt.

**Negativ-Beispiel:** "Habe alles erledigt, validate ist grün, mark_task_complete." — kein Self-Review-Block, keine Empirie-Belege.

**Positiv-Beispiel:** Senior-Self-Review-Block mit allen 6 Feldern ausgefüllt, gefolgt von `mark_task_complete`.

### R7 — Single-Source-of-Truth-Disziplin

| Bereich | SSOT | Verbot |
|---|---|---|
| Seitentypen, Labels, Sections, Varianten, Hilfetexte | `lib/shared/src/page-types/registry.ts` | Inline-Labels in Komponenten, Duplikate in `configs.ts` |
| Layout-Feldzuordnungen | `artifacts/wiki-frontend/src/components/layouts/layout-engine/configs.ts` | Doppelte Field-Definitionen außerhalb dieser Datei |
| Shared UI-Komponenten | `lib/ui/src/` (`@workspace/ui`) | Lokale Kopien in wiki-frontend, außer für app-spezifische Hooks |
| Environment-Variablen | `artifacts/api-server/src/lib/config.ts` | `process.env.X` außerhalb des Config-Moduls |
| DB-Schema | `lib/db/src/schema/` | Hardcoded Tabellennamen, SQL-Strings in Business-Logik |
| API-Vertrag (Routen, Request-/Response-Schemas) | `lib/api-spec/openapi.yaml` | Separate Zod-Schemas in Routen, die vom OpenAPI-Spec abweichen |
| RBAC-Permissions (Middleware) | `artifacts/api-server/src/middlewares/require-permission.ts` | Hardcoded Rollennamen in Frontend-Komponenten |
| Audit-Event-Codes | `lib/db/src/schema/audit-events.ts` | Frei erfundene Event-Strings pro Endpoint |

Bei Konflikt zwischen DB-Stand und SSOT-Datei: **SSOT-Datei gewinnt.** DB-Stand wird beim nächsten `pnpm --filter @workspace/db push` überschrieben.

### R8 — Root-Cause vor Symptom

Wenn ein Test rot ist oder ein Feature nicht funktioniert:

1. **Erst:** Warum (mechanistisch — welche Funktion liefert was, welche Bedingung trifft nicht zu, welcher Aufruf läuft anders als erwartet)?
2. **Dann:** Welcher minimale Eingriff korrigiert die Ursache?
3. **Verboten:** Try/catch um den Fehler herum, `?.`-Optional-Chains als "Fix", Test-Skip, Feature-Toggle off.

**Negativ-Beispiel:** BPMN-Editor-Chip zeigt falschen Text. Symptom-Patch: Chip-Text direkt in der Komponente überschreiben. Root-Fix: `registry.ts`-Label korrigieren — eine SSOT-Datei, alle Konsumenten profitieren automatisch.

**Positiv-Beispiel:** `registry.ts` hatte `label: "Swimlane-Diagramm"` statt `"BPMN 2.0-Diagramm"` — Fix direkt dort. `rg Swimlane lib/shared/src/page-types/registry.ts` → 0 Treffer danach.

Wenn du eine Symptom-Behandlung machen **musst** (z. B. weil der Root-Fix in einer externen Bibliothek liegt), kennzeichne sie explizit als Workaround mit Verweis auf den eigentlichen Fix-Pfad.

## Wie du diese Datei liest

Du liest `AGENTS.md` **bei jeder neuen Sitzung als allererstes** — vor `replit.md`, vor allem anderen. Wenn du sie nicht gelesen hast, hast du den Vertrag nicht akzeptiert. Bei Konflikt zwischen Skill-Hinweisen und `AGENTS.md` gewinnt `AGENTS.md`.

## Was passiert bei Verstößen

Der User wird Vertragsbrüche namentlich nennen ("Du hast R1 verletzt — kein Audit-Tabellen-Output vor dem Edit"). Das ist kein persönlicher Angriff, sondern eine Diagnose. Reaktion: Vertragsbruch anerkennen, korrektes Verhalten nachholen, weitermachen.

## Verifikations-Workflow am Ende einer Sitzung

```
1. pnpm --filter @workspace/scripts run task-completion-audit   # statische Checks (no-hardcode, route-contract, env-check, dead-import, rootfix-audit)
2. pnpm --filter @workspace/scripts run senior-self-review      # Selbst-Audit (6 Felder ausgeben)
3. → Audit-Block mit ausgefüllten 6 Feldern in User-Antwort einfügen
4. → mark_task_complete
```
