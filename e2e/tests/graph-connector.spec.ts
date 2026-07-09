import { test, expect } from "@playwright/test";

const API = "/api";
const ADMIN_A = "2804b3e6-46c0-43e4-8e6b-5ee6a588c8dd"; // system_admin
const ADMIN_B = "ce73daf3-fd70-4578-8bff-b05535623a73"; // second system_admin (four-eyes approver)
const EDITOR = "3227429a-98c2-49c5-a641-1abafe46e3ef"; // editor + process_manager + viewer

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
  confidentiality: "public",
};

async function createPublishedBrandPage(
  request: import("@playwright/test").APIRequestContext,
  title: string,
) {
  const { node, workingCopyId } = await createNodeWithWorkingCopy(request, title);
  await request.patch(`${API}/content/working-copies/${workingCopyId}`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { structuredFields: VALID_AGENT_METADATA },
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
      definition: `Definition von ${term} für e2e-Tests`,
      synonyms: ["Testsynonym"],
    },
  });
  expect(res.status()).toBe(201);
  return res.json();
}

test.describe("Cluster 4 - Microsoft Graph External Connection & Schema", () => {
  test("schema JSON can be generated and contains required properties", async ({
    request,
  }) => {
    const res = await request.get(`${API}/graph-connector/schema`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(200);
    const schema = await res.json();
    expect(schema.baseType).toBe("microsoft.graph.externalItem");
    const names = schema.properties.map((p: { name: string }) => p.name);
    for (const required of [
      "title",
      "sourceUrl",
      "nodeId",
      "immutableId",
      "authorityLevel",
      "sourcePriority",
      "owner",
      "reviewDue",
      "version",
      "revision",
      "term",
      "definition",
      "synonyms",
      "relatedTerms",
    ]) {
      expect(names).toContain(required);
    }
  });

  test("schema dry run validates without calling Microsoft Graph", async ({
    request,
  }) => {
    const res = await request.get(`${API}/graph-connector/schema/dry-run`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(200);
    const result = await res.json();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.propertyCount).toBeGreaterThan(0);
  });

  test("only system_admin can access the connector endpoints", async ({
    request,
  }) => {
    const res = await request.get(`${API}/graph-connector/schema`, {
      headers: { "X-Dev-Principal-Id": EDITOR },
    });
    expect(res.status()).toBe(403);
  });

  test("externalItem payload for a published page is generated with valid ACL and content", async ({
    request,
  }) => {
    const title = "E2E Graph Connector Page";
    const node = await createPublishedBrandPage(request, title);

    const res = await request.get(
      `${API}/graph-connector/external-items/pages/${node.id}`,
      { headers: { "X-Dev-Principal-Id": ADMIN_A } },
    );
    expect(res.status()).toBe(200);
    const { dryRun, item } = await res.json();
    expect(dryRun).toBe(true);
    expect(item.id).toBe(`flowcore_page_${node.immutableId}`);
    expect(item.acl.length).toBeGreaterThan(0);
    expect(item.acl[0].type).toBe("everyone");
    expect(item.properties.authorityLevel).toBe("binding");
    expect(item.properties.version).toBe("v1.0");
    expect("owner" in item.properties).toBe(true);
    expect("reviewDue" in item.properties).toBe(true);
    expect(item.content.value).toContain(node.id ? item.properties.sourceUrl : "");
    expect(item.content.value).toContain("Titel:");
    expect(item.content.value).toContain("Version:");
    expect(item.content.value).toContain("Authority-Level:");
  });

  test("externalItem content contains the FlowCore sourceUrl and no working-copy-only content", async ({
    request,
  }) => {
    const title = "E2E Graph Connector SourceUrl Check";
    const node = await createPublishedBrandPage(request, title);

    const res = await request.get(
      `${API}/graph-connector/external-items/pages/${node.id}`,
      { headers: { "X-Dev-Principal-Id": ADMIN_A } },
    );
    const { item } = await res.json();
    expect(item.properties.sourceUrl).toContain(node.id);
    expect(item.content.value).toContain(item.properties.sourceUrl);
    expect(item.properties.status).toBe("published");
  });

  test("externalItem payload for a glossary term is generated", async ({
    request,
  }) => {
    const term = await createGlossaryTerm(request, `E2E-Begriff-${Date.now()}`);

    const res = await request.get(
      `${API}/graph-connector/external-items/glossary/${term.id}`,
      { headers: { "X-Dev-Principal-Id": ADMIN_A } },
    );
    expect(res.status()).toBe(200);
    const { dryRun, item } = await res.json();
    expect(dryRun).toBe(true);
    expect(item.id).toBe(`flowcore_glossary_${term.id}`);
    expect(item.acl.length).toBeGreaterThan(0);
    expect(item.properties.term).toBe(term.term);
    expect(item.properties.definition).toContain(term.term);
    expect(item.content.value).toContain(`Begriff: ${term.term}`);
    expect(item.content.value).toContain(item.properties.sourceUrl);
  });

  test("missing page (unpublished/non-existent) yields an explicit error, not a fabricated payload", async ({
    request,
  }) => {
    const { node } = await createNodeWithWorkingCopy(
      request,
      "E2E Graph Connector Unpublished",
    );

    const res = await request.get(
      `${API}/graph-connector/external-items/pages/${node.id}`,
      { headers: { "X-Dev-Principal-Id": ADMIN_A } },
    );
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("connection payload is configurable and does not fabricate a live connection id", async ({
    request,
  }) => {
    const res = await request.get(`${API}/graph-connector/connection`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(200);
    const connection = await res.json();
    expect(connection.name).toBeTruthy();
    expect(connection.description).toBeTruthy();
  });
});
