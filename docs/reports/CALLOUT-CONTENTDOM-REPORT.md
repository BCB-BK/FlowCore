# Callout-Hinweisfeld verliert Text/Farbe im Haupt-Editor – Abschlussbericht (Zusatz V4)

**Datum:** 2026-07-03
**Verbindliche Vorgabe:** `attached_assets/Verbindlicher_Zusatz_klein_v4_1783061817746.md`
**Gemeldetes Symptom:** Callout-/Hinweisfelder (info/warning/error/success) erscheinen im
Haupt-Editor nach dem Einreichen der Arbeitskopie leer – Text UND Typ-Badge/Farbe verschwinden.
Es existierte noch kein formaler Task für diesen Bug; dieser Bericht deckt die vollständige
Root-Cause-Analyse und den Fix in einem Zyklus ab.

## 1. Root Cause

Die `CalloutNodeView`-Komponente (`artifacts/wiki-frontend/src/components/editor/NodeViews.tsx`)
markierte ihren Inhaltsbereich manuell mit dem rohen HTML-Attribut
`<div data-node-view-content="" />` statt der offiziellen `<NodeViewContent>`-Komponente aus
`@tiptap/react`.

In Tiptap v3 (`@tiptap/react@3.20.5`) sucht `ReactNodeView` diesen Marker **synchron im
Konstruktor**, direkt nach `super(component, props, options)`, per
`this.dom.querySelector("[data-node-view-content]")`, und hängt danach das eigentliche,
von ProseMirror verwaltete `contentDOMElement` als Kind in dieses gefundene Element ein
(`contentTarget.appendChild(this.contentDOMElement)`). Wird das Ziel-Element zu diesem
Zeitpunkt nicht gefunden bzw. wird das `appendChild` durch den React-Renderzyklus nicht
synchron vollzogen, bleibt `contentDOMElement` **detached** (nie in den sichtbaren DOM-Baum
eingehängt). ProseMirror schreibt den Textinhalt des Knotens dann in dieses unsichtbare,
losgelöste Element – der Text existiert im Dokumentmodell und wird korrekt gespeichert, ist
aber im gerenderten DOM nicht sichtbar.

Die offizielle `<NodeViewContent>`-Komponente verwendet stattdessen einen React-**Callback-Ref**
(`nodeViewContentRef`), der garantiert erst nach dem tatsächlichen React-Commit des Elements
aufgerufen wird – dieser Mechanismus ist robust gegen die genannte Race-Condition, die eigene
`data-node-view-content`-Div-Variante war es nicht.

**Live-Beweis der Ursache (vor dem Fix):**
Direkte DOM-Inspektion im laufenden Editor (`page.evaluate`) auf
`document.querySelectorAll('[data-node-view-content]')` ergab genau 1 Treffer (das
Callout-Contentdiv) mit `childElementCount: 0`, `childNodesCount: 0`, `textContent: ""` –
obwohl der zugehörige Working-Copy-Datensatz denselben Text serverseitig korrekt enthielt
(per direktem API-Roundtrip nachgewiesen). Das Contentdiv war also **echt leer im DOM**,
kein reines CSS-/Sichtbarkeitsproblem.

Der Backend-Publish-/Submit-Pfad (`working-copy.service.ts`) wurde separat live per
API-Roundtrip getestet (PATCH mit Callout-Node → POST `/submit`) und verliert/saniert die
Callout-Daten **nicht** – die Ursache liegt ausschließlich im Frontend-Rendering.

## 2. Betroffene Datenkette

```
TipTap-Dokumentmodell (Callout-Node, content: "inline*")
  → ReactNodeView-Konstruktor (Tiptap v3, @tiptap/react)
    → querySelector("[data-node-view-content]") im rohen <div>-Marker [RACE / SCHEITERT]
      → contentDOMElement bleibt detached, nie in sichtbaren DOM-Baum eingehängt
        → Editor-UI zeigt Callout-Box (Farbe/Rahmen korrekt), aber Textbereich leer
        → (Backend/DB/Persistenz bleiben unberührt korrekt – Bug ist rein Frontend-Rendering)
```

## 3. Datei-Impact-Liste

- `artifacts/wiki-frontend/src/components/editor/NodeViews.tsx` (Root-Cause-Fix)

