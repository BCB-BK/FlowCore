---
name: Confidentiality access model — role-based vs per-principal grants
description: How allowed_roles config interacts with explicit per-principal confidentiality grants; relevant when writing tests or reasoning about who has access to a confidential/restricted item.
---

Access to a confidentiality level is the union of two independent mechanisms:

1. **Role-based**: `confidentiality_access_config.allowed_roles` per level (e.g. confidential
   defaults to `system_admin`, `process_manager`, `compliance_manager`). Any principal holding
   one of these global roles gets access automatically, with no explicit grant needed.
2. **Per-principal grants**: explicit assignment/removal via the confidentiality assign/unassign
   endpoints, layered on top of (1).

**Why this matters:** a principal can appear to "still have access after revocation" not
because revocation is broken, but because they independently qualify via an allowed_role
(e.g. a principal seeded with `process_manager` will always have confidential access,
regardless of per-principal assign/unassign calls).

**How to apply:** when writing tests (or debugging) for "no access" / "access revoked"
scenarios at a given confidentiality level, pick a test principal whose *global roles* are
disjoint from that level's `allowed_roles` — check `confidentiality_access_config` in the DB
first. Otherwise the test will spuriously see access that has nothing to do with the
mechanism under test.
