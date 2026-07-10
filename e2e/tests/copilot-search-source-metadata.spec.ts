import { test, expect } from "@playwright/test";

const API = "/api";
const ADMIN_A = "2804b3e6-46c0-43e4-8e6b-5ee6a588c8dd"; // system_admin

/**
 * Task 4 - "Quellenblock-freundliche Metadaten normalisieren": verifies
 * that the connector's default response shapes lead with human-facing
 * source metadata (displayCode, title, sourceUrl/url, version, ownerName)
 * and do NOT surface the raw node UUID, `status: published`, or
 * `sourcePriority` as top-level/default fields — those must only appear
 * nested under `technical`, for follow-up lookups or conflict resolution.
 */

let apiKey: string;

test.beforeAll(async ({ request }) => {
  const keyRes = await request.post(`${API}/copilot/admin/keys`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { name: "e2e-source-metadata-test", agentScopes: [], brandScopes: [] },
  });
  expect(keyRes.status()).toBe(201);
  apiKey = (await keyRes.json()).apiKey;
});

test("search results lead with human-facing source metadata, not UUID/status/sourcePriority", async ({
  request,
}) => {
  const res = await request.post(`${API}/copilot/search`, {
    headers: { "X-FlowCore-Api-Key": apiKey },
    data: { query: "Produkt", limit: 10 },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.results.length).toBeGreaterThan(0);

  for (const result of body.results) {
    expect(result).toHaveProperty("displayCode");
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("version");
    expect(result).toHaveProperty("ownerName");

    // Not part of the default citation shape.
    expect(result).not.toHaveProperty("nodeId");
    expect(result).not.toHaveProperty("status");
    expect(result).not.toHaveProperty("sourcePriority");

    // Still technically available, but namespaced away from the default.
    expect(result.technical).toHaveProperty("nodeId");
    expect(result.technical).toHaveProperty("sourcePriority");
  }
});

test("node lookup response leads with displayCode/title/sourceUrl/version/ownerName and hides UUID/status/sourcePriority by default", async ({
  request,
}) => {
  const searchRes = await request.post(`${API}/copilot/search`, {
    headers: { "X-FlowCore-Api-Key": apiKey },
    data: { query: "Struktur", limit: 10 },
  });
  const searchBody = await searchRes.json();
  const pageResult = (searchBody.results as Array<{ itemType: string; technical: { nodeId: string } }>).find(
    (r) => r.itemType === "flowcore_page",
  );
  expect(pageResult).toBeTruthy();
  const nodeId = pageResult!.technical.nodeId;

  const nodeRes = await request.get(`${API}/copilot/nodes/${nodeId}`, {
    headers: { "X-FlowCore-Api-Key": apiKey },
  });
  expect(nodeRes.status()).toBe(200);
  const node = await nodeRes.json();

  expect(node).toHaveProperty("displayCode");
  expect(node).toHaveProperty("title");
  expect(node).toHaveProperty("sourceUrl");
  expect(node).toHaveProperty("version");
  expect(node).toHaveProperty("ownerName");

  expect(node).not.toHaveProperty("nodeId");
  expect(node).not.toHaveProperty("status");
  expect(node).not.toHaveProperty("sourcePriority");
  expect(node).not.toHaveProperty("revision");

  expect(node.technical).toHaveProperty("nodeId", nodeId);
  expect(node.technical).toHaveProperty("revision");
  expect(node.technical).toHaveProperty("sourcePriority");
});
