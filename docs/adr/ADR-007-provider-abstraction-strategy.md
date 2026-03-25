# ADR-007: Provider-Abstraktionsstrategie

**Status**: Accepted
**Date**: 2026-03-25
**Context**: Cluster 1 Nachschärfung – Austauschbare Infrastrukturkomponenten

## Kontext

Das Enterprise-Wiki integriert sich mit mehreren externen Systemen (Microsoft Entra, Graph API, Dateispeicher, KI-Dienste). Um Vendor-Lock-in zu vermeiden und spätere Migrationen zu ermöglichen, müssen alle externen Abhängigkeiten hinter stabilen Provider-Interfaces abstrahiert werden.

## Entscheidung

Sechs Provider-Kategorien werden als TypeScript-Interfaces definiert. Jede Kategorie hat genau ein Interface, gegen das implementiert wird. Konkrete Implementierungen werden über Dependency Injection oder Factory-Pattern bereitgestellt.

### Provider-Kategorien

| Kategorie | Interface | Erste Implementierung | Zweck |
|---|---|---|---|
| **Auth / Identity** | `IAuthProvider` | Microsoft Entra ID (MSAL) | Login, Token-Validierung, Session-Management |
| **Storage / Medien** | `IStorageProvider` | Lokales Dateisystem / Replit Object Storage | Datei-Upload, -Download, -Verwaltung |
| **Search / Index** | `ISearchProvider` | PostgreSQL Full-Text (pg_trgm) | Volltextsuche, Facettensuche, Indexierung |
| **AI / Retrieval** | `IAIProvider` | OpenAI-kompatible API | Embedding, RAG, Zusammenfassung, Qualitätsanalyse |
| **Connectoren / Source Systems** | `IConnectorProvider` | Microsoft Graph | Personensuche, Gruppenlookup, SharePoint-Anbindung |
| **Notifications** | `INotificationProvider` | In-App + E-Mail (optional) | Benachrichtigungen bei Review, Freigabe, Erwähnung |

### Interface-Design-Prinzipien

1. **Minimale Fläche**: Jedes Interface definiert nur die Methoden, die das Wiki tatsächlich braucht
2. **Async-first**: Alle Provider-Methoden sind `async`
3. **Ergebnis-Typen**: Standardisierter `ProviderResult<T>` Wrapper (`{success: true, data: T} | {success: false, error: string, code?: string}`) in `lib/shared/src/providers/result.ts` – Provider-Implementierungen nutzen `ok(data)` / `fail(error)` Hilfsfunktionen
4. **Keine Implementierungsdetails**: Interfaces kennen keine Microsoft-, AWS- oder sonstigen Vendor-Typen
5. **Konfigurierbar**: Provider werden über Config/Environment konfiguriert, nicht hardcodiert

### Implementierungsstrategie

- Interfaces werden in `lib/shared/src/providers/` definiert
- Konkrete Implementierungen leben im jeweiligen Service-Modul (z.B. `api-server/src/services/`)
- Registrierung über ein zentrales Provider-Registry (Factory-Pattern)
- Feature Flags steuern, welche Provider aktiv sind

## Konsequenzen

- Jeder externe Dienst kann ausgetauscht werden, ohne die Geschäftslogik zu ändern
- Tests können Mock-Provider verwenden
- Neue Provider (z.B. Azure Blob Storage, Elasticsearch) können ergänzt werden, ohne bestehenden Code zu brechen
- Initiale Implementierung bleibt pragmatisch (ein Provider pro Kategorie), aber die Architektur ist vorbereitet
