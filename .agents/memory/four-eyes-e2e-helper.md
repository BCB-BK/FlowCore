---
name: Four-eyes review/publish in e2e helpers
description: Reusable createPublishedPage-style e2e helpers must use two distinct principals for submit vs approve/publish.
---

Any e2e/test helper that programmatically drives a content node through submit → approve → publish must use a *different* principal for approve/publish than the one used for submit.

**Why:** The backend enforces a four-eyes (Vier-Augen-Prinzip) separation-of-duties rule: the same principal cannot submit and then approve/publish their own working copy. Using one admin ID for the whole flow causes approve/publish to fail with 403 (`sodRule: four_eyes_review` / `four_eyes_publish`), which can cascade into confusing downstream failures (e.g. a sync endpoint returning 404 "not published" because publish silently failed).

**How to apply:** When writing a helper that creates a published page/node for test setup, use two known-good admin/approver principal IDs (see `e2e-dev-principal-fixtures.md` for how to find valid ones) — one for create/submit, a different one for approve/publish.
