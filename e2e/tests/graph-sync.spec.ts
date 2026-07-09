import { test, expect } from "@playwright/test";

const API = "/api";
const ADMIN_A = "2804b3e6-46c0-43e4-8e6b-5ee6a588c8dd"; // system_admin
const ADMIN_B = "ce73daf3-fd70-4578-8bff-b05535623a73"; // second system_admin (four-eyes approver)
const UNAUTHORIZED = "bdb316ff-13be-4a10-a5f9-a821f81938b5";

const INTERNAL_STANDARD_GROUP_ID = "33333333-3333-4333-8333-333333333333";
const EXECUTIVE_GROUP_ID = "44444444-4444-4444-8444-444444444444";

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

async function seedGroupMapping(
  request: import("@playwright/test").APIRequestContext,
  tier: "internal_standard" | "restricted" | "executive",
  entraGroupId: string,
) {
  const res = await request.put(`${API}/graph-connector/group-mappings/${tier}`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { entraGroupId, label: `Graph Sync E2E ${tier}` },
  });
  expect(res.status()).toBe(200);
}

test.beforeAll(async ({ request }) => {
  await seedGroupMapping(request, "internal_standard", INTERNAL_STANDARD_GROUP_ID);
  await seedGroupMapping(request, "executive", EXECUTIVE_GROUP_ID);
});

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

async function createGlossaryTerm(
  request: import("@playwright/test").APIRequestContext,
  term: string,
) {
  const res = await request.post(`${API}/glossary`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: {
      term,
      definition: `Definition von ${term} für Graph Sync e2e-Tests`,
      synonyms: ["Testsynonym"],
    },
  });
  expect(res.status()).toBe(201);
  return res.json();
}

async function createAndAssignTag(
  request: import("@playwright/test").APIRequestContext,
  nodeId: string,
  name: string,
) {
  const tagRes = await request.post(`${API}/tags`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { name },
  });
  expect(tagRes.status()).toBe(201);
  const tag = await tagRes.json();

  const assignRes = await request.post(`${API}/tags/nodes/${nodeId}`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { tagId: tag.id },
  });
  expect(assignRes.status()).toBe(201);
  return tag;
}

