import { test, expect } from "@playwright/test";

const API = "http://localhost:8080/api";
const FRONTEND = "http://localhost:80";
const HEADERS = {
  "Content-Type": "application/json",
  "X-Dev-Principal-Id": "00000000-0000-0000-0000-000000000001",
};

test.describe("Frontend Navigation (API)", () => {
  let testNodeId: string;
  let childNodeId: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API}/content/nodes`, {
      headers: HEADERS,
      data: {
        title: "Nav Test Parent",
        templateType: "area_overview",
      },
    });
    const node = await res.json();
    testNodeId = node.id;

    const childRes = await request.post(`${API}/content/nodes`, {
      headers: HEADERS,
      data: {
        title: "Nav Test Child",
        templateType: "process_page_text",
        parentNodeId: testNodeId,
      },
    });
    const child = await childRes.json();
    childNodeId = child.id;
  });

  test("frontend serves HTML at root", async ({ request }) => {
    const res = await request.get(FRONTEND);
    expect(res.ok()).toBe(true);
    const html = await res.text();
    expect(html.toLowerCase()).toContain("<!doctype html");
  });

  test("ancestors endpoint returns parent chain", async ({ request }) => {
    const res = await request.get(
      `${API}/content/nodes/${childNodeId}/ancestors`,
      { headers: HEADERS },
    );
    expect(res.ok()).toBe(true);
    const ancestors = await res.json();
    expect(ancestors.length).toBe(1);
    expect(ancestors[0].id).toBe(testNodeId);
    expect(ancestors[0].title).toBe("Nav Test Parent");
  });

  test("ancestors of root node returns empty array", async ({ request }) => {
    const res = await request.get(
      `${API}/content/nodes/${testNodeId}/ancestors`,
      { headers: HEADERS },
    );
    expect(res.ok()).toBe(true);
    const ancestors = await res.json();
    expect(ancestors.length).toBe(0);
  });

  test("PATCH /content/nodes/:id updates title", async ({ request }) => {
    const res = await request.patch(`${API}/content/nodes/${testNodeId}`, {
      headers: HEADERS,
      data: { title: "Nav Test Updated" },
    });
    expect(res.ok()).toBe(true);
    const updated = await res.json();
    expect(updated.title).toBe("Nav Test Updated");
    expect(updated.id).toBe(testNodeId);

    await request.patch(`${API}/content/nodes/${testNodeId}`, {
      headers: HEADERS,
      data: { title: "Nav Test Parent" },
    });
  });

  test("PATCH /content/nodes/:id updates templateType", async ({
    request,
  }) => {
    const res = await request.patch(`${API}/content/nodes/${testNodeId}`, {
      headers: HEADERS,
      data: { templateType: "dashboard" },
    });
    expect(res.ok()).toBe(true);
    const updated = await res.json();
    expect(updated.templateType).toBe("dashboard");

    await request.patch(`${API}/content/nodes/${testNodeId}`, {
      headers: HEADERS,
      data: { templateType: "area_overview" },
    });
  });

  test("PATCH /content/nodes/:id rejects empty body", async ({ request }) => {
    const res = await request.patch(`${API}/content/nodes/${testNodeId}`, {
      headers: HEADERS,
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("PATCH /content/nodes/:id returns 404 for unknown node", async ({
    request,
  }) => {
    const res = await request.patch(
      `${API}/content/nodes/00000000-0000-0000-0000-999999999999`,
      {
        headers: HEADERS,
        data: { title: "Should fail" },
      },
    );
    expect(res.status()).toBe(404);
  });

  test("children endpoint returns child nodes", async ({ request }) => {
    const res = await request.get(
      `${API}/content/nodes/${testNodeId}/children`,
      { headers: HEADERS },
    );
    expect(res.ok()).toBe(true);
    const children = await res.json();
    expect(children.length).toBeGreaterThanOrEqual(1);
    expect(children.some((c: { title: string }) => c.title === "Nav Test Child")).toBe(true);
  });

  test("root nodes include test parent", async ({ request }) => {
    const res = await request.get(`${API}/content/nodes/roots`, {
      headers: HEADERS,
    });
    expect(res.ok()).toBe(true);
    const roots = await res.json();
    expect(roots.some((n: { id: string }) => n.id === testNodeId)).toBe(true);
  });

  test.afterAll(async ({ request }) => {
    await request.delete(`${API}/content/nodes/${childNodeId}`, {
      headers: HEADERS,
    });
    await request.delete(`${API}/content/nodes/${testNodeId}`, {
      headers: HEADERS,
    });
  });
});