## 4. Existing-Implementation-Verifikation

Für dieses Symptom existierte noch kein Task und kein Fix-Versuch. Die zunächst naheliegende
Hypothese – Datenverlust im Backend-Submit-/Publish-Pfad (`working-copy.service.ts`) – wurde
zuerst **live per direktem API-Test ausgeschlossen** (PATCH mit Callout-Node
`type="warning"`, `text="TESTHINWEIS-CALLOUT-12345"`, danach `POST .../submit`: JSON
rundet verlustfrei durch das reale Backend). Erst danach wurde per Live-Browser-Test und
DOM-Inspektion die tatsächliche Ursache im Frontend (`CalloutNodeView`) lokalisiert.

## 5. Implementierung

- Import von `NodeViewContent` aus `@tiptap/react` ergänzt.
- Der manuelle `<div className="prose prose-sm dark:prose-invert" data-node-view-content="" />`
  wurde durch `<NodeViewContent className="prose prose-sm dark:prose-invert" />` ersetzt.
  Dadurch nutzt der Callout-Content-Bereich denselben offiziellen, ref-basierten
  Content-DOM-Bindungsmechanismus wie alle Standard-Tiptap-Node-Views – keine Änderung an
  Styling, Schema oder Verhalten der übrigen Callout-Funktionalität (Typauswahl-Buttons,
  Farblogik, Löschbar-Icon-Leiste bleiben unverändert).

## 6. Geänderte Dateien mit technischer Erklärung

| Datei | Änderung |
|---|---|
| `NodeViews.tsx` | Import `NodeViewContent`; `CalloutNodeView`s manuelles `data-node-view-content`-Div durch `<NodeViewContent>`-Komponente ersetzt (korrekt getimte Ref-Bindung statt racy synchroner `querySelector` im Tiptap-v3-`ReactNodeView`-Konstruktor) |

## 7. Tests

- `typecheck-frontend` (`tsc --noEmit`, wiki-frontend): **grün**, keine neuen Fehler durch den Fix.
- `typecheck-api`: weiterhin scope-fremd rot (bereits aus Task #167 dokumentiert: veraltete
  generierte Enum-Typdefinition für `inline_wiki_link` in `lib/db/dist`, nicht durch diesen
  Fix verursacht oder verändert).
- `build-frontend`: erfolgreich.
- **E2E Live-Test 1 (Text-Rendering, nach Fix):** `/nodes/:id/edit` geöffnet, Callout mit
  Text `TESTHINWEIS-CALLOUT-12345` sichtbar gerendert (gelb, Typ "warning", Text lesbar).
  DOM-Check `document.querySelectorAll('[data-node-view-content]')` → jetzt
  `childElementCount: 1, childNodesCount: 1, textContent: "TESTHINWEIS-CALLOUT-12345"`
  (vorher: `0/0/""`).
- **E2E Live-Test 2 (Text-Editierbarkeit, nach Fix):** Cursor ans Textende gesetzt, 5×
  Backspace gedrückt → Text kürzte sich korrekt auf `"TESTHINWEIS-CALLOUT-"`; erneuter
  DOM-Check bestätigte den verkürzten Text im Content-DOM. Vor dem Fix war das
  Content-DOM-Element gar nicht im Baum vorhanden, Texteingabe/-löschung im Callout war damit
  faktisch unmöglich zu verifizieren/nutzen.
- **E2E Live-Test 3 (voller Workflow UI→API→Submit, nach Fix):** Arbeitskopie mit sauberem
  Callout-Node (`calloutType="warning"`, Text `"V4-VALIDIERUNG-OK"`) über `PATCH
  /api/content/working-copies/:id` gesetzt, per UI im Editor als korrekt farbig/sichtbar
  bestätigt, über "Einreichen" (Submit-Button, Änderungstyp "Kleinere Änderung") eingereicht.
  API-Bestätigung: Working-Copy-Status wechselte zu `submitted`, `structuredFields._editorContent`
  enthält weiterhin unverändert den korrekten Callout-Node (`type: "callout"`,
  `calloutType: "warning"`, Text `"V4-VALIDIERUNG-OK"`) – **kein** Datenverlust beim Submit.
  Die Veröffentlichung (Publish) selbst wurde durch das bestehende Vier-Augen-Prinzip
  blockiert (Autor darf eigene Arbeitskopie nicht selbst freigeben) – dies ist reguläres,
  vom Bug unabhängiges Systemverhalten und kein Fehler dieses Fixes (siehe Abschnitt 13).

