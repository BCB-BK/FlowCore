---
name: Copilot indexability rule
description: Central rule for what makes a page exportable to Copilot/Graph; changing it changes test fixtures everywhere.
---

A content node is Copilot/Graph-indexable only if ALL of:
- published (`node.status === "published"` and `publishedRevisionId` set), not soft-deleted
- `confidentiality` maps to a valid ACL, and that ACL actually has entries (not just "public" by default — public trivially satisfies this, other levels need `confidentiality_access_config` roles or `confidentiality_principal_access` rows)

`agent_enabled` was REMOVED as a gating factor on 2026-07-10 (explicit user request) — it's no longer read by `evaluateIndexability` at all, even though the field itself still exists in structuredFields/AgentMetadata for other purposes.

`authority_level` was ALSO REMOVED as a gating factor on 2026-07-10 (explicit user request) — `node_status` already fully captures publish state, so treating a separately unset/"draft" `authority_level` as a second gate was redundant AND actively harmful: the field was never exposed in the wiki-frontend edit UI, so ~1/3 of published pages silently had no way to become indexable. `authority_level` still exists as a field (structuredFields, AgentMetadata, search/projection display) — it's just no longer read by `evaluateIndexability`.

As of the same date, a missing/unset `confidentiality` value is no longer treated as "no ACL" (null) — `getNodeConfidentialityLevel` and the Copilot projection now default it to `"internal"` (see `DEFAULT_CONFIDENTIALITY_LEVEL` in `confidentiality.service.ts`). This means an unset confidentiality behaves like an explicit "Intern" level (requires internal-role ACL access), not like public or like fully blocked.

Implemented as `evaluateIndexability` in `artifacts/api-server/src/lib/agent-metadata.ts`, called from `copilot-content-projection.service.ts::projectPublishedPage`, which returns `null` (→ 404 at the route) when not indexable.

**Why:** Before this rule existed, any published node was exportable. Then a stricter rule (agent_enabled + authority_level + confidentiality/ACL) was added, but users found agent_enabled confusing/redundant, and blank confidentiality was silently excluding legitimate pages that were never explicitly classified — the user opted to make "unset" behave as "Intern" by default instead of blocking.

**How to apply:** New e2e/unit tests that expect a published page to be exportable via `/api/copilot/pages/:id` only need `authority_level: "binding"` (or non-draft/archived) plus either an explicit `confidentiality` that maps to a populated ACL, or no confidentiality at all (now defaults to internal — requires an internal-role ACL grant to be indexable/accessible, not just published). Do NOT set `agent_enabled` expecting it to matter.
