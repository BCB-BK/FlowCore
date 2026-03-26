# 14 — Qualitätssicherung & Dashboard

## 14.1 Übersicht

FlowCore enthält ein integriertes Qualitätssicherungssystem, das die Vollständigkeit und Aktualität der Wiki-Inhalte überwacht. Es umfasst:

- Aggregierte Qualitäts-KPIs
- Seitenbezogene Qualitätsbewertung
- Duplikaterkennung
- Automatisierte Wartungsvorschläge
- Persönliche Aufgabenübersicht

## 14.2 Qualitäts-KPIs

**Endpunkt:** `GET /api/quality/overview`

| KPI | Beschreibung |
|:----|:-------------|
| **Gesamtvollständigkeit** | Durchschnittlicher Vollständigkeitsgrad aller Seiten |
| **Seiten mit Review-Bedarf** | Anzahl Seiten, deren nächstes Prüfdatum überschritten ist |
| **Entwürfe ohne Prüfung** | Anzahl Entwürfe, die noch nicht eingereicht wurden |
| **Verwaiste Seiten** | Seiten ohne eingehende Verknüpfungen |
| **Veraltete Seiten** | Seiten, die seit X Monaten nicht aktualisiert wurden |

## 14.3 Seitenbezogene Qualität

**Endpunkt:** `GET /api/quality/pages`

Jede Seite erhält eine individuelle Qualitätsbewertung basierend auf:

- **Metadaten-Vollständigkeit:** Anteil ausgefüllter Pflichtfelder
- **Sektions-Vollständigkeit:** Anteil gefüllter Template-Sektionen
- **Aktualität:** Zeitraum seit letzter Überarbeitung
- **Review-Status:** Ob der Review-Zyklus eingehalten wird
- **Verknüpfungen:** Anzahl ein-/ausgehender Relationen

### Vollständigkeitsberechnung

Die Funktion `calculateCompleteness` prüft für jeden Template-Typ:

1. Erforderliche Metadatenfelder des Templates abrufen
2. Definierte Sektionen des Templates abrufen
3. Vorhandene Daten in der aktuellen Revision abgleichen
4. Prozentsatz = (ausgefüllte Felder + gefüllte Sektionen) / (alle Felder + alle Sektionen)

## 14.4 Duplikaterkennung

**Endpunkt:** `GET /api/quality/duplicates`

Identifiziert potenzielle Duplikate basierend auf:
- Titel-Ähnlichkeit
- Inhaltsüberlappung
- Gleicher Template-Typ

## 14.5 Wartungsvorschläge

**Endpunkt:** `GET /api/quality/maintenance-hints`

Automatisierte Vorschläge für Inhaltsverbesserungen:

| Hinweistyp | Beschreibung |
|:-----------|:-------------|
| **Review fällig** | Prüfdatum überschritten |
| **Unvollständig** | Pflichtfelder nicht ausgefüllt |
| **Veraltet** | Lange nicht aktualisiert |
| **Verwaist** | Keine eingehenden Verknüpfungen |
| **Fehlende Eigentümerschaft** | Kein Verantwortlicher zugewiesen |

## 14.6 Persönliche Aufgaben

**Endpunkt:** `GET /api/quality/my-work`

Zeigt dem aktuellen Benutzer seine offenen Aufgaben:

- Entwürfe, die eingereicht werden können
- Seiten, die zur Prüfung anstehen
- Reviews, auf die gewartet wird
- Seiten, bei denen ein Review fällig ist

## 14.7 Berechtigungen

| Endpunkt | Berechtigung |
|:---------|:-------------|
| Qualitätsübersicht | `read_page` |
| Seitenqualität | `read_page` |
| Duplikate | `read_page` |
| Wartungshinweise | `read_page` |
| Meine Aufgaben | `read_page` |
| Dashboard-Seite anzeigen | `view_dashboard` |
| Aufgaben-Seite anzeigen | `view_tasks` |

## 14.8 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `artifacts/api-server/src/routes/quality.ts` | Qualitäts-Endpunkte |
| `artifacts/wiki-frontend/src/pages/DashboardPage.tsx` | Dashboard-UI |
| `artifacts/wiki-frontend/src/pages/TasksPage.tsx` | Aufgaben-UI |