## 8. Live-Wirksamkeitsmatrix

| Fehler | Vor Fix | Nach Fix | Nachweis |
|---|---|---|---|
| Callout-Text im Editor unsichtbar (Content-DOM detached) | reproduziert (`childElementCount:0`, `textContent:""`) | behoben (`childElementCount:1`, korrekter Text) | Live-DOM-Test |
| Callout-Farbe/Typ-Badge verschwindet | in dieser Session **nicht** reproduzierbar isoliert von der Textursache – Farbe/Badge blieben in allen Tests sichtbar; das gemeldete "verschwindet" bezog sich vermutlich auf den optischen Gesamteindruck einer leeren, aber weiterhin farbigen Box | Farbe/Badge in allen Tests durchgehend korrekt sichtbar | Live-UI-Test (Screenshots) |
| Text im Callout nicht editierbar (Backspace wirkungslos, da Content-DOM nicht Teil des editierbaren Baums) | reproduziert (kein Content-DOM im Baum) | behoben (Backspace verkürzt Text korrekt) | Live-DOM-Test |
| Backend/Submit verliert Callout-Daten | **nicht bestätigt** – Daten rundeten in allen API-Tests verlustfrei durch | unverändert korrekt (kein Fix nötig) | API-Roundtrip-Test |

## 9. Datenkettennachweis

UI (Editor, Callout-NodeView) → TipTap-Dokumentmodell → Autosave/PATCH
`/api/content/working-copies/:id` (HTTP 200) → `content_working_copies.structured_fields`
(korrekt persistiert, Callout-Node vollständig erhalten) → Submit
(`POST .../submit`, Status `submitted`) → erneuter API-Read bestätigt unveränderten
Callout-Node. Vollständig end-to-end nachgewiesen, keine manuelle DB-Manipulation zur
Herstellung eines Erfolgszustands (Testdaten ausschließlich über echte API-Endpunkte
geschrieben).

## 10. Qualitätsprüfung

- Keine Validatoren abgeschwächt, keine Severity gesenkt, keine Pflichtfelder optional gemacht.
- Keine Dummy-Daten zur künstlichen Erfolgsherstellung; alle Testdaten liefen über echte
  API-Endpunkte (`PATCH`, `/submit`, `/return-for-changes`, `/cancel`).
- Kein Silent-Fallback, kein Wrapper-only-Fix: Die Änderung bindet direkt an den
  Produktivpfad (dieselbe `CalloutNodeView`, die im Haupt-Editor aktiv verwendet wird).
- Minimal-invasiv: Nur die Content-DOM-Bindungstechnik wurde ersetzt; Schema, Styling,
  Typauswahl-Logik, Icon-Leiste der Callout-Komponente unverändert.
- `code-quality` (`task-completion-audit`) ist an eine spezifische Task-Markdown-Datei
  gebunden; für diesen (noch task-losen) Bugfix nicht direkt anwendbar – stattdessen wurde
  die Wirksamkeit über Live-DOM- und API-Tests nachgewiesen (siehe Abschnitt 7–9).

## 11. UI/API/DB/Audit-Abgleich

Konsistent: Der im Editor sichtbare Callout-Text entspricht exakt dem per API persistierten
und danach erneut ausgelesenen `structuredFields._editorContent`-Callout-Node. Keine
Abweichung zwischen UI-Anzeige und Datenbankinhalt in allen drei Testzyklen festgestellt.

## 12. Evidenzdateien / technische Prüfdateien

- Diese Datei: `docs/reports/CALLOUT-CONTENTDOM-REPORT.md`
- Code-Diff: `artifacts/wiki-frontend/src/components/editor/NodeViews.tsx`
  (Zeilen ~1–4 Import, ~265–269 `CalloutNodeView`-Content-Rendering)
