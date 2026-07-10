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
   `GetFlowCoreNode` mit einer zurückgegebenen `nodeId`.

Schritt 2–5 erfordern Zugriff auf den Microsoft-Tenant / das Power Apps
Portal und können nicht aus der FlowCore-Entwicklungsumgebung heraus
durchgeführt oder verifiziert werden — dieselbe externe Grenze wie bei
Cluster 12.
