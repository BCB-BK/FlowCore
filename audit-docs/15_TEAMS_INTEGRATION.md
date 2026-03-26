# 15 — Microsoft Teams Integration

## 15.1 Übersicht

FlowCore kann als **Microsoft Teams Tab-App** eingebettet werden. Die Integration umfasst:

- Teams-SSO (On-Behalf-Of Flow) für nahtlose Anmeldung
- Kontextweitergabe (Team, Kanal, Benutzersprache)
- Vollständige Wiki-Funktionalität innerhalb von Teams
- Responsives Layout für Teams-Tab-Größe

## 15.2 Teams-SSO-Flow

```
Teams SDK → getAuthToken() → Client-Token
                                  ↓
POST /api/teams/sso → OBO-Flow → Graph-Token → Session
```

### Ablauf:

1. **Token-Beschaffung:** `TeamsProvider.tsx` ruft `microsoftTeams.authentication.getAuthToken()` auf
2. **Token-Austausch:** Das Client-Token wird an `POST /api/teams/sso` gesendet
3. **OBO-Flow:** Backend tauscht per MSAL OBO das Token gegen ein Graph-Token
4. **Session:** Principal-Upsert und Session-Erstellung wie beim Web-Flow
5. **Ergebnis:** Benutzer ist automatisch angemeldet ohne separaten Login

### Rate-Limiting:

Der `/teams/sso`-Endpunkt ist durch `authRateLimit` geschützt.

## 15.3 Kontextweitergabe

**Endpunkt:** `GET /api/teams/context`

Gibt Teams-spezifische Konfiguration zurück:

| Feld | Beschreibung |
|:-----|:-------------|
| `appId` | Teams-App-ID |
| `entityId` | Aktuelle Entitäts-ID (Tab-Kontext) |
| `channelId` | Kanal-ID (wenn in einem Kanal) |
| `teamId` | Team-ID |
| `locale` | Benutzersprache |

## 15.4 Frontend-Integration

### TeamsProvider

Die `TeamsProvider`-Komponente (`artifacts/wiki-frontend/src/components/teams/TeamsProvider.tsx`) erkennt automatisch, ob die App in Teams läuft und:

- Initialisiert das Teams SDK
- Führt SSO-Authentifizierung durch
- Stellt Teams-Kontext über React Context bereit
- Passt das Layout für die Tab-Einbettung an

### Teams-Erkennung

```
Prüfung ob microsoftTeams SDK verfügbar → Teams-Modus aktivieren
                                        → SSO statt regulärer Login
                                        → Angepasstes Layout
```

## 15.5 Konfiguration

| Variable | Beschreibung |
|:---------|:-------------|
| `TEAMS_APP_ID` | Microsoft Teams App-ID |
| `ENTRA_CLIENT_ID` | Muss mit der Teams-App-Registrierung übereinstimmen |

### Teams-App-Manifest

Die Teams-App muss im Microsoft Teams Admin Center registriert werden mit:

- Gültiger App-ID
- Tab-Konfiguration mit der Wiki-URL
- SSO-Berechtigungen (User.Read, Sites.ReadWrite.All etc.)

## 15.6 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `artifacts/api-server/src/routes/teams.ts` | Teams-SSO und Kontext-Endpunkte |
| `artifacts/wiki-frontend/src/components/teams/TeamsProvider.tsx` | Teams-SDK-Integration |
| `artifacts/wiki-frontend/src/lib/teams.ts` | Teams-Hilfsfunktionen |
