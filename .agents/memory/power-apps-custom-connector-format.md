---
name: Power Apps Custom Connector import format
description: The OpenAPI document format required to successfully import a Custom Connector into Power Apps / Power Automate / Copilot Studio.
---

Power Apps and Power Automate's Custom Connector import wizard only accepts
**OpenAPI 2.0 (Swagger)** definitions, not OpenAPI 3.x. Source: Microsoft
Learn, "Create a custom connector from an OpenAPI definition" — "The OpenAPI
definition needs to be in OpenAPI 2.0 format."

**Why:** If a backend already exposes a modern OpenAPI 3.0/3.1 document
(common default for most spec generators), importing that file into the
Custom Connector wizard will fail or be silently misinterpreted. This is easy
to miss because 3.0 "looks" like the more current/correct choice.

**How to apply:** When building a Custom Connector surface for Power
Platform / Copilot Studio, serve a dedicated Swagger 2.0 document (distinct
top-level shape: `swagger: "2.0"`, `host`/`basePath`/`schemes` instead of
`servers`, `securityDefinitions` instead of `components.securitySchemes`,
inline `schema` on body/response instead of `$ref`-based `content` blocks).
If a 3.0 document already exists for other consumers (human-readable docs,
other tooling), keep both and clearly label which one is for the Power Apps
import.

Separately, the left-nav location for "Custom Connectors" inside
make.powerapps.com has moved around across Microsoft UI revisions (as of
mid-2026 it's under Data → Custom Connectors, or under a "More" overflow
menu) — don't assume a fixed screenshot/navigation path stays valid; verify
against current Microsoft Learn docs or ask the user to screenshot their
actual UI when guiding them through it live.
