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
| `GET /v1/openapi.json` | Schnittstellenbeschreibung; enthält keine Inhalte, verlangt aber denselben Header wie alle anderen Endpunkte |
| `GET /v1/scope` | Selbstauskunft: Was darf dieser Schlüssel? |
| `GET /v1/pages` | Seitenliste mit Pagination, Filter, `updatedSince` |
| `GET /v1/pages/{id}` | Eine Seite: Inhalt, Struktur, Metadaten, Verknüpfungen (`?format=` steuert den Umfang) |
| `GET /v1/changes` | Änderungs-Feed für die laufende Synchronisation |
| `POST /v1/search` | Volltextsuche im freigegebenen Ausschnitt |
| `GET /v1/glossary` | Glossarbegriffe |

### Erster Aufruf

```bash
curl -H "X-FlowCore-Api-Key: fc_int_…" \
     https://<host>/api/content/v1/scope
```

Liefert unter anderem `accessiblePageCount` — die Zahl der Seiten, die dieser
Schlüssel gerade lesen darf. Steht dort 0, ist die Freigabe zu eng
geschnitten; das ist der schnellste Weg, ein Anbindungsproblem von einem
Freigabeproblem zu unterscheiden.

### Antwortformate einer Seite

`GET /v1/pages/{id}` liefert den Inhalt **genau einmal** — welche Fassung,
bestimmt `format`:

| Wert | Inhalt | Wofür |
| --- | --- | --- |
| `markdown` (Standard) | `contentMarkdown`: alle beschrifteten Abschnitte, Tabellen und Seitenlinks; dazu `structuredData` für Felder, die kein Fließtext sind | Regelfall, auch für KI-Kontext |
| `text` | `contentText`: derselbe Inhalt als reiner Text | Systeme ohne Markdown-Verarbeitung |
| `full` | zusätzlich beide Textfassungen und alle gespeicherten Abschnittsfelder (ohne Editor-JSON) | Systeme, die einzelne Felder in ihrer Rohform brauchen |

Ein unbekannter Wert beantwortet die Anfrage mit **400** und nennt die
erlaubten Werte. Das Editor-JSON (`_editorContent`) verlässt FlowCore nicht:
Es trug denselben Inhalt ein zweites Mal und machte bei den Markenseiten 88 %
der übertragenen Felder aus. Über alle 41 Seiten gemessen: 1.600 KB bisher,
517 KB mit `format=markdown`, mit gzip 192 KB.

### Was eine Seitenantwort enthält

Jede Antwort trägt ihren Vertrag mit: `contract` nennt Name und Version
(`flowcore.content-api.page`, aktuell `2.0`). Ändert sich der Umfang, ändert
sich diese Version.

| Feld | Bedeutung |
| --- | --- |
| `nodeId`, `immutableId`, `displayCode`, `title`, `pageType` | Identität der Seite |
| `version`, `revision`, `contentHash` | veröffentlichter Stand |
| `parentNodeId`, `sortOrder` | Hierarchie als Identität, nicht als Textpfad |
| `childPages` | direkte Unterseiten mit `id`, Titel, Anzeigecode, Seitentyp, `sortOrder`, Kurzbeschreibung und URL |
| `pageMetadata` | fachliche Metadaten: Marke, Markenebene, Herkunftsfassung, Prüfzyklus in Monaten, führendes System, verantwortliche Person |
| `governance` | Publikations-, Entscheidungs- und Verbindlichkeitsangaben mit Herkunft (siehe unten) |
| `relations` | gerichtete Beziehungen mit gespeichertem `relationType` (z. B. `inline_wiki_link`, `implements_policy`) |
| `contentLinks` | jedes Verweisvorkommen im Inhalt mit Feld, Tabelle, Zeile, Spalte, Ziel-UUID und URL |
| `media`, `structuredData` | Dateien und Bilder der Seite; Felder, die kein Fließtext sind (Verweislisten, Tabellen-Widgets) |
| `tags`, `confidentiality`, `validFrom`, `reviewDue`, `ownerName`, `sourceUrl` | Einordnung und Herkunft |

**Links sind absolut.** `contentMarkdown`, `media`, `structuredData` und
`childPages` enthalten vollständige URLs; die verwendete Basis steht als
`linkBase` in der Antwort. Ein eigener Resolver ist nicht nötig.

**Seitenlinks in Tabellen bleiben Links.** Ein Verweis in einer Tabellenzelle
behält seine Ziel-UUID; Pipes werden maskiert, harte Umbrüche werden `<br>`,
die Spaltenzahl bleibt unberührt. Wer Ziele maschinell auswerten will, nimmt
`contentLinks` und muss das Markdown nicht zerlegen.

