---
name: Copilot connector search must tokenize queries
description: Free-text search matching bug where the whole query string was treated as one literal substring instead of being split into words.
---

`searchForConnector`'s `textMatches()` originally lower-cased the entire query and checked `.includes(fullQuery)` against title/summary/content/keywords. Copilot Studio sends natural-language queries like "Vision BildungsCampus" or "Was weißt du über Produkte?", which almost never appear as a contiguous substring in the page even when every individual word is present (e.g. page titled "Vision des BildungsCampus" doesn't contain the phrase "vision bildungscampus" — the word "des" is in between). This made the connector return `results: []` for nearly all real queries while still returning results for single generic words like "a".

Fixed 2026-07-10: split the query into words (`\p{L}\p{N}` runs, length > 1) and score each field per word, summing scores. A page matching more of the query's words now ranks higher, and word order/adjacency no longer matters.

**Why:** Any user-facing free-text search feature (not just this connector) should assume the query is natural language, not an exact-phrase lookup, unless it explicitly implements phrase-quoting syntax.

**How to apply:** When adding or reviewing text search/matching logic that consumes external free-text input (chatbots, search boxes, connector queries), tokenize and match per-token rather than using a single `.includes(query)` check. Also relevant: whether Copilot Studio calls the connector at all for single generic words like "Produkt" is a separate, unconfirmed question — that's Copilot Studio's own query-routing behavior, not something this codebase controls.
