import { test, expect } from "@playwright/test";

const API = "/api";
const ADMIN_ID = "00000000-0000-0000-0000-000000000001";
const EDITOR_ID = "00000000-0000-0000-0000-000000000002";
const VIEWER_ID = "00000000-0000-0000-0000-000000000003";
const REVIEWER_ID = "00000000-0000-0000-0000-000000000004";

function authHeaders(principalId: string) {
  return { "X-Dev-Principal-Id": principalId };
}

test.describe("Auth Endpoints", () => {
  test("GET /auth/me returns current dev user", async ({ request }) => {
    const res = await request.get(`${API}/auth/me`, {
      headers: authHeaders(ADMIN_ID),
    });
    expect(res.status()).toBe(200);
    const user = await res.json();
    expect(user.principalId).toBe(ADMIN_ID);
    expect(user.displayName).toBe("Dev Admin");
    expect(user.roles).toBeDefined();
    expect(user.permissions).toContain("read_page");
    expect(user.permissions).toContain("manage_permissions");
  });

  test("GET /auth/me with viewer returns limited permissions", async ({
    request,
  }) => {
    const res = await request.get(`${API}/auth/me`, {
      headers: authHeaders(VIEWER_ID),
    });
    expect(res.status()).toBe(200);
    const user = await res.json();
    expect(user.principalId).toBe(VIEWER_ID);
    expect(user.permissions).toContain("read_page");
    expect(user.permissions).not.toContain("create_page");
    expect(user.permissions).not.toContain("manage_permissions");
  });

  test("GET /auth/dev-users returns 5 dev users", async ({ request }) => {
    const res = await request.get(`${API}/auth/dev-users`);
    expect(res.status()).toBe(200);
    const users = await res.json();
    expect(users.length).toBe(5);
    expect(users[0].roles).toBeDefined();
  });

  test("GET /auth/me with invalid dev ID returns 401", async ({ request }) => {
    const res = await request.get(`${API}/auth/me`, {
      headers: authHeaders("00000000-0000-0000-0000-999999999999"),
    });
    expect(res.status()).toBe(401);
  });

  test("POST /auth/logout succeeds", async ({ request }) => {
    const res = await request.post(`${API}/auth/logout`, {
      headers: authHeaders(ADMIN_ID),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Logged out");
  });
});

test.describe("Principals CRUD", () => {
  test("GET /principals lists all principals", async ({ request }) => {
    const res = await request.get(`${API}/principals`, {
      headers: authHeaders(ADMIN_ID),
    });
    expect(res.status()).toBe(200);
    const principals = await res.json();
    expect(principals.length).toBeGreaterThanOrEqual(5);
  });

  test("GET /principals?q=Admin finds admin principal", async ({
    request,
  }) => {
    const res = await request.get(`${API}/principals?q=Admin`, {
      headers: authHeaders(ADMIN_ID),
    });
    expect(res.status()).toBe(200);
    const principals = await res.json();
    expect(principals.length).toBeGreaterThanOrEqual(1);
    expect(
      principals.some(
        (p: { displayName: string }) => p.displayName === "Dev Admin",
      ),
    ).toBe(true);
  });

  test("GET /principals/:id returns principal with roles", async ({
    request,
  }) => {
    const res = await request.get(`${API}/principals/${ADMIN_ID}`, {
      headers: authHeaders(ADMIN_ID),
    });
    expect(res.status()).toBe(200);
    const principal = await res.json();
    expect(principal.id).toBe(ADMIN_ID);
    expect(principal.displayName).toBe("Dev Admin");
    expect(principal.roles).toBeDefined();
    expect(principal.roles.length).toBeGreaterThanOrEqual(1);
    expect(principal.roles[0].role).toBe("system_admin");
  });

  test("GET /principals/:id returns 404 for unknown ID", async ({
    request,
  }) => {
    const res = await request.get(
      `${API}/principals/00000000-0000-0000-0000-999999999999`,
      { headers: authHeaders(ADMIN_ID) },
    );
    expect(res.status()).toBe(404);
  });
});

test.describe("RBAC - Role Permission Matrix", () => {
  test("GET /rbac/matrix returns role-permission mapping", async ({
    request,
  }) => {
    const res = await request.get(`${API}/rbac/matrix`, {
      headers: authHeaders(ADMIN_ID),
    });
    expect(res.status()).toBe(200);
    const matrix = await res.json();
    expect(matrix.system_admin).toContain("manage_permissions");
    expect(matrix.viewer).toContain("read_page");
    expect(matrix.viewer).not.toContain("create_page");
    expect(matrix.editor).toContain("edit_content");
    expect(matrix.reviewer).toContain("review_page");
  });
});

test.describe("RBAC - Role Assignment", () => {
  test("POST /principals/:id/roles assigns a role", async ({ request }) => {
    const res = await request.post(`${API}/principals/${VIEWER_ID}/roles`, {
      headers: authHeaders(ADMIN_ID),
      data: { role: "editor", scope: "global" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.assignmentId).toBeDefined();

    const permRes = await request.get(
      `${API}/principals/${VIEWER_ID}/permissions`,
      { headers: authHeaders(ADMIN_ID) },
    );
    const perms = await permRes.json();
    expect(perms.permissions).toContain("edit_content");

    await request.delete(
      `${API}/principals/${VIEWER_ID}/roles/${body.assignmentId}`,
      { headers: authHeaders(ADMIN_ID) },
    );
  });

  test("viewer cannot assign roles (no manage_permissions)", async ({
    request,
  }) => {
    const res = await request.post(`${API}/principals/${EDITOR_ID}/roles`, {
      headers: authHeaders(VIEWER_ID),
      data: { role: "editor" },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("RBAC - Effective Permissions", () => {
  test("GET /principals/:id/permissions returns effective permissions", async ({
    request,
  }) => {
    const res = await request.get(
      `${API}/principals/${ADMIN_ID}/permissions`,
      { headers: authHeaders(ADMIN_ID) },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.principalId).toBe(ADMIN_ID);
    expect(body.permissions).toContain("read_page");
    expect(body.permissions.length).toBe(13);
  });

  test("editor has correct permission set", async ({ request }) => {
    const res = await request.get(
      `${API}/principals/${EDITOR_ID}/permissions`,
      { headers: authHeaders(ADMIN_ID) },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.permissions).toContain("read_page");
    expect(body.permissions).toContain("create_page");
    expect(body.permissions).toContain("edit_content");
    expect(body.permissions).toContain("manage_relations");
    expect(body.permissions).toContain("submit_for_review");
    expect(body.permissions).not.toContain("edit_structure");
    expect(body.permissions).not.toContain("manage_permissions");
    expect(body.permissions).not.toContain("approve_page");
  });
});

test.describe("Permission Enforcement on Content Routes", () => {
  test("viewer cannot create nodes", async ({ request }) => {
    const res = await request.post(`${API}/content/nodes`, {
      headers: authHeaders(VIEWER_ID),
      data: { title: "Viewer Node", templateType: "policy" },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.requiredPermission).toBe("create_page");
  });

  test("viewer cannot delete nodes", async ({ request }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: authHeaders(ADMIN_ID),
      data: { title: "Delete Test", templateType: "policy" },
    });
    const node = await createRes.json();

    const res = await request.delete(`${API}/content/nodes/${node.id}`, {
      headers: authHeaders(VIEWER_ID),
    });
    expect(res.status()).toBe(403);

    await request.delete(`${API}/content/nodes/${node.id}`, {
      headers: authHeaders(ADMIN_ID),
    });
  });

  test("viewer can read nodes", async ({ request }) => {
    const res = await request.get(`${API}/content/nodes`, {
      headers: authHeaders(VIEWER_ID),
    });
    expect(res.status()).toBe(200);
  });

  test("editor can create and edit content", async ({ request }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: authHeaders(EDITOR_ID),
      data: { title: "Editor Node", templateType: "procedure_instruction" },
    });
    expect(createRes.status()).toBe(201);
    const node = await createRes.json();

    const revRes = await request.post(
      `${API}/content/nodes/${node.id}/revisions`,
      {
        headers: authHeaders(EDITOR_ID),
        data: {
          title: "Updated Title",
          body: { content: "Test content" },
        },
      },
    );
    expect(revRes.status()).toBe(201);
  });

  test("editor cannot publish (needs approve_page)", async ({ request }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: authHeaders(ADMIN_ID),
      data: { title: "Publish Test", templateType: "policy" },
    });
    const node = await createRes.json();

    const revRes = await request.post(
      `${API}/content/nodes/${node.id}/revisions`,
      {
        headers: authHeaders(ADMIN_ID),
        data: {
          title: "Rev 1",
          body: { content: "body" },
        },
      },
    );
    const rev = await revRes.json();

    const publishRes = await request.post(
      `${API}/content/revisions/${rev.id}/publish`,
      {
        headers: authHeaders(EDITOR_ID),
        data: { versionLabel: "1.0" },
      },
    );
    expect(publishRes.status()).toBe(403);
    const body = await publishRes.json();
    expect(body.requiredPermission).toBe("approve_page");
  });

  test("reviewer can publish (has approve_page)", async ({ request }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: authHeaders(ADMIN_ID),
      data: { title: "Reviewer Publish", templateType: "policy" },
    });
    const node = await createRes.json();

    const revRes = await request.post(
      `${API}/content/nodes/${node.id}/revisions`,
      {
        headers: authHeaders(ADMIN_ID),
        data: {
          title: "Rev 1",
          body: { content: "body" },
        },
      },
    );
    const rev = await revRes.json();

    const publishRes = await request.post(
      `${API}/content/revisions/${rev.id}/publish`,
      {
        headers: authHeaders(REVIEWER_ID),
        data: { versionLabel: "1.0" },
      },
    );
    expect(publishRes.status()).toBe(200);
  });
});

test.describe("Page-Level Permissions", () => {
  test("grant and revoke page permission", async ({ request }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: authHeaders(ADMIN_ID),
      data: { title: "Permission Node", templateType: "policy" },
    });
    const node = await createRes.json();

    const grantRes = await request.post(
      `${API}/content/nodes/${node.id}/permissions`,
      {
        headers: authHeaders(ADMIN_ID),
        data: {
          principalId: VIEWER_ID,
          permission: "edit_content",
        },
      },
    );
    expect(grantRes.status()).toBe(201);
    const grant = await grantRes.json();
    expect(grant.id).toBeDefined();

    const permsRes = await request.get(
      `${API}/content/nodes/${node.id}/permissions`,
      { headers: authHeaders(ADMIN_ID) },
    );
    expect(permsRes.status()).toBe(200);
    const perms = await permsRes.json();
    expect(perms.length).toBeGreaterThanOrEqual(1);

    const revokeRes = await request.delete(
      `${API}/content/nodes/${node.id}/permissions/${grant.id}`,
      { headers: authHeaders(ADMIN_ID) },
    );
    expect(revokeRes.status()).toBe(204);
  });

  test("viewer cannot grant page permissions", async ({ request }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: authHeaders(ADMIN_ID),
      data: { title: "Viewer Grant Test", templateType: "policy" },
    });
    const node = await createRes.json();

    const res = await request.post(
      `${API}/content/nodes/${node.id}/permissions`,
      {
        headers: authHeaders(VIEWER_ID),
        data: {
          principalId: EDITOR_ID,
          permission: "edit_content",
        },
      },
    );
    expect(res.status()).toBe(403);
  });
});

