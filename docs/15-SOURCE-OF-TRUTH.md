# Source-of-Truth-Modell

Dieses Dokument definiert verbindlich, welche Instanz für welchen Artefakttyp die führende Quelle (Source of Truth) ist.

## Grundsatz

Für jeden Artefakttyp gibt es genau eine führende Instanz. Alle anderen Instanzen sind Ableitungen oder Kopien, die durch den definierten Sync-Pfad aktualisiert werden. Abweichungen werden durch die Konsistenzprüfung (Admin → Konsistenz) erkannt und gemeldet.

## Führungsquellen je Artefakttyp

| Artefakttyp | Source of Truth | Sekundär | Sync-Richtung | Prüfung |
|:---|:---|:---|:---|:---|
| **Anwendungscode** | Replit Workspace | GitHub (Export) | Replit → GitHub | Build-Hash-Vergleich |
| **DB-Schema (Drizzle)** | `lib/db/src/schema/*.ts` | Laufzeit-DB | Code → DB via `drizzle-kit push` | Schema-Drift-Erkennung |
| **DB-Migrationen** | Drizzle-Kit + Code-Schema | – | Automatisch | Tabellen-Vergleich |
| **API-Spezifikation** | `lib/api-spec/openapi.yaml` | Generierte Clients | Spec → Codegen (Orval) | Generierte Dateien aktuell? |
| **Konfiguration / Secrets** | Replit Secrets | `.env` (nicht committed) | Manuell | Config-Validierung bei Start |
| **Inhalte (Wiki-Seiten)** | PostgreSQL (Laufzeit-DB) | Backup-Exports | DB → Backup | Backup-Status |
| **Dokumentation (docs/)** | `docs/` im Repository | – | – | Datei-Vollständigkeit |
| **Audit-Dokumentation** | `audit-docs/` im Repository | – | – | Datei-Vollständigkeit |
| **Templates / Seitentypen** | `lib/shared/src/page-types/` | DB-Kopien | Code → Runtime | Registry-Vergleich |
| **Prompts (KI)** | `artifacts/api-server/src/` | – | – | – |
| **Build-Artefakte** | Generiert aus Code | – | Code → Build | Build-Integrität |
| **Frontend-Assets** | `artifacts/wiki-frontend/` | Build-Output | Code → Vite Build | – |

## Sync-Pfade

### Replit → GitHub (Code-Export)
- **Trigger**: Manuell nach Release-Abnahme (kein automatischer Sync)
- **Inhalt**: Gesamter Workspace (Code, Docs, Config-Templates)
- **Nicht enthalten**: Secrets, Laufzeitdaten, `node_modules`
- **Risiko**: Export-Fehler → GitHub-Stand veraltet
- **Absicherung**: Konsistenzprüfung im Admin-Bereich
- **Abnahmeregel**: GitHub-Sync wird im Release-Pfad als manueller Schritt bestätigt. Der System-Admin führt den Export durch und bestätigt den Sync-Status im Release-Management (Einstellungen → Releases → Status „Sync ausstehend" → „Veröffentlicht"). Es gibt derzeit keinen technischen Sync-Mechanismus – die Synchronisation erfolgt über die Replit-Plattform oder manuellen Git-Push.

### Code → Datenbank (Schema-Sync)
- **Trigger**: `drizzle-kit push` bei Deployment
- **Risiko**: Schema-Drift zwischen Code und DB
- **Absicherung**: Automatische Tabellen-Prüfung

### OpenAPI → Codegen
- **Trigger**: `pnpm --filter @workspace/api-spec run codegen`
- **Risiko**: Generierte Dateien nicht aktuell
- **Absicherung**: Build-Prüfung

## Bekannte Widerspruchsrisiken

1. **GitHub-Stand ≠ Replit-Stand**: Wenn Export nicht nach jedem Release ausgeführt wird, divergieren die Stände. → Lösung: Release-Pflicht umfasst GitHub-Sync.
2. **DB-Schema ≠ Code-Schema**: Drizzle-Kit push wird vergessen. → Lösung: Automatische Prüfung beim Start und im Admin-Dashboard.
3. **Generierte Clients ≠ OpenAPI-Spec**: Codegen nicht nach Spec-Änderung ausgeführt. → Lösung: Build-Check.
4. **Dokumentation veraltet**: Docs nicht nach Architekturänderung aktualisiert. → Lösung: Release-Checkliste enthält Docs-Prüfung.

## Verbindlicher Release-Pfad

Jede Änderung folgt dem Pfad:

```
Implementation → Audit/Test → Konsistenzprüfung → GitHub-Sync → Release
```

Der Release-Status ist im Admin-Bereich (Einstellungen → Releases) einsehbar. Eine Änderung gilt erst als abgeschlossen, wenn alle Schritte durchlaufen sind.

## Verantwortlichkeiten

| Rolle | Verantwortung |
|:---|:---|
| Entwickler | Code-Änderungen, Schema-Updates, Codegen |
| Reviewer | Audit, Test-Prüfung |
| System-Admin | GitHub-Sync, Release-Freigabe, Konsistenzprüfung |
| Projektleitung | Go/No-Go-Entscheidung |
