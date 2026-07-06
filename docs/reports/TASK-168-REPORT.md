# TASK-168-REPORT: L2-Übersicht Duplikat-Anzeige & Feldreihenfolge fixen

## 1. Ziel
Kindseiten auf `core_process_overview`- und `area_overview`-Seiten sollen nur noch
einmal angezeigt werden; "Zweck & Geltungsbereich" (PageLayout) soll an erster
Position vor jeder Kindseiten-Liste erscheinen. Reines Rendering-/Reihenfolge-Fix,
keine Datenmigration.

## 2. Root Cause (bestätigt)
In `NodeDetail.tsx` wurden für Seiten mit `isOverviewPage === true`
(`displayProfile: "overview_container"`) **und** `showsClusterArea === true`
(`pageDef.supportsClusterGroups === true`) zwei unabhängige Render-Blöcke aktiv,
die beide dieselbe `useNodeChildren`-Datenquelle konsumierten:

1. `showsClusterArea`-Block → `<DocRegistryView>` (volle Cluster-CRUD: Filter,
   Verlinken, Neu, Reassign-Dropdown, Pagination) unter Überschrift
   `"<Seitentyp>-Inhalte"`.
2. `isOverviewPage`-Inline-Block "Bereiche & Prozesse"/"Zugehörige Seiten"
   (gruppiert nach Cluster oder Seitentyp, mit eigenem Löschen/Entfernen).

Dazwischen lag der `<PageLayout>`-Block (inkl. "Zweck & Geltungsbereich"),
wodurch das Pflichtfeld zwischen den beiden Duplikat-Listen statt davor
erschien. Nur `core_process_overview` und `area_overview` haben in
`lib/shared/src/page-types/registry.ts` beide Flags gleichzeitig gesetzt
(Cross-Referenz per grep/awk bestätigt) — kein anderer Seitentyp betroffen.

## 3. Datenkette
```
content_nodes.template_type (core_process_overview | area_overview)
  → PAGE_TYPE_REGISTRY: displayProfile:"overview_container" (isOverviewPage=true)
                         supportsClusterGroups:true (showsClusterArea=true)
    → NodeDetail.tsx: beide Bedingungen gleichzeitig wahr
      → useNodeChildren(nodeId) einmal geladen, zweimal gerendert
        → DocRegistryView-Block + "Bereiche & Prozesse"-Block = Duplikat
        → PageLayout ("Zweck & Geltungsbereich") lag zwischen den Blöcken
```
Zugrunde liegende Daten (`content_nodes`, Cluster-Zuordnungen) waren korrekt und
einmalig gespeichert — reiner Rendering-Fehler, keine Dateninkonsistenz.

## 4. Klärung UI-Zweck beider Blöcke (Schritt 1 der Implementierungsanforderungen)
`DocRegistryView` ist der funktional vollständigere Block: Status-/Typ-Filterleiste,
pro Cluster "Neu"/"Verlinken", Cluster-Reassign-Dropdown pro Kindseite, Pagination-
Grundlage. Der inline "Bereiche & Prozesse"-Block bot zusätzlich nur: Cluster-Löschen-
Button, Entfernen-aus-Cluster-Button (X) und Verlink-Icon pro Kindseite — sonst
identische Daten in anderer Gruppierungsdarstellung.

**Entscheidung:** `DocRegistryView` bleibt der einzige verbleibende Block.
Die drei Zusatzfunktionen aus dem inline-Block wurden in `DocRegistryView.tsx`
nachgebaut (neue optionale Props `canEdit`, `linkedNodeIds`, `onRemoveFromCluster`,
`onDeleteCluster`), damit keine Funktionalität verloren geht.

**Bewusster Trade-off (dokumentiert, nicht versteckt):** Der inline-Block hatte für
den Zero-Cluster-Fall eine nach Seitentyp gruppierte Darstellung mit pro-Typ-"Neu"-
Button (voreingestellter `templateType`). `DocRegistryView`s Zero-Cluster-Fallback
zeigt stattdessen eine flache, nach Datum sortierte Liste mit Status-/Typ-Filter oben;
Seiten-Erstellung ist weiterhin über den allgemeinen "Neu"-Button möglich, nur ohne
Typ-Voreinstellung. Als Folgetask vorgeschlagen (siehe Abschnitt 9), falls gewünscht.

## 5. Umsetzung
- `NodeDetail.tsx`: `<PageLayout>`-Block (nur bei `isOverviewPage`) vor den
  `showsClusterArea`-Block verschoben. Überschrift des verbleibenden Blocks:
  `isOverviewPage` → `"Bereiche & Prozesse"` (core_process_overview) bzw.
  `"Zugehörige Seiten"` (area_overview); sonst unverändert
  `"<Seitentyp>-Inhalte"`. Dupliziertes "Bereiche & Prozesse"-Inline-Segment
  vollständig entfernt (~280 Zeilen). Ungenutzte Imports (`Layers`, `Link2`)
  bereinigt.
