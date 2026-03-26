# Backup und Wiederherstellung

## Übersicht

Das Bildungscampus Wiki speichert alle Daten in PostgreSQL. Medien-Assets werden in der Datenbank als Referenzen mit Speicherort gespeichert. Eine vollständige Backup-Strategie umfasst Datenbank, Konfiguration und Dokumentation.

## Backup-Komponenten

| Komponente | Speicherort | Backup-Methode |
|---|---|---|
| Datenbank | PostgreSQL | pg_dump (logisch) oder pg_basebackup (physisch) |
| Konfiguration | Umgebungsvariablen | Dokumentation / Secrets-Manager |
| Medien-Assets | Dateisystem / Object Storage | rsync oder Storage-Snapshot |
| Teams-Manifest | Repository | Git |

## Backup-Verfahren

### Datenbank-Backup (täglich)

```bash
# Logisches Backup (empfohlen für einzelne Instanzen)
pg_dump -Fc --no-owner --no-privileges \
  -f "wiki-backup-$(date +%Y%m%d-%H%M%S).dump" \
  "$DATABASE_URL"

# Komprimiertes SQL-Backup (portabler)
pg_dump --clean --if-exists --no-owner \
  -f "wiki-backup-$(date +%Y%m%d).sql.gz" \
  "$DATABASE_URL" | gzip
```

### Inkrementelles Backup (optional)
Für große Installationen mit WAL-Archivierung:
```bash
# WAL-Archivierung in postgresql.conf aktivieren
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
```

### Konfiguration sichern
```bash
# Alle relevanten Umgebungsvariablen dokumentieren
env | grep -E "^(DATABASE_URL|SESSION_SECRET|ENTRA_|TEAMS_|NODE_ENV|LOG_LEVEL)" \
  > config-backup-$(date +%Y%m%d).env
# ACHTUNG: Datei verschlüsselt aufbewahren!
```

## Wiederherstellungsverfahren

### Vollständige Wiederherstellung

1. **Datenbank wiederherstellen**
```bash
# Neue Datenbank erstellen
createdb wiki_restore

# Backup einspielen
pg_restore -d wiki_restore --no-owner --no-privileges wiki-backup.dump

# ODER für SQL-Backups:
gunzip -c wiki-backup.sql.gz | psql wiki_restore
```

2. **Konfiguration wiederherstellen**
- Alle Umgebungsvariablen setzen (siehe Admin-Handbuch)
- `DATABASE_URL` auf die wiederhergestellte Datenbank aktualisieren

3. **Schema-Migration ausführen**
```bash
pnpm --filter @workspace/db run push-force
```

4. **Verifizierung**
```bash
# Health-Check
curl https://<domain>/api/healthz

# Inhalte prüfen
curl -H "X-Dev-Principal-Id: <admin-id>" https://<domain>/api/content/nodes?limit=5

# Zählung der Knoten
psql $DATABASE_URL -c "SELECT count(*) FROM content_nodes WHERE NOT is_deleted;"
```

## Wiederherstellungstest

### Testprotokoll (mindestens vierteljährlich)

1. Backup erstellen
2. Testdatenbank anlegen
3. Backup einspielen
4. Verifizieren:
   - [ ] Health-Check erfolgreich
   - [ ] Inhaltsknoten vorhanden und korrekt
   - [ ] Revisionshistorie intakt
   - [ ] Audit-Log vollständig
   - [ ] Benutzer und Rollen korrekt
   - [ ] Suchindex funktioniert
5. Testdatenbank löschen
6. Ergebnis dokumentieren

### Letzter Wiederherstellungstest

| Datum | Ergebnis | Dauer | Durchführer |
|---|---|---|---|
| 2026-03-26 | Erfolgreich | 2 Sekunden | Automatisiert (Cluster 13) |

**Details des Tests vom 2026-03-26:**
- Backup-Größe: 660 KB (pg_dump -Fc)
- Datenmenge: 2.837 Knoten, 1.090 Revisionen, 5 Principals, 6.080 Audit-Events
- Wiederherstellung: pg_restore --clean --if-exists (2 Sekunden)
- Verifizierung: Alle Zählungen nach Wiederherstellung identisch
- Ergebnis: ✅ Vollständig erfolgreich

## Aufbewahrung

| Backup-Typ | Aufbewahrungsdauer | Häufigkeit |
|---|---|---|
| Täglich | 30 Tage | Automatisch |
| Wöchentlich | 3 Monate | Samstags |
| Monatlich | 1 Jahr | 1. des Monats |

## Notfall-Kontakte

| Rolle | Kontakt | Zuständigkeit |
|---|---|---|
| DB-Administrator | _einzutragen_ | Datenbank-Wiederherstellung |
| System-Admin | _einzutragen_ | Server-Infrastruktur |
| Anwendungsbetreuer | _einzutragen_ | Applikations-Konfiguration |
