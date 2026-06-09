# Go-Live-Checkliste – FlowCore

## Infrastruktur

- [ ] Produktionsserver bereitgestellt und erreichbar (`https://flowcore.bildungscampus-backnang.de`)
- [ ] PostgreSQL-Datenbank bereitgestellt und konfiguriert
- [ ] TLS-Zertifikat installiert und gültig
- [ ] Reverse-Proxy / CDN konfiguriert (HTTPS-Terminierung)

---

## Umgebungsvariablen (Replit Secrets)

- [ ] `NODE_ENV=production` gesetzt
- [ ] `SESSION_SECRET` auf starken, zufälligen Wert gesetzt (mind. 32 Zeichen)
- [ ] `DATABASE_URL` auf Produktionsdatenbank gesetzt
- [ ] `ENTRA_CLIENT_ID` konfiguriert
- [ ] `ENTRA_CLIENT_SECRET` konfiguriert
- [ ] `ENTRA_TENANT_ID` konfiguriert
- [ ] `ENTRA_REDIRECT_URI` auf Produktions-Callback-URL gesetzt (`https://<domain>/api/auth/callback`)
- [ ] `TEAMS_APP_ID` konfiguriert (falls Teams-Integration aktiv)
- [ ] `OPENAI_API_KEY` konfiguriert (falls KI-Assistent aktiv)
- [ ] `AUTH_DEV_MODE` nicht gesetzt oder auf `false`
- [ ] `LOG_LEVEL=info`

---

## Azure AD / Entra ID App-Registrierung

- [ ] App-Registrierung erstellt (FlowCore)
- [ ] Redirect-URI konfiguriert: `https://<domain>/api/auth/callback`
- [ ] **Delegierte Berechtigungen** erteilt und Admin-Consent gegeben:
  - `User.Read`
  - `openid`, `profile`, `email`
  - `offline_access`
- [ ] **Anwendungsberechtigungen** erteilt und Admin-Consent gegeben:
  - `Files.ReadWrite.All` (für SharePoint-Medienablage und Backup)
  - alternativ: `Sites.ReadWrite.All`
- [ ] Client-Secret erstellt, Ablaufdatum notiert und in Replit Secrets hinterlegt
- [ ] Single-Tenant-Konfiguration bestätigt (nur Bildungscampus-Tenant)

---

## Datenbank

- [ ] Schema-Migration ausgeführt: `pnpm --filter @workspace/db run push-force`
- [ ] `pg_trgm`-Erweiterung aktiviert (für Volltextsuche)
- [ ] Indizes erstellt und verifiziert
- [ ] Admin-Benutzer konfiguriert und Rolle `system_admin` zugewiesen

---

## Konnektoren-Konfiguration

- [ ] SharePoint-Speicheranbieter für **Medienablage** angelegt (Zweck: `media_archive`, Als Standard markiert)
- [ ] SharePoint-Speicheranbieter für **Backup** angelegt (Zweck: `backup_target`)
- [ ] Test-Upload erfolgreich durchgeführt (Datei landet in SharePoint-Medienablage)
- [ ] Test-Backup erfolgreich durchgeführt (Backup landet im konfigurierten SharePoint-Ordner)

---

## Backup-System

- [ ] Backup-Konfiguration unter Einstellungen → Backup ausgefüllt
- [ ] SharePoint-Zielordner ausgewählt
- [ ] Aufbewahrungsregeln definiert
- [ ] Automatischer Backup aktiviert
- [ ] Erster manueller Backup erfolgreich (Backup-Historie zeigt Eintrag)
- [ ] Wiederherstellungstest erfolgreich durchgeführt

---

## Sicherheit

- [ ] Security-Header aktiv (X-Content-Type-Options, HSTS, CSP)
- [ ] Rate-Limiting aktiv (Auth: 30/15min, API: 200/min)
- [ ] Session-Cookie: `SameSite=None; Secure; HttpOnly`
- [ ] `trust proxy` aktiviert
- [ ] CORS-Policy auf erlaubte Domains beschränkt
- [ ] Keine Geheimnisse in Logs oder Fehlerantworten

---

## Microsoft Teams (optional)

- [ ] Teams-App-Manifest aktualisiert (App-ID, Domain, Client-ID)
- [ ] App in Teams Admin Center hochgeladen
- [ ] App für Organisation freigegeben
- [ ] SSO-Funktionalität getestet (Desktop + Web)
- [ ] Tab-Konfiguration getestet

---

## Inhalte & Funktionen

- [ ] Pilotinhalte migriert (Kernprozesse, Richtlinien, Formulare)
- [ ] Alle 11 Seitentypen getestet
- [ ] Suchfunktion getestet
- [ ] Revisionsworkflow getestet (Entwurf → Review → Genehmigung → Veröffentlichung)
- [ ] Mediathek-Upload getestet (Datei erscheint in SharePoint-Bibliothek)
- [ ] BPMN-Editor getestet
- [ ] KI-Assistent getestet (falls aktiviert)
- [ ] Qualitäts-Dashboard überprüft

---

## Tests

- [ ] E2E-Tests erfolgreich (62+ Testfälle)
- [ ] RBAC-Regressionstests bestanden
- [ ] Performance-Test durchgeführt (Antwortzeiten < 500ms für Standard-Seiten)
- [ ] UAT-Protokoll abgeschlossen und abgenommen

---

## Dokumentation & Schulung

- [ ] Admin-Handbuch verteilt
- [ ] Runbooks vorhanden und verifiziert
- [ ] Editor-Leitfaden verteilt
- [ ] Reviewer-Leitfaden verteilt
- [ ] Schnellstart-Anleitung verteilt
- [ ] Administratoren geschult
- [ ] Editoren geschult
- [ ] Reviewer/Genehmiger geschult

---

## Go/No-Go-Entscheidung

| Kriterium | Status | Verantwortlicher |
|---|---|---|
| Alle Pflichtfelder grün | ☐ | Projektleitung |
| Keine kritischen Bugs offen | ☐ | Entwicklung |
| UAT-Abnahme erteilt | ☐ | Fachbereich |
| Backup-Test erfolgreich | ☐ | Betrieb |
| Schulungen durchgeführt | ☐ | Projektleitung |
| Entra-Berechtigungen erteilt | ☐ | IT-Administration |

**Go-Live-Datum**: _einzutragen_
**Verantwortlich**: _einzutragen_
**Rollback-Plan**: Wiederherstellung aus letztem Backup + vorherige Deployment-Version über Replit Checkpoint
