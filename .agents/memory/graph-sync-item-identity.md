---
name: Graph sync item identity & dedup
description: How externalItem IDs and content-hash dedup must be constructed for the Graph sync queue/delta-sync, and pitfalls that caused silent identity mismatches.
---

Graph externalItem IDs for pages are built from the content node's `immutableId` (a separate stable text column), never from the node's row `id` (uuid). Any code path that reconstructs an itemId from a queue job (which only stores `nodeId`) must look up `immutableId` from the DB first, or the reconstructed ID will silently diverge from the one used when the item was originally pushed/logged — log/queue entries end up keyed under two different itemIds for the same logical item, and audit queries filtering by itemId miss entries.

**Why:** Delete/deindex handling in the delta-sync queue built the itemId as `flowcore_page_${job.nodeId}` while the original push used `flowcore_page_${immutableId}`. This didn't error — it just made delete-confirmation log lookups return the wrong (stale) log entry, which only surfaced via an e2e assertion on log content, not a typecheck or an obvious runtime failure.

**How to apply:** Whenever adding new sync/queue code that reconstructs a Graph externalItem ID from partial data (e.g. just a node/term row), reuse the same helper/lookup that the original push path uses rather than reassembling the ID string manually.

Separately: content-hash-based dedup (skip re-pushing to Graph when nothing changed) must incorporate the resolved ACL, not just the page/glossary content. ACL/rights changes (e.g. confidentiality level, group mapping) do not change page content, so a plain content hash will falsely report "unchanged" and skip the required Graph ACL update. Combine content hash + a hash of the resolved ACL payload into the dedup key.
