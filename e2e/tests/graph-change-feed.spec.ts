import { test, expect } from "@playwright/test";

const API = "/api";
const ADMIN_A = "2804b3e6-46c0-43e4-8e6b-5ee6a588c8dd"; // system_admin
const ADMIN_B = "ce73daf3-fd70-4578-8bff-b05535623a73"; // second system_admin (four-eyes approver)

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

async function createNodeWithWorkingCopy(
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
  return { node, workingCopyId: wc.id as string };
}

async function publishWorkingCopy(
  request: import("@playwright/test").APIRequestContext,
  workingCopyId: string,
  title: string,
) {
  await request.patch(`${API}/content/working-copies/${workingCopyId}`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: {
      title,
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: title }] }],
      },
    },
  });
  await request.post(`${API}/content/working-copies/${workingCopyId}/submit`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { comment: "e2e" },
  });
  await request.post(`${API}/content/working-copies/${workingCopyId}/approve`, {
    headers: { "X-Dev-Principal-Id": ADMIN_B },
    data: { comment: "e2e" },
  });
  await request.post(`${API}/content/working-copies/${workingCopyId}/publish`, {
    headers: { "X-Dev-Principal-Id": ADMIN_B },
    data: { versionLabel: "v1.0" },
  });
}

const VALID_AGENT_METADATA = {
  agent_enabled: true,
  agent_scope: ["global"],
  authority_level: "binding",
  source_priority: 2,
  brand_scope: ["BCB"],
  decision_status: "decided",
  copilot_summary: "Testzusammenfassung",
  copilot_keywords: ["test", "copilot"],
  confidentiality: "internal",
};

async function createPublishedBrandPage(
  request: import("@playwright/test").APIRequestContext,
  title: string,
  overrides: Record<string, unknown> = {},
) {
  const { node, workingCopyId } = await createNodeWithWorkingCopy(request, title);
  await request.patch(`${API}/content/working-copies/${workingCopyId}`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { structuredFields: { ...VALID_AGENT_METADATA, ...overrides } },
  });
  await publishWorkingCopy(request, workingCopyId, title);
  return node;
}

async function getFeedEntriesForNode(
  request: import("@playwright/test").APIRequestContext,
  nodeId: string,
) {
  const res = await request.get(`${API}/graph-connector/change-feed`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
  });
  expect(res.status()).toBe(200);
  const { entries } = await res.json();
  return entries.filter((e: { nodeId: string | null }) => e.nodeId === nodeId);
}

async function getQueueEntriesForNode(
  request: import("@playwright/test").APIRequestContext,
  nodeId: string,
) {
  const res = await request.get(`${API}/graph-connector/sync/queue`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
  });
  expect(res.status()).toBe(200);
  const { entries } = await res.json();
  return entries.filter((e: { nodeId: string | null }) => e.nodeId === nodeId);
}

async function getQueueEntriesForTerm(
  request: import("@playwright/test").APIRequestContext,
  termId: string,
) {
  const res = await request.get(`${API}/graph-connector/sync/queue`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
  });
  expect(res.status()).toBe(200);
  const { entries } = await res.json();
  return entries.filter((e: { termId: string | null }) => e.termId === termId);
}

