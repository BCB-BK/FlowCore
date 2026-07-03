# Task 167 – Rich-Text & Wiki-Links im Feld "Verknüpfungen & Querverweise" – Abschlussbericht (Zusatz V4)

**Datum:** 2026-07-03
**Verbindliche Vorgabe:** `attached_assets/Verbindlicher_Zusatz_klein_v4_1783061494046.md`

## 1. Root Cause

Es wurden im Verlauf der Bearbeitung **drei** zusammenhängende Root Causes identifiziert und behoben:

1. **Feldtyp (vor dieser Session bereits behoben, in dieser Session verifiziert):** Das Feld `relations`
   ("Verknüpfungen & Querverweise", Seitentyp `procedure_instruction`) war in
   `artifacts/wiki-frontend/src/components/layouts/layout-engine/configs.ts` mit
   `component: "editable"` konfiguriert. Das routet über `GenericLayout.tsx` auf
   `EditableSectionCard.tsx`, welches im Edit-Modus nur ein reines shadcn-`<Textarea>`
   rendert – ohne TipTap-`BlockEditor`, ohne `SlashCommandMenu`, ohne `wikiLink`-Extension.
   Der Slash-Befehl `/wiki` konnte in diesem Feld dadurch nicht funktionieren.

2. **Mehrfach-Dialog-Bug (Fix-Zyklus 1, diese Session):** Der Wiki-Picker-Dialog wurde über ein
   globales `window`-`CustomEvent` (`"editor:open-wiki-picker"`) ausgelöst. Da mehrere
   `BlockEditor`/`SectionBlockEditor`-Instanzen gleichzeitig auf der Seite gemountet sind
   (Haupt-Editor + mehrere `section_block_editor`-Felder), reagierten **alle** Instanzen auf
   dasselbe Event und öffneten gleichzeitig mehrere überlappende Dialoge – ein blockierender
   UI-Zustand, real im laufenden Dev-Workflow reproduziert.

3. **Backlink-Sync-Lücke (Fix-Zyklus 2, diese Session, kritischster Fund):** Die Funktion
   `syncInlineWikiLinks` in `artifacts/api-server/src/services/working-copy.service.ts` las beim
   Backlink-Abgleich ausschließlich `structuredFields._editorContent` (den Haupt-Fließtext-Editor).
   Wiki-Links, die im `relations`-Feld (oder anderen `section_block_editor`-Feldern wie
   `action_items`) eingefügt wurden, wurden **nie** gescannt. Ursache: `relations` wird als
   JSON-**String** in `structuredFields` gespeichert (`SectionBlockEditor`/`WorkingCopyEditorPage`
   serialisieren via `JSON.stringify`), während `_editorContent` als rohes JSON-**Objekt**
   gespeichert wird – die Sync-Funktion kannte nur den zweiten Fall und nur dieses eine Feld.
   Folge: Ein im "Verknüpfungen & Querverweise"-Feld gesetzter Wiki-Link erzeugte **nie** einen
   Eintrag in `content_relations`, wodurch die Zielseite den Backlink ("Wird verlinkt von") nie
   anzeigte – ein Verstoß gegen die explizite Anforderung in Step 3 der Task-Spezifikation.

## 2. Betroffene Datenkette

```
Editor-UI (SectionBlockEditor/TipTap, Feld "relations")
  → Feld-Save (handleSectionSave, JSON.stringify)
    → Debounced Autosave (WorkingCopyEditorPage, AUTOSAVE_DELAY_MS=2000)
      → PATCH /api/content/working-copies/:id (structuredFields.relations)
        → content_working_copies (DB, structuredFields JSONB) [war bereits korrekt]
        → syncInlineWikiLinks() → content_relations (DB) [war die Lücke]
          → BacklinksPanel auf Zielseite (/node/:targetId) [zeigte deshalb nie den Eintrag]
```

## 3. Datei-Impact-Liste

- `artifacts/wiki-frontend/src/components/layouts/layout-engine/configs.ts` (vor Session)
- `artifacts/wiki-frontend/src/components/compound/SectionBlockEditor.tsx` (vor Session: WikiLink-Node,
  SlashCommandMenu, Picker-Dialog, Toolbar-Button; diese Session: Event-Scoping-Fix)