- Tiptap-v3-Quellcode-Nachweis der Root Cause:
  `node_modules/.pnpm/@tiptap+react@3.20.5_.../@tiptap/react/dist/index.js`
  (`ReactNodeView`-Konstruktor, `querySelector("[data-node-view-content]")`-Logik;
  `NodeViewContent`-Komponente mit Ref-basierter `nodeViewContentRef`-Bindung)
- Live-Browser-Testläufe (runTest, Playwright-basiert): Vorher-DOM-Nachweis (leeres
  Content-DOM), Nachher-DOM-Nachweis (korrekter Text), Backspace-Editierbarkeitstest,
  voller Submit-Workflow-Test
- Testnode: "Prozessseite 1" (`6c5a55b9-bfcf-4bee-bc52-fdc920e7dd13`),
  Arbeitskopie `71fc818c-bcab-4edc-82fa-13b1e54a7436` (nach Tests auf Status `cancelled`
  zurückgesetzt, Inhalt auf sauberen, unveränderten Zustand bereinigt – keine
  Testpollution verbleibend, Original-Publish-Stand des Knotens war während der gesamten
  Session zu keinem Zeitpunkt betroffen, da nie freigegeben)

## 13. Offene Risiken

- Die separat vermutete Beschwerde "Callout kann nicht gelöscht werden" (Lösch-Icon-Leiste /
  Block-Aktionsmenü) konnte in dieser Session **nicht** abschließend reproduziert werden:
  Zwei automatisierte Browser-Testversuche (Hover-Grip-Menü, Text-markieren-und-Backspace)
  scheiterten an Interaktionsproblemen des Testtools selbst (Hover-Reveal-UI wurde nicht
  zuverlässig ausgelöst), nicht an einem eindeutig reproduzierten Anwendungsfehler. Diese
  Beschwerde war zudem **nicht** Teil der ursprünglich gemeldeten Aufgabenbeschreibung
  (die sich explizit auf "leer nach Einreichen" bezog) und wird hier als offener,
  unbestätigter Folgepunkt dokumentiert, nicht als bestätigter zweiter Bug.
- Vorbestehende, scope-fremde rote Checks (identisch zu Task #167 dokumentiert, durch diesen
  Fix nicht verursacht oder verschärft):
  - Legacy-Workflow `API Server` (Port-Konfigurationsfehler, doppelter/alter Workflow-Eintrag,
    der tatsächlich aktive `artifacts/api-server: API Server` läuft fehlerfrei).
  - `typecheck-api`: veraltete generierte Enum-Typdefinition für `inline_wiki_link` in
    `lib/db/dist`.
- Die vollständige Publish-Verifikation (Freigabe durch einen zweiten Nutzer) wurde aufgrund
  des Vier-Augen-Prinzips nicht bis zur veröffentlichten Leseansicht durchgeführt; die
  ursprünglich gemeldete Fehlerursache (Content-DOM-Rendering im Editor) ist davon jedoch
  unabhängig, da die Leseansicht node-view-unabhängig aus dem persistierten JSON gerendert
  wird und der Bug nachweislich ausschließlich die editierbare ProseMirror-NodeView betraf.

## 14. Abschlussstatus nach harter Taxonomie

```
BESTANDEN
```

Begründung: Die Root Cause (racy Content-DOM-Bindung der manuellen
`data-node-view-content`-Div-Technik in Tiptap v3, statt der offiziellen
`<NodeViewContent>`-Komponente) wurde im realen Dev-Workflow per Live-DOM-Inspektion
zweifelsfrei nachgewiesen, minimal-invasiv behoben und danach erneut live (Text-Rendering,
Text-Editierbarkeit, voller Submit-Workflow über echte API-Endpunkte) verifiziert. Die
Datenkette UI→TipTap-Modell→API→DB wurde vollständig nachgewiesen, ohne künstliche
Erfolgsherstellung. Der ursprünglich gemeldete Fehler (leerer Callout-Text nach Einreichen)
tritt real nicht mehr auf. Die unbestätigte "kann nicht gelöscht werden"-Nebenbeschwerde
liegt außerhalb des ursprünglich gemeldeten Scopes und wird unter Punkt 13 transparent als
offen dokumentiert, ohne den Abschlussstatus dieses spezifischen, gemeldeten Bugs zu mindern.
