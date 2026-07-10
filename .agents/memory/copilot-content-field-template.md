---
name: Copilot content field template
description: Fixed section order and rules for the Graph externalItem `content` free-text field for pages and glossary terms.
---

The `content` field of every externalItem (page or glossary term) must be a
semantically structured knowledge block, not a raw content dump, so Copilot
Studio can both answer directly from it and disambiguate between multiple
search hits.

Fixed section order:
1. Titel / FlowCore-Code / Kurzbeschreibung / Seitentyp / (optional) Geltungsbereich
2. Inhalt (sanitized: no HTML tags, no bare UUIDs)
3. (optional) Strukturierte Felder — RACI/SIPOC/KPIs/Risiken/Kontrollen/Zuständigkeiten only
4. Unterseiten / Detailseiten — always present, "keine" if empty; each entry is title + short description together, never child-page hints as an isolated note
5. Glossarbegriffe — always present, "keine" if empty
6. (optional) Relationen, Übergeordnet
7. Quellenhinweis — Quelle/Version/Owner/Authority only

**Why:** earlier content leaked governance/technical clutter (raw UUIDs, HTML
markup from rich-text fields, a prominent "Status: published" line, Status/
Revision/ReviewDue mixed into the source block) which is exactly what makes
Copilot answers look like technical dumps instead of usable knowledge units.

**How to apply:** any structured field key that already has a dedicated Graph
property (confidentiality, authority_level, agent_scope, decision_status,
copilot_summary/keywords, sourceUrl/sourceType, etc.) must be excluded from
the "Strukturierte Felder" free-text block — that block is reserved for
fachliche process content. Run all free text (Kurzbeschreibung, Inhalt,
Geltungsbereich) through a combined stripHtml + stripUuids sanitizer before
it enters the content string; some source fields (esp. glossary
`definition`) still carry raw rich-text HTML and are not pre-cleaned upstream.
