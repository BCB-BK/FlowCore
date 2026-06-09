# Backup und Wiederherstellung – FlowCore

## Übersicht

FlowCore verfügt über ein eingebautes automatisches Backup-System, das Datenbankdumps, Systemkonfiguration, Template-Definitionen, Konnektor-Konfiguration, den Medien-Index und Audit-Metadaten regelmäßig in einen konfigurierten SharePoint-Ordner sichert.

## Backup-Architektur

```
FlowCore API-Server
       │
       ├── PostgreSQL DB-Dump (pg_dump, JSON-Format)
       ├── Template-Definitionen (alle Seitenvorlagen)
       ├── Konnektor-Konfiguration (ohne Secrets)
       ├── Medien-Index (bis 1.000 Einträge)
       └── Audit-Metadaten (letzte 1.000 Einträge)
                │
                ▼
       SharePoint-Bibliothek
       (via Microsoft Graph API)
```

## Backup-Inhalte

| Komponente | Inhalt | Format |
|---|---|---|
| DB-Dump | Vollständiger PostgreSQL-Datenbankinhalt (JSON Fallback) | JSON/SQL |
| Template-Definitionen | Alle aktiven Seitenvorlagen | JSON |
| Konnektor-Konfiguration | Speicheranbieter und Quellsysteme (ohne Secrets) | JSON |
| Medien-Index | Metadaten der letzten 1.000 Medien-Assets | JSON |
| Audit-Metadaten | Letzte 1.000 Audit-Events | JSON |

## Einrichtung

### Voraussetzungen

1. **SharePoint App-Berechtigung**: Die App-Registrierung (ENTRA_CLIENT_ID) benötigt die Anwendungsberechtigung `Files.ReadWrite.All` oder `Sites.ReadWrite.All` in Microsoft Graph (mit Admin-Consent).

2. **Speicheranbieter konfigurieren**: Unter **Einstellungen → Konnektoren → Speicheranbieter** einen Anbieter vom Typ „SharePoint" mit Zweck „Backup-Ziel" anlegen.

3. **Zielordner auswählen**: Unter **Einstellungen → Backup → Konfiguration** den gewünschten SharePoint-Ordner auswählen.

### Konfigurationsschritte

1. Öffnen Sie **Einstellungen → Backup → Konfiguration**
2. Wählen Sie unter „SharePoint-Zielordner" den gewünschten Ordner in der SharePoint-Bibliothek
3. Stellen Sie die **Aufbewahrungsregeln** ein:
   - Tägliche Backups (Standard: 7)
   - Wöchentliche Backups (Standard: 4)
   - Monatliche Backups (Standard: 12)
4. Aktivieren Sie den **automatischen Backup-Zeitplan**
5. Wählen Sie den **Backup-Umfang** (Templates, Konnektoren, Medien-Index, Audit-Metadaten)
6. Klicken Sie **„Konfiguration speichern"**

## Backup-Zeitplan

| Typ | Häufigkeit | Aufbewahrung (Standard) |
|---|---|---|
| Täglich | Täglich (automatisch) | 7 Backups |
| Wöchentlich | Wöchentlich | 4 Backups |
| Monatlich | Monatlich | 12 Backups |

## Manueller Backup

Ein Backup kann jederzeit über **Einstellungen → Backup → Konfiguration → „Backup jetzt erstellen"** ausgelöst werden.

## Backup-Verlauf

Unter **Einstellungen → Backup → Backup-Historie** sind alle durchgeführten Backups mit Status (Erfolgreich/Fehlgeschlagen), Zeitstempel und Dateigröße einsehbar.

## Wiederherstellungsverfahren

### Aus SharePoint-Backup wiederherstellen

1. Laden Sie das gewünschte Backup-Archiv aus dem SharePoint-Ordner herunter
2. Entpacken Sie das Archiv (ZIP-Format)
3. Führen Sie die Datenbankwiederherstellung durch:

```bash
# Neue Datenbank erstellen (falls notwendig)
createdb flowcore_restore

# Backup einspielen
psql flowcore_restore < backup-YYYY-MM-DD.sql

# ODER für JSON-Backups: Schema-Migration und Daten-Import
pnpm --filter @workspace/db run push-force
```

4. Setzen Sie alle Umgebungsvariablen (siehe `05-CONFIG-ENV.md`)
5. Starten Sie den API-Server neu
6. Führen Sie den Health-Check durch:

```bash
curl https://flowcore.bildungscampus-backnang.de/api/healthz
```

### Einzelne Komponenten wiederherstellen

- **Templates**: JSON-Datei aus Backup über API `/api/admin/templates/import` einspielen
- **Konnektoren**: Konfiguration manuell über Einstellungen → Konnektoren neu anlegen (Secrets müssen manuell eingetragen werden)
- **Medien-Assets**: Liegen physisch in der SharePoint-Medienablage und bleiben dort erhalten

## Wiederherstellungstest

### Testprotokoll (mindestens vierteljährlich)

1. Manuellen Backup auslösen
2. Backup-Datei aus SharePoint herunterladen
3. Testdatenbank anlegen und Backup einspielen
4. Verifizieren:
   - [ ] Health-Check erfolgreich
   - [ ] Inhaltsknoten vorhanden und korrekt
   - [ ] Revisionshistorie intakt
   - [ ] Audit-Log vollständig
   - [ ] Benutzer und Rollen korrekt
   - [ ] Suchindex funktioniert
5. Testdatenbank löschen
6. Ergebnis dokumentieren

### Protokoll der letzten Wiederherstellungstests

| Datum | Typ | Ergebnis | Dauer | Durchführer |
|---|---|---|---|---|
| _(einzutragen)_ | Manuell | — | — | — |

## Aufbewahrungsrichtlinie

| Backup-Typ | Aufbewahrung | Automatische Bereinigung |
|---|---|---|
| Täglich | 7 Backups | Ja (älteste werden gelöscht) |
| Wöchentlich | 4 Backups | Ja |
| Monatlich | 12 Backups | Ja |

## Notfall-Kontakte

| Rolle | Kontakt | Zuständigkeit |
|---|---|---|
| DB-Administrator | _einzutragen_ | Datenbank-Wiederherstellung |
| System-Admin | _einzutragen_ | Server-Infrastruktur, SharePoint-Zugriff |
| Anwendungsbetreuer | _einzutragen_ | Applikations-Konfiguration |

## Sicherheitshinweise

- Backup-Dateien enthalten **keine** Passwörter, Tokens oder Client-Secrets
- Der SharePoint-Zielordner sollte auf autorisierte Personen beschränkt sein
- Backup-Credentials (ENTRA_CLIENT_SECRET) sind ausschließlich in Replit Secrets gespeichert
