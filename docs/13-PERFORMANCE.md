# Performance und Kapazität

## Systemanforderungen

### Minimale Anforderungen
- **CPU**: 2 vCPU
- **RAM**: 2 GB (API-Server) + 1 GB (PostgreSQL)
- **Speicher**: 10 GB (Datenbank) + Speicher für Medien-Assets
- **Node.js**: v20+ (LTS empfohlen)
- **PostgreSQL**: 15+

### Empfohlene Konfiguration (bis 500 Benutzer)
- **CPU**: 4 vCPU
- **RAM**: 4 GB (API-Server) + 4 GB (PostgreSQL)
- **Speicher**: 50 GB SSD
- **Datenbankpool**: 20 Verbindungen

## Leistungskennzahlen

### API-Antwortzeiten (Richtwerte)

| Endpunkt | Erwartete Antwortzeit | Akzeptabler Grenzwert |
|---|---|---|
| `GET /healthz` | < 10ms | < 50ms |
| `GET /content/nodes` (Liste) | < 100ms | < 500ms |
| `GET /content/nodes/:id` (Einzeln) | < 50ms | < 200ms |
| `POST /content/nodes` (Erstellen) | < 100ms | < 500ms |
| `GET /search` (Volltextsuche) | < 200ms | < 1000ms |
| `GET /quality/overview` | < 500ms | < 2000ms |
| `GET /quality/duplicates` | < 1000ms | < 3000ms |

### Datenbankindizes

Kritische Indizes für die Performance:
- `content_nodes.display_code` (UNIQUE)
- `content_nodes.parent_node_id` (Hierarchie-Traversierung)
- `content_nodes.title_tsvector` (GIN-Index für Volltextsuche)
- `content_nodes.template_type` (Filterung)
- `audit_events.created_at` (Zeitreihenabfragen)
- `content_revisions.node_id, revision_no` (UNIQUE, Versionshistorie)
- `pg_trgm`-Index auf `content_nodes.title` (Ähnlichkeitssuche)

### Erweiterung pg_trgm

Die `pg_trgm`-Erweiterung muss aktiv sein:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## Lasttests

### Testszenarien

1. **Normalbetrieb**: 50 gleichzeitige Benutzer, 80 % Lesen / 20 % Schreiben
2. **Spitzenlast**: 200 gleichzeitige Benutzer, 90 % Lesen / 10 % Schreiben
3. **Suchlast**: 100 gleichzeitige Suchanfragen

### Durchführung (mit curl/ab/k6)

```bash
# Einfacher Lasttest mit Apache Bench
ab -n 1000 -c 50 -H "X-Dev-Principal-Id: <admin-id>" \
  https://<domain>/api/content/nodes

# Erweitert mit k6 (empfohlen)
# Erstelle k6-Skript für realistische Benutzerszenarien
```

### Ergebnisse

_Ergebnisse nach Durchführung hier dokumentieren._

## Optimierungsmöglichkeiten

### Kurzfristig
- Datenbankpool-Größe anpassen (Standard: 10)
- Rate-Limiting-Parameter justieren
- Abfrage-Caching für häufig abgerufene Inhalte

### Mittelfristig
- Redis/Valkey für Session-Speicherung (statt In-Memory)
- Materialisierte Views für Dashboard-Aggregationen
- CDN für statische Frontend-Assets

### Langfristig
- Read-Replicas für Leseoperationen
- Horizontale Skalierung des API-Servers (Sticky Sessions)
- Dedizierte Suchinfrastruktur (Elasticsearch/Meilisearch)

## Kapazitätsplanung

| Datenmenge | Erwartete Leistung | Empfohlene Ressourcen |
|---|---|---|
| < 1.000 Seiten | Hervorragend | Minimale Konfiguration |
| 1.000–10.000 Seiten | Gut | Empfohlene Konfiguration |
| 10.000–50.000 Seiten | Akzeptabel | 8 vCPU, 16 GB RAM, SSD |
| > 50.000 Seiten | Erfordert Optimierung | Dedizierte Infrastruktur |
