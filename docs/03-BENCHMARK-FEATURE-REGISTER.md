# Benchmark Feature Register – FlowCore

Zielmerkmale abgeleitet aus: Confluence, Docmost, XWiki, Teams-Wiki, KI-gestützten Wissenssystemen.

**Stand**: Juni 2026

---

## Kategorie: Inhaltsstruktur & Navigation

| # | Feature | Confluence | Docmost | XWiki | Teams | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|
| F-001 | Hierarchische Seitenstruktur (Baum) | ✓ | ✓ | ✓ | Flach | ✓ | ✅ Implementiert |
| F-002 | Fachliche Querverweise (Graph) | Plugin | ✗ | ✓ | ✗ | ✓ | ✅ Implementiert |
| F-003 | Hierarchische Fachnummern (Display-Code) | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |
| F-004 | Immutable System-ID | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |
| F-005 | Breadcrumb-Navigation | ✓ | ✓ | ✓ | ✗ | ✓ | ✅ Implementiert |
| F-006 | Sidebar-Baumnavigation | ✓ | ✓ | ✓ | ✗ | ✓ | ✅ Implementiert |
| F-007 | Multi-Organisation / Multi-Brand | ✗ | ✗ | Spaces | ✗ | ✓ | 🔵 Schema vorbereitet |

---

## Kategorie: Versionierung & Revisionen

| # | Feature | Confluence | Docmost | XWiki | Teams | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|
| F-010 | Revisionskette (jede Änderung) | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ Implementiert |
| F-011 | Fachliche Versionsnummern (1.0, 2.0) | ✗ | ✗ | ✓ | ✗ | ✓ | ✅ Implementiert |
| F-012 | Versionsstamm / Chronik-Ansicht | ✓ | ✗ | ✓ | ✗ | ✓ | ✅ Implementiert |
| F-013 | Diff zwischen Revisionen | ✓ | ✗ | ✓ | ✗ | ✓ | ✅ Implementiert |
| F-014 | Restore auf alte Revision | ✓ | ✗ | ✓ | ✗ | ✓ | ✅ Implementiert |
| F-015 | Änderungstypen (editorial, major, regulatory) | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |

---

## Kategorie: Seitentypen & Templates

| # | Feature | Confluence | Docmost | XWiki | Teams | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|
| F-020 | Kernprozess-Übersicht | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |
| F-021 | Verfahrensanweisung (SIPOC, RACI, Swimlane) | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |
| F-022 | Rollenprofil | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |
| F-023 | 11 Seitentypen mit strukturierten Feldern | ✗ | ✗ | Teilweise | ✗ | ✓ | ✅ Implementiert |
| F-024 | Template-basierte Pflichtfeldvalidierung | ✗ | ✗ | Teilweise | ✗ | ✓ | ✅ Implementiert |
| F-025 | BPMN 2.0 Prozessdiagramme | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |

---

## Kategorie: Authentifizierung & Berechtigungen

| # | Feature | Confluence | Docmost | XWiki | Teams | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|
| F-030 | Microsoft Entra SSO | Plugin | ✗ | Plugin | ✓ | ✓ | ✅ Implementiert |
| F-031 | 7 Rollen (Admin bis Viewer) | ✓ | Einfach | ✓ | Einfach | ✓ | ✅ Implementiert |
| F-032 | 13+ granulare Berechtigungen | ✓ | ✗ | ✓ | ✗ | ✓ | ✅ Implementiert |
| F-033 | Seitenebene-Rechte mit Vererbung | ✓ | ✗ | ✓ | ✗ | ✓ | ✅ Implementiert |
| F-034 | Ownership / Stellvertretung | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |
| F-035 | Graph-basierter Personenpicker | ✗ | ✗ | ✗ | ✓ | ✓ | ✅ Implementiert |

---

## Kategorie: Zusammenarbeit & Social

