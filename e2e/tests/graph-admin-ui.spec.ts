import { test, expect } from "@playwright/test";

const API = "/api";
const ADMIN_A = "2804b3e6-46c0-43e4-8e6b-5ee6a588c8dd"; // system_admin
const ADMIN_B = "ce73daf3-fd70-4578-8bff-b05535623a73"; // system_admin (four-eyes approver)
const VIEWER_ONLY = "bdb316ff-13be-4a10-a5f9-a821f81938b5"; // BildungsCampus - Übergreifend (viewer only)

async function setMockMode(
  request: import("@playwright/test").APIRequestContext,
  enabled: boolean,
) {
  const res = await request.put(`${API}/admin/system-settings/graph_sync_mock_mode`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { value: enabled ? "true" : "false" },
  });
  expect(res.status()).toBe(200);
}

async function createPublishedPage(
  request: import("@playwright/test").APIRequestContext,
  title: string,
) {
  const createRes = await request.post(`${API}/content/nodes`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { title, templateType: "policy" },
  });
  expect(createRes.status()).toBe(201);
  const node = await createRes.json();

  const wcRes = await request.post(`${API}/content/nodes/${node.id}/working-copies`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
  });
  const wc = await wcRes.json();

  await request.patch(`${API}/content/working-copies/${wc.id}`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: {
      title,
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: title }] }],
      },
      structuredFields: {
        agent_enabled: true,
        agent_scope: ["global"],
        authority_level: "binding",
        source_priority: 2,
        brand_scope: ["BCB"],
        decision_status: "decided",
        copilot_summary: "Testzusammenfassung",
        copilot_keywords: ["test"],
        confidentiality: "internal",
      },
    },
  });
  await request.post(`${API}/content/working-copies/${wc.id}/submit`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { comment: "e2e" },
  });
  await request.post(`${API}/content/working-copies/${wc.id}/approve`, {
    headers: { "X-Dev-Principal-Id": ADMIN_B },
    data: { comment: "e2e" },
  });
  await request.post(`${API}/content/working-copies/${wc.id}/publish`, {
    headers: { "X-Dev-Principal-Id": ADMIN_B },
    data: { versionLabel: "v1.0" },
  });
  return node;
}

