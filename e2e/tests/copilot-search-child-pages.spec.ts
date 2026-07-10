import { test, expect } from "@playwright/test";

const API = "/api";
const ADMIN_A = "2804b3e6-46c0-43e4-8e6b-5ee6a588c8dd"; // system_admin

/**
 * Task 5 - "Unterseiten und Detailseiten exportfähig machen": verifies that
 * an overview page's node response tells Copilot both WHAT its child pages
 * are (title/displayCode/pageType/shortDescription/sourceUrl) and WHY they
 * matter for the current question — a ready-to-use German guidance sentence
 * equivalent to "Die Detailseiten behandeln die konkrete Ausarbeitung."
 */

let apiKey: string;

test.beforeAll(async ({ request }) => {
  const keyRes = await request.post(`${API}/copilot/admin/keys`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { name: "e2e-child-pages-test", agentScopes: [], brandScopes: [] },
  });
  expect(keyRes.status()).toBe(201);
  apiKey = (await keyRes.json()).apiKey;
});

test("overview page node response exposes structured child pages and fachliche guidance", async ({
  request,
}) => {
  const searchRes = await request.post(`${API}/copilot/search`, {
    headers: { "X-FlowCore-Api-Key": apiKey },
    data: { query: "Struktur", limit: 10 },
  });
  expect(searchRes.status()).toBe(200);
  const searchBody = await searchRes.json();

  let overviewNode: any = null;
  for (const result of searchBody.results as Array<{
    itemType: string;
    technical: { nodeId: string };
  }>) {
    if (result.itemType !== "flowcore_page") continue;
    const nodeRes = await request.get(
      `${API}/copilot/nodes/${result.technical.nodeId}`,
      { headers: { "X-FlowCore-Api-Key": apiKey } },
    );
    if (nodeRes.status() !== 200) continue;
    const node = await nodeRes.json();
    if (node.hasChildren) {
      overviewNode = node;
      break;
    }
  }

  expect(overviewNode).toBeTruthy();
  expect(overviewNode.childPageCount).toBeGreaterThan(0);

  // Either the full list or the truncated sample must be present, never both
  // silently empty.
  const list = overviewNode.childPages ?? overviewNode.topChildPages;
  expect(Array.isArray(list)).toBe(true);
  expect(list.length).toBeGreaterThan(0);

  for (const child of list) {
    expect(child).toHaveProperty("title");
    expect(child).toHaveProperty("displayCode");
    expect(child).toHaveProperty("pageType");
    expect(child).toHaveProperty("shortDescription");
    expect(child).toHaveProperty("sourceUrl");
  }

  if (overviewNode.childPages === null) {
    expect(typeof overviewNode.childPagesSearchHint).toBe("string");
  } else {
    expect(overviewNode.childPagesSearchHint).toBeNull();
  }

  // The DoD requirement: Copilot must be able to state that detail pages
  // carry the concrete elaboration — verify the ready-to-use sentence is
  // present and mentions "Detailseiten"/"Ausarbeitung".
  expect(typeof overviewNode.childPagesGuidance).toBe("string");
  expect(overviewNode.childPagesGuidance).toContain("Detailseiten");
  expect(overviewNode.childPagesGuidance).toContain("Ausarbeitung");
});

test("page without children has no child-page guidance", async ({
  request,
}) => {
  const searchRes = await request.post(`${API}/copilot/search`, {
    headers: { "X-FlowCore-Api-Key": apiKey },
    data: { query: "Struktur", limit: 10 },
  });
  const searchBody = await searchRes.json();

  let leafNode: any = null;
  for (const result of searchBody.results as Array<{
    itemType: string;
    technical: { nodeId: string };
  }>) {
    if (result.itemType !== "flowcore_page") continue;
    const nodeRes = await request.get(
      `${API}/copilot/nodes/${result.technical.nodeId}`,
      { headers: { "X-FlowCore-Api-Key": apiKey } },
    );
    if (nodeRes.status() !== 200) continue;
    const node = await nodeRes.json();
    if (!node.hasChildren) {
      leafNode = node;
      break;
    }
  }

  expect(leafNode).toBeTruthy();
  expect(leafNode.childPageCount).toBe(0);
  expect(leafNode.childPages).toEqual([]);
  expect(leafNode.topChildPages).toBeNull();
  expect(leafNode.childPagesSearchHint).toBeNull();
  expect(leafNode.childPagesGuidance).toBeNull();
});
