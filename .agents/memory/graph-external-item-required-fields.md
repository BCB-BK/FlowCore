---
name: Graph externalItem required fields
description: Which page properties are mandatory vs. optional for Microsoft Graph externalItem mapping
---

When mapping FlowCore pages/glossary terms to Microsoft Graph `externalItem` payloads, keep the "required properties" list narrow: id, title, sourceUrl, nodeId/immutableId, status, version, revision, authorityLevel, sourcePriority.

`owner` and `reviewDue` must NOT be in the required-fields list, even though they appear as schema properties.

**Why:** Many published pages legitimately have no assigned owner or no next-review date set yet. Treating them as required blocks otherwise-valid published pages from being exported to Graph with a 400 error, even though nothing about the content is actually invalid.

**How to apply:** When adding new optional metadata properties to a Graph/Copilot schema, default to NOT required unless the data model guarantees the field is always populated by the time a node is published. Validate presence in tests via `"fieldName" in properties` (key exists, value may be null) rather than asserting truthiness.
