# 10 — Konnektoren & Externe Systeme

## 10.1 Übersicht

FlowCore unterstützt die Integration mit externen Systemen über ein Konnektor-Framework. Aktuell werden zwei Integrationstypen unterstützt:

1. **Quellsysteme** — Externe Datenquellen, aus denen Inhalte synchronisiert werden
2. **Speicheranbieter** — Externe Speicherorte für hochgeladene Dateien

## 10.2 Quellsysteme (Source Systems)

### Zweck

Quellsysteme ermöglichen es, Inhalte aus externen Plattformen (z.B. SharePoint) als Referenzen in Wiki-Seiten einzubinden und deren Verfügbarkeit zu überwachen.

### Konfiguration

| Feld | Beschreibung |
|:-----|:-------------|
| `name` | Anzeigename des Systems |
| `slug` | Kurzbezeichner (URL-freundlich) |
| `systemType` | Typ des Systems (z.B. "sharepoint") |
| `connectionConfig` | Verbindungskonfiguration (JSONB) |
| `syncEnabled` | Automatische Synchronisation aktiviert |
| `syncIntervalMinutes` | Synchronisationsintervall (Standard: 60 Min.) |
| `isActive` | System aktiv/inaktiv |

### SharePoint-Verbindungskonfiguration

```json
{
  "siteId": "...",
  "siteName": "Intranet",
  "driveId": "...",
  "driveName": "Dokumente",
  "folderId": "...",
  "folderName": "Prozessdokumente",
  "folderPath": "Abteilungen/HR/Prozessdokumente",
  "itemId": "...",
  "itemName": "Onboarding-Checkliste.docx",
  "isFolder": true
}
```

### Quellreferenzen

Wiki-Knoten können über `source_references` mit externen Dokumenten verknüpft werden:

| Feld | Beschreibung |
|:-----|:-------------|
| `node_id` | Verknüpfter Wiki-Knoten |
| `source_system_id` | Quellsystem |
| `external_id` | ID im externen System |
| `external_url` | URL zum Originaldokument |
| `sync_status` | Status der Synchronisation |

### Synchronisation

- **Manuell:** `POST /connectors/source-systems/:id/sync`
- **Automatisch:** Basierend auf `syncIntervalMinutes`
- **Statusabfrage:** `GET /connectors/sync/status`

## 10.3 Speicheranbieter (Storage Providers)

### Zweck

Speicheranbieter definieren, wo hochgeladene Dateien (Bilder, Dokumente, Videos) physisch gespeichert werden.

### Konfiguration

| Feld | Beschreibung |
|:-----|:-------------|
| `name` | Anzeigename |
| `slug` | Kurzbezeichner |
| `providerType` | Typ (z.B. "local", "sharepoint") |
| `isDefault` | Standard-Speicheranbieter |
| `config` | Verbindungskonfiguration |

### SharePoint als Speicheranbieter

Im Storage-Modus wird nur die Ordnerauswahl angeboten (keine Dateien), da der Zielort ein Ordner sein muss:

```json
{
  "siteId": "...",
  "siteName": "Intranet",
  "driveId": "...",
  "driveName": "Wiki-Assets",
  "folderId": "...",
  "folderName": "Uploads",
  "folderPath": "Wiki/Uploads",
  "isFolder": true
}
```

## 10.4 SharePoint-Browser (Picker)

### Dreistufige Auswahl

Der SharePoint-Picker führt den Benutzer durch drei Ebenen:

```
1. Site-Auswahl → 2. Bibliothek-Auswahl → 3. Ordner/Datei-Navigation
```

### Modi

| Modus | Kontext | Verhalten |
|:------|:--------|:----------|
| `source` | Quellsystem | Zeigt Ordner UND Dateien; beides auswählbar |
| `storage` | Speicheranbieter | Zeigt nur Ordner; Dateien sind ausgeblendet |

### SharePoint-API-Endpunkte

| Endpunkt | Zweck |
|:---------|:------|
| `GET /connectors/sharepoint/sites?q=...` | Sites suchen |
| `GET /connectors/sharepoint/drives/:siteId` | Bibliotheken eines Sites |
| `GET /connectors/sharepoint/drives/:driveId/items?folderId=...` | Ordner/Dateien durchsuchen |

### Funktionen des Pickers

- **Suche:** Sites können nach Name gefiltert werden
- **Breadcrumb-Navigation:** Sites → Site → Bibliothek → Ordner → Unterordner
- **Zurück-Navigation:** Schritt für Schritt rückwärts navigieren
- **Ordnerauswahl:** Aktuellen Ordner (inkl. Stammverzeichnis) als Ziel auswählen
- **Dateiauswahl:** (nur Source-Modus) Einzelne Dateien direkt auswählen

## 10.5 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `artifacts/api-server/src/routes/connectors.ts` | Konnektor-Routen |
| `artifacts/api-server/src/services/sharepoint.service.ts` | SharePoint Graph API Client |
| `lib/db/src/schema/source-systems.ts` | DB-Schema für Quellsysteme |
| `artifacts/wiki-frontend/src/pages/ConnectorsPage.tsx` | Konnektor-Verwaltungs-UI |
| `artifacts/wiki-frontend/src/components/settings/SharePointSiteDrivePicker.tsx` | SharePoint-Picker-Komponente |
| `artifacts/wiki-frontend/src/components/settings/SharePointBrowser.tsx` | SharePoint-Dateibrowser |