test.describe("Cluster 8 - Admin UI für Copilot Studio / Microsoft Graph Connector", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ request }) => {
    await setMockMode(request, true);
  });

  test("only system_admin can access the Graph connector admin endpoints", async ({ request }) => {
    const forbidden = await request.get(`${API}/graph-connector/connection`, {
      headers: { "X-Dev-Principal-Id": VIEWER_ONLY },
    });
    expect(forbidden.status()).toBe(403);

    const allowed = await request.get(`${API}/graph-connector/connection`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(allowed.status()).toBe(200);
  });

  test("test-connection reports status without syncing any content", async ({ request }) => {
    const logBefore = await request.get(`${API}/graph-connector/sync/log?limit=5`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const { entries: entriesBefore } = await logBefore.json();

    const res = await request.post(`${API}/graph-connector/test-connection`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.success).toBe("boolean");
    expect(typeof body.message).toBe("string");
    expect(body).toHaveProperty("tokenAcquired");
    expect(body).toHaveProperty("connectionExists");

    const logAfter = await request.get(`${API}/graph-connector/sync/log?limit=5`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const { entries: entriesAfter } = await logAfter.json();
    expect(entriesAfter.length).toBe(entriesBefore.length);
  });

  test("readiness check returns an aggregated status with individual checks", async ({ request }) => {
    const res = await request.get(`${API}/graph-connector/readiness-check`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(["ready", "not_ready", "partial"]).toContain(body.overall);
    expect(Array.isArray(body.checks)).toBe(true);
    expect(body.checks.length).toBeGreaterThan(0);
    for (const check of body.checks) {
      expect(["ok", "warning", "failed", "not_checkable"]).toContain(check.status);
      expect(typeof check.message).toBe("string");
    }
    const notCheckable = body.checks.filter(
      (c: { status: string }) => c.status === "not_checkable",
    );
    expect(notCheckable.length).toBeGreaterThan(0);
  });

  test("a dry-run schema registration does not persist the schema-registered timestamp", async ({ request }) => {
    const beforeRes = await request.get(`${API}/graph-connector/readiness-check`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const before = await beforeRes.json();
    const schemaBefore = before.checks.find((c: { key: string }) => c.key === "schema");

    const dryRunRes = await request.post(`${API}/graph-connector/schema/register`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: true },
    });
    expect(dryRunRes.status()).toBe(200);

    const afterRes = await request.get(`${API}/graph-connector/readiness-check`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const after = await afterRes.json();
    const schemaAfter = after.checks.find((c: { key: string }) => c.key === "schema");

    expect(schemaAfter.message).toBe(schemaBefore.message);
  });

  test("registering the schema (non-dry-run) without a configured connection ID fails with an actionable message, not a silent no-op", async ({ request }) => {
    const registerRes = await request.post(`${API}/graph-connector/schema/register`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    // In this environment GRAPH_EXTERNAL_CONNECTION_ID is not configured, so a
    // real (non-dry-run) registration against Microsoft Graph cannot succeed.
    // The admin must get a clear, actionable error rather than a fake success.
    expect(registerRes.status()).toBe(400);
    const body = await registerRes.json();
    expect(body.error).toContain("GRAPH_EXTERNAL_CONNECTION_ID");
  });

  test("dry-run full sync does not write to graph_sync_state, real sync does", async ({ request }) => {
    const node = await createPublishedPage(request, `C8 Admin UI Sync Page ${Date.now()}`);

    const statusBefore = await request.get(`${API}/graph-connector/index-status/pages`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const { entries: pagesBefore } = await statusBefore.json();
    const entryBefore = pagesBefore.find((p: { nodeId: string }) => p.nodeId === node.id);
    expect(entryBefore).toBeTruthy();
    expect(entryBefore.indexStatus).toBe("not_indexed");

    const dryRunRes = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: true },
    });
    expect(dryRunRes.status()).toBe(200);
    const dryRunBody = await dryRunRes.json();
    expect(dryRunBody.dryRun).toBe(true);

    const statusAfterDryRun = await request.get(`${API}/graph-connector/index-status/pages`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const { entries: pagesAfterDryRun } = await statusAfterDryRun.json();
    const entryAfterDryRun = pagesAfterDryRun.find((p: { nodeId: string }) => p.nodeId === node.id);
    expect(entryAfterDryRun.indexStatus).toBe("not_indexed");

    const liveRes = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    expect(liveRes.status()).toBe(200);

    const statusAfterLive = await request.get(`${API}/graph-connector/index-status/pages`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const { entries: pagesAfterLive } = await statusAfterLive.json();
    const entryAfterLive = pagesAfterLive.find((p: { nodeId: string }) => p.nodeId === node.id);
    expect(entryAfterLive.indexStatus).toBe("synced");
    expect(entryAfterLive.lastSyncedAt).toBeTruthy();
  });

  test("the ACL/payload preview for a page returns access control entries without writing anything", async ({ request }) => {
    const node = await createPublishedPage(request, `C8 ACL Preview Page ${Date.now()}`);

    const res = await request.get(`${API}/graph-connector/acl-preview/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeTruthy();
  });

  test("the sync log can be exported as CSV with the expected columns", async ({ request }) => {
    const res = await request.get(`${API}/graph-connector/sync/log/export?limit=10`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    const body = await res.text();
    const firstLine = body.split("\n")[0];
    expect(firstLine).toBe(
      "id,itemId,itemType,nodeId,operation,result,reason,contentHash,dryRun,attempt,createdAt",
    );
  });

  test("glossary index status reflects synchronization state", async ({ request }) => {
    const term = `C8 Admin UI Glossary Term ${Date.now()}`;
    const createRes = await request.post(`${API}/glossary`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { term, definition: "Definition für Cluster 8 e2e-Test" },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();

    const statusBefore = await request.get(`${API}/graph-connector/index-status/glossary`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const { entries: glossaryBefore } = await statusBefore.json();
    const entryBefore = glossaryBefore.find((g: { termId: string }) => g.termId === created.id);
    expect(entryBefore).toBeTruthy();
    expect(entryBefore.indexStatus).toBe("not_indexed");

    const syncRes = await request.post(`${API}/graph-connector/sync/glossary/${created.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    expect(syncRes.status()).toBe(200);

    const statusAfter = await request.get(`${API}/graph-connector/index-status/glossary`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const { entries: glossaryAfter } = await statusAfter.json();
    const entryAfter = glossaryAfter.find((g: { termId: string }) => g.termId === created.id);
    expect(entryAfter.indexStatus).toBe("synced");
  });
});
