---
name: Copilot indexability rule
description: Central rule for what makes a page exportable to Copilot/Graph; changing it changes test fixtures everywhere.
---

A content node is Copilot/Graph-indexable only if ALL of:
- published (`node.status === "published"` and `publishedRevisionId` set), not soft-deleted
- `agent_enabled === true` (structuredFields, per-revision)
- `authority_level` is neither `draft` nor `archived`
- `confidentiality` maps to a valid ACL, and that ACL actually has entries (not just "public" by default — public trivially satisfies this, other levels need `confidentiality_access_config` roles or `confidentiality_principal_access` rows)

Implemented as `evaluateIndexability` in `artifacts/api-server/src/lib/agent-metadata.ts`, called from `copilot-content-projection.service.ts::projectPublishedPage`, which returns `null` (→ 404 at the route) when not indexable.

**Why:** Before this rule existed, any published node was exportable. e2e fixtures that assume "publish → exportable" (e.g. `copilot-projection.spec.ts`'s `createAndPublishNode` helper) must now also set `agent_enabled: true`, `authority_level: "binding"`, and `confidentiality: "public"` in the working-copy patch, or the projection silently returns null/404.

**How to apply:** When writing new e2e/unit tests that expect a published page to be exportable via `/api/copilot/pages/:id`, always include those three structuredFields in the publish flow.
