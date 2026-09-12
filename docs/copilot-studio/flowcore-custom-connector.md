# FlowCore Custom Connector (optionaler Zusatzcluster)

Stand: 09.07.2026

## Zweck

Dieser Connector ist **nicht** dieselbe Integration wie die Microsoft-Graph-
Knowledge-Source (siehe `flowcore-agent-setup.md` / Cluster 12). Er erlaubt
Copilot Studio Spezialagenten (z.B. Prozessmanagement, Marketing, QM, EHiP),
FlowCore live als **Tool/Action** über einen Power-Platform-Custom-Connector
abzufragen — mit Filtern, statt nur passiv indexierten Inhalten.

Empfehlung: Erst nach erfolgreichem Graph-/Knowledge-MVP (Cluster 12)
nutzen.

## Endpoints

| Methode | Pfad | Auth | Zweck |
|---|---|---|---|
| GET | `/api/copilot/swagger.json` | keine (öffentliches Schema-Dokument) | **Diese Datei für den Import in den Power Apps Custom-Connector-Wizard verwenden** (OpenAPI 2.0/Swagger) |
| GET | `/api/copilot/openapi.json` | keine (öffentliches Schema-Dokument) | Menschenlesbare OpenAPI-3.0-Referenz derselben API — NICHT für den Power-Apps-Import geeignet |
| POST | `/api/copilot/search` | `X-FlowCore-Api-Key` | Volltextsuche über veröffentlichte, Copilot-indexierbare Seiten, optional gefiltert nach `brandScope`/`agentScope` |
| GET | `/api/copilot/nodes/:id` | `X-FlowCore-Api-Key` | Liefert die vollständige Projektion einer einzelnen veröffentlichten Seite |

> **Wichtig:** Power Apps / Power Automate Custom Connectors akzeptieren beim
> Import ausschließlich **OpenAPI 2.0 (Swagger)**, kein OpenAPI 3.x (Stand:
> Microsoft Learn, "Create a custom connector from an OpenAPI definition").
> Deshalb gibt es zwei Dokumente — für den tatsächlichen Connector-Import
> immer `swagger.json` verwenden.