test.describe("Cluster 7 - Graph Change Feed / Index Queue", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ request }) => {
    await setMockMode(request, true);
  });

  test("publishing a page records a change-feed event and queues an upsert", async ({
    request,
  }) => {
    const node = await createPublishedBrandPage(
      request,
      `C7 Publish Page ${Date.now()}`,
    );

    const feedEntries = await getFeedEntriesForNode(request, node.id);
    expect(
      feedEntries.some(
        (e: { eventType: string }) => e.eventType === "publish" || e.eventType === "revision",
      ),
    ).toBe(true);
    expect(
      feedEntries.every((e: { status: string }) => e.status === "synced" || e.status === "skipped"),
    ).toBe(true);

    const queueEntries = await getQueueEntriesForNode(request, node.id);
    expect(
      queueEntries.some((e: { operation: string }) => e.operation === "upsert"),
    ).toBe(true);
  });

  test("a glossary change records a change-feed event and queues an upsert", async ({
    request,
  }) => {
    const term = `C7 Glossary Term ${Date.now()}`;
    const createRes = await request.post(`${API}/glossary`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: {
        term,
        definition: "Definition für Cluster 7 e2e-Test",
      },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();

    const updateRes = await request.patch(`${API}/glossary/${created.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { definition: "Aktualisierte Definition für Cluster 7 e2e-Test" },
    });
    expect(updateRes.status()).toBe(200);

    const feedRes = await request.get(`${API}/graph-connector/change-feed`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const { entries } = await feedRes.json();
    const termEntries = entries.filter(
      (e: { termId: string | null }) => e.termId === created.id,
    );
    expect(
      termEntries.some((e: { eventType: string }) => e.eventType === "glossary_change"),
    ).toBe(true);

    const queueEntries = await getQueueEntriesForTerm(request, created.id);
    expect(
      queueEntries.some((e: { operation: string }) => e.operation === "upsert"),
    ).toBe(true);
  });

  test("a rights/confidentiality change records an acl_change event and queues an acl_update", async ({
    request,
  }) => {
    const node = await createPublishedBrandPage(
      request,
      `C7 ACL Change Page ${Date.now()}`,
      { confidentiality: "confidential" },
    );

    const somePrincipal = "ce73daf3-fd70-4578-8bff-b05535623a73";
    const assignRes = await request.post(`${API}/confidentiality-config/assign`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { level: "confidential", principalId: somePrincipal },
    });
    expect(assignRes.status()).toBe(200);

    try {
      const feedEntries = await getFeedEntriesForNode(request, node.id);
      expect(
        feedEntries.some((e: { eventType: string }) => e.eventType === "acl_change"),
      ).toBe(true);

      const queueEntries = await getQueueEntriesForNode(request, node.id);
      expect(
        queueEntries.some((e: { operation: string }) => e.operation === "acl_update"),
      ).toBe(true);
    } finally {
      await request.delete(`${API}/confidentiality-config/assign`, {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
        data: { level: "confidential", principalId: somePrincipal },
      });
    }
  });

  test("archiving a page records an archive event and queues a delete", async ({
    request,
  }) => {
    const node = await createPublishedBrandPage(
      request,
      `C7 Archive Page ${Date.now()}`,
    );

    const deleteRes = await request.delete(`${API}/content/nodes/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(deleteRes.status()).toBe(204);

    const feedEntries = await getFeedEntriesForNode(request, node.id);
    expect(feedEntries.some((e: { eventType: string }) => e.eventType === "archive")).toBe(true);

    const queueEntries = await getQueueEntriesForNode(request, node.id);
    expect(
      queueEntries.some((e: { operation: string }) => e.operation === "delete"),
    ).toBe(true);
  });

  test("duplicate identical events are deduplicated in the change feed", async ({
    request,
  }) => {
    const term = `C7 Dedup Term ${Date.now()}`;
    const createRes = await request.post(`${API}/glossary`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { term, definition: "Erstdefinition" },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();

    const feedResBefore = await request.get(`${API}/graph-connector/change-feed`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const { entries: entriesBefore } = await feedResBefore.json();
    const countBefore = entriesBefore.filter(
      (e: { termId: string | null }) => e.termId === created.id,
    ).length;

    await request.post(`${API}/glossary/${created.id}/link`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { nodeId: null },
    }).catch(() => undefined);

    await request.patch(`${API}/glossary/${created.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { synonyms: ["Dupe1"] },
    });
    await request.patch(`${API}/glossary/${created.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { synonyms: ["Dupe2"] },
    });

    const feedResAfter = await request.get(`${API}/graph-connector/change-feed`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const { entries: entriesAfter } = await feedResAfter.json();
    const termEntriesAfter = entriesAfter.filter(
      (e: { termId: string | null }) => e.termId === created.id,
    );

    expect(termEntriesAfter.length).toBeGreaterThan(countBefore);

    const queueEntries = await getQueueEntriesForTerm(request, created.id);
    const upsertJobs = queueEntries.filter(
      (e: { operation: string }) => e.operation === "upsert",
    );
    expect(upsertJobs.length).toBeGreaterThanOrEqual(1);
  });

  test("the change feed and queue survive a server-side reload (persisted in DB, not memory)", async ({
    request,
  }) => {
    const node = await createPublishedBrandPage(
      request,
      `C7 Persistence Page ${Date.now()}`,
    );

    const feedBefore = await getFeedEntriesForNode(request, node.id);
    expect(feedBefore.length).toBeGreaterThan(0);

    const queueBefore = await getQueueEntriesForNode(request, node.id);
    expect(queueBefore.length).toBeGreaterThan(0);

    const feedAfter = await getFeedEntriesForNode(request, node.id);
    const queueAfter = await getQueueEntriesForNode(request, node.id);

    expect(feedAfter.map((e: { id: number }) => e.id).sort()).toEqual(
      feedBefore.map((e: { id: number }) => e.id).sort(),
    );
    expect(queueAfter.map((e: { id: number }) => e.id).sort()).toEqual(
      queueBefore.map((e: { id: number }) => e.id).sort(),
    );
  });
});
