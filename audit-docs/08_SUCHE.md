# 08 — Suche & Analytik

## 8.1 Übersicht

FlowCore implementiert ein umfassendes Suchsystem basierend auf **PostgreSQL Full-Text Search (FTS)** mit:

- Volltextsuche mit deutscher Sprachunterstützung
- Facettierte Filterung nach Template-Typ, Status, Eigentümer und Tags
- Echtzeit-Autovervollständigung (Vorschläge)
- Such-Analytik mit Klick-Tracking
- Integration in das KI-RAG-System

## 8.2 Volltextsuche

### Indexierung

- **Spalte:** `search_vector` (Typ: `tsvector`) in der `content_nodes`-Tabelle
- **Index:** GIN-Index `idx_content_nodes_search` für performante Abfragen
- **Sprache:** Konfiguriert für `german` (deutsche Stemming-Regeln)

### Suchablauf

```
Benutzereingabe → Sanitierung → tsquery-Transformation → Hybridsuche → Ranking → Ergebnis
```

1. **Sanitierung:** Eingabe wird bereinigt und tokenisiert
2. **Transformation:** Wörter werden zu einer `to_tsquery('german', ...)` transformiert mit `:*` für Präfix-Matching und `&`-Operator (AND-Verknüpfung)
3. **Hybridsuche:** Drei Suchstrategien parallel:
   - **FTS-Match:** `search_vector @@ to_tsquery('german', ...)`
   - **ILIKE-Match:** Teilstring-Suche in `title` und `displayCode`
   - **Alias-Match:** Suche in `content_aliases` nach früheren Display-Codes
4. **Ranking:** Ergebnisse werden via `ts_rank` nach Relevanz sortiert
5. **Hervorhebung:** `ts_headline` erzeugt Snippets mit `<b>`-Tags

### Facettierung

Jede Suchanfrage liefert automatisch Facettenzähler:

| Facette | Beschreibung |
|:--------|:-------------|
| `templateType` | Anzahl pro Seitenvorlage |
| `status` | Anzahl pro Status (draft, published, etc.) |
| `ownerId` | Anzahl pro Eigentümer |
| `tags` | Anzahl pro Tag |

## 8.3 Autovervollständigung (Vorschläge)

- **Endpunkt:** `GET /search/suggestions`
- **Mindestlänge:** 2 Zeichen
- **Suchfelder:** `title`, `displayCode` (ILIKE)
- **Zusätzlich:** `content_aliases` für historische IDs
- **Limits:** Max. 10 Knoten + 5 Aliase

## 8.4 Such-Analytik

### Query-Logging

Jede Suchanfrage wird in der `search_queries`-Tabelle protokolliert:

| Feld | Beschreibung |
|:-----|:-------------|
| `query` | Suchbegriff |
| `result_count` | Anzahl Ergebnisse |
| `user_id` | Suchender Benutzer |
| `created_at` | Zeitstempel |

### Klick-Tracking

Klicks auf Suchergebnisse werden in `search_clicks` erfasst:

| Feld | Beschreibung |
|:-----|:-------------|
| `query_id` | Zugehörige Suchanfrage |
| `node_id` | Angeklickter Knoten |
| `position` | Position im Suchergebnis |

### Analyse-Dashboard

- **Endpunkt:** `GET /search/analytics`
- **Berechtigung:** `view_audit_log`
- **Metriken:**
  - Populärste Suchbegriffe
  - Null-Ergebnis-Anfragen (Content-Gaps)
  - Gesamtvolumen der Suchen (Standard: 30 Tage)

## 8.5 KI-Suchintegration

Der KI-Assistent nutzt dieselbe Suchinfrastruktur:

- **`searchWikiContent`:** Verwendet `search_vector` mit RBAC-Prüfung
- **`searchConnectorSources`:** Sucht in externen Konnektordaten
- **Kontext-Aufbereitung:** Relevante Snippets werden als strukturierter Kontext an das LLM weitergegeben

## 8.6 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `artifacts/api-server/src/routes/search.ts` | Such-Routen und FTS-Logik |
| `lib/db/src/schema/content-nodes.ts` | search_vector Spalte und Index |
| `lib/db/src/schema/search-analytics.ts` | Analytics-Tabellen |
| `artifacts/wiki-frontend/src/pages/SearchPage.tsx` | Such-UI mit Facetten |
| `artifacts/api-server/src/services/ai.service.ts` | KI-Suchintegration |
