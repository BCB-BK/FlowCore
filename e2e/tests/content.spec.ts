import { test, expect } from "@playwright/test";

const API = "/api/content";

test.describe("Content Nodes", () => {
  test("GET /content/nodes returns seeded nodes", async ({ request }) => {
    const res = await request.get(`${API}/nodes`);
    expect(res.status()).toBe(200);
    const nodes = await res.json();
    expect(nodes.length).toBeGreaterThanOrEqual(3);
  });

  test("GET /content/nodes/roots returns root nodes", async ({ request }) => {
    const res = await request.get(`${API}/nodes/roots`);
    expect(res.status()).toBe(200);
    const roots = await res.json();
    expect(roots.length).toBeGreaterThanOrEqual(1);
    expect(roots[0].parentNodeId).toBeNull();
  });

  test("POST /content/nodes creates a node with auto-generated IDs", async ({
    request,
  }) => {
    const res = await request.post(`${API}/nodes`, {
      data: {
        title: "E2E Test Node",
        templateType: "policy",
      },
    });
    expect(res.status()).toBe(201);
    const node = await res.json();
    expect(node.immutableId).toMatch(/^WN-/);
    expect(node.displayCode).toMatch(/^RL-/);
    expect(node.title).toBe("E2E Test Node");
    expect(node.status).toBe("draft");
  });

  test("GET /content/nodes/:id returns a specific node", async ({
    request,
  }) => {
    const rootsRes = await request.get(`${API}/nodes/roots`);
    const roots = await rootsRes.json();
    const rootId = roots[0].id;

    const res = await request.get(`${API}/nodes/${rootId}`);
    expect(res.status()).toBe(200);
    const node = await res.json();
    expect(node.id).toBe(rootId);
  });

  test("GET /content/nodes/:id returns 404 for unknown ID", async ({
    request,
  }) => {
    const res = await request.get(
      `${API}/nodes/00000000-0000-0000-0000-000000000000`,
    );
    expect(res.status()).toBe(404);
  });

  test("POST /content/nodes creates child node under parent", async ({
    request,
  }) => {
    const rootsRes = await request.get(`${API}/nodes/roots`);
    const roots = await rootsRes.json();
    const parentId = roots[0].id;

    const res = await request.post(`${API}/nodes`, {
      data: {
        title: "E2E Child Node",
        templateType: "process_page_text",
        parentNodeId: parentId,
      },
    });
    expect(res.status()).toBe(201);
    const child = await res.json();
    expect(child.parentNodeId).toBe(parentId);
    expect(child.displayCode).toContain("PRZ-");
  });

  test("GET /content/nodes/:id/children returns children", async ({
    request,
  }) => {
    const parentRes = await request.post(`${API}/nodes`, {
      data: { title: "Children Parent", templateType: "area_overview" },
    });
    const parent = await parentRes.json();

    await request.post(`${API}/nodes`, {
      data: {
        title: "Child A",
        templateType: "policy",
        parentNodeId: parent.id,
      },
    });
    await request.post(`${API}/nodes`, {
      data: {
        title: "Child B",
        templateType: "policy",
        parentNodeId: parent.id,
      },
    });

    const res = await request.get(`${API}/nodes/${parent.id}/children`);
    expect(res.status()).toBe(200);
    const children = await res.json();
    expect(children.length).toBeGreaterThanOrEqual(2);
  });

  test("DELETE /content/nodes/:id soft-deletes node", async ({ request }) => {
    const createRes = await request.post(`${API}/nodes`, {
      data: { title: "To Delete", templateType: "dashboard" },
    });
    const node = await createRes.json();

    const delRes = await request.delete(`${API}/nodes/${node.id}`);
    expect(delRes.status()).toBe(204);

    const getRes = await request.get(`${API}/nodes/${node.id}`);
    const deleted = await getRes.json();
    expect(deleted.isDeleted).toBe(true);
    expect(deleted.status).toBe("deleted");
  });
});