### Status und Verbindlichkeit

`governance` nennt zu jeder Angabe **Wert, Herkunft und Bedeutung**. Drei
verschiedene Dimensionen, die nicht miteinander verwechselt werden dürfen:

| Angabe | Was sie sagt |
| --- | --- |
| `publicationStatus` | Die Seite ist in FlowCore veröffentlicht. Das ist **kein** Urteil über die fachliche Freigabe einzelner Produkt-, Zulassungs- oder Förderaussagen. |
| `decisionStatus` | Redaktioneller Entscheidungsstand (`decided`, `proposed`, `in_review`). |
| `authorityLevel` | Normative Verbindlichkeit (`binding`, `guidance`, `draft`, `archived`), sofern gepflegt. `null` heißt „kein Wert hinterlegt“ — nicht „unverbindlich“. |
| `sourcePriority` | Quellenrang 1–5 zur Gewichtung mehrerer Treffer. |
| `contentRole` | `navigation` für Register und Übersichten, `content` für Seiten mit eigenem Inhalt. Ein Register ist damit keine Marken- oder Prozessregel. |

**Wichtig für Verbraucher:** `decision_status`, `authority_level` und
`source_priority` liegen in den strukturierten Feldern und haben derzeit
**keine Eingabemöglichkeit in der Oberfläche**. Sie sind deshalb im Bestand
nicht gepflegt; die Antwort weist das in `herkunft` ausdrücklich als
„standardwert“ bzw. „nicht gepflegt“ aus. Ein Zielsystem darf daraus keine
Freigabeaussage ableiten. Wer Verbindlichkeit maschinell führen will, braucht
zuerst eine fachliche Festlegung und eine Pflegeoberfläche.

### Zwei Prüfsummen, nicht eine

- **`contentHash`** ist der Inhaltshash des Quellsystems: SHA-256 über das
  stabil sortierte JSON aus Inhalt, Abschnittsfeldern, Titel und
  Versionsbezeichnung der veröffentlichten Revision. Er beantwortet: Hat sich
  der gespeicherte Stand geändert?
- **Ein Byte-Hash der empfangenen Antwort** ist Sache des Zielsystems. Er
  beantwortet: Liegt genau diese Datei unverändert vor?

Aus dem einen folgt nicht das andere. Ein gleicher `contentHash` bei
unterschiedlichen Dateibytes ist kein Fehler — etwa nach einer Änderung an der
Darstellung.

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

### Blätterfolge und Konsistenz eines Abzugs

`/v1/pages` liefert aufsteigend nach `updatedAt`. Wird während einer
Blätterfolge eine Seite bearbeitet, wandert sie ans Ende — bei `offset`-weisem
Lesen kann dabei ein Eintrag übersprungen werden. Der belastbare Abschluss
eines Laufs sieht deshalb so aus:

1. Vor dem ersten Abruf `/v1/changes` holen und den `checkpoint` merken.
2. Seiten lesen.
3. Danach `/v1/changes?since=<checkpoint>` abrufen. Ist `changed` leer, hat
   sich während des Laufs nichts geändert — der Abzug ist in sich stimmig.
   Sonst genau diese Seiten nachziehen.

Wer zusätzlich `knownIds` mitgibt, erfährt in `removed`, welche davon nicht
mehr freigegeben sind und im Zielsystem entfernt werden sollten.

### Übertragung

Antworten werden komprimiert ausgeliefert, sobald der Aufrufer
`Accept-Encoding: gzip` sendet — was die meisten HTTP-Bibliotheken von selbst
tun. Das spart bei JSON typischerweise 70–80 % Übertragungsvolumen. Clients
ohne gzip erhalten die Antwort unverändert unkomprimiert.

### Fehler und ihre Bedeutung

| Status | Bedeutung |
| --- | --- |
| 400 | Unbekannter Wert für `format`; die Meldung nennt die erlaubten Werte |
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
2. `GET /v1/openapi.json` **mit dem Header** abrufen und als External Service
   importieren (Setup → External Services → From API Specification). Die
   Beschreibung enthält keine Inhalte, liegt aber wie alle Endpunkte hinter der
   Anmeldung dieser Installation. Werkzeuge, die eine Spezifikation ohne
   Kopfzeilen laden wollen, bekommen die Datei am einfachsten vorab:

   ```bash
   curl -H "X-FlowCore-Api-Key: fc_int_…" \
        https://<host>/api/content/v1/openapi.json > flowcore-content-api.json
   ```
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
