# Go-Live-Checkliste

## Voraussetzungen

### Infrastruktur
- [ ] Produktionsserver bereitgestellt und erreichbar
- [ ] PostgreSQL-Datenbank bereitgestellt und konfiguriert
- [ ] DNS-Eintrag für die Produktions-URL konfiguriert
- [ ] TLS-Zertifikat installiert und gültig
- [ ] Reverse-Proxy konfiguriert (HTTPS-Terminierung)

### Konfiguration
- [ ] `NODE_ENV=production` gesetzt
- [ ] `SESSION_SECRET` auf starken, zufälligen Wert gesetzt (mind. 32 Zeichen)
- [ ] `DATABASE_URL` auf Produktionsdatenbank gesetzt
- [ ] `ENTRA_CLIENT_ID` konfiguriert
- [ ] `ENTRA_CLIENT_SECRET` konfiguriert
- [ ] `ENTRA_TENANT_ID` konfiguriert
- [ ] `ENTRA_REDIRECT_URI` auf Produktions-Callback-URL gesetzt
- [ ] `TEAMS_APP_ID` konfiguriert (falls Teams-Integration aktiv)
- [ ] `AUTH_DEV_MODE=false` (oder nicht gesetzt)
- [ ] `LOG_LEVEL=info` (oder warn für weniger Logs)

### Sicherheit
- [ ] Security-Header aktiv (X-Content-Type-Options, HSTS, CSP)
- [ ] Rate-Limiting aktiv (Auth: 30/15min, API: 200/min)
- [ ] Session-Cookie: `SameSite=None; Secure; HttpOnly`
- [ ] `trust proxy` aktiviert
- [ ] Keine Entwicklungs-Endpunkte in Produktion aktiv
- [ ] CORS-Policy auf erlaubte Domains beschränkt
- [ ] Keine Geheimnisse in Logs oder Fehlerantworten

### Datenbank
- [ ] Schema-Migration ausgeführt (`pnpm --filter @workspace/db run push-force`)
- [ ] `pg_trgm`-Erweiterung aktiviert
- [ ] Indizes erstellt und verifiziert
- [ ] Initialrollen und -berechtigungen angelegt
- [ ] Admin-Benutzer konfiguriert

### Azure AD / Entra ID
- [ ] App-Registrierung erstellt
- [ ] Redirect-URI konfiguriert
- [ ] API-Berechtigungen gewährt (User.Read, openid, profile, email)
- [ ] Geheimnis erstellt und in Umgebungsvariablen hinterlegt
- [ ] Multi-Tenant oder Single-Tenant korrekt konfiguriert

### Microsoft Teams (optional)
- [ ] Teams-App-Manifest aktualisiert (App-ID, Domain, Client-ID)
- [ ] App in Teams Admin Center hochgeladen
- [ ] App für Organisation freigegeben oder sideloaded
- [ ] SSO-Funktionalität getestet (Desktop + Web)
- [ ] Tab-Konfiguration getestet

### Inhalte
- [ ] Pilotinhalte migriert (Kernprozesse, Richtlinien, Formulare)
- [ ] Seitentypen getestet (alle 11 Vorlagentypen)
- [ ] Suchfunktion getestet
- [ ] Revisionsworkflow getestet (Entwurf → Review → Genehmigung → Veröffentlichung)

### Backup
- [ ] Backup-Verfahren dokumentiert und getestet
- [ ] Automatisches tägliches Backup eingerichtet
- [ ] Wiederherstellungstest erfolgreich durchgeführt
- [ ] Aufbewahrungsrichtlinie definiert

### Tests
- [ ] E2E-Tests erfolgreich (62+ Tests)
- [ ] RBAC-Regressionstests bestanden
- [ ] Performance-Test durchgeführt (Antwortzeiten akzeptabel)
- [ ] UAT-Protokoll abgeschlossen und abgenommen

### Dokumentation
- [ ] Admin-Handbuch aktuell
- [ ] Runbooks vorhanden
- [ ] Editor-Leitfaden verteilt
- [ ] Reviewer-Leitfaden verteilt
- [ ] Schnellstart-Anleitung verteilt

### Schulung
- [ ] Administratoren geschult
- [ ] Editoren geschult
- [ ] Reviewer/Genehmiger geschult
- [ ] Pilot-Feedback eingearbeitet

## Go/No-Go-Entscheidung

| Kriterium | Status | Verantwortlicher |
|---|---|---|
| Alle Pflichtfelder grün | ☐ | Projektleitung |
| Keine kritischen Bugs offen | ☐ | Entwicklung |
| UAT-Abnahme erteilt | ☐ | Fachbereich |
| Backup-Test erfolgreich | ☐ | Betrieb |
| Schulungen durchgeführt | ☐ | Projektleitung |

**Go-Live-Datum**: _einzutragen_
**Verantwortlich**: _einzutragen_
**Rollback-Plan**: Wiederherstellung aus letztem Backup + vorherige Deployment-Version
