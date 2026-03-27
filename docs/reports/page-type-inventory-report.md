# Seitentypen-Inventur – Abweichungsreport

**Datum**: 2026-03-27  
**Registry Version**: 2.0.0 (nach Konsolidierung)

## Zusammenfassung

18 Seitentypen wurden über 6 Definitionsorte hinweg verglichen. Vor der Konsolidierung gab es Abweichungen an 2 Stellen.

## Inventur: Alle 18 Seitentypen

| # | Seitentyp | Registry | DB-Enum | API-Zod | UI-Labels | UI-Icons | API-Valid. (vorher) | ID-Prefix (vorher) |
|---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | core_process_overview | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ KP |
| 2 | area_overview | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ BER |
| 3 | process_page_text | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ PRZ |
| 4 | process_page_graphic | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ PRZ |
| 5 | procedure_instruction | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ VA |
| 6 | use_case | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ UC |
| 7 | policy | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ RL |
| 8 | role_profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ ROL |
| 9 | dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ DSH |
| 10 | system_documentation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ SYS |
| 11 | glossary | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ GLO |
| 12 | work_instruction | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ (DOC) |
| 13 | checklist | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ (DOC) |
| 14 | faq | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ (DOC) |
| 15 | interface_description | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ (DOC) |
| 16 | meeting_protocol | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ (DOC) |
| 17 | training_resource | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ (DOC) |
| 18 | audit_object | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ (DOC) |

## Gefundene Abweichungen (vor Konsolidierung)

### 1. API-Validierung – VALID_TEMPLATE_TYPES (content.ts:120-131)
- **Ort**: `artifacts/api-server/src/routes/content.ts`
- **Problem**: Hardcoded Liste mit nur 10 von 18 Typen
- **Fehlend**: glossary, work_instruction, checklist, faq, interface_description, meeting_protocol, training_resource, audit_object
- **Auswirkung**: PATCH /nodes/:id mit diesen 8 Typen als templateType wurde mit 400 abgelehnt
- **Lösung**: Ersetzt durch `ALL_TEMPLATE_TYPES` aus der Shared Registry

### 2. ID-Prefix-Map – TEMPLATE_PREFIX_MAP (identity.service.ts:12-24)
- **Ort**: `artifacts/api-server/src/services/identity.service.ts`
- **Problem**: Hardcoded Map mit nur 11 von 18 Typen
- **Fehlend**: work_instruction, checklist, faq, interface_description, meeting_protocol, training_resource, audit_object
- **Auswirkung**: Neue Seiten dieser Typen erhielten den generischen Prefix "DOC" statt eines typspezifischen Prefix
- **Lösung**: Ersetzt durch `getDisplayIdPrefix()` aus der Shared Registry

### 3. UI-Labels und Icons (types.ts)
- **Ort**: `artifacts/wiki-frontend/src/lib/types.ts`
- **Problem**: Manuell gepflegte Duplikate der Labels und Icons aus der Registry
- **Auswirkung**: Potentielles Auseinanderdriften bei Änderungen
- **Lösung**: Automatische Ableitung aus `PAGE_TYPE_REGISTRY`

## Display Profile Zuordnung (neu)

| Display Profile | Seitentypen |
|:---|:---|
| overview_container | core_process_overview, area_overview, dashboard |
| process_document | process_page_text, process_page_graphic, procedure_instruction, work_instruction |
| reference_article | use_case, role_profile, glossary, faq, meeting_protocol |
| governance_document | policy, audit_object |
| system_document | system_documentation, interface_description |
| module_page | checklist, training_resource |

## Status nach Konsolidierung

Alle 18 Seitentypen sind systemweit konsistent. Die Shared Registry ist die einzige Source of Truth (siehe ADR-008).
