# ADR-008: Seitentypen-Registry als Single Source of Truth

**Status**: Accepted  
**Datum**: 2026-03-27  
**Kontext**: Cluster 26 – Seitentypen-Registry, Source of Truth und Template-Konsolidierung

## Kontext

Die 18 Seitentypen des Bildungscampus-Wiki waren an mehreren Stellen im System definiert:

1. **Shared Registry** (`lib/shared/src/page-types/registry.ts`) – 18 Typen mit vollständigen Definitionen (TemplateType-Union, Metadaten, Sektionen, Validierungen)
2. **DB-Enum** (`lib/db/src/schema/enums.ts`) – 18 Typen (konsistent)
3. **API-Validierung** (`artifacts/api-server/src/routes/content.ts`) – nur 10 Typen in einer hardcoded Liste `VALID_TEMPLATE_TYPES` (fehlend: glossary, work_instruction, checklist, faq, interface_description, meeting_protocol, training_resource, audit_object)
4. **API ID-Prefixes** (`artifacts/api-server/src/services/identity.service.ts`) – nur 11 Typen in `TEMPLATE_PREFIX_MAP` (fehlend: work_instruction, checklist, faq, interface_description, meeting_protocol, training_resource, audit_object)
5. **UI-Labels** (`artifacts/wiki-frontend/src/lib/types.ts`) – 18 Typen in `PAGE_TYPE_LABELS` und `PAGE_TYPE_ICON_MAP` (konsistent, aber redundant gepflegt)
6. **API-Zod-Typen** (`lib/api-zod/src/generated/types/`) – 18 Typen (generiert, konsistent)

### Problem

- API-Validierung lehnte 8 von 18 gültigen Seitentypen beim Patch ab
- ID-Präfix-Generierung fiel für 7 Typen auf den generischen Fallback "DOC" zurück
- UI-Labels und Icons mussten manuell synchron gehalten werden
- Keine formale Klassifikation der Darstellungsweise je Seitentyp

## Entscheidung

### 1. Single Source of Truth

Die **Shared Registry** (`lib/shared/src/page-types/registry.ts`) ist die einzige verbindliche Quelle für:
- Seitentyp-Definitionen (TemplateType)
- Labels (DE/EN), Icons, Farben
- Kategorien und Display Profiles
- Erlaubte Kindtypen (allowedChildTypes)
- Metadaten-Felddefinitionen und Sektionen
- Validierungsregeln (Publish/Draft)
- ID-Präfixe (displayIdPrefix)

Alle anderen Stellen **leiten** ihre Daten aus der Registry ab:
- API-Server: `ALL_TEMPLATE_TYPES` für Validierung, `getDisplayIdPrefix()` für ID-Generierung
- Frontend: `PAGE_TYPE_LABELS` und `PAGE_TYPE_ICON_MAP` werden aus Registry-Daten berechnet
- DB-Enum: Manuell synchron gehalten (Drizzle-Enum kann nicht dynamisch generiert werden)

### 2. Display Profiles

Jeder Seitentyp erhält ein `displayProfile`, das definiert, wie er dargestellt wird:

| Display Profile | Beschreibung | Zugeordnete Seitentypen |
|:---|:---|:---|
| `overview_container` | Übergeordnete Container-Seiten | core_process_overview, area_overview, dashboard |
| `process_document` | Prozedurale Schritt-für-Schritt-Dokumente | process_page_text, process_page_graphic, procedure_instruction, work_instruction |
| `reference_article` | Eigenständige Nachschlagewerke | use_case, role_profile, glossary, faq, meeting_protocol |
| `governance_document` | Normative Dokumente mit Freigabepflicht | policy, audit_object |
| `system_document` | Technische Systemdokumentation | system_documentation, interface_description |
| `module_page` | Interaktive Strukturseiten | checklist, training_resource |

### 3. ID-Präfixe im Registry

Jeder Seitentyp definiert ein `displayIdPrefix` direkt in der Registry, anstatt eine separate Map im API-Server zu pflegen.

## Konsequenzen

### Positiv
- Eine einzige Quelle der Wahrheit für alle 18 Seitentypen
- Kein Auseinanderdriften von Validierung, Labels und Typen möglich
- Display Profiles ermöglichen profilbasierte Layout-Steuerung
- Neue Seitentypen müssen nur an einer Stelle hinzugefügt werden (plus DB-Enum)

### Negativ
- DB-Enum (`templateTypeEnum`) muss manuell synchron gehalten werden (technische Limitierung von Drizzle/PostgreSQL-Enums)
- API-Zod-Typen werden aus OpenAPI-Spec generiert und müssen bei Änderungen regeneriert werden

### Migrationsrisiko
- Keine Datenbankmigration erforderlich (Enum-Werte unverändert)
- Keine Breaking Changes für bestehende API-Clients