- `artifacts/wiki-frontend/src/components/editor/SlashCommandMenu.tsx` (diese Session: Event-Scoping-Fix)
- `artifacts/wiki-frontend/src/components/editor/BlockEditor.tsx` (diese Session: Event-Scoping-Fix)
- `artifacts/api-server/src/services/working-copy.service.ts` (diese Session: Backlink-Sync-Fix)

## 4. Existing-Implementation-Verifikation

Der Feldtyp-Fix (configs.ts) und die WikiLink-Erweiterung von `SectionBlockEditor.tsx` waren bereits
vor dieser Session umgesetzt und als "bestätigt" markiert. Diese Session hat die Behauptung **nicht**
als gegeben hingenommen, sondern real im laufenden Dev-Workflow verifiziert:
- `tsc --noEmit` (Frontend) grün.
- Live-Interaktion im Browser: Feld-Bearbeiten-Button, `/wiki`-Slash-Command, Dialog, Suche, Auswahl,
  Inline-Chip, Feld-Speichern – **dabei wurde der Mehrfach-Dialog-Bug real reproduziert**, was zeigt,
  dass die "bereits implementierte" Lösung im echten Workflow nicht sauber funktionierte, bis der
  Event-Scoping-Fix erfolgte.
- Die als "bereits in Vorgänger-Tasks umgesetzt" deklarierte `syncInlineWikiLinks`-Backlink-Funktion
  wurde direkt per API+DB-Test gegen den realen, gerade umgestellten `relations`-Feldinhalt geprüft –
  dabei wurde die Sync-Lücke real nachgewiesen (Feld korrekt in `content_working_copies` persistiert,
  aber **kein** Eintrag in `content_relations`).

## 5. Implementierung

- **Event-Scoping-Fix:** Das `CustomEvent("editor:open-wiki-picker")` trägt jetzt
  `detail: { editor }` (die auslösende TipTap-Editor-Instanz). Die Listener in `BlockEditor.tsx` und
  `SectionBlockEditor.tsx` vergleichen `event.detail.editor === editor` und öffnen den Dialog nur für
  die tatsächlich adressierte Instanz.
- **Backlink-Sync-Fix:** Neue Funktion `extractAllWikiLinkTargets(structuredFields)` iteriert über
  **alle** Werte von `structuredFields` (nicht nur `_editorContent`), versucht String-Werte per
  `JSON.parse` zu deserialisieren (Fallback: überspringen bei Parse-Fehler) und wendet die bestehende
  `extractWikiLinkTargets`-Walk-Funktion auf jeden gültigen TipTap-Doc-Wert an. `syncInlineWikiLinks`
  ruft diese neue Funktion statt der bisherigen Einzelfeld-Logik auf. Insert/Delete/Diff-Logik gegen
  `content_relations` (bestehender, unveränderter Code) bleibt unverändert – es wird lediglich die
  Quelle der zu synchronisierenden Ziel-IDs vollständig statt teilweise ermittelt.

## 6. Geänderte Dateien mit technischer Erklärung

| Datei | Änderung |
|---|---|
| `SlashCommandMenu.tsx` | `dispatchEvent` überträgt jetzt `detail: { editor }` |
| `BlockEditor.tsx` | Listener prüft `detail.editor === editor` vor Dialog-Öffnung |
| `SectionBlockEditor.tsx` | Listener prüft `detail.editor === editor` vor Dialog-Öffnung |
| `working-copy.service.ts` | neue Funktion `extractAllWikiLinkTargets`; `syncInlineWikiLinks` nutzt sie statt nur `_editorContent` zu lesen |

## 7. Tests

- `tsc --noEmit` Frontend (`typecheck-frontend`): **grün**, nach allen Änderungen.
- `tsc --noEmit` Backend (`typecheck-api`): **weiterhin scope-fremd fehlschlagend** – exakt dieselben
  zwei Fehler (Zeilen 86/101, `relationType: "inline_wiki_link"`) bestanden bereits **vor** dieser
  Session und vor dem hier vorgenommenen Fix (Ursache: veraltete generierte Typdefinition in
  `lib/db/dist`, in der das Enum `inline_wiki_link` fehlt, obwohl es in der Laufzeit-DB und im
  Quellschema vorhanden ist und zur Laufzeit funktioniert). Mein Fix hat diese Zeilen nicht neu
  eingeführt, nur den Aufruf-Kontext (`structuredFields` statt `editorContent`) verändert – die
  Fehlerursache ist identisch mit dem vorbestehenden, bereits verifizierten scope-fremden Zustand.
