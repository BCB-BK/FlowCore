# FlowCore Content-API

Lesender Zugriff auf veröffentlichte FlowCore-Inhalte für andere Systeme —
Salesforce, Intranet, Portale, eigene Agenten. Die Freigabe wird pro Zugang
festgelegt und lässt sich von „ein ganzer Kernprozess" bis „genau diese eine
Seite" herunterbrechen.

## Grundprinzipien

**Nur veröffentlichte Stände.** Arbeitskopien, Entwürfe und Seiten in Prüfung
verlassen FlowCore nicht. Wer über die API liest, sieht denselben Stand wie
jemand, der die Seite im Wiki aufruft.

**Nur lesend.** Es gibt keinen Schreibpfad. FlowCore bleibt die führende
Quelle; angebundene Systeme spiegeln, sie verändern nicht.

**Freigabe statt Vertrauen.** Ein Schlüssel bekommt keinen Vollzugriff mit
Einschränkungen, sondern nur genau den Ausschnitt, der ihm zugewiesen wurde.
Was nicht freigegeben ist, existiert für diesen Schlüssel nicht — auch nicht
in der Suche.

## Freigabedimensionen

Alle Dimensionen wirken **gleichzeitig**. Eine Seite wird nur ausgeliefert,
wenn sie jede erfüllt.

