# Runbooks – Betriebsverfahren

## Runbook 1: Server-Neustart

### Anlass
Server reagiert nicht oder zeigt Fehler nach Deployment.

### Verfahren
1. Prüfe den Health-Endpunkt: `curl https://<domain>/api/healthz`
2. Prüfe die Logs auf Fehler
3. Starte den API-Server-Workflow neu
4. Verifiziere den Health-Endpunkt erneut
5. Prüfe, ob Session-Daten verloren gegangen sind (In-Memory-Sessions)

### Eskalation
Bei wiederholtem Versagen → Rollback auf vorheriges Deployment

---

## Runbook 2: Datenbankverbindung verloren

### Symptome
- API antwortet mit 500-Fehlern
- Logs zeigen `ECONNREFUSED` oder `connection timeout`

### Verfahren
1. Prüfe Datenbankstatus: `pg_isready -h <host>`
2. Prüfe `DATABASE_URL`-Umgebungsvariable
3. Prüfe Verbindungslimits (max_connections)
4. Starte den API-Server neu
5. Verifiziere mit Health-Check

---

## Runbook 3: Benutzer kann sich nicht anmelden

### Symptome
- 401/403 nach Entra-ID-Login
- "Tenant not authorized"-Fehler

### Verfahren
1. Prüfe Entra-ID-App-Registrierung (Client-ID, Tenant-ID)
2. Prüfe `ENTRA_REDIRECT_URI`
3. Prüfe Tenant-ID-Übereinstimmung in Logs
4. Prüfe, ob der Benutzer im richtigen Azure AD-Tenant ist
5. Prüfe Session-Cookie-Einstellungen (SameSite, Secure)

---

## Runbook 4: Teams-Einbettung funktioniert nicht

### Symptome
- Wiki lädt nicht im Teams-Tab
- SSO schlägt fehl

### Verfahren
1. Prüfe `TEAMS_APP_ID`-Umgebungsvariable
2. Prüfe Teams-App-Manifest (validDomains)
3. Prüfe Cookie-Einstellungen (`SameSite=None; Secure` in Produktion)
4. Prüfe `trust proxy`-Konfiguration
5. Prüfe CSP frame-ancestors
6. Teste mit Teams-Desktop und Teams-Web

---

## Runbook 5: Hohe Antwortzeiten

### Symptome
- API-Antworten > 2 Sekunden
- Benutzer berichten Verzögerungen

### Verfahren
1. Prüfe Datenbankabfrage-Performance (pg_stat_activity)
2. Prüfe auf fehlende Indizes
3. Prüfe Rate-Limiting-Zähler
4. Prüfe Speicherauslastung des Servers
5. Prüfe, ob Volltext-Suchindex aktuell ist

---

## Runbook 6: Inhaltsverlust / versehentliche Löschung

### Symptome
- Benutzer meldet fehlende Seite
- Audit-Log zeigt Delete-Event

### Verfahren
1. Prüfe Audit-Trail: `SELECT * FROM audit_events WHERE action = 'delete' ORDER BY created_at DESC LIMIT 10`
2. Soft-Delete: Seite ist noch in der Datenbank (`is_deleted = true`)
3. Wiederherstellen: `UPDATE content_nodes SET is_deleted = false WHERE id = '<node_id>'`
4. Revisionshistorie bleibt erhalten
5. Informiere den Benutzer über die Wiederherstellung

---

## Runbook 7: Secret-Rotation

### Verfahren
1. Generiere neues `SESSION_SECRET` (mind. 32 Zeichen, kryptographisch zufällig)
2. Aktualisiere die Umgebungsvariable
3. Starte den Server neu (alle aktiven Sessions werden ungültig)
4. Informiere Benutzer über erneute Anmeldung
5. Rotiere `ENTRA_CLIENT_SECRET` im Azure-Portal und aktualisiere die Umgebungsvariable
