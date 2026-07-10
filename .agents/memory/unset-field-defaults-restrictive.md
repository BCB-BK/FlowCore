---
name: Unset structured fields default to restrictive, not permissive
description: Recurring bug pattern where an optional classification field being unset silently blocks functionality instead of falling back to a safe default.
---

Twice in this project, an optional structured field (`confidentiality`, then `authority_level`) was used as a gate in `evaluateIndexability`, and code treated "field not set" the same as "field set to the most restrictive value" (draft/archived, or no-ACL). Because neither field was consistently populated by editors (one wasn't even exposed in the edit UI), a large fraction of legitimately published content was silently excluded from Copilot/Graph search with no error surfaced anywhere.

**Why:** When a field is optional/nullable in the data model but used for security- or visibility-relevant gating, "unset" needs an explicit, deliberate default — it should not fall through to whatever branch happens to run when the value doesn't match expected enum members.

**How to apply:** When adding or reviewing any gate that reads an optional classification field, explicitly ask "what happens when this is null, and is that the intended default?" Prefer removing the field as a gate entirely (as done for `authority_level`) if a more reliable source of truth already exists (e.g. `node_status`), rather than trying to patch the default. If the field must remain a gate, pick and document an explicit default (e.g. confidentiality now defaults to `"internal"`, not blocked).