| Dimension | Wirkung | Leer bedeutet |
| --- | --- | --- |
| Vertraulichkeit | Höchste ausgelieferte Stufe | — (immer gesetzt, Standard „Intern") |
| Seitentypen | Nur diese Typen | alle Typen |
| Struktur | Kernprozesse, Teilbäume, Einzelseiten | gesamte Wissensstruktur |
| Marken | Nur Seiten dieser Marken (`brand:`-Tags) | alle Marken |
| Bereiche | Nur Seiten dieser Bereiche (`agent_scope`) | alle Bereiche |

Bei der Struktur addieren sich Einschlüsse; Ausschlüsse gewinnen immer. So
lässt sich „der ganze Kernprozess Qualitätsmanagement, aber ohne den Zweig
Auditberichte" abbilden.

**Freigabe-Vorschau.** Der Anlagedialog zeigt live, wie viele und welche
Seiten die aktuelle Freigabe tatsächlich umfasst — bevor der Schlüssel
existiert. Eine Regel zu lesen ist das eine, die Liste zu sehen, die daraus
folgt, etwas anderes.

## Schlüssel verwalten

Einstellungen → **Content-API**. Benötigt die Berechtigung
`manage_integration_keys` (Systemadministration).

- Der Klartext wird **einmalig** bei der Erstellung angezeigt. FlowCore
  speichert nur einen SHA-256-Hash und kann den Wert nicht erneut ausgeben.
- **Tauschen** erzeugt einen neuen Wert und behält die Freigabe; der alte Wert
  gilt ab sofort nicht mehr.
- **Widerrufen** sperrt den Zugang dauerhaft.
- Optional: Ablaufdatum, IP-Freigabe, eigenes Anfragelimit pro Minute.
- Jeder Abruf landet im Audit-Trail (`event_type = content_api`) — welcher
  Schlüssel, welcher Endpunkt, wie viele Datensätze, und bei Ablehnungen der
  Grund.

## Endpunkte

Basis: `https://<host>/api/content`
Authentifizierung: Header `X-FlowCore-Api-Key: <Schlüssel>`
(alternativ `Authorization: Bearer <Schlüssel>`)

| Endpunkt | Zweck |
| --- | --- |
| `GET /v1/openapi.json` | Schnittstellenbeschreibung, ohne Schlüssel abrufbar |
| `GET /v1/scope` | Selbstauskunft: Was darf dieser Schlüssel? |
| `GET /v1/pages` | Seitenliste mit Pagination, Filter, `updatedSince` |
| `GET /v1/pages/{id}` | Eine Seite mit Text, Feldern, Verknüpfungen, Governance |
| `GET /v1/changes` | Änderungs-Feed für die laufende Synchronisation |
| `POST /v1/search` | Volltextsuche im freigegebenen Ausschnitt |
| `GET /v1/glossary` | Glossarbegriffe |

### Erster Aufruf

```bash
curl -H "X-FlowCore-Api-Key: fc_int_…" \
     https://flowcore.bildungscampus-backnang.de/api/content/v1/scope
```

Liefert unter anderem `accessiblePageCount` — die Zahl der Seiten, die dieser
Schlüssel gerade lesen darf. Steht dort 0, ist die Freigabe zu eng
geschnitten; das ist der schnellste Weg, ein Anbindungsproblem von einem
Freigabeproblem zu unterscheiden.

### Synchronisation

```bash
# Erstlauf
curl -H "X-FlowCore-Api-Key: …" ".../api/content/v1/pages?limit=100&offset=0"

# Folgeläufe
curl -H "X-FlowCore-Api-Key: …" \
     ".../api/content/v1/changes?since=2026-07-27T08:00:00Z&knownIds=<id1>,<id2>"
```

Die Antwort enthält:

- `changed` — seit `since` geänderte Seiten
- `removed` — von den übergebenen `knownIds` diejenigen, die **nicht mehr**
  freigegeben sind. Diese sollten im Zielsystem entfernt werden, sonst bleibt
  dort Inhalt liegen, den FlowCore längst zurückgezogen hat.
- `checkpoint` — Zeitstempel für den nächsten Aufruf, vom Server erzeugt,
  damit Uhrenversatz im Zielsystem keine Änderungen verschluckt.

### Fehler und ihre Bedeutung

| Status | Bedeutung |
| --- | --- |
| 401 | Schlüssel fehlt, ist unbekannt, widerrufen oder abgelaufen |
| 403 (Verwaltung) | Zugriff von nicht freigegebener IP |
| 403 (Seitenabruf) | Seite liegt außerhalb der Freigabe; `reason` nennt die Dimension: `out_of_structure`, `template_type`, `confidentiality`, `brand_or_agent_scope` |
| 404 | Seite existiert nicht oder ist nicht veröffentlicht |
| 429 | Anfragelimit des Schlüssels erreicht; `Retry-After` beachten |

Ein Seitenabruf außerhalb der Freigabe antwortet bewusst mit 403 und Begründung,
nicht mit 404 — das erspart bei der Anbindung die Ratearbeit. Für Seiten, die
gar nicht veröffentlicht sind, bleibt es bei 404, damit ein Schlüssel den
Bestand nicht abtasten kann.

## Anbindung an Salesforce

1. In FlowCore einen Schlüssel anlegen und die Freigabe über die Vorschau
   prüfen.
2. `GET /v1/openapi.json` abrufen und als External Service importieren
   (Setup → External Services → From API Specification).
3. Named Credential auf `https://<host>/api/content` anlegen, den Schlüssel
   als Custom Header `X-FlowCore-Api-Key` hinterlegen.
4. Erstbefüllung über `/v1/pages`, danach zeitgesteuert `/v1/changes` mit dem
   zuletzt erhaltenen `checkpoint`.

Dasselbe Vorgehen funktioniert mit Power Automate, n8n, Make oder einem
eigenen Skript — das OpenAPI-Dokument ist Standard.

## Abgrenzung zu den Copilot Connector-Keys

Beide Systeme arbeiten mit API-Schlüsseln, verfolgen aber unterschiedliche
Zwecke:

- **Copilot Connector-Keys** bedienen Copilot-Studio-Spezialagenten über einen
  Power-Platform-Custom-Connector. Ihr Zuschnitt läuft über `agent_scope`,
  `brand_scope` und Vertraulichkeit.
- **Integrationsschlüssel** bedienen beliebige Fremdsysteme und schneiden
  zusätzlich nach Seitentypen und Struktur zu.

Die Copilot-Anbindung bleibt unverändert bestehen; die Content-API tritt
daneben, nicht an ihre Stelle.

## Konfiguration

| Variable | Bedeutung | Standard |
| --- | --- | --- |
| `INTEGRATION_SCOPE_CACHE_TTL_SEC` | Wie lange die aufgelöste Struktur-Auswahl zwischengespeichert wird | `60` |

Änderungen an einer Freigabe wirken sofort — der Cache wird beim Speichern
gezielt verworfen.
