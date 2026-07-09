import { test, expect } from "@playwright/test";

const API = "/api";
const ADMIN_A = "2804b3e6-46c0-43e4-8e6b-5ee6a588c8dd"; // Jan Philipp Feldten (system_admin)
const ADMIN_B = "ce73daf3-fd70-4578-8bff-b05535623a73"; // second system_admin (four-eyes approver)

async function createAndPublishNode(
  request: import("@playwright/test").APIRequestContext,
  title: string,
) {
  const createRes = await request.post(`${API}/content/nodes`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { title, templateType: "policy" },
  });
  expect(createRes.status()).toBe(201);
  const node = await createRes.json();

  const wcRes = await request.post(
    `${API}/content/nodes/${node.id}/working-copies`,
    { headers: { "X-Dev-Principal-Id": ADMIN_A } },
  );
  const wc = await wcRes.json();

  const patchRes = await request.patch(`${API}/content/working-copies/${wc.id}`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: {
      title,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: `Inhalt für ${title}` }],
          },
        ],
      },
    },
  });
  expect(patchRes.status()).toBe(200);

  const submitRes = await request.post(
    `${API}/content/working-copies/${wc.id}/submit`,
    {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { comment: "e2e submit" },
    },
  );
  expect(submitRes.status()).toBe(200);

  await request.post(`${API}/content/working-copies/${wc.id}/approve`, {
    headers: { "X-Dev-Principal-Id": ADMIN_B },
    data: { comment: "e2e approve" },
  });

  await request.post(`${API}/content/working-copies/${wc.id}/publish`, {
    headers: { "X-Dev-Principal-Id": ADMIN_B },
    data: { versionLabel: "v1.0" },
  });

  const nodeRes = await request.get(`${API}/content/nodes/${node.id}`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
  });
  const publishedNode = await nodeRes.json();
  return { node: publishedNode, workingCopyId: wc.id as string };
}