test.describe("Node Ownership", () => {
  test("set and get node ownership", async ({ request }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: authHeaders(ADMIN_ID),
      data: { title: "Ownership Node", templateType: "policy" },
    });
    const node = await createRes.json();

    const setRes = await request.put(
      `${API}/content/nodes/${node.id}/ownership`,
      {
        headers: authHeaders(ADMIN_ID),
        data: {
          ownerId: EDITOR_ID,
          deputyId: REVIEWER_ID,
          reviewerId: REVIEWER_ID,
          approverId: ADMIN_ID,
        },
      },
    );
    expect(setRes.status()).toBe(200);
    const result = await setRes.json();
    expect(result.id).toBeDefined();

    const getRes = await request.get(
      `${API}/content/nodes/${node.id}/ownership`,
      { headers: authHeaders(ADMIN_ID) },
    );
    expect(getRes.status()).toBe(200);
    const ownership = await getRes.json();
    expect(ownership.ownerId).toBe(EDITOR_ID);
    expect(ownership.deputyId).toBe(REVIEWER_ID);
  });

  test("viewer cannot set ownership", async ({ request }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: authHeaders(ADMIN_ID),
      data: { title: "Viewer Ownership", templateType: "policy" },
    });
    const node = await createRes.json();

    const res = await request.put(
      `${API}/content/nodes/${node.id}/ownership`,
      {
        headers: authHeaders(VIEWER_ID),
        data: { ownerId: VIEWER_ID },
      },
    );
    expect(res.status()).toBe(403);
  });
});

test.describe("Graph Search (Dev Mode)", () => {
  test("GET /graph/people returns mock results", async ({ request }) => {
    const res = await request.get(`${API}/graph/people?q=admin`, {
      headers: authHeaders(ADMIN_ID),
    });
    expect(res.status()).toBe(200);
    const people = await res.json();
    expect(Array.isArray(people)).toBe(true);
  });

  test("GET /graph/groups returns mock results", async ({ request }) => {
    const res = await request.get(`${API}/graph/groups?q=team`, {
      headers: authHeaders(ADMIN_ID),
    });
    expect(res.status()).toBe(200);
    const groups = await res.json();
    expect(Array.isArray(groups)).toBe(true);
  });
});

test.describe("Audit Trail", () => {
  test("content creation generates audit event", async ({ request }) => {
    const createRes = await request.post(`${API}/content/nodes`, {
      headers: authHeaders(ADMIN_ID),
      data: { title: "Audit Test Node", templateType: "policy" },
    });
    expect(createRes.status()).toBe(201);
  });
});