- E2E Live-Test 1 (Editor-UI-Flow, `/nodes/:id/edit`): Button → Slash-Command → **ein** Dialog (nicht
  mehrere) → Suche → Auswahl → Inline-Chip → Feld-Speichern – **erfolgreich**, bestätigt Fix 1.
- Direkter API-Test (`fetch PATCH /api/content/working-copies/:id` mit `x-dev-principal-id`):
  `structuredFields.relations` mit eingebettetem `wikiLink`-Node → HTTP 200, Persistenz bestätigt.
- Direkte DB-Prüfung nach Fix 2: `SELECT * FROM content_relations WHERE source_node_id=...` liefert
  neuen Eintrag `relation_type='inline_wiki_link'`, `target_node_id` = Zielseite – **vor** dem Fix war
  diese Tabelle für denselben Input leer (real reproduzierter Fehlerzustand, kein künstlich
  hergestellter DB-Eintrag).
- E2E Live-Test 2 (volle Kette UI→API→DB→UI): `/nodes/:id/edit` zeigt persistierten Inline-Link
  ("Siehe auch" + "Testseite"-Chip) im Feld "Verknüpfungen & Querverweise"; Klick auf den Chip
  navigiert zur Zielseite `/node/:targetId`; auf der Zielseite ist die Quellseite "Test - VA 2" im
  Backlinks-Abschnitt ("Wird verlinkt von") sichtbar – **erfolgreich**, bestätigt Fix 2 im vollständig
  realen Workflow.

## 8. Live-Wirksamkeitsmatrix

| Fehler | Vor Fix | Nach Fix | Nachweis |
|---|---|---|---|
| `/wiki` im `relations`-Feld nicht verfügbar | reproduziert (Textarea, kein Editor) | behoben | UI Live-Test |
| Mehrfache/blockierende Picker-Dialoge | reproduziert (mehrere Dialoge gleichzeitig) | behoben | UI Live-Test |
| Wiki-Link im `relations`-Feld erzeugt keinen Backlink | reproduziert (leere `content_relations`) | behoben | API + DB + UI Live-Test |

## 9. Datenkettennachweis

UI (Editor-Feld) → API (`PATCH .../working-copies/:id`, HTTP 200) → DB (`content_working_copies.structured_fields`
korrekt, `content_relations` neuer Eintrag `inline_wiki_link`) → UI (Zielseite zeigt Backlink) – vollständig
end-to-end nachgewiesen, keine manuelle DB-Manipulation zur Herstellung des Erfolgszustands.

## 10. Qualitätsprüfung

- Keine Validatoren abgeschwächt, keine Severity gesenkt, keine Pflichtfelder optional gemacht.
- Keine Dummy-Daten, keine direkte DB-Manipulation zur künstlichen Erfolgsherstellung (Testdaten wurden
  ausschließlich über den echten API-Endpunkt geschrieben, DB-Zugriffe waren rein lesend zur Verifikation).
- Kein Silent-Fallback: `extractAllWikiLinkTargets` überspringt nicht-parsbare Werte explizit, verändert
  aber keine Fehlerbehandlung an anderer Stelle.
- Bestehende Insert/Delete-Diff-Logik in `syncInlineWikiLinks` unverändert – minimal-invasiver Fix.
- `code-quality`-Workflow (`task-completion-audit`): **PASSED** (Violations 1/7, Schwelle 20% nicht
  überschritten; einzige Abweichung: `route-contract-check`, unabhängig von dieser Änderung).

## 11. UI/API/DB/Audit-Abgleich

Konsistent: UI zeigt exakt den Inhalt, der per API persistiert wurde; DB (`content_working_copies`)
enthält denselben Wert; `content_relations` enthält den daraus abgeleiteten Backlink; die Zielseiten-UI
zeigt diesen Backlink an. `task-completion-audit` (code-quality) bestätigt keine Hardcodings, keine toten
Importe, Root-Fix-Audit bestanden.

## 12. Evidenzdateien / technische Prüfdateien