- `DocRegistryView.tsx`: neue optionale Props `canEdit`, `linkedNodeIds`,
  `onRemoveFromCluster`, `onDeleteCluster`; Cluster-Löschen-Button im
  Cluster-Header, Verlink-Icon (`Link2`) und Entfernen-Button (`X`, hover-reveal)
  pro Kindseite in `ClusterSection` ergänzt und über beide Render-Pfade
  (Zero-Cluster-Fallback + gruppierte Darstellung) durchgereicht.
- **Wichtige Korrektur während Selbst-Review:** Die neuen Props wurden zunächst
  unbedingt an `<DocRegistryView>` übergeben. Das hätte Lösch-/Entfernen-Buttons
  auch auf `dashboard`/`doc_registry`/`policy`-Seiten sichtbar gemacht, die
  `showsClusterArea` nutzen, aber nicht `isOverviewPage` sind — ein Verstoß gegen
  die Regressions-Anforderung ("andere Seitentypen zeigen weiterhin exakt das
  gleiche, unveränderte Verhalten"). Korrigiert: `canEdit`/`linkedNodeIds`/
  `onRemoveFromCluster`/`onDeleteCluster` werden nur bei `isOverviewPage === true`
  durchgereicht, sonst `undefined`. Per Screenshot-Regressionstest verifiziert
  (Abschnitt 7).

## 6. PROD-Datenprüfung (read-only, vor Abschluss erneut bestätigt)
Erneute read-only SQL-Abfrage gegen `environment: "production"` zum Task-Ende
(Stand 06.07.2026) zeigt gegenüber der ursprünglichen Planungssession
geänderte, aber weiterhin signifikante Zahlen (normale PROD-Nutzung im
Zeitraum, keine durch diesen Task verursachte Änderung — es wurden keine
Schreiboperationen gegen PROD durchgeführt):

| Typ | Status | Ursprünglich (Planung) | Aktuell (Abschluss) |
|---|---|---|---|
| core_process_overview | published | 13 | 2 |
| core_process_overview | draft | 2 | 0 |
| area_overview | published | 10 | 17 |
| area_overview | draft | 0 | 1 |

Der Bug betraf und betrifft weiterhin ausschließlich diese beiden Seitentypen;
die genaue Fallzahl schwankt mit normalem Content-Betrieb, die Root-Cause-
Zuordnung bleibt unverändert gültig.

## 7. Live-Test (DEV-Workflow, `artifacts/wiki-frontend: web`)
- Referenzabgleich zu den in `task-168.md` genannten PROD-Beispielknoten
  `BER-016.KP-026`, `BER-015.KP-001`, `BER-016.KP-030`, `KP-013`, `KP-017`:
  Alle fünf sind laut PROD-Bestand `core_process_overview`- bzw.
  `area_overview`-Knoten und damit exakt die durch die Root Cause betroffene
  Teilmenge; die DEV-Testknoten unten wurden bewusst als strukturell
  äquivalente Stellvertreter genutzt (gleiche Seitentyp-/Flag-Kombination),
  da DEV keine 1:1-Kopie der PROD-Knoten-IDs enthält.
- **core_process_overview** (Node `e2e9017a-ddea-4bf8-8189-96fd11192609`, "HR",
  KP-002, vergleichbar mit PROD-Referenz `BER-016.KP-026`): Vorher zwei Blöcke
  (Screenshot/Code bestätigt), nachher genau ein Block "Bereiche & Prozesse"
  mit Filter, Cluster-Gruppierung ("Nicht zugeordnet", 7 Seiten), Verlinken/Neu.
  "Zweck & Geltungsbereich" strukturell vor der Liste positioniert (Feld war für
  diese Testseite leer/0%-Anlage-Modus → kein sichtbarer Inhalt, aber korrekte
  DOM-Reihenfolge; leere PageLayout-Zeilen werden von `GenericLayout`
  vorbestehend unterdrückt — keine Regression).
- **area_overview** (Node `d265f18b-0374-44c6-acca-d01c18bf711d`,
  "Unternehmen und Struktur", KP-001.BER-001): genau ein Block
  "Zugehörige Seiten", 5 Seiten korrekt gelistet, kein Duplikat.
- **Regressionstest andere Seitentypen (unverändert erwartet):**
  - `policy` (Node `76678c2b-b9b4-4d8c-aa64-e27d5aee53cb`, "test", RL-007):
    Anzeige unverändert (Zweck-Karte wie vorher, kein Cluster-Bereich betroffen).
  - `doc_registry` (Node `1eeab812-3878-4639-af19-4090bcd025c7`, "Management &
    Governance Register"): vor Korrektur zeigte dieser Seitentyp fälschlich neu
    einen Cluster-Löschen-Button (Scope-Verstoß, siehe Abschnitt 5); nach
    Korrektur exakt identisch zum Vorher-Zustand (kein Löschen-/Entfernen-Icon,
    nur "Neu"/"Verlinken" wie zuvor) — per Vorher-/Nachher-Screenshot bestätigt.
  - `dashboard`: kein published Node dieses Typs im DEV-Bestand vorhanden;
    Code-Pfad (`showsClusterArea` ohne `isOverviewPage`) ist identisch zum
    `doc_registry`-Pfad und damit durch obigen Test mit abgedeckt.
- **Negativtest Datenintegrität:** Keine Schreiboperation gegen Cluster-/
  Kindseiten-Zuordnungen während des gesamten Fixes; alle Änderungen sind reine
  Frontend-Renderlogik (`NodeDetail.tsx`, `DocRegistryView.tsx`). Kein DB-Write
  in DEV oder PROD durchgeführt.

## 8. Tests
- `typecheck-frontend` (`tsc --noEmit`, wiki-frontend): **grün**, keine Ausgabe.
- `build-frontend`: **erfolgreich** (`✓ built in 24.75s`, 3130 Module).
- `task-completion-audit`: **grün** (Ratio 14.3%, Schwelle 20%). Erste
  Ausführung schlug fehl (`dead-import-check`): Beim Entfernen des
  ~280-Zeilen-Inline-Blocks blieb der Type-Import `TemplateType` aus
  `NodeDetail.tsx:45` ungenutzt zurück (frühere Treffer wie
  `editTemplateType` sind Teilstrings, kein `\bTemplateType\b`-Wortmatch).
  Entfernt; `dead-import-check` danach grün, `typecheck-frontend`/
  `build-frontend` erneut grün bestätigt.
- `route-contract-check`: bleibt rot (50 Abweichungen: 48 undokumentierte
  Admin-/RBAC-/Delegations-/Glossar-/Media-/Token-Routen, 2 Client-Drift bei
  `/admin/sessions`) — vollständig unabhängig von diesem Task; `git diff`
  bestätigt, dass außer `NodeDetail.tsx`/`DocRegistryView.tsx` keine Datei in
  `artifacts/api-server`, `lib/api-spec` oder `lib/api-client-react` verändert
  wurde. Pre-existing, MUST_NOT_TOUCH laut Scope.
- Vorbestehende, scope-fremde rote Checks (unverändert, nicht Teil dieses Fixes):
  - `API Server` (Legacy-Duplikat-Workflow, "port: nan" Konfigurationsfehler) —
    bereits vor diesem Task fehlerhaft, betrifft nicht `artifacts/api-server:
    API Server` (läuft stabil).
  - `typecheck-api` (`working-copy.service.ts`, `"inline_wiki_link"` fehlt im
    Drizzle-Enum) — Backend, MUST_NOT_TOUCH laut Scope, unverändert.

## 9. Qualitätsprüfung (Blueprint V5, Abschnitt 15)
| Kriterium | Status | Anmerkung |
|---|---|---|
| Root Cause identifiziert & im Code verifiziert | ✅ | Registry-Cross-Referenz, Zeilen dokumentiert |
| Fix behebt exakt das gemeldete Symptom | ✅ | Kein Duplikat mehr, Feldreihenfolge korrekt |
| Keine Funktionalität verloren | ✅ | Cluster-CRUD, Löschen, Entfernen, Verlinken alle erhalten in DocRegistryView |
| Keine Regression bei anderen Seitentypen | ✅ (nach Korrektur) | Scope-Leck bei doc_registry/policy während Selbst-Review gefunden und behoben |
| Keine DB-/PROD-Schreiboperation | ✅ | Nur Lesezugriffe für Verifikation |
| typecheck-frontend grün | ✅ | |
| build-frontend erfolgreich | ✅ | |
| Live-Test DEV (beide Seitentypen) | ✅ | Screenshots dokumentiert |
| Bekannte Trade-offs dokumentiert | ✅ | Abschnitt 4 (Zero-Cluster-Typ-Voreinstellung) |
| Scope eingehalten (MUST_NOT_TOUCH) | ✅ | Keine Backend-/DB-/Registry-Änderung |

## 10. Geänderte Dateien
- `artifacts/wiki-frontend/src/pages/NodeDetail.tsx`
- `artifacts/wiki-frontend/src/components/registry/DocRegistryView.tsx`

## 11. Nicht verändert (bestätigt)
- `content_nodes`, `content_relations`, Cluster-Tabellen (keine Schreiboperation)
- `lib/shared/src/page-types/registry.ts` (keine Änderung nötig — Flag-Kombination
  war korrekt für diese zwei Seitentypen, das Problem lag ausschließlich im
  Rendering)
- Backend-API/Working-Copy-Pipeline

## 12. Offene Punkte / Folgetasks
Siehe `proposeFollowUpTasks`-Aufruf: Zero-Cluster-Typ-Voreinstellung (Trade-off
aus Abschnitt 4) als optionaler Folgetask vorgeschlagen.

## Abschlussstatus
**BESTANDEN**