test.describe("Revisions and Versioning", () => {
  test("POST /content/nodes/:id/revisions creates a revision", async ({
    request,
  }) => {
    const createRes = await request.post(`${API}/nodes`, {
      data: { title: "Rev Test Node", templateType: "use_case" },
    });
    const node = await createRes.json();

    const revRes = await request.post(`${API}/nodes/${node.id}/revisions`, {
      data: {
        title: "Rev Test Node",
        content: { actor: "Student" },
        changeSummary: "Initial content",
        changeType: "major",
      },
    });
    expect(revRes.status()).toBe(201);
    const revision = await revRes.json();
    expect(revision.revisionNo).toBe(1);
    expect(revision.status).toBe("draft");
  });

  test("revision numbers increment per node", async ({ request }) => {
    const createRes = await request.post(`${API}/nodes`, {
      data: { title: "Multi Rev Node", templateType: "policy" },
    });
    const node = await createRes.json();

    const rev1Res = await request.post(`${API}/nodes/${node.id}/revisions`, {
      data: { title: "Multi Rev Node", changeSummary: "Rev 1" },
    });
    const rev1 = await rev1Res.json();

    const rev2Res = await request.post(`${API}/nodes/${node.id}/revisions`, {
      data: {
        title: "Multi Rev Node v2",
        changeSummary: "Rev 2",
        basedOnRevisionId: rev1.id,
      },
    });
    const rev2 = await rev2Res.json();

    expect(rev1.revisionNo).toBe(1);
    expect(rev2.revisionNo).toBe(2);
  });

  test("publishing a revision assigns version label", async ({ request }) => {
    const createRes = await request.post(`${API}/nodes`, {
      data: { title: "Publish Test", templateType: "procedure_instruction" },
    });
    const node = await createRes.json();

    const revRes = await request.post(`${API}/nodes/${node.id}/revisions`, {
      data: { title: "Publish Test", changeType: "major" },
    });
    const revision = await revRes.json();

    const pubRes = await request.post(
      `${API}/revisions/${revision.id}/publish`,
      {
        data: { versionLabel: "1.0" },
      },
    );
    expect(pubRes.status()).toBe(200);
    const published = await pubRes.json();
    expect(published.versionLabel).toBe("1.0");
    expect(published.status).toBe("published");

    const nodeRes = await request.get(`${API}/nodes/${node.id}`);
    const updatedNode = await nodeRes.json();
    expect(updatedNode.publishedRevisionId).toBe(revision.id);
    expect(updatedNode.status).toBe("published");
  });

  test("restoring a revision creates a new revision", async ({ request }) => {
    const createRes = await request.post(`${API}/nodes`, {
      data: { title: "Restore Test", templateType: "role_profile" },
    });
    const node = await createRes.json();

    const rev1Res = await request.post(`${API}/nodes/${node.id}/revisions`, {
      data: {
        title: "Restore Test",
        content: { role_name: "Admin" },
        changeType: "major",
      },
    });
    const rev1 = await rev1Res.json();

    await request.post(`${API}/nodes/${node.id}/revisions`, {
      data: {
        title: "Restore Test v2",
        content: { role_name: "Super Admin" },
        basedOnRevisionId: rev1.id,
      },
    });

    const restoreRes = await request.post(
      `${API}/revisions/${rev1.id}/restore`,
      {
        data: { authorId: "test-user" },
      },
    );
    expect(restoreRes.status()).toBe(201);
    const restored = await restoreRes.json();
    expect(restored.revisionNo).toBe(3);
    expect(restored.basedOnRevisionId).toBe(rev1.id);
    expect(restored.changeSummary).toContain("Restored from revision");
  });

  test("GET /content/nodes/:id/revisions returns version tree", async ({
    request,
  }) => {
    const createRes = await request.post(`${API}/nodes`, {
      data: { title: "Version Tree Node", templateType: "policy" },
    });
    const node = await createRes.json();

    await request.post(`${API}/nodes/${node.id}/revisions`, {
      data: { title: "Version Tree Node", changeSummary: "Rev 1" },
    });
    await request.post(`${API}/nodes/${node.id}/revisions`, {
      data: { title: "Version Tree Node v2", changeSummary: "Rev 2" },
    });

    const res = await request.get(`${API}/nodes/${node.id}/revisions`);
    expect(res.status()).toBe(200);
    const revisions = await res.json();
    expect(revisions.length).toBeGreaterThanOrEqual(2);
    expect(revisions[0].revisionNo).toBeGreaterThan(revisions[1].revisionNo);
  });
});

