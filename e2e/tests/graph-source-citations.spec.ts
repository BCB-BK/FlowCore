import { test, expect } from "@playwright/test";

const API = "/api";
const ADMIN_A = "2804b3e6-46c0-43e4-8e6b-5ee6a588c8dd"; // system_admin
const ADMIN_B = "ce73daf3-fd70-4578-8bff-b05535623a73"; // system_admin (four-eyes approver)
const VIEWER_ONLY = "bdb316ff-13be-4a10-a5f9-a821f81938b5"; // BildungsCampus - Übergreifend (viewer only)

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

async function createPublishedPage(
  request: import("@playwright/test").APIRequestContext,
  title: string,
  confidentiality: string = "internal",
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

  await request.patch(`${API}/content/working-copies/${wc.id}`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: {
      title,
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: title }] }],
      },
      structuredFields: {
        agent_enabled: true,
        agent_scope: ["global"],
        authority_level: "binding",
        source_priority: 2,
        brand_scope: ["BCB"],
        decision_status: "decided",
        copilot_summary: "Testzusammenfassung",
        copilot_keywords: ["test"],
        confidentiality,
      },
    },
  });
  await request.post(`${API}/content/working-copies/${wc.id}/submit`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { comment: "e2e" },
  });
  await request.post(`${API}/content/working-copies/${wc.id}/approve`, {
    headers: { "X-Dev-Principal-Id": ADMIN_B },
    data: { comment: "e2e" },
  });
  await request.post(`${API}/content/working-copies/${wc.id}/publish`, {
    headers: { "X-Dev-Principal-Id": ADMIN_B },
    data: { versionLabel: "v1.0" },
  });
  return node;
}

test.describe("Cluster 10 - Source URL, Citations und Search Result Quality", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ request }) => {
    await setMockMode(request, true);
  });

  test("page externalItem payload carries a full citation field set + Quellenblock", async ({
    request,
  }) => {
    const node = await createPublishedPage(request, "Cluster10 Quellen-Test Seite");

    const syncRes = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: true },
    });
    expect(syncRes.status()).toBe(200);
    const body = await syncRes.json();
    expect(body.status).toBe("dry_run");
    const props = body.item.properties;

    for (const key of [
      "sourceUrl",
      "title",
      "displayCode",
      "version",
      "revision",
      "authorityLevel",
      "immutableId",
      "lastModifiedAt",
    ]) {
      expect(props[key], `expected properties.${key} to be set`).toBeTruthy();
    }

    const content: string = body.item.content.value;
    expect(content).toContain("Quellenblock:");
    expect(content).toContain(`Quelle: ${props.sourceUrl}`);
    expect(content).toContain(`FlowCore-ID: ${props.immutableId}`);
    expect(content).toContain("Version:");
    expect(content).toContain("Revision:");
    expect(content).toContain("Authority:");
    expect(content).toContain("Review fällig:");
  });

  test("glossary externalItem payload carries its own source + Quellenblock", async ({
    request,
  }) => {
    const glossaryRes = await request.post(`${API}/glossary`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: {
        term: `Cluster10-Testbegriff-${Date.now()}`,
        definition: "Ein Testbegriff für den Quellenblock-Nachweis.",
      },
    });
    expect(glossaryRes.status()).toBe(201);
    const term = await glossaryRes.json();

    const syncRes = await request.post(`${API}/graph-connector/sync/glossary/${term.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: true },
    });
    expect(syncRes.status()).toBe(200);
    const body = await syncRes.json();
    expect(body.status).toBe("dry_run");
    const props = body.item.properties;

    expect(props.sourceUrl).toBeTruthy();
    expect(props.displayCode).toBeTruthy();
    expect(props.lastModifiedAt).toBeTruthy();

    const content: string = body.item.content.value;
    expect(content).toContain("Quellenblock:");
    expect(content).toContain(`Quelle: ${props.sourceUrl}`);
    expect(content).toContain(`FlowCore-ID: ${props.displayCode}`);
  });

  test("unauthorized user cannot open the source node (confidentiality-gated)", async ({
    request,
  }) => {
    const node = await createPublishedPage(
      request,
      "Cluster10 Vertraulich-Test Seite",
      "confidential",
    );

    const forbidden = await request.get(`${API}/content/nodes/${node.id}`, {
      headers: { "X-Dev-Principal-Id": VIEWER_ONLY },
    });
    expect(forbidden.status()).toBe(403);

    const allowed = await request.get(`${API}/content/nodes/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_B },
    });
    expect(allowed.status()).toBe(200);
  });

  test("search result template prep exposes the required field mapping", async ({ request }) => {
    const res = await request.get(`${API}/graph-connector/search-result-template`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("manual_setup_required");
    const labels = body.fields.map((f: { label: string }) => f.label);
    for (const label of [
      "Titel",
      "Kurzbeschreibung",
      "FlowCore-ID",
      "Version",
      "Owner",
      "ReviewDue",
      "SourceUrl",
    ]) {
      expect(labels).toContain(label);
    }
  });
});
