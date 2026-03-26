import { test, expect } from "@playwright/test";

const API = "/api";
const ADMIN_ID = "00000000-0000-0000-0000-000000000001";
const EDITOR_ID = "00000000-0000-0000-0000-000000000002";
const VIEWER_ID = "00000000-0000-0000-0000-000000000003";
const REVIEWER_ID = "00000000-0000-0000-0000-000000000004";
const PM_ID = "00000000-0000-0000-0000-000000000005";

function authHeaders(principalId: string) {
  return { "X-Dev-Principal-Id": principalId };
}

test.describe("Security Headers", () => {
  test("API responses include security headers", async ({ request }) => {
    const res = await request.get(`${API}/healthz`);
    expect(res.status()).toBe(200);
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-dns-prefetch-control"]).toBe("off");
    expect(res.headers()["x-download-options"]).toBe("noopen");
    expect(res.headers()["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  test("rate limit headers present on auth endpoints", async ({ request }) => {
    const res = await request.get(`${API}/auth/login`);
    expect(res.headers()["x-ratelimit-limit"]).toBeDefined();
    expect(res.headers()["x-ratelimit-remaining"]).toBeDefined();
  });
});

test.describe("RBAC Permission Boundaries", () => {
  test("viewer cannot create pages", async ({ request }) => {
    const res = await request.post(`${API}/content/nodes`, {
      headers: {
        ...authHeaders(VIEWER_ID),
        "Content-Type": "application/json",
      },
      data: {
        title: "Viewer Test Node",
        templateType: "policy",
      },
    });
    expect(res.status()).toBe(403);
  });

  test("viewer cannot delete pages", async ({ request }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: {
        ...authHeaders(ADMIN_ID),
        "Content-Type": "application/json",
      },
      data: {
        title: "RBAC Delete Test",
        templateType: "policy",
      },
    });
    const node = await createRes.json();

    const deleteRes = await request.delete(
      `${API}/content/nodes/${node.id}`,
      { headers: authHeaders(VIEWER_ID) },
    );
    expect(deleteRes.status()).toBe(403);

    await request.delete(`${API}/content/nodes/${node.id}`, {
      headers: authHeaders(ADMIN_ID),
    });
  });

  test("viewer cannot update pages", async ({ request }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: {
        ...authHeaders(ADMIN_ID),
        "Content-Type": "application/json",
      },
      data: {
        title: "RBAC Update Test",
        templateType: "policy",
      },
    });
    const node = await createRes.json();

    const updateRes = await request.patch(
      `${API}/content/nodes/${node.id}`,
      {
        headers: {
          ...authHeaders(VIEWER_ID),
          "Content-Type": "application/json",
        },
        data: { title: "Hacked!" },
      },
    );
    expect(updateRes.status()).toBe(403);

    await request.delete(`${API}/content/nodes/${node.id}`, {
      headers: authHeaders(ADMIN_ID),
    });
  });

  test("editor can create and read pages", async ({ request }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: {
        ...authHeaders(EDITOR_ID),
        "Content-Type": "application/json",
      },
      data: {
        title: `Editor RBAC Test ${Date.now()}`,
        templateType: "procedure_instruction",
      },
    });
    expect(createRes.status()).toBe(201);
    const node = await createRes.json();

    const readRes = await request.get(`${API}/content/nodes/${node.id}`, {
      headers: authHeaders(EDITOR_ID),
    });
    expect(readRes.status()).toBe(200);

    await request.delete(`${API}/content/nodes/${node.id}`, {
      headers: authHeaders(ADMIN_ID),
    });
  });

  test("viewer can read pages", async ({ request }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: {
        ...authHeaders(ADMIN_ID),
        "Content-Type": "application/json",
      },
      data: {
        title: "Viewer Read Test",
        templateType: "policy",
      },
    });
    const node = await createRes.json();

    const readRes = await request.get(`${API}/content/nodes/${node.id}`, {
      headers: authHeaders(VIEWER_ID),
    });
    expect(readRes.status()).toBe(200);

    await request.delete(`${API}/content/nodes/${node.id}`, {
      headers: authHeaders(ADMIN_ID),
    });
  });

  test("unauthenticated request returns 401", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: "http://localhost:80",
      extraHTTPHeaders: {},
    });
    const res = await ctx.get(`${API}/content/nodes`);
    expect([401, 403]).toContain(res.status());
    await ctx.dispose();
  });

  test("invalid principal returns 401", async ({ request }) => {
    const res = await request.get(`${API}/content/nodes`, {
      headers: authHeaders("00000000-0000-0000-0000-000000000099"),
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("RBAC Quality Dashboard Access", () => {
  test("viewer can access quality overview with read_page", async ({
    request,
  }) => {
    const res = await request.get(`${API}/quality/overview`, {
      headers: authHeaders(VIEWER_ID),
    });
    expect(res.status()).toBe(200);
  });

  test("admin can access quality dashboard", async ({ request }) => {
    const res = await request.get(`${API}/quality/overview`, {
      headers: authHeaders(ADMIN_ID),
    });
    expect(res.status()).toBe(200);
  });

  test("process manager can access quality dashboard", async ({ request }) => {
    const res = await request.get(`${API}/quality/overview`, {
      headers: authHeaders(PM_ID),
    });
    expect(res.status()).toBe(200);
  });
});

test.describe("RBAC Tag Management", () => {
  test("viewer cannot create tags", async ({ request }) => {
    const res = await request.post(`${API}/tags`, {
      headers: {
        ...authHeaders(VIEWER_ID),
        "Content-Type": "application/json",
      },
      data: { name: "RBAC Test Tag" },
    });
    expect(res.status()).toBe(403);
  });

  test("editor can create tags", async ({ request }) => {
    const res = await request.post(`${API}/tags`, {
      headers: {
        ...authHeaders(EDITOR_ID),
        "Content-Type": "application/json",
      },
      data: { name: `RBAC Tag ${Date.now()}` },
    });
    expect(res.status()).toBe(201);
  });
});

test.describe("RBAC Glossary Access", () => {
  test("viewer cannot create glossary terms", async ({ request }) => {
    const res = await request.post(`${API}/glossary`, {
      headers: {
        ...authHeaders(VIEWER_ID),
        "Content-Type": "application/json",
      },
      data: {
        term: "RBAC Test",
        definition: "Test",
      },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("RBAC Admin Routes", () => {
  test("viewer cannot manage principals", async ({ request }) => {
    const res = await request.get(`${API}/principals`, {
      headers: authHeaders(VIEWER_ID),
    });
    expect(res.status()).toBe(403);
  });

  test("admin can manage principals", async ({ request }) => {
    const res = await request.get(`${API}/principals`, {
      headers: authHeaders(ADMIN_ID),
    });
    expect(res.status()).toBe(200);
  });
});

test.describe("Teams Endpoint Security", () => {
  test("teams context endpoint is publicly accessible", async ({
    request,
  }) => {
    const res = await request.get(`${API}/teams/context`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("configured");
    expect(body).toHaveProperty("entraConfigured");
  });

  test("teams SSO returns error in dev mode", async ({ request }) => {
    const res = await request.post(`${API}/teams/sso`, {
      headers: { "Content-Type": "application/json" },
      data: { ssoToken: "fake-token" },
    });
    expect(res.status()).toBe(400);
  });
});
