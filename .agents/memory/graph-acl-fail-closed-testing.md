---
name: Forcing genuinely unmapped/unauthorized ACLs in e2e tests
description: How to construct a real no_entra_mapping / no_authorized_principals scenario for Graph export ACL fail-closed tests, since normal API-created content always resolves an authorized principal.
---

In this codebase's permission model (`flowcore-permission-resolver.service.ts`,
`confidentiality.service.ts`), a content node's read-access principal set is
built from several always-populated sources:

- `content_nodes.owner_id` (set to the creator on creation)
- `node_ownership` rows (owner/deputy/reviewer/approver)
- `page_permissions` grants
- Confidentiality `allowed_roles` config, which is **global and role-based**,
  not node-scoped — any active holder of an allowed role (e.g. system_admin,
  process_manager, compliance_manager for the "confidential" level) is added
  regardless of that node's actual ownership.

Because of this, simply creating a page via the public API and calling
`/graph-connector/sync/pages/:id` as an admin can never produce a genuine
`no_entra_mapping` or `no_authorized_principals` result — the creating/admin
actor (or another admin with an allowed role) always resolves as both
authorized and Entra-mapped.

**How to apply:** To test these fail-closed paths in e2e, connect directly to
Postgres (via `pg`, using `DATABASE_URL`) as a test fixture step:
1. Null out `content_nodes.owner_id` and delete any `node_ownership` /
   `page_permissions` rows for the node.
2. Query `role_assignments` joined to `confidentiality_access_config` for the
   relevant level's `allowed_roles`, and temporarily set
   `external_provider`/`external_id` on all of those principals to a bogus,
   non-`'entra'` value (restore in a `finally` block).

Only after both steps does `buildRestrictedAcl` see zero resolvable Entra
identities and throw with `no_entra_mapping`/`no_authorized_principals`
(422). Skipping step 2 will silently keep the test green-lit (200) because
some admin/role-holder always slips through.

Also note: `getAclMappingStatus`/`evaluateIndexability` treat a page with
*no* allowed_roles/direct grants at all as "not indexable" and return 404
before the ACL builder even runs — that's a different (also valid) fail-closed
path, not the same as `no_entra_mapping`. If you empty `allowed_roles`
entirely instead of unmapping identities, expect 404, not 422.

Separately: Graph mock-mode success responses
(`graph-schema-registration.service.ts` `pushExternalItem`) must set
`graphResponseCode: 200` even in mock mode — it was easy to forget this on
the mock branch while the real-Graph and fault-injection branches set it,
leaving `graphResponseCode` null in the audit log for otherwise-successful
mock-mode syncs.
