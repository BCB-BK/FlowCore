# Benchmark Feature Register

Zielmerkmale abgeleitet aus: Confluence, Docmost, XWiki, Teams-Wiki, KI-gestützten Wissenssystemen.

## Kategorie: Inhaltsstruktur & Navigation

| # | Feature | Confluence | Docmost | XWiki | Teams | KI-Systeme | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|---|
| F-001 | Hierarchische Seitenstruktur (Baum) | ✓ | ✓ | ✓ | Flach | – | ✓ | Implementiert |
| F-002 | Fachliche Querverweise (Graph) | Plugin | ✗ | ✓ | ✗ | ✓ | ✓ | Implementiert |
| F-003 | Hierarchische Fachnummern (Display-Code) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | Implementiert |
| F-004 | Immutable System-ID | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | Implementiert |
| F-005 | Breadcrumb-Navigation | ✓ | ✓ | ✓ | ✗ | – | ✓ | Implementiert |
| F-006 | Sidebar-Baumnavigation | ✓ | ✓ | ✓ | ✗ | – | ✓ | Implementiert |
| F-007 | Multi-Organisation / Multi-Brand | ✗ | ✗ | Spaces | ✗ | ✗ | ✓ | Schema vorbereitet |

## Kategorie: Versionierung & Revisionen

| # | Feature | Confluence | Docmost | XWiki | Teams | KI-Systeme | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|---|
| F-010 | Revisionskette (jede Änderung) | ✓ | ✓ | ✓ | ✓ | – | ✓ | Implementiert |
| F-011 | Fachliche Versionsnummern (1.0, 2.0) | ✗ | ✗ | ✓ | ✗ | – | ✓ | Implementiert |
| F-012 | Versionsstamm / Chronik-Ansicht | ✓ | ✗ | ✓ | ✗ | – | ✓ | API vorbereitet |
| F-013 | Diff zwischen Revisionen | ✓ | ✗ | ✓ | ✗ | – | ✓ | Geplant |
| F-014 | Restore auf alte Revision | ✓ | ✗ | ✓ | ✗ | – | ✓ | Implementiert |
| F-015 | Änderungstypen (editorial, major, regulatory) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | Implementiert |

## Kategorie: Seitentypen & Templates

| # | Feature | Confluence | Docmost | XWiki | Teams | KI-Systeme | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|---|
| F-020 | Kernprozess-Übersicht | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | Template definiert |
| F-021 | Verfahrensanweisung (SIPOC, RACI, Swimlane) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | Template definiert |
| F-022 | Stellenprofil | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | Template definiert |
| F-023 | 10+ Seitentypen mit strukturierten Feldern | ✗ | ✗ | Teilweise | ✗ | ✗ | ✓ | 10 Templates definiert |
| F-024 | Template-basierte Pflichtfeldvalidierung | ✗ | ✗ | Teilweise | ✗ | ✗ | ✓ | Schema vorbereitet |

## Kategorie: Authentifizierung & Berechtigungen

| # | Feature | Confluence | Docmost | XWiki | Teams | KI-Systeme | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|---|
| F-030 | Microsoft Entra SSO | Plugin | ✗ | Plugin | ✓ | ✗ | ✓ | Implementiert |
| F-031 | 7 Rollen (Admin bis Viewer) | ✓ | Einfach | ✓ | Einfach | – | ✓ | Implementiert |
| F-032 | 13+ granulare Berechtigungen | ✓ | ✗ | ✓ | ✗ | – | ✓ | Implementiert |
| F-033 | Seitenebene-Rechte mit Vererbung | ✓ | ✗ | ✓ | ✗ | – | ✓ | Implementiert |
| F-034 | Ownership / Stellvertretung | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | Implementiert |
| F-035 | Graph-basierter Personenpicker | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | API vorbereitet |
| F-036 | Scope-basierte Rollenvergabe | ✗ | ✗ | ✓ | ✗ | – | ✓ | Schema vorbereitet |

## Kategorie: Zusammenarbeit & Social

| # | Feature | Confluence | Docmost | XWiki | Teams | KI-Systeme | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|---|
| F-040 | Seitenkommentare / Annotationen | ✓ | ✓ | ✓ | ✓ | – | ✓ | Schema vorbereitet |
| F-041 | Watchlist / Beobachtungsliste | ✓ | ✗ | ✓ | ✗ | – | ✓ | Schema vorbereitet |
| F-042 | Favoriten | ✓ | ✗ | ✓ | ✗ | – | ✓ | Schema vorbereitet |
| F-043 | Benachrichtigungen | ✓ | ✗ | ✓ | ✓ | – | ✓ | Schema vorbereitet |
| F-044 | Seitenverifizierung / Aktualitätsprüfung | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | Schema vorbereitet |

## Kategorie: Suche & KI

| # | Feature | Confluence | Docmost | XWiki | Teams | KI-Systeme | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|---|
| F-050 | Volltextsuche | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Einfach implementiert |
| F-051 | KI-Assistent / Chatbot | ✗ | ✗ | ✗ | Copilot | ✓ | ✓ | Geplant |
| F-052 | RAG-basiertes Retrieval | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | Geplant |
| F-053 | Automatische Qualitätsanalyse | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | Geplant |
| F-054 | Intelligente Vorschläge | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | Geplant |

## Kategorie: Integration & Distribution

| # | Feature | Confluence | Docmost | XWiki | Teams | KI-Systeme | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|---|
| F-060 | Microsoft Teams Embedding | Plugin | ✗ | ✗ | ✓ | ✗ | ✓ | Geplant |
| F-061 | SharePoint-Medienablage | Plugin | ✗ | ✗ | ✓ | ✗ | ✓ | Geplant |
| F-062 | Source-System-Connectoren | Plugin | ✗ | Plugin | ✗ | ✓ | ✓ | Schema vorbereitet |

## Kategorie: Medien & Assets

| # | Feature | Confluence | Docmost | XWiki | Teams | KI-Systeme | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|---|
| F-070 | Datei-Upload & Verwaltung | ✓ | ✓ | ✓ | ✓ | – | ✓ | Schema implementiert |
| F-071 | Asset-Klassifikation | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | Schema vorbereitet |
| F-072 | Video-Metadaten & Transkript-Referenz | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | Schema vorbereitet |
| F-073 | Verwendungsnachweise über Seiten | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | Schema vorbereitet |

## Kategorie: Audit & Governance

| # | Feature | Confluence | Docmost | XWiki | Teams | KI-Systeme | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|---|
| F-080 | Audit-Trail für alle Aktionen | ✓ | ✗ | ✓ | ✗ | – | ✓ | Implementiert |
| F-081 | Correlation-ID für Request-Tracking | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | Implementiert |
| F-082 | Strukturiertes Logging (JSON) | ✗ | ✗ | ✗ | ✗ | – | ✓ | Implementiert |
| F-083 | Review-Workflow mit Approval-Kette | Plugin | ✗ | Plugin | ✗ | ✗ | ✓ | Schema implementiert |
