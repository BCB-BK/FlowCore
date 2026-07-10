---
name: Graph externalItem strict-required vs nullable properties
description: Which enriched Copilot/Graph externalItem properties may be marked strictly required vs. must stay nullable, and why.
---

`assertRequiredProperties()` (graph-external-item-mapper.service.ts) treats `undefined`, `null`, and `""` all as "missing" and throws `AppError(400)`. This means `REQUIRED_PAGE_PROPERTY_NAMES` / `REQUIRED_GLOSSARY_PROPERTY_NAMES` must only ever list fields that are **guaranteed non-null by construction** for every published page/term — not fields that are merely "usually present".

Fields that looked required but are legitimately empty for real data, and must NOT be added to the required lists:
- `version`, `authorityLevel` — many published pages have no structured `version`/`authority_level` set.
- `shortDescription` — falls back to `""` when a page has neither a `kurzbeschreibung` structured field nor a `summary`.
- `parentPath`, `reviewDue`, `ownerName`/`owner` — null for root pages, pages without a review cycle, or pages without an assigned owner.

**Why:** these were added while enriching Graph externalItem properties (owner/shortDescription/hierarchy fields, 2026-07-10). Marking any of them required broke real published pages/terms with a 400 during export/sync — a page with no summary or a term with no linked node's authority level is still valid and must sync, just with that property explicitly `null`/`""` ("vollständig oder nachvollziehbar leer", not required-non-empty).

**How to apply:** before adding a new externalItem property to a REQUIRED_*_PROPERTY_NAMES list, verify it is computed with a non-null fallback in every code path (e.g. `pageType` from `node.templateType`, `sourcePriority` defaulting to `1`, `lastModifiedAt` always set). If any code path can leave it `null`/`""`, keep it optional and let it flow through as an explicit empty value instead.
