---
name: CORS must be scoped per-route when mixing cookie auth and API-key auth
description: Strict single-origin CORS for CSRF protection can silently break unrelated API-key-authenticated routes meant for external callers (e.g. Power Platform connectors).
---

A single strict CORS allowlist (needed to protect cookie/session-based routes from CSRF) will also block API-key-authenticated routes that legitimate external callers (Power Apps, Copilot Studio, other tenants) must reach from arbitrary origins.

**Why:** API-key auth doesn't rely on cookies, so it isn't vulnerable to the CSRF pattern strict-origin CORS defends against — but a blanket CORS policy applied ahead of routing doesn't know that, and rejects those calls too. The resulting 403 can also get mishandled by a generic error handler and turned into a 500, obscuring the real cause.

**How to apply:** Split CORS by path prefix — an open policy (`Access-Control-Allow-Origin: *`, no credentials) for public discovery + API-key-authenticated endpoints, and the strict origin-lock for cookie-authenticated endpoints. Also make sure the error handler preserves `.status` on plain errors instead of defaulting non-`AppError` throws to 500.
