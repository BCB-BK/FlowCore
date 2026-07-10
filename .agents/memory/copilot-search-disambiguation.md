---
name: Copilot search disambiguation strategy
description: How the FlowCore connector's /search ranks results across content pages and glossary terms so generic questions surface multiple hits while specific/definitional/filing questions narrow correctly.
---

## Problem

A single free-text search endpoint (`POST /api/copilot/search`) has to serve
very different question shapes well:

- Generic ("Wie konzipiert man ein Produkt?") → should return several
  plausible hits, not just one.
- Brand-specific ("Wie konzipiert die EHiP Academy ein Produkt?") → should
  narrow to that brand's content.
- Definitional ("Was bedeutet AZAV?") → should surface the glossary entry
  itself, not a process page that merely mentions the abbreviation.
- Filing/template ("Wo lege ich ein neues Markenprofil ab?") → should
  surface the canonical structure/filing guide, if one is tagged.

## Key decisions

**Stopword filtering before word-scoring.** German question-frame words
("was", "wie", "ist", "bedeutet", "ich", "ein", …) appear in almost every
page's running text. Left in the per-word scoring loop, they drown out the
one or two words that actually discriminate in a short question — e.g. "Was
bedeutet AZAV?" would rank any page containing "was" and "bedeutet" above
the glossary entry literally titled "AZAV".
**Why:** confirmed via direct measurement — before filtering, the exact
glossary term ranked below unrelated terms that merely shared the frame
words.
**How to apply:** strip stopwords first; only fall back to the unfiltered
word list if stripping removes every word (avoids returning zero words for
a stopword-only query).

**Exact-title match outweighs synonym cross-references.** Many glossary
entries list other entries' names as synonyms/related terms for
cross-referencing (e.g. "AZWV" lists "AZAV" as a synonym; "Compliance" does
too). Giving keyword/synonym matches the same weight as an exact title
match let every cross-referencing entry tie with or beat the actual "AZAV"
entry.
**Why:** discovered by testing "Was bedeutet AZAV?" end-to-end — several
unrelated entries outranked "AZAV" itself until title-exact-match got a
distinctly higher weight than keyword/synonym-exact-match.
**How to apply:** when scoring, `title === word` should score noticeably
higher than `keywords.includes(word)` (synonym exact match), which in turn
outweighs plain substring containment.

**Intent detection uses the original (unfiltered) query text and applies a
flat score bonus, not a multiplier.** `detectQueryIntent` regex-matches
definitional phrasing ("was ist/bedeutet/heißt", "was versteht man unter")
and filing/template phrasing ("wo lege ich … ab", "welches template/welche
vorlage", "ablage(struktur)", "strukturleitfaden") against the raw query
before stopwords are removed. Matching items get a flat additive bonus
rather than a multiplier, so a genuinely poor text match can't win purely
off the intent boost.
**How to apply:** the filing/template boost only fires for pages tagged
with the `structure-guide` convention tag — this is an editorial
convention, not automatic detection, and does nothing until an editor tags
the canonical structure-guide page with it.

**Glossary terms are searched as a first-class source alongside pages**, not
merely referenced from within page content — otherwise no page-only search
could ever prioritize a bare definition over a page that happens to mention
the term.
