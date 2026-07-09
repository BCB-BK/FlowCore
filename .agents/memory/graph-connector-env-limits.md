---
name: No real Microsoft Graph tenant in this workspace environment
description: This dev environment has no configured GRAPH_EXTERNAL_CONNECTION_ID and no Copilot Studio/tenant access; how to still verify the sync pipeline technically.
---

`GRAPH_EXTERNAL_CONNECTION_ID` is not set in this environment, and there is
no way to reach an actual Microsoft 365 tenant, Entra admin center, or
Copilot Studio UI from here. Any acceptance work that requires "confirm the
agent answers using FlowCore knowledge in Copilot Studio" cannot be executed
directly — it must be documented as an external blocker for a human with
tenant access to complete.

**How to apply:** To still verify the FlowCore-side pipeline (schema
registration, ACL building, sync log completeness) end-to-end without a real
tenant, temporarily flip the dev-only `system_settings` row
`graph_sync_mock_mode` to `'true'` (only takes effect outside production —
see `system-settings.service.ts` `isGraphSyncMockMode`). This makes
`pushExternalItem`/`deleteExternalItem` skip the real Graph HTTP call but
still exercise indexability checks, ACL resolution, and full audit logging
(`graph_sync_log` with `result`, `graph_response_code`, `acl_hash`, etc).
**Always reset the setting back to `'false'` afterward** to restore the
default fail-closed state — don't leave mock mode enabled.

Things that remain genuinely unverifiable from this environment even with
mock mode: Microsoft Search indexing latency/results, and whether the
Enterprise Data Connector source is visible/selectable inside Copilot
Studio (tenant/license/admin-side concern, not something the Graph API
exposes for querying).
