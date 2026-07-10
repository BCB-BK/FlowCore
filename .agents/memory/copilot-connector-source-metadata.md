---
name: Copilot connector citation vs. technical fields
description: How the FlowCore custom connector separates human-facing "Quellenblock" citation fields from internal/technical fields in search and node responses.
---

The connector's default response shape (search results and `GET /nodes/:id`)
must lead with human-facing citation fields — `displayCode`, `title`,
`url`/`sourceUrl`, `version`, `ownerName` — and must not surface `nodeId`
(UUID), `status`, or `sourcePriority` at the top level by default.

**Why:** Copilot builds source citations directly from whatever fields are
present in the response. If a UUID, `status: "published"`, or an internal
priority number is a top-level field, Copilot tends to quote it verbatim in
the answer, which is meaningless/confusing to end users. This mirrors a
constraint already solved for the Graph externalItem content mapper (its
"Quellenhinweis" content block), which never exposed those fields either.

**How to apply:** These values are still needed for follow-up `GetNode`
calls, conflict resolution, and debugging — don't delete them. Nest them
under a `technical` object instead (`technical.nodeId`,
`technical.sourcePriority`, plus `technical.revision`, `immutableId`,
`confidentiality`, `decisionStatus`, `contentHash` for the node endpoint).
`status` is omitted entirely from the node endpoint response since only
published pages are ever reachable there, so it would always be a constant.
Apply the same split to any new Copilot-facing endpoint or OpenAPI schema
added to the connector.
