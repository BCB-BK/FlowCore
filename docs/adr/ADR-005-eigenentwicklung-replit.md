# ADR-005: Eigenentwicklung auf Replit als feste Architekturprämisse

**Status**: Accepted
**Date**: 2026-03-25
**Context**: Cluster 1 Nachschärfung – Architekturprämisse

## Kontext

Vor Projektstart wurden bestehende Produkte evaluiert (Confluence, Docmost, XWiki, Teams-Wiki, KI-gestützte Wissenssysteme). Keine dieser Lösungen erfüllt gleichzeitig alle Anforderungen des Bildungscampus:

- Hierarchische Prozess-IDs mit immutabler Identität
- Fachliche Seitentypen mit strukturierten Pflichtfeldern (SIPOC, RACI, KPIs)
- Mehrstufiger Freigabe-Workflow mit getrennten Review-/Approval-Rechten
- Microsoft Entra SSO + Graph-Integration für Personenpicker
- Multi-Organisation / Multi-Brand (Campus, Schulen, Marken, Bereiche)
- KI-gestütztes Retrieval und Assistenzfunktionen
- Teams-Embedding als Distributionskanal

## Entscheidung

Das Enterprise-Wiki wird als Eigenentwicklung auf Replit gebaut. Diese Entscheidung ist eine feste Architekturprämisse und keine erneute Produktauswahl.

### Begründung

1. **Prozessmanagement-Tiefe**: Kein verfügbares Wiki-Produkt bietet die Kombination aus hierarchischen Fachnummern, SIPOC-/RACI-Strukturen und fachlicher Versionierung.
2. **Freigabe-Governance**: Die Trennung von Content-Bearbeitung, Struktur-Bearbeitung, Review und Freigabe mit serverseitiger Durchsetzung erfordert ein maßgeschneidertes Rechtemodell.
3. **Graph-/Entra-Integration**: Die tiefe Integration mit Microsoft-Infrastruktur (Personenpicker, Gruppen, delegierter Zugriff) geht über Plugin-Fähigkeiten hinaus.
4. **Multi-Brand-Fähigkeit**: Campus-first-Architektur mit mandantenfähiger Struktur für Schulen, Marken und Querschnittsfunktionen.
5. **KI-Readiness**: Native KI-Integration (RAG, Assistenz, Qualitätsanalyse) ab der Datenmodell-Ebene.

### Abgrenzung zu evaluierten Produkten

| Kriterium | Confluence | Docmost | XWiki | Teams-Wiki | Eigenentwicklung |
|---|---|---|---|---|---|
| Hierarchische Fachnummern | ✗ | ✗ | ✗ | ✗ | ✓ |
| Strukturierte Seitentypen (SIPOC, RACI) | ✗ | ✗ | Teilweise | ✗ | ✓ |
| Mehrstufige Freigabe | Plugin | ✗ | Plugin | ✗ | ✓ |
| Entra SSO + Graph Personenpicker | Plugin | ✗ | Plugin | ✓ | ✓ |
| Multi-Organisation / Multi-Brand | ✗ | ✗ | Teilweise | ✗ | ✓ |
| Native KI-Integration | Plugin | ✗ | ✗ | ✗ | ✓ |
| Teams-Embedding | Plugin | ✗ | ✗ | ✓ | ✓ |

## Konsequenzen

- Keine erneute Produktauswahlrunde
- Alle Features werden auf dem bestehenden Stack (React, Express, PostgreSQL, Drizzle) gebaut
- Provider-Abstraktionen sichern die Austauschbarkeit einzelner Infrastrukturkomponenten (siehe ADR-007)
- Höhere initiale Entwicklungskosten, dafür volle Kontrolle und keine Lizenzabhängigkeiten
