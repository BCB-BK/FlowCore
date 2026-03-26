# 12 — Medien & Dateiverwaltung

## 12.1 Übersicht

FlowCore verfügt über ein Medienverwaltungssystem für Bilder, Dokumente und andere Dateien, die in Wiki-Seiten eingebettet werden. Es unterstützt:

- Datei-Upload über konfigurierbare Speicheranbieter
- Metadaten-Verwaltung (Dateityp, Größe, MIME-Typ)
- Nutzungs-Tracking (wo wird ein Asset verwendet)
- Einbettungs-Validierung für externe URLs
- Soft-Delete für sichere Löschung

## 12.2 Upload-Prozess

```
Datei-Upload → POST /api/media/upload → Speicheranbieter → media_assets-Eintrag
```

1. **Datei-Annahme:** Multipart-Upload über den `/media/upload`-Endpunkt
2. **Speicherung:** Datei wird an den Standard-Speicheranbieter weitergeleitet
3. **Metadaten:** Eintrag in `media_assets` mit Dateiname, MIME-Typ, Größe und Speicherschlüssel
4. **Berechtigung:** `edit_content`

## 12.3 Speicheranbieter

Dateien werden über konfigurierbare Speicheranbieter abgelegt:

| Anbieter | Beschreibung |
|:---------|:-------------|
| **Lokal** | Dateisystembasierte Speicherung auf dem Server |
| **SharePoint** | Speicherung in einer SharePoint-Dokumentbibliothek |

Der Standard-Speicheranbieter wird in den Einstellungen festgelegt (`isDefault: true`).

## 12.4 Asset-Verwaltung

### Assets auflisten

```
GET /api/media/assets?q=suchbegriff
```

### Asset-Details

```
GET /api/media/assets/:id
```

### Datei herunterladen

```
GET /api/media/files/:key
```

Streamt die Datei direkt aus dem Speicheranbieter mit korrektem MIME-Typ.

### Asset löschen

```
DELETE /api/media/assets/:id
```

Soft-Delete: Setzt `is_deleted = true`, Datei bleibt physisch erhalten.

## 12.5 Nutzungs-Tracking

```
POST /api/media/assets/:id/usages
```

Verfolgt, in welchen Wiki-Seiten ein Asset referenziert wird. Ermöglicht:
- Prüfung, ob ein Asset noch verwendet wird
- Aufräumen ungenutzter Assets
- Impact-Analyse bei Löschung

## 12.6 Einbettungs-Validierung

```
POST /api/media/validate-embed
```

Prüft, ob eine externe URL/Domain für die Einbettung in den Editor zugelassen ist. Schützt vor unerlaubten Einbettungen.

## 12.7 Integration in den Editor

Der Tiptap-Editor unterstützt:
- **Bilder:** Inline-Einbettung mit Größenanpassung
- **Videos:** Eingebettete Videoplayer
- **Dateien:** Download-Links für Dokumente
- **Drag & Drop:** Dateien können direkt in den Editor gezogen werden

## 12.8 Datenmodell

```
media_assets
├── id (uuid, PK)
├── node_id (FK → content_nodes)
├── filename
├── mime_type
├── size
├── storage_key
├── storage_provider_id (FK → storage_providers)
├── is_deleted (boolean)
└── created_at
```

## 12.9 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `artifacts/api-server/src/routes/media.ts` | Medien-Endpunkte |
| `artifacts/api-server/src/services/storage.service.ts` | Speicheranbieter-Abstraktion |
| `lib/db/src/schema/media-assets.ts` | DB-Schema |
| `artifacts/wiki-frontend/src/components/editor/BlockEditor.tsx` | Editor mit Medien-Integration |