async function waitForQueueDrain(
  request: import("@playwright/test").APIRequestContext,
  maxRounds = 5,
) {
  let lastResult;
  for (let i = 0; i < maxRounds; i++) {
    const res = await request.post(`${API}/graph-connector/sync/delta`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(200);
    lastResult = await res.json();
    const pendingRes = await request.get(`${API}/graph-connector/sync/queue?status=pending`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const { entries } = await pendingRes.json();
    if (entries.length === 0) break;
  }
  return lastResult;
}

test.describe("Cluster 6 - Graph Sync Engine", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ request }) => {
    await setMockMode(request, true);
  });

  test.afterAll(async ({ request }) => {
    await setMockMode(request, false);
  });

  test("full sync pushes multiple published pages successfully with Graph confirmation", async ({
    request,
  }) => {
    const nodeA = await createPublishedBrandPage(request, `C6 Full Sync Page A ${Date.now()}`);
    const nodeB = await createPublishedBrandPage(request, `C6 Full Sync Page B ${Date.now()}`);

    const res = await request.post(`${API}/graph-connector/sync/full`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    expect(res.status()).toBe(200);
    const summary = await res.json();
    expect(summary.dryRun).toBe(false);
    expect(summary.pages.total).toBeGreaterThanOrEqual(2);
    expect(summary.pages.success).toBeGreaterThanOrEqual(2);

    for (const node of [nodeA, nodeB]) {
      const logRes = await request.get(
        `${API}/graph-connector/sync/log?itemId=flowcore_page_${node.immutableId}&limit=5`,
        { headers: { "X-Dev-Principal-Id": ADMIN_A } },
      );
      const { entries } = await logRes.json();
      expect(entries[0].result).toBe("success");
      expect(entries[0].graphResponse).toBeTruthy();
    }
  });

  test("full sync pushes glossary terms successfully with Graph confirmation", async ({
    request,
  }) => {
    const term = await createGlossaryTerm(request, `C6-Glossar-Full-${Date.now()}`);

    const res = await request.post(`${API}/graph-connector/sync/full`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    expect(res.status()).toBe(200);
    const summary = await res.json();
    expect(summary.glossary.total).toBeGreaterThanOrEqual(1);
    expect(summary.glossary.success).toBeGreaterThanOrEqual(1);

    const logRes = await request.get(
      `${API}/graph-connector/sync/log?itemId=flowcore_glossary_${term.id}&limit=5`,
      { headers: { "X-Dev-Principal-Id": ADMIN_A } },
    );
    const { entries } = await logRes.json();
    expect(entries[0].result).toBe("success");
    expect(entries[0].graphResponse).toBeTruthy();
  });

  test("publishing a new revision enqueues and delta-syncs the page with an updated contentHash", async ({
    request,
  }) => {
    const title = `C6 Delta Revision Page ${Date.now()}`;
    const node = await createPublishedBrandPage(request, title);

    // force an initial full sync so a prior success state with a contentHash exists
    await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    const firstLog = await request.get(
      `${API}/graph-connector/sync/log?itemId=flowcore_page_${node.immutableId}&limit=5`,
      { headers: { "X-Dev-Principal-Id": ADMIN_A } },
    );
    const { entries: firstEntries } = await firstLog.json();
    const firstHash = firstEntries[0]?.contentHash;
    expect(firstHash).toBeTruthy();

    // publish a new revision with different content -> should enqueue an upsert
    const wcRes = await request.post(`${API}/content/nodes/${node.id}/working-copies`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const wc = await wcRes.json();
    await publishWorkingCopy(request, wc.id, `${title} - überarbeitet`);

    const queueRes = await request.get(`${API}/graph-connector/sync/queue?status=pending`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const { entries: queued } = await queueRes.json();
    expect(queued.some((q: { nodeId: string; operation: string }) => q.nodeId === node.id && q.operation === "upsert")).toBe(true);

    await waitForQueueDrain(request);

    const secondLog = await request.get(
      `${API}/graph-connector/sync/log?itemId=flowcore_page_${node.immutableId}&limit=5`,
      { headers: { "X-Dev-Principal-Id": ADMIN_A } },
    );
    const { entries: secondEntries } = await secondLog.json();
    expect(secondEntries[0].result).toBe("success");
    expect(secondEntries[0].contentHash).not.toBe(firstHash);
  });

  test("changing agent metadata (tags) enqueues a delta upsert for the page", async ({
    request,
  }) => {
    const title = `C6 Delta Metadata Page ${Date.now()}`;
    const node = await createPublishedBrandPage(request, title);
    await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });

    await createAndAssignTag(request, node.id, `graph-sync-e2e-${Date.now()}`);

    const queueRes = await request.get(`${API}/graph-connector/sync/queue?status=pending`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const { entries: queued } = await queueRes.json();
    expect(
      queued.some((q: { nodeId: string; operation: string }) => q.nodeId === node.id && q.operation === "upsert"),
    ).toBe(true);

    await waitForQueueDrain(request);
  });

  test("granting/revoking rights on a confidential level enqueues and delta-syncs an ACL update", async ({
    request,
  }) => {
    const node = await createPublishedBrandPage(request, `C6 ACL Update Page ${Date.now()}`, {
      confidentiality: "confidential",
    });
    await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });

    const assignRes = await request.post(`${API}/confidentiality-config/assign`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { level: "confidential", principalId: UNAUTHORIZED },
    });
    expect(assignRes.status()).toBe(200);

    try {
      const queueRes = await request.get(`${API}/graph-connector/sync/queue?status=pending`, {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
      });
      const { entries: queued } = await queueRes.json();
      expect(
        queued.some((q: { nodeId: string; operation: string }) => q.nodeId === node.id && q.operation === "upsert"),
      ).toBe(true);

      await waitForQueueDrain(request);

      const previewRes = await request.get(`${API}/graph-connector/acl-preview/${node.id}`, {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
      });
      const preview = await previewRes.json();
      const values = preview.acl.map((e: { value: string }) => e.value);
      expect(values).toContain("2ceca2f9-5a84-48b7-a970-063c2adfdc55"); // UNAUTHORIZED_ENTRA_ID now granted

      const logRes = await request.get(
        `${API}/graph-connector/sync/log?itemId=flowcore_page_${node.immutableId}&limit=5`,
        { headers: { "X-Dev-Principal-Id": ADMIN_A } },
      );
      const { entries } = await logRes.json();
      expect(entries[0].result).toBe("success");
    } finally {
      await request.delete(`${API}/confidentiality-config/assign`, {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
        data: { level: "confidential", principalId: UNAUTHORIZED },
      });
    }
  });

  test("deleting a page enqueues and confirms a Graph deindex", async ({ request }) => {
    const node = await createPublishedBrandPage(request, `C6 Delete Deindex Page ${Date.now()}`);
    const syncRes = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    expect((await syncRes.json()).status).toBe("success");

    const deleteRes = await request.delete(`${API}/content/nodes/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(deleteRes.status()).toBeLessThan(300);

    const queueRes = await request.get(`${API}/graph-connector/sync/queue?status=pending`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const { entries: queued } = await queueRes.json();
    expect(
      queued.some((q: { nodeId: string; operation: string }) => q.nodeId === node.id && q.operation === "delete"),
    ).toBe(true);

    await waitForQueueDrain(request);

    const logRes = await request.get(
      `${API}/graph-connector/sync/log?itemId=flowcore_page_${node.immutableId}&limit=5`,
      { headers: { "X-Dev-Principal-Id": ADMIN_A } },
    );
    const { entries } = await logRes.json();
    expect(entries[0].operation).toBe("delete");
    expect(entries[0].result).toBe("success");
  });

  test("turning agent_enabled off deindexes a previously-synced page via full sync reconciliation", async ({
    request,
  }) => {
    const title = `C6 Deindex AgentDisabled Page ${Date.now()}`;
    const { node, workingCopyId } = await createNodeWithWorkingCopy(request, title);
    await request.patch(`${API}/content/working-copies/${workingCopyId}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { structuredFields: VALID_AGENT_METADATA },
    });
    await publishWorkingCopy(request, workingCopyId, title);

    const syncRes = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    expect((await syncRes.json()).status).toBe("success");

    const wcRes = await request.post(`${API}/content/nodes/${node.id}/working-copies`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const wc = await wcRes.json();
    await request.patch(`${API}/content/working-copies/${wc.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { structuredFields: { ...VALID_AGENT_METADATA, agent_enabled: false } },
    });
    await publishWorkingCopy(request, wc.id, title);

    const fullRes = await request.post(`${API}/graph-connector/sync/full`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    expect(fullRes.status()).toBe(200);
    const summary = await fullRes.json();
    expect(summary.deindexed).toBeGreaterThanOrEqual(1);

    const logRes = await request.get(
      `${API}/graph-connector/sync/log?itemId=flowcore_page_${node.immutableId}&limit=5`,
      { headers: { "X-Dev-Principal-Id": ADMIN_A } },
    );
    const { entries } = await logRes.json();
    expect(entries[0].operation).toBe("delete");
    expect(entries[0].result).toBe("success");
  });

  test("a Graph error (no live connection configured) is recorded as a visible failure, not a silent success", async ({
    request,
  }) => {
    await setMockMode(request, false);
    try {
      const node = await createPublishedBrandPage(request, `C6 Graph Error Page ${Date.now()}`);
      const res = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
        data: { dryRun: false },
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
      const body = await res.json();
      expect(body.error).toBeTruthy();

      const logRes = await request.get(
        `${API}/graph-connector/sync/log?itemId=flowcore_page_${node.immutableId}&limit=5`,
        { headers: { "X-Dev-Principal-Id": ADMIN_A } },
      );
      const { entries } = await logRes.json();
      expect(entries[0].result).toBe("failed");
      expect(entries[0].reason).toBeTruthy();
    } finally {
      await setMockMode(request, true);
    }
  });

  test("a queue job exhausts its retry limit and is marked terminally failed", async ({
    request,
  }) => {
    test.setTimeout(60_000);
    await setMockMode(request, false);
    try {
      const node = await createPublishedBrandPage(request, `C6 Retry Limit Page ${Date.now()}`);

      await createAndAssignTag(request, node.id, `graph-sync-retry-e2e-${Date.now()}`);

      let queueEntry;
      for (let attempt = 0; attempt < 4; attempt++) {
        const deltaRes = await request.post(`${API}/graph-connector/sync/delta`, {
          headers: { "X-Dev-Principal-Id": ADMIN_A },
        });
        expect(deltaRes.status()).toBe(200);

        const queueRes = await request.get(`${API}/graph-connector/sync/queue`, {
          headers: { "X-Dev-Principal-Id": ADMIN_A },
        });
        const { entries } = await queueRes.json();
        queueEntry = entries.find((q: { nodeId: string }) => q.nodeId === node.id);
        if (queueEntry?.status === "failed") break;
        await new Promise((resolve) => setTimeout(resolve, 6000 * (attempt + 1)));
      }

      expect(queueEntry).toBeTruthy();
      expect(queueEntry.status).toBe("failed");
      expect(queueEntry.attempts).toBeGreaterThanOrEqual(queueEntry.maxAttempts);
      expect(queueEntry.lastError).toBeTruthy();
    } finally {
      await setMockMode(request, true);
    }
  });
});
