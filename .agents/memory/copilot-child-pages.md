---
name: Copilot child-page export & business-relevance guidance
description: How overview/detail-page relationships are exported to Copilot, and why a plain child list isn't enough.
---

Overview pages (process overviews, documentation registers) export their
children as structured data (`hasChildren`, `childPageCount`, `childPages`
with title/displayCode/pageType/shortDescription/sourceUrl), but when the
child list is large it must be truncated to a small sample
(`topChildPages`) plus a search hint rather than dumped in full — large
inline arrays bloat every node response even when Copilot only needs a
few examples.

**Why:** Copilot also can't infer *why* children matter without being told
explicitly — for a process overview, the detail pages carry the real
process steps and are usually more relevant than the overview; for a
documentation register, the children ARE the actual documents, not just
links to them. This is domain knowledge with no signal in the raw content,
so it has to be exported as a ready-made guidance sentence
(`childPagesGuidance`) keyed off `pageType`, not left for the model to
guess.

**How to apply:** Any new overview-style `templateType` added later needs
its own branch in the guidance-derivation function, or it silently falls
back to a generic sentence. Keep the truncation threshold and sample size
in one place so search-hint wording and truncation stay consistent.
