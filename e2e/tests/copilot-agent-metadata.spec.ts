import { test, expect } from "@playwright/test";

const API = "/api";
const ADMIN_A = "2804b3e6-46c0-43e4-8e6b-5ee6a588c8dd"; // Jan Philipp Feldten (system_admin)
const ADMIN_B = "ce73daf3-fd70-4578-8bff-b05535623a73"; // second system_admin (four-eyes approver)
const EDITOR = "3227429a-98c2-49c5-a641-1abafe46e3ef"; // Axel Mäder (editor + process_manager + viewer)
const VIEWER_ONLY = "bdb316ff-13be-4a10-a5f9-a821f81938b5"; // BildungsCampus - Übergreifend (viewer only)

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

  const wcRes = await request.post(
    `${API}/content/nodes/${node.id}/working-copies`,
    { headers: { "X-Dev-Principal-Id": ADMIN_A } },
  );
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
        content: [
          { type: "paragraph", content: [{ type: "text", text: title }] },
        ],
      },
    },
  });
  await request.post(
    `${API}/content/working-copies/${workingCopyId}/submit`,
    { headers: { "X-Dev-Principal-Id": ADMIN_A }, data: { comment: "e2e" } },
  );
  await request.post(
    `${API}/content/working-copies/${workingCopyId}/approve`,
    { headers: { "X-Dev-Principal-Id": ADMIN_B }, data: { comment: "e2e" } },
  );
  await request.post(
    `${API}/content/working-copies/${workingCopyId}/publish`,
    { headers: { "X-Dev-Principal-Id": ADMIN_B }, data: { versionLabel: "v1.0" } },
  );
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
};

test.describe("Cluster 3 - Agent-Metadatenfelder", () => {
  test("editor/admin can save and load agent metadata on a working copy", async ({
    request,
  }) => {
    const { workingCopyId } = await createNodeWithWorkingCopy(
      request,
      "E2E Agent Metadata Save",
    );

    const patchRes = await request.patch(
      `${API}/content/working-copies/${workingCopyId}`,
      {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
        data: { structuredFields: VALID_AGENT_METADATA },
      },
    );
    expect(patchRes.status()).toBe(200);

    const getRes = await request.get(
      `${API}/content/working-copies/${workingCopyId}`,
      { headers: { "X-Dev-Principal-Id": ADMIN_A } },
    );
    const wc = await getRes.json();
    expect(wc.structuredFields.agent_enabled).toBe(true);
    expect(wc.structuredFields.authority_level).toBe("binding");
    expect(wc.structuredFields.agent_scope).toEqual(["global"]);
  });

  test("viewer cannot edit agent metadata fields (403)", async ({
    request,
  }) => {
    const { workingCopyId } = await createNodeWithWorkingCopy(
      request,
      "E2E Agent Metadata Viewer Blocked",
    );

    const patchRes = await request.patch(
      `${API}/content/working-copies/${workingCopyId}`,
      {
        headers: { "X-Dev-Principal-Id": VIEWER_ONLY },
        data: { structuredFields: { agent_enabled: true } },
      },
    );
    expect(patchRes.status()).toBe(403);
  });

  test("editor can edit agent metadata fields", async ({ request }) => {
    const { node, workingCopyId } = await createNodeWithWorkingCopy(
      request,
      "E2E Agent Metadata Editor Allowed",
    );

    const patchRes = await request.patch(
      `${API}/content/working-copies/${workingCopyId}`,
      {
        headers: { "X-Dev-Principal-Id": EDITOR },
        data: { structuredFields: { agent_enabled: true } },
      },
    );
    expect(patchRes.status()).toBe(200);
    expect(node.id).toBeTruthy();
  });

  test("invalid enum value for authority_level is rejected", async ({
    request,
  }) => {
    const { workingCopyId } = await createNodeWithWorkingCopy(
      request,
      "E2E Agent Metadata Invalid Enum",
    );

    const patchRes = await request.patch(
      `${API}/content/working-copies/${workingCopyId}`,
      {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
        data: { structuredFields: { authority_level: "not_a_real_level" } },
      },
    );
    expect(patchRes.status()).toBe(400);
  });

  test("sync-only index-status fields cannot be smuggled via working-copy patch", async ({
    request,
  }) => {
    const { workingCopyId } = await createNodeWithWorkingCopy(
      request,
      "E2E Agent Metadata Sync-Only Strip",
    );

    const patchRes = await request.patch(
      `${API}/content/working-copies/${workingCopyId}`,
      {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
        data: {
          structuredFields: {
            agent_enabled: true,
            copilot_index_status: "indexed",
          },
        },
      },
    );
    expect(patchRes.status()).toBe(200);
    const wc = await patchRes.json();
    expect(wc.structuredFields.copilot_index_status).toBeUndefined();
  });

  test("draft page with agent_enabled=true is not exportable via Copilot API", async ({
    request,
  }) => {
    const { node, workingCopyId } = await createNodeWithWorkingCopy(
      request,
      "E2E Agent Metadata Draft Not Exportable",
    );
    await request.patch(`${API}/content/working-copies/${workingCopyId}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { structuredFields: VALID_AGENT_METADATA },
    });

    const res = await request.get(`${API}/copilot/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(404);
  });

  test("published page with agent_enabled=true and valid ACL is exportable and exposes agent fields", async ({
    request,
  }) => {
    const title = "E2E Agent Metadata Published Exportable";
    const { node, workingCopyId } = await createNodeWithWorkingCopy(
      request,
      title,
    );
    await request.patch(`${API}/content/working-copies/${workingCopyId}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: {
        structuredFields: {
          ...VALID_AGENT_METADATA,
          confidentiality: "public",
        },
      },
    });
    await publishWorkingCopy(request, workingCopyId, title);

    const res = await request.get(`${API}/copilot/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(200);
    const projection = await res.json();
    expect(projection.agentEnabled).toBe(true);
    expect(projection.authorityLevel).toBe("binding");
    expect(projection.decisionStatus).toBe("decided");
    expect(projection.copilotSummary).toBe("Testzusammenfassung");
    expect(projection.copilotIndexStatus).toBe("not_indexed");
  });

  test("published page with agent_enabled=false is not exportable", async ({
    request,
  }) => {
    const title = "E2E Agent Metadata Published Not Enabled";
    const { node, workingCopyId } = await createNodeWithWorkingCopy(
      request,
      title,
    );
    await request.patch(`${API}/content/working-copies/${workingCopyId}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: {
        structuredFields: {
          ...VALID_AGENT_METADATA,
          agent_enabled: false,
          confidentiality: "public",
        },
      },
    });
    await publishWorkingCopy(request, workingCopyId, title);

    const res = await request.get(`${API}/copilot/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(404);
  });

  test("index-status endpoint requires manage_copilot_index_status permission", async ({
    request,
  }) => {
    const { node } = await createNodeWithWorkingCopy(
      request,
      "E2E Agent Metadata Index Status Perm",
    );

    const editorRes = await request.patch(
      `${API}/copilot/pages/${node.id}/index-status`,
      {
        headers: { "X-Dev-Principal-Id": EDITOR },
        data: { status: "indexed" },
      },
    );
    expect(editorRes.status()).toBe(403);

    const adminRes = await request.patch(
      `${API}/copilot/pages/${node.id}/index-status`,
      {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
        data: { status: "indexed" },
      },
    );
    expect(adminRes.status()).toBe(204);
  });
});
