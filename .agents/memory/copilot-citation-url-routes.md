---
name: Copilot citation sourceUrl must match live frontend routes
description: Backend-generated citation/source URLs can silently drift from the actual frontend route table, causing every citation link to 404 despite correct search/scoring logic.
---

When a backend service constructs a user-facing "source"/"citation" URL (e.g. `${BASE_URL}/nodes/${id}` or `${BASE_URL}/glossary/${slug}`), it is easy for the path segment to drift out of sync with the frontend's actual route definitions (e.g. plural `/nodes/:id` vs. the real singular `/node/:id` route, or a route that doesn't support a parameterized deep-link at all, like `/glossary` with no `/glossary/:slug`).

**Why:** This class of bug is invisible in normal testing of search/ranking logic — the API returns 200 with well-formed JSON, and the URL *looks* plausible. It only surfaces when someone actually clicks the link, which automated API-level tests rarely do. In this project it caused 100% of Copilot Studio citation links (both page and glossary term citations) to 404.

**How to apply:** Whenever adding or reviewing a service that emits a `sourceUrl`/`url`/citation link field, grep the frontend's route table for the exact literal path structure being generated (singular vs. plural, presence/absence of a `:param` segment) rather than assuming it matches. If a route only exists in list form (no per-item deep link), either add the missing parameterized route or fall back to a URL structure that is provably resolvable client-side.