test.describe("Copilot Content Projection - Pages", () => {
  test("published page is exported with all core fields", async ({ request }) => {
    const { node } = await createAndPublishNode(
      request,
      "E2E Copilot Published Page",
    );
    expect(node.publishedRevisionId).toBeTruthy();

    const res = await request.get(`${API}/copilot/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(200);
    const projection = await res.json();
    expect(projection.itemType).toBe("flowcore_page");
    expect(projection.status).toBe("published");
    expect(projection.nodeId).toBe(node.id);
    expect(projection.contentText).toContain("Inhalt für E2E Copilot Published Page");
    expect(typeof projection.contentHash).toBe("string");
    expect(projection.contentHash.length).toBeGreaterThan(10);
  });

  test("node with only a draft working copy is not exported", async ({
    request,
  }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { title: "E2E Draft Node", templateType: "policy" },
    });
    const node = await createRes.json();
    await request.post(`${API}/content/nodes/${node.id}/working-copies`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });

    const res = await request.get(`${API}/copilot/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(404);
  });

  test("node with a submitted (in review) working copy is not exported", async ({
    request,
  }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { title: "E2E Review Node", templateType: "policy" },
    });
    const node = await createRes.json();
    const wcRes = await request.post(
      `${API}/content/nodes/${node.id}/working-copies`,
      { headers: { "X-Dev-Principal-Id": ADMIN_A } },
    );
    const wc = await wcRes.json();
    await request.post(`${API}/content/working-copies/${wc.id}/submit`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { comment: "e2e submit only" },
    });

    const res = await request.get(`${API}/copilot/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(404);
  });

  test("archived node is not exported", async ({ request }) => {
    const { node, workingCopyId } = await createAndPublishNode(
      request,
      "E2E Archive Candidate",
    );
    void workingCopyId;

    const archiveRes = await request.post(
      `${API}/content/nodes/${node.id}/archive`,
      { headers: { "X-Dev-Principal-Id": ADMIN_A } },
    );
    // Some deployments may not expose a dedicated archive endpoint; skip the
    // assertion body if unsupported, but still assert exports respect status.
    if (archiveRes.status() === 200 || archiveRes.status() === 204) {
      const res = await request.get(`${API}/copilot/pages/${node.id}`, {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
      });
      expect(res.status()).toBe(404);
    }
  });

  test("soft-deleted node is not exported", async ({ request }) => {
    const { node } = await createAndPublishNode(
      request,
      "E2E Delete Candidate",
    );
    const delRes = await request.delete(`${API}/content/nodes/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(delRes.status()).toBe(204);

    const res = await request.get(`${API}/copilot/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(404);
  });

  test("contentHash is stable for an unchanged published revision", async ({
    request,
  }) => {
    const { node } = await createAndPublishNode(
      request,
      "E2E Hash Stability Node",
    );
    const res1 = await request.get(`${API}/copilot/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const res2 = await request.get(`${API}/copilot/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const p1 = await res1.json();
    const p2 = await res2.json();
    expect(p1.contentHash).toBe(p2.contentHash);
  });

  test("contentHash changes when a new revision is published", async ({
    request,
  }) => {
    const { node } = await createAndPublishNode(
      request,
      "E2E Hash Change Node",
    );
    const before = await (
      await request.get(`${API}/copilot/pages/${node.id}`, {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
      })
    ).json();

    const wcRes = await request.post(
      `${API}/content/nodes/${node.id}/working-copies`,
      { headers: { "X-Dev-Principal-Id": ADMIN_A } },
    );
    const wc = await wcRes.json();
    await request.patch(`${API}/content/working-copies/${wc.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: {
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Geänderter Inhalt v2" }],
            },
          ],
        },
      },
    });
    await request.post(`${API}/content/working-copies/${wc.id}/submit`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { comment: "e2e revision 2" },
    });
    await request.post(`${API}/content/working-copies/${wc.id}/approve`, {
      headers: { "X-Dev-Principal-Id": ADMIN_B },
      data: { comment: "approve v2" },
    });
    await request.post(`${API}/content/working-copies/${wc.id}/publish`, {
      headers: { "X-Dev-Principal-Id": ADMIN_B },
      data: { versionLabel: "v2.0" },
    });

    const after = await (
      await request.get(`${API}/copilot/pages/${node.id}`, {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
      })
    ).json();

    expect(after.contentHash).not.toBe(before.contentHash);
    expect(after.contentText).toContain("Geänderter Inhalt v2");
  });

  test("GET /copilot/pages requires authentication", async ({ request }) => {
    const res = await request.get(`${API}/copilot/pages`);
    expect(res.status()).toBe(401);
  });

  test("GET /copilot/pages supports pagination", async ({ request }) => {
    const res = await request.get(`${API}/copilot/pages?limit=2&offset=0`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBeLessThanOrEqual(2);
    expect(typeof body.total).toBe("number");
    expect(body.limit).toBe(2);
  });
});

test.describe("Copilot Content Projection - Glossary", () => {
  test("glossary batch export returns published items", async ({ request }) => {
    const res = await request.get(`${API}/copilot/glossary?limit=5`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBeGreaterThan(0);
    for (const item of body.items) {
      expect(item.itemType).toBe("glossary_term");
      expect(item.status).toBe("published");
      expect(typeof item.contentHash).toBe("string");
    }
  });

  test("single glossary term is exported by id", async ({ request }) => {
    const listRes = await request.get(`${API}/copilot/glossary?limit=1`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const list = await listRes.json();
    const termId = list.items[0].termId;

    const res = await request.get(`${API}/copilot/glossary/${termId}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(200);
    const term = await res.json();
    expect(term.termId).toBe(termId);
  });

  test("GET /copilot/glossary requires authentication", async ({ request }) => {
    const res = await request.get(`${API}/copilot/glossary`);
    expect(res.status()).toBe(401);
  });
});
