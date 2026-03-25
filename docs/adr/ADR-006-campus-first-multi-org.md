# ADR-006: Campus-first / Multi-Organisation / Multi-Brand Architektur

**Status**: Accepted
**Date**: 2026-03-25
**Context**: Cluster 1 Nachschärfung – Organisationsarchitektur

## Kontext

Das Enterprise-Wiki muss den gesamten Bildungscampus Backnang tragen. Dazu gehören mehrere Organisationsebenen: der Campus selbst, einzelne Schulen/Marken, Bereiche, Teams, Standorte und Querschnittsfunktionen. Das Datenmodell muss diese Struktur von Anfang an abbilden.

## Entscheidung

Die Architektur wird Campus-first / Multi-Organisation / Multi-Brand aufgebaut. Folgende Kernentitäten werden im Datenmodell verankert:

### Organisationsmodell

| Entität | Zweck | Beispiele |
|---|---|---|
| `organization_units` | Organisatorische Einheiten im Campus | Fachbereiche, Abteilungen |
| `brands` | Schulen / Marken unter dem Campus-Dach | Einzelne Schulen, Markenidentitäten |
| `locations` | Physische Standorte | Gebäude, Räume, Campusteile |
| `business_functions` | Querschnittsfunktionen | Qualitätsmanagement, IT, Personal |

### Zuordnungslogik

- Content Nodes können einer `organization_unit`, `brand` und/oder `location` zugeordnet werden
- Rollen und Rechte können auf Ebene von Campus, Brand/Schule, Kernprozess, Bereich oder Seite vergeben werden (scope in `role_assignments`)
- Filter und Navigation im Frontend leiten sich aus diesen Zuordnungen ab

### Scope-Hierarchie für Berechtigungen

```
campus (global)
  └── brand / school
        └── organization_unit
              └── core_process (Kernprozess)
                    └── area (Bereich)
                          └── page (Einzelseite)
                                └── revision / workflow
```

## Konsequenzen

- Alle Inhalte sind organisatorisch zuordenbar
- Filter für Campus, Marke, Bereich und Standort sind aus dem Datenmodell ableitbar
- Navigation und IA können sowohl kernprozesszentriert als auch nach Marke/Bereich/Querschnitt filtern
- Keine nachträgliche Ergänzung von Organisations-Strukturen nötig