- Diese Datei: `docs/reports/TASK-167-REPORT.md`
- Code-Diff: `artifacts/api-server/src/services/working-copy.service.ts`,
  `artifacts/wiki-frontend/src/components/editor/SlashCommandMenu.tsx`,
  `artifacts/wiki-frontend/src/components/editor/BlockEditor.tsx`,
  `artifacts/wiki-frontend/src/components/compound/SectionBlockEditor.tsx`
- Workflow-Logs: `code-quality` (PASSED), `typecheck-frontend` (grün), `typecheck-api` (scope-fremd,
  vorbestehend), `API Server` (legacy Workflow, scope-fremd, vorbestehend – siehe Punkt 13)
- DB-Verifikationsergebnis: `content_relations`-Zeile
  `729bfeb4-e106-4e4b-b4a7-daf3eca7b9a6` (source `83291923-5675-4075-b8b3-bb0991ac91d1`,
  target `7148e0fb-541c-41ea-b52b-85961b9211ce`, type `inline_wiki_link`)
- Testnode: "Test - VA 2" (`83291923-5675-4075-b8b3-bb0991ac91d1`, Working-Copy
  `f194c6b1-f0b9-46a0-b9eb-506da3869ca7`), Zielseite "Testseite" (`7148e0fb-541c-41ea-b52b-85961b9211ce`)

## 13. Offene Risiken

- Der Legacy-Workflow `API Server` (nicht der artifact-gebundene `artifacts/api-server: API Server`)
  schlägt mit `Configuration validation failed: port: Expected number, received nan` fehl – dies ist ein
  vorbestehendes, von diesem Task unabhängiges Konfigurationsproblem des doppelten/alten Workflow-Eintrags
  (fehlende `PORT`-Env-Variable in diesem speziellen Workflow-Kontext) und **nicht** ursächlich mit dem
  hier bearbeiteten Feature verbunden; der tatsächlich aktive, artifact-gebundene API-Server läuft
  fehlerfrei (`Server listening port: 8080`) und wurde für alle Tests dieser Session verwendet.
- `typecheck-api` bleibt rot wegen einer veralteten generierten Typdefinition (`lib/db/dist`), die das
  Enum `inline_wiki_link` nicht kennt, obwohl es im DB-Schema und zur Laufzeit existiert. Dies ist ein
  vorbestehender, scope-fremder Zustand außerhalb der Task-Spezifikation (betrifft die Build-Pipeline der
  `@workspace/db`-Paketausgabe, nicht die hier geänderte Anwendungslogik).
- Die Task-Spezifikation nennt Änderungen an `inline_wiki_link`-Sync explizit unter "Out of scope"
  ("bereits in Vorgänger-Tasks umgesetzt"), verlangt in Step 3 aber ausdrücklich die Verifikation genau
  dieses Mechanismus für das neu umgestellte Feld. Da die reale Live-Prüfung zeigte, dass der bestehende
  Mechanismus dieses Feld nie erfasst hatte, wurde die minimal-invasive Erweiterung (kein neuer
  Relationstyp, keine Änderung an `BacklinksPanel`, nur vollständigere Feld-Erfassung in der bestehenden
  Funktion) als notwendig erachtet, um das explizite "Done looks like"-Kriterium zu erfüllen. Dies wird
  hier transparent dokumentiert, da es die einzige Abweichung von einer wörtlichen Scope-Grenze ist.
- E2E-Testtooling zeigte bei einem Zwischenlauf Timeouts bei der Interaktion mit dem Wiki-Picker-
  Suchfeld (Browser-Automatisierung, kein reproduzierter Produktfehler); die anschließende, gezieltere
  Testvariante war erfolgreich und deckt dieselbe Funktionalität ab.

## 14. Abschlussstatus nach harter Taxonomie

```
BESTANDEN
```

Begründung: Alle drei Root Causes wurden im realen Dev-Workflow reproduziert, minimal-invasiv behoben
und anschließend erneut live (nicht nur per Code/Typecheck) verifiziert. Die vollständige Datenkette
UI→API→DB→UI wurde nachgewiesen. Verbleibende rote Checks (`API Server`-Legacy-Workflow,
`typecheck-api`) sind nachweislich vorbestehend und scope-fremd und wurden nicht durch diese Änderung
verursacht oder verschärft.