| # | Feature | Confluence | Docmost | XWiki | Teams | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|
| F-040 | Seitenkommentare / Annotationen | ✓ | ✓ | ✓ | ✓ | ✓ | 🔵 Schema vorbereitet |
| F-041 | Watchlist / Beobachtungsliste | ✓ | ✗ | ✓ | ✗ | ✓ | ✅ Implementiert |
| F-042 | Favoriten | ✓ | ✗ | ✓ | ✗ | ✓ | ✅ Implementiert |
| F-043 | In-App-Benachrichtigungen | ✓ | ✗ | ✓ | ✓ | ✓ | ✅ Implementiert |
| F-044 | Seitenverifizierung / Aktualitätsprüfung | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |

---

## Kategorie: Suche & KI

| # | Feature | Confluence | Docmost | XWiki | Teams | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|
| F-050 | Volltextsuche (pg_trgm) | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ Implementiert |
| F-051 | KI-Assistent (FlowCore-Assistent) | ✗ | ✗ | ✗ | Copilot | ✓ | ✅ Implementiert |
| F-052 | KI-Feldvorschläge (AI Field Profiles) | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |
| F-053 | Automatische Qualitätsanalyse | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |

---

## Kategorie: Integration & Distribution

| # | Feature | Confluence | Docmost | XWiki | Teams | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|
| F-060 | Microsoft Teams Embedding | Plugin | ✗ | ✗ | ✓ | ✓ | ✅ Implementiert |
| F-061 | SharePoint-Medienablage | Plugin | ✗ | ✗ | ✓ | ✓ | ✅ Implementiert |
| F-062 | SharePoint-Dateiauswahl (Picker) | ✗ | ✗ | ✗ | ✓ | ✓ | ✅ Implementiert |
| F-063 | Konnektor-Framework (Speicheranbieter) | Plugin | ✗ | Plugin | ✗ | ✓ | ✅ Implementiert |

---

## Kategorie: Medien & Assets

| # | Feature | Confluence | Docmost | XWiki | Teams | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|
| F-070 | Datei-Upload & Medienbibliothek | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ Implementiert |
| F-071 | Asset-Klassifikation | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |
| F-072 | Referenzdokumente & URL-Verlinkung | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |
| F-073 | Verwendungsnachweise über Seiten | ✗ | ✗ | ✗ | ✗ | ✓ | 🔵 Schema vorbereitet |

---

## Kategorie: Audit & Governance

| # | Feature | Confluence | Docmost | XWiki | Teams | Ziel Wiki | Status |
|---|---|---|---|---|---|---|---|
| F-080 | Audit-Trail für alle Aktionen | ✓ | ✗ | ✓ | ✗ | ✓ | ✅ Implementiert |
| F-081 | Correlation-ID für Request-Tracking | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |
| F-082 | Strukturiertes Logging (JSON/pino) | ✗ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |
| F-083 | Review-Workflow mit Approval-Kette | Plugin | ✗ | Plugin | ✗ | ✓ | ✅ Implementiert |
| F-084 | Qualitäts-Dashboard | ✓ | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |
| F-085 | Automatisches Backup (SharePoint) | Plugin | ✗ | ✗ | ✗ | ✓ | ✅ Implementiert |
| F-086 | Glossar mit Synonym-Unterstützung | Plugin | ✗ | ✓ | ✗ | ✓ | ✅ Implementiert |

---

## Zusammenfassung

| Kategorie | Implementiert | Vorbereitet | Gesamt |
|---|---|---|---|
| Inhaltsstruktur & Navigation | 6 | 1 | 7 |
| Versionierung & Revisionen | 6 | 0 | 6 |
| Seitentypen & Templates | 6 | 0 | 6 |
| Authentifizierung & Berechtigungen | 6 | 0 | 6 |
| Zusammenarbeit & Social | 4 | 1 | 5 |
| Suche & KI | 4 | 0 | 4 |
| Integration & Distribution | 4 | 0 | 4 |
| Medien & Assets | 3 | 1 | 4 |
| Audit & Governance | 7 | 0 | 7 |
| **Gesamt** | **46** | **3** | **49** |

**Implementierungsgrad: 94 %**

---

## Legende

| Symbol | Bedeutung |
|---|---|
| ✅ Implementiert | Feature vollständig umgesetzt und produktiv |
| 🔵 Schema vorbereitet | Datenbankschema und Infrastruktur vorhanden, UI/API noch ausstehend |
| ✗ | Feature nicht vorhanden in diesem System |
