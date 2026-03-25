import { test, expect } from "@playwright/test";

const API = "http://localhost:8080/api";
const HEADERS = {
  "Content-Type": "application/json",
  "X-Dev-Principal-Id": "00000000-0000-0000-0000-000000000001",
};

test.describe("Frontend UI – Browser interactions", () => {
  let parentId: string;
  let childId: string;

  test.beforeAll(async ({ request }) => {
    const parent = await (
      await request.post(`${API}/content/nodes`, {
        headers: HEADERS,
        data: { title: "UI Test Node", templateType: "area_overview" },
      })
    ).json();
    parentId = parent.id;

    const child = await (
      await request.post(`${API}/content/nodes`, {
        headers: HEADERS,
        data: {
          title: "UI Child Node",
          templateType: "process_page_text",
          parentNodeId: parentId,
        },
      })
    ).json();
    childId = child.id;
  });

  test("Hub renders heading and greeting", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1:has-text('Knowledge Hub')")).toBeVisible();
    await expect(page.locator("text=Willkommen, Dev Admin")).toBeVisible();
  });

  test("Hub sidebar shows root nodes and structure labels", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("text=Startseite")).toBeVisible();
    await expect(page.locator("text=Wissensstruktur")).toBeVisible();
    await expect(page.locator("aside >> text=UI Test Node")).toBeVisible();
  });

  test("Hub shows process cards grid", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Kernprozesse & Bereiche")).toBeVisible();
  });

  test("clicking card navigates to node detail", async ({ page }) => {
    await page.goto("/");
    await page
      .locator("[class*='grid'] >> div:has-text('UI Test Node')")
      .first()
      .click();
    await page.waitForURL(`**/node/${parentId}`);
    await expect(page.locator("h1:has-text('UI Test Node')")).toBeVisible();
  });

  test("node detail shows metadata", async ({ page }) => {
    await page.goto(`/node/${parentId}`);
    await expect(page.locator("text=Metadaten")).toBeVisible();
    await expect(page.locator("text=System-ID")).toBeVisible();
    await expect(page.locator("text=Display-Code")).toBeVisible();
    await expect(page.locator("text=Erstellt")).toBeVisible();
    await expect(page.locator("text=Aktualisiert")).toBeVisible();
  });

  test("node detail has breadcrumbs with Hub link", async ({ page }) => {
    await page.goto(`/node/${parentId}`);
    const nav = page.locator("nav");
    await expect(nav.locator("text=Hub")).toBeVisible();
    await expect(nav.locator(`text=UI Test Node`)).toBeVisible();
  });

  test("node detail lists children", async ({ page }) => {
    await page.goto(`/node/${parentId}`);
    await expect(page.locator("text=Unterseiten")).toBeVisible();
    await expect(page.locator("text=UI Child Node")).toBeVisible();
  });

  test("sidebar tree expansion reveals children", async ({ page }) => {
    await page.goto("/");
    const parentRow = page
      .locator("aside >> div:has-text('UI Test Node')")
      .first();
    const expandBtn = parentRow.locator("button").first();
    await expandBtn.click();
    await expect(page.locator("aside >> text=UI Child Node")).toBeVisible();
  });

  test("search input navigates to search page", async ({ page }) => {
    await page.goto("/");
    await page.locator("input[placeholder='Suchen...']").click();
    await expect(page).toHaveURL(/\/search/);
  });

  test("create dialog opens and closes", async ({ page }) => {
    await page.goto("/");
    await page.locator("text=Neu anlegen").click();
    await expect(page.locator("text=Neue Seite anlegen")).toBeVisible();
    await expect(page.locator("#create-title")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.locator("text=Neue Seite anlegen"),
    ).not.toBeVisible();
  });

  test("edit dialog updates node title", async ({ page }) => {
    await page.goto(`/node/${parentId}`);
    await expect(page.locator("h1:has-text('UI Test Node')")).toBeVisible();
    await page.locator("button:has-text('Bearbeiten')").click();
    await expect(page.locator("text=Seite bearbeiten")).toBeVisible();
    await page.locator("#edit-title").fill("UI Test Renamed");
    await page.locator("button:has-text('Speichern')").click();
    await expect(
      page.locator("h1:has-text('UI Test Renamed')"),
    ).toBeVisible();
    await page.locator("button:has-text('Bearbeiten')").click();
    await page.locator("#edit-title").fill("UI Test Node");
    await page.locator("button:has-text('Speichern')").click();
  });

  test("breadcrumb Hub link navigates home", async ({ page }) => {
    await page.goto(`/node/${parentId}`);
    await page.locator("nav >> text=Hub").click();
    await expect(page).toHaveURL("/");
    await expect(page.locator("h1:has-text('Knowledge Hub')")).toBeVisible();
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
