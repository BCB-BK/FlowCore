---
name: Working-copy PATCH error mapping
description: Route-level mapServiceError in working-copies.ts must recognize new service error message patterns or they default to 500.
---

`routes/working-copies.ts`'s `mapServiceError` converts service-thrown `Error`s into HTTP status codes by matching substrings in the error message (German text like "nicht gefunden", "bereits", "nicht erfüllt"). Any new validation error thrown from `working-copy.service.ts` (e.g. field-level validation like `validateAgentMetadataPatch`) needs its message pattern added here, or it falls through to the generic `return err` branch and surfaces as an uncaught 500 instead of a 400.

**Why:** Discovered when agent-metadata validation errors (message starting with "Ungültiger ..." / "... muss ein ...") returned 500 instead of 400 until the patterns were added to `mapServiceError`.

**How to apply:** When adding a new throw-on-invalid-input path inside `working-copy.service.ts`, always cross-check `mapServiceError` in `routes/working-copies.ts` and add a matching substring/prefix check mapped to 400.
