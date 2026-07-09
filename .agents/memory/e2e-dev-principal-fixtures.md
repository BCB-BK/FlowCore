---
name: E2E tests need real DB principal IDs, not hardcoded dev-seed UUIDs
description: auth-rbac.spec.ts hardcodes dev-seed principal IDs (e.g. 00000000-0000-0000-0000-000000000001) that can drift out of sync with the actual seeded/migrated database, causing 401s unrelated to the feature under test.
---

When writing new Playwright e2e specs against the api-server (`e2e/tests/*.spec.ts`), don't reuse the hardcoded UUID constants from `auth-rbac.spec.ts` (e.g. `ADMIN_ID = "00000000-0000-0000-0000-000000000001"`) without checking they still exist.

**Why:** Those constants assume a fixed dev-user seed. In this project the DB has since been repopulated with real named principals (e.g. Jan Philipp Feldten, Steffen Lüdcke) and the original placeholder UUIDs no longer resolve to any row in `principals`, so `X-Dev-Principal-Id` auth returns 401 for them. This is a pre-existing data-drift issue, not a code regression — don't assume your change broke auth-rbac.spec.ts just because it fails.

**How to apply:** Before writing a new e2e spec, query `principals` (or reuse IDs already verified via curl/psql in the current session) to get real, currently-valid principal IDs and role assignments, rather than trusting older spec files' hardcoded constants. When two distinct actors are needed (e.g. four-eyes approve/publish flows requiring different submitter/approver), pick two different real system_admin principals.