test.describe("Relations and Graph", () => {
  test("POST /content/relations creates a relation", async ({ request }) => {
    const node1Res = await request.post(`${API}/nodes`, {
      data: { title: "Rel Source", templateType: "system_documentation" },
    });
    const node1 = await node1Res.json();

    const node2Res = await request.post(`${API}/nodes`, {
      data: { title: "Rel Target", templateType: "system_documentation" },
    });
    const node2 = await node2Res.json();

    const relRes = await request.post(`${API}/relations`, {
      data: {
        sourceNodeId: node1.id,
        targetNodeId: node2.id,
        relationType: "related_to",
      },
    });
    expect(relRes.status()).toBe(201);
    const relation = await relRes.json();
    expect(relation.relationType).toBe("related_to");
  });

  test("self-referencing relation is rejected", async ({ request }) => {
    const nodeRes = await request.post(`${API}/nodes`, {
      data: { title: "Self Ref", templateType: "policy" },
    });
    const node = await nodeRes.json();

    const relRes = await request.post(`${API}/relations`, {
      data: {
        sourceNodeId: node.id,
        targetNodeId: node.id,
        relationType: "depends_on",
      },
    });
    expect(relRes.status()).toBe(400);
    const body = await relRes.json();
    expect(body.error).toContain("Self-referencing");
  });

  test("cyclic directed relation is rejected", async ({ request }) => {
    const node1Res = await request.post(`${API}/nodes`, {
      data: { title: "Cycle A", templateType: "policy" },
    });
    const node1 = await node1Res.json();

    const node2Res = await request.post(`${API}/nodes`, {
      data: { title: "Cycle B", templateType: "policy" },
    });
    const node2 = await node2Res.json();

    const node3Res = await request.post(`${API}/nodes`, {
      data: { title: "Cycle C", templateType: "policy" },
    });
    const node3 = await node3Res.json();

    await request.post(`${API}/relations`, {
      data: {
        sourceNodeId: node1.id,
        targetNodeId: node2.id,
        relationType: "depends_on",
      },
    });

    await request.post(`${API}/relations`, {
      data: {
        sourceNodeId: node2.id,
        targetNodeId: node3.id,
        relationType: "depends_on",
      },
    });

    const cycleRes = await request.post(`${API}/relations`, {
      data: {
        sourceNodeId: node3.id,
        targetNodeId: node1.id,
        relationType: "depends_on",
      },
    });
    expect(cycleRes.status()).toBe(400);
    const body = await cycleRes.json();
    expect(body.error).toContain("cycle");
  });

  test("GET /content/nodes/:id/relations returns relations", async ({
    request,
  }) => {
    const rootsRes = await request.get(`${API}/nodes/roots`);
    const roots = await rootsRes.json();
    const rootId = roots[0].id;
    const childRes = await request.get(`${API}/nodes/${rootId}/children`);
    const children = await childRes.json();

    if (children.length >= 2) {
      const relRes = await request.get(
        `${API}/nodes/${children[0].id}/relations`,
      );
      expect(relRes.status()).toBe(200);
    }
  });

  test("DELETE /content/relations/:id removes a relation", async ({
    request,
  }) => {
    const node1Res = await request.post(`${API}/nodes`, {
      data: { title: "Del Rel A", templateType: "dashboard" },
    });
    const node1 = await node1Res.json();

    const node2Res = await request.post(`${API}/nodes`, {
      data: { title: "Del Rel B", templateType: "dashboard" },
    });
    const node2 = await node2Res.json();

    const relRes = await request.post(`${API}/relations`, {
      data: {
        sourceNodeId: node1.id,
        targetNodeId: node2.id,
        relationType: "references",
      },
    });
    const relation = await relRes.json();

    const delRes = await request.delete(`${API}/relations/${relation.id}`);
    expect(delRes.status()).toBe(204);
  });
});

test.describe("Templates", () => {
  test("GET /content/templates returns 10 templates", async ({ request }) => {
    const res = await request.get(`${API}/templates`);
    expect(res.status()).toBe(200);
    const templates = await res.json();
    expect(templates.length).toBe(10);
  });

  test("templates have field schemas with sections", async ({ request }) => {
    const res = await request.get(`${API}/templates`);
    const templates = await res.json();
    for (const t of templates) {
      expect(t.fieldSchema).toHaveProperty("sections");
      expect(t.fieldSchema.sections.length).toBeGreaterThanOrEqual(1);
      for (const section of t.fieldSchema.sections) {
        expect(section).toHaveProperty("key");
        expect(section).toHaveProperty("label");
        expect(section).toHaveProperty("fields");
      }
    }
  });
});

test.describe("Node Move and Aliases", () => {
  test("moving a node creates an alias record", async ({ request }) => {
    const parentRes = await request.post(`${API}/nodes`, {
      data: { title: "Move Parent", templateType: "area_overview" },
    });
    const parent = await parentRes.json();

    const childRes = await request.post(`${API}/nodes`, {
      data: {
        title: "Move Child",
        templateType: "process_page_text",
        parentNodeId: parent.id,
      },
    });
    const child = await childRes.json();
    const oldCode = child.displayCode;

    const moveRes = await request.post(`${API}/nodes/${child.id}/move`, {
      data: { newParentNodeId: null },
    });
    expect(moveRes.status()).toBe(200);
    const moved = await moveRes.json();
    expect(moved.parentNodeId).toBeNull();

    const aliasRes = await request.get(`${API}/nodes/${child.id}/aliases`);
    expect(aliasRes.status()).toBe(200);
    const aliases = await aliasRes.json();
    expect(aliases.length).toBeGreaterThanOrEqual(1);
    expect(aliases[0].previousDisplayCode).toBe(oldCode);
  });
});

test.describe("Tree Traversal", () => {
  test("GET /content/nodes/:id/tree returns hierarchical data", async ({
    request,
  }) => {
    const rootsRes = await request.get(`${API}/nodes/roots`);
    const roots = await rootsRes.json();
    const rootId = roots[0].id;

    const res = await request.get(`${API}/nodes/${rootId}/tree`);
    expect(res.status()).toBe(200);
    const tree = await res.json();
    expect(tree.length).toBeGreaterThanOrEqual(1);
    expect(tree[0].depth).toBe(0);
  });
});
