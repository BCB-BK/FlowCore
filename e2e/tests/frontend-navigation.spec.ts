import { test, expect } from "@playwright/test";

const API = "http://localhost:8080/api";
const HEADERS = {
  "Content-Type": "application/json",
  "X-Dev-Principal-Id": "00000000-0000-0000-0000-000000000001",
};

test.describe("Frontend Navigation – API layer", () => {
  let parentId: string;
  let childId: string;

  test.beforeAll(async ({ request }) => {
    const parent = await (
      await request.post(`${API}/content/nodes`, {
        headers: HEADERS,
        data: { title: "Nav Parent", templateType: "area_overview" },
      })
    ).json();
    parentId = parent.id;

    const child = await (
      await request.post(`${API}/content/nodes`, {
        headers: HEADERS,
        data: {
          title: "Nav Child",
          templateType: "process_page_text",
          parentNodeId: parentId,
        },
      })
    ).json();
    childId = child.id;
  });

  test("ancestors returns parent chain for child", async ({ request }) => {
    const res = await request.get(
      `${API}/content/nodes/${childId}/ancestors`,
      { headers: HEADERS },
    );
    expect(res.ok()).toBe(true);
    const ancestors = await res.json();
    expect(ancestors).toHaveLength(1);
    expect(ancestors[0].id).toBe(parentId);
    expect(ancestors[0].title).toBe("Nav Parent");
  });

  test("ancestors returns empty for root node", async ({ request }) => {
    const res = await request.get(
      `${API}/content/nodes/${parentId}/ancestors`,
      { headers: HEADERS },
    );
    expect(res.ok()).toBe(true);
    expect(await res.json()).toHaveLength(0);
  });

  test("children endpoint lists child nodes", async ({ request }) => {
    const res = await request.get(
      `${API}/content/nodes/${parentId}/children`,
      { headers: HEADERS },
    );
    expect(res.ok()).toBe(true);
    const children = await res.json();
    expect(children.some((c: { id: string }) => c.id === childId)).toBe(true);
  });

  test("PATCH updates title", async ({ request }) => {
    const res = await request.patch(`${API}/content/nodes/${parentId}`, {
      headers: HEADERS,
      data: { title: "Nav Parent Renamed" },
    });
    expect(res.ok()).toBe(true);
    expect((await res.json()).title).toBe("Nav Parent Renamed");
    await request.patch(`${API}/content/nodes/${parentId}`, {
      headers: HEADERS,
      data: { title: "Nav Parent" },
    });
  });

  test("PATCH updates templateType", async ({ request }) => {
    const res = await request.patch(`${API}/content/nodes/${parentId}`, {
      headers: HEADERS,
      data: { templateType: "dashboard" },
    });
    expect(res.ok()).toBe(true);
    expect((await res.json()).templateType).toBe("dashboard");
    await request.patch(`${API}/content/nodes/${parentId}`, {
      headers: HEADERS,
      data: { templateType: "area_overview" },
    });
  });

  test("PATCH rejects empty body", async ({ request }) => {
    const res = await request.patch(`${API}/content/nodes/${parentId}`, {
      headers: HEADERS,
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("PATCH returns 404 for unknown node", async ({ request }) => {
    const res = await request.patch(
      `${API}/content/nodes/00000000-0000-0000-0000-999999999999`,
      { headers: HEADERS, data: { title: "Nope" } },
    );
    expect(res.status()).toBe(404);
  });

  test("root nodes include test parent", async ({ request }) => {
    const res = await request.get(`${API}/content/nodes/roots`, {
      headers: HEADERS,
    });
    expect(res.ok()).toBe(true);
    const roots = await res.json();
    expect(roots.some((n: { id: string }) => n.id === parentId)).toBe(true);
  });

  test("frontend serves valid HTML", async ({ request }) => {
    const res = await request.get("http://localhost:80");
    expect(res.ok()).toBe(true);
    const html = await res.text();
    expect(html.toLowerCase()).toContain("<!doctype html");
  });

  test.afterAll(async ({ request }) => {
    await request.delete(`${API}/content/nodes/${childId}`, {
      headers: HEADERS,
    });
    await request.delete(`${API}/content/nodes/${parentId}`, {
      headers: HEADERS,
    });
  });
});