Admin-Verwaltung der API-Keys (normale FlowCore-Session/RBAC-Auth, Berechtigung
`manage_copilot_connector_keys`):

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/copilot/admin/keys` | Liste aller Connector-Keys (ohne Klartext-Secret) |
| POST | `/api/copilot/admin/keys` | Neuen Key anlegen; Klartext-Secret wird **nur bei Erstellung einmalig** zurückgegeben |
| DELETE | `/api/copilot/admin/keys/:id` | Key widerrufen |

## Sicherheitsmodell

Jeder API-Key ist fest auf eine Teilmenge von `agent_scope` und `brand_scope`
sowie eine maximale Vertraulichkeitsstufe beschränkt (Entscheidung vom
09.07.2026, passend zum Fail-Closed-Modell aus Cluster 11):

- Ein Key mit leerer `agentScopes`/`brandScopes`-Liste gilt als
  uneingeschränkt für diese Dimension.
- Ein Key mit gesetzter Liste sieht **nur** Seiten, deren eigener
  `agent_scope`/`brand_scope` mit der Liste überlappt.
- `maxConfidentialityLevel` begrenzt zusätzlich unabhängig davon, welche
  Vertraulichkeitsstufe eine Seite maximal haben darf, damit der Key sie
  sehen darf (Rangfolge: `public < internal < confidential <
  strictly_confidential`).
- Eine Suchanfrage, die einen `brandScope`/`agentScope`-Filter außerhalb der
  Berechtigung des Keys anfordert, wird mit `400` abgelehnt (nicht stillschweigend
  auf ein leeres Ergebnis reduziert) — ein falsch konfigurierter Copilot-
  Studio-Custom-Connector-Aufruf soll laut scheitern, nicht scheinbar "keine
  Treffer" liefern.
- `GET /nodes/:id` liefert `403`, wenn der Key für diese konkrete Seite nicht
  berechtigt ist (Scope- oder Vertraulichkeitsverstoß).
- Nur strikt veröffentlichte, Copilot-indexierbare Seiten (siehe
  `evaluateIndexability` in `agent-metadata.ts`) sind über diesen Connector
  überhaupt erreichbar — dieselbe Regel wie beim Graph-Sync.

## Einrichtung in Copilot Studio / Power Apps (durch Tenant-Admin)

1. Im FlowCore Admin-Bereich für jeden Spezialagenten einen eigenen API-Key
   anlegen (`POST /api/copilot/admin/keys`) mit passendem `agentScopes`/
   `brandScopes`/`maxConfidentialityLevel`. Das Secret wird nur einmal
   angezeigt — sicher hinterlegen.
2. Im Power Apps Portal (make.powerapps.com) über den linken Navigationsbereich
   **Data → Custom Connectors** (Microsoft benennt/verschiebt diesen Menüpunkt
   gelegentlich um; alternativ über "More"/„Mehr" am unteren Rand der
   Seitenleiste suchen) → **+ New custom connector** → **Import an OpenAPI
   file** (bzw. „Aus URL importieren"), und dabei
   `GET /api/copilot/swagger.json` (nicht `openapi.json`!) verwenden.
3. Als Authentifizierung "API Key" mit Header `X-FlowCore-Api-Key` und dem
   erzeugten Secret konfigurieren.
4. Den Connector in Copilot Studio als Tool/Action zum jeweiligen
   Spezialagenten hinzufügen.
5. Testaufruf: `SearchFlowCore` mit einer Beispiel-Query, dann
   `GetFlowCoreNode` mit der `technical.nodeId` eines Treffers (siehe
   „Quellenblock-Metadaten" unten).

Schritt 2–5 erfordern Zugriff auf den Microsoft-Tenant / das Power Apps
Portal und können nicht aus der FlowCore-Entwicklungsumgebung heraus
durchgeführt oder verifiziert werden — dieselbe externe Grenze wie bei
Cluster 12.

## Trefferlogik für Mehrfachtreffer (`POST /search`)

Stand: 10.07.2026. Ziel: generische Fragen sollen mehrere plausible Treffer
liefern, spezifische Fragen sollen korrekt eingegrenzt werden, Definitionsfragen
sollen den Glossarbegriff bevorzugen, und Ablage-/Template-Fragen sollen den
FlowCore-Strukturleitfaden bevorzugen (Task 3).

### Was durchsucht wird

`searchForConnector` durchsucht zwei Quellen und mischt die Ergebnisse in
einer gemeinsamen, nach Score sortierten Trefferliste:

1. Alle veröffentlichten, Copilot-indexierbaren Seiten (`contentNodesTable` →
   `projectPublishedPage`) — Titel, Kurzbeschreibung, Volltext, Keywords.
2. Alle Glossarbegriffe (`glossaryTermsTable` → `projectGlossaryTerm`) —
   Begriff, Kurzbeschreibung, Definition, Synonyme/verwandte Begriffe.

Jeder Treffer trägt ein `itemType`-Feld (`flowcore_page` oder
`glossary_term`), damit ein Spezialagent unterscheiden kann, womit er es zu
tun hat.

### Wortbasiertes Scoring (nicht Phrasen-Matching)

Die Nutzerfrage wird in einzelne Wörter zerlegt statt als zusammenhängende
Phrase gesucht (eine Seite "Vision des BildungsCampus" enthält nicht die
Phrase "vision bildungscampus", aber beide Wörter). Für jedes Wort wird der
beste Treffer pro Feld aufsummiert (Titel > Keywords/Synonyme > Kurzbeschreibung
> Volltext), mit einem zusätzlichen Bonus für exakte Titel-Übereinstimmung
(z.B. die Frage "Was bedeutet AZAV?" soll den Begriff "AZAV" selbst treffen,
nicht nur Begriffe, die "AZAV" beiläufig referenzieren).

Häufige deutsche Fragewörter ("was", "wie", "ist", "bedeutet", "ich", "ein", …)
werden vor dem Scoring entfernt (Stoppwort-Filter) — sonst würden kurze Fragen
durch die immer gleichen Füllwörter dominiert statt durch das eigentliche
Schlüsselwort.

### Intent-Erkennung und Boosts

Zusätzlich zum reinen Textscore erkennt `detectQueryIntent` zwei
Frage-Absichten anhand der Originalfrage (vor Stoppwort-Filterung):

- **Definitorisch** ("was ist/bedeutet/heißt …", "was versteht man unter …")
  → Glossarbegriffe erhalten einen festen Bonus, damit sie Prozessseiten
  überholen, die den Begriff nur erwähnen.
- **Ablage/Template** ("wo lege ich … ab", "welches template/welche vorlage …",
  "ablage(struktur)", "strukturleitfaden") → Seiten mit dem Tag
  `structure-guide` erhalten denselben Bonus.

Der `structure-guide`-Tag ist eine **Konvention, kein automatisch erkannter
Seitentyp** — er muss redaktionell auf die eine kanonische
FlowCore-Strukturleitfaden-Seite gesetzt werden, sobald diese Seite existiert.
Ohne eine so getaggte Seite fallen Ablage-/Template-Fragen auf das normale
Text-Scoring zurück (funktioniert, ist aber nicht bevorzugt).

### Marken-/Agenten-Scope-Eingrenzung

Eine markenspezifische Frage (z.B. "Wie konzipiert die EHiP Academy ein
Produkt?") grenzt sich bereits über das normale Wort-Scoring ein, weil der
Markenname als zusätzliches, hoch gewichtetes Wort in Titel/Content der
jeweiligen Markenprofil-Seite vorkommt — eine explizite `brandScope`-Filterung
im Request ist dafür nicht zwingend nötig, aber weiterhin möglich (siehe
Sicherheitsmodell oben: angeforderte Scopes müssen eine Teilmenge der
Key-Berechtigung sein).

### Getestet in

`e2e/tests/copilot-search-disambiguation.spec.ts` deckt die vier
Kernszenarien ab: generische Mehrfachtreffer, definitorische Anfrage,
markenspezifische Eingrenzung, und Scope-Validierung.

## Quellenblock-Metadaten (`POST /search` und `GET /nodes/:id`)

Stand: 10.07.2026 (Task 4). Ziel: Copilot soll Quellenangaben standardmäßig
aus menschenlesbaren Feldern bilden — nicht aus internen IDs oder
technischem Zustand.

### Standard-Zitierfelder

Jeder Treffer aus `POST /search` und jede Antwort von `GET /nodes/:id`
führt mit denselben Quellenblock-Feldern, die auch im Graph-Content
("Quellenhinweis", Task 2/3) verwendet werden:

- `displayCode` — sprechender FlowCore-Code (z.B. `PROC-BEWERBUNG-01`)
- `title` — Seiten-/Begriffstitel
- `url` (Suche) bzw. `sourceUrl` (Node) — kanonischer Link
- `version` — Versionsstand
- `ownerName` — Name des inhaltlich Verantwortlichen

`nodeId` (UUID), `status` (immer `"published"`, da nur veröffentlichte
Seiten über den Connector erreichbar sind) und `sourcePriority` sind
**nicht** Teil dieser Standardfelder und tauchen dort nicht mehr auf.

### `technical`-Block

Dieselben Werte bleiben für Folgeaufrufe und Konfliktauflösung/Debug
verfügbar, aber unter einem verschachtelten `technical`-Objekt:

- In Suchergebnissen: `technical.nodeId`, `technical.sourcePriority`.
- In `GET /nodes/:id`: `technical.nodeId`, `technical.revision`,
  `technical.sourcePriority`, sowie `immutableId`, `confidentiality`,
  `decisionStatus`, `contentHash`.

`GetFlowCoreNode` wird weiterhin mit `technical.nodeId` aus einem
Suchtreffer aufgerufen (siehe Einrichtungsschritt 5 oben) — dieser Wert
ist nur nicht mehr das Feld, aus dem eine Zitation gebaut werden soll.

### Getestet in

`e2e/tests/copilot-search-source-metadata.spec.ts` prüft, dass Such- und
Node-Antworten `displayCode`/`title`/`url`(`sourceUrl`)/`version`/
`ownerName` als Standardfelder enthalten und `nodeId`/`status`/
`sourcePriority` **nicht** auf oberster Ebene auftauchen — diese Werte
sind nur noch unter `technical` erreichbar.

## Unterseiten / Detailseiten (`GET /nodes/:id`)

Stand: 10.07.2026 (Task 5). Ziel: Copilot soll erkennen können, ob eine
Übersichtsseite Unterseiten hat, welche davon relevant sind, und *warum*
sie relevant sind — ohne dafür jedes Mal eine Zusatzsuche zu brauchen.

### Export-Felder

Jede Antwort von `GET /nodes/:id` enthält:

- `hasChildren` — `true`/`false`
- `childPageCount` — Gesamtzahl der veröffentlichten Unterseiten
- `childPages` — vollständige Liste je Unterseite, sofern nicht zu groß
  (aktuell bis 12 Einträge): `id`, `title`, `displayCode`, `pageType`,
  `sortOrder`, `shortDescription`, `sourceUrl`. Die Liste kommt in der
  gespeicherten Reihenfolge (`sortOrder`, bei Gleichstand Titel, dann `id`);
  `id` erspart das Auflösen über den Titel (Reaudit FC-RA-20260911, T-03)
- `topChildPages` / `childPagesSearchHint` — wenn die Liste zu groß ist,
  wird `childPages` zu `null`; stattdessen liefert `topChildPages` eine
  Auswahl von 5 Einträgen und `childPagesSearchHint` einen fertigen
  deutschen Hinweistext, mit `SearchFlowCore` (gefiltert auf den
  `displayCode`/Titel der Übersichtsseite) weiterzusuchen

### Fachliche Relevanz (`childPagesGuidance`)

Ob Unterseiten für eine Antwort **wichtiger** sind als die Übersichtsseite
selbst, hängt vom Seitentyp ab — das ist reines Fachwissen, das Copilot
sonst nicht hätte. `childPagesGuidance` liefert dafür einen einsatzbereiten
deutschen Satz, passend zum `pageType` der Übersichtsseite:

- **Prozessübersicht** (`core_process_overview`, `area_overview`): die
  Detailseiten behandeln die konkrete Ausarbeitung der einzelnen
  Prozessschritte und sind bei Detailfragen meist relevanter als die
  Übersicht.
- **Dokumentationsregister** (`doc_registry`): die Unterseiten sind die
  eigentlichen Dokumente, nicht nur Verweise darauf.
- Alle anderen Seiten mit Unterseiten erhalten einen generischen Hinweis
  ("Die Detailseiten behandeln die konkrete Ausarbeitung.").
- `null`, wenn die Seite keine Unterseiten hat (`hasChildren: false`).

### Getestet in

`e2e/tests/copilot-search-child-pages.spec.ts` prüft, dass eine
Übersichtsseite mit Unterseiten `childPages` (oder bei Überschreiten des
Limits `topChildPages`/`childPagesSearchHint`) mit allen Feldern pro
Eintrag liefert, dass `childPagesGuidance` gesetzt ist und
"Detailseiten"/"Ausarbeitung" enthält, und dass eine Seite ohne Unterseiten
`childPageCount: 0` sowie `childPagesGuidance: null` zurückgibt.
