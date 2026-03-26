import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SHAREPOINT_HOSTNAME = "bildungscampusbacknang.sharepoint.com";
const OUTPUT_DIR = path.resolve(
  import.meta.dirname ?? process.cwd(),
  "../../sharepoint-export",
);

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface SitePage {
  id: string;
  title: string;
  name: string;
  webUrl: string;
  description?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

interface PageCollection {
  value: SitePage[];
  "@odata.nextLink"?: string;
}

interface WebPart {
  "@odata.type"?: string;
  innerHtml?: string;
  data?: unknown;
}

interface CanvasColumn {
  id: string;
  width: number;
}

interface HorizontalSection {
  id: string;
  columns: (CanvasColumn & { webparts: WebPart[] })[];
}

interface CanvasLayout {
  horizontalSections?: HorizontalSection[];
}

interface SitePageDetail extends SitePage {
  canvasLayout?: CanvasLayout;
}

async function acquireToken(): Promise<string> {
  const tenantId = process.env["ENTRA_TENANT_ID"];
  const clientId = process.env["ENTRA_CLIENT_ID"];
  const clientSecret = process.env["ENTRA_CLIENT_SECRET"];

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Missing environment variables: ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET",
    );
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token acquisition failed (${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as TokenResponse;
  return data.access_token;
}

async function graphGet<T>(
  token: string,
  url: string,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (resp.ok) {
      return resp.json() as Promise<T>;
    }

    if (
      (resp.status === 429 || resp.status >= 500) &&
      attempt < maxRetries
    ) {
      const retryAfter = resp.headers.get("Retry-After");
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : Math.min(1000 * 2 ** attempt, 30000);
      console.warn(
        `  [RETRY] ${resp.status} for ${url} – waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    const text = await resp.text();
    throw new Error(`Graph API error (${resp.status}) ${url}: ${text}`);
  }

  throw new Error(`Graph API: max retries exceeded for ${url}`);
}

async function resolveSiteId(token: string): Promise<string> {
  const url = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_HOSTNAME}:/`;
  const site = await graphGet<{ id: string; displayName: string }>(token, url);
  console.log(`Resolved site: "${site.displayName}" (${site.id})`);
  return site.id;
}

async function listAllPages(
  token: string,
  siteId: string,
): Promise<SitePage[]> {
  const pages: SitePage[] = [];
  let nextUrl: string | undefined =
    `https://graph.microsoft.com/v1.0/sites/${siteId}/pages?$select=id,title,name,webUrl,description,createdDateTime,lastModifiedDateTime&$top=50`;

  while (nextUrl) {
    const result: PageCollection = await graphGet<PageCollection>(token, nextUrl);
    pages.push(...result.value);
    nextUrl = result["@odata.nextLink"];
  }

  return pages;
}

async function getPageContent(
  token: string,
  siteId: string,
  pageId: string,
): Promise<SitePageDetail> {
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/pages/${pageId}/microsoft.graph.sitePage?$expand=canvasLayout`;
  return graphGet<SitePageDetail>(token, url);
}

function extractHtmlFromWebParts(webparts: WebPart[]): string {
  const htmlParts: string[] = [];
  for (const wp of webparts) {
    if (wp.innerHtml) {
      htmlParts.push(wp.innerHtml);
    } else if (wp.data) {
      htmlParts.push(
        `<pre>${escapeHtml(JSON.stringify(wp.data, null, 2))}</pre>`,
      );
    }
  }
  return htmlParts.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(page: SitePageDetail): string {
  const title = page.title || page.name || "Untitled";
  const sections: string[] = [];

  if (page.canvasLayout?.horizontalSections) {
    for (const section of page.canvasLayout.horizontalSections) {
      const columnHtmls: string[] = [];
      for (const col of section.columns) {
        if (col.webparts && col.webparts.length > 0) {
          columnHtmls.push(extractHtmlFromWebParts(col.webparts));
        }
      }
      if (columnHtmls.length > 0) {
        sections.push(`<section>\n${columnHtmls.join("\n")}\n</section>`);
      }
    }
  }

  const body =
    sections.length > 0
      ? sections.join("\n\n")
      : "<p><em>No canvas content available for this page.</em></p>";

  const meta: string[] = [];
  if (page.description) meta.push(`<p><em>${escapeHtml(page.description)}</em></p>`);
  if (page.createdDateTime) meta.push(`<p>Created: ${page.createdDateTime}</p>`);
  if (page.lastModifiedDateTime)
    meta.push(`<p>Last modified: ${page.lastModifiedDateTime}</p>`);
  if (page.webUrl) meta.push(`<p>Source: <a href="${escapeHtml(page.webUrl)}">${escapeHtml(page.webUrl)}</a></p>`);

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #333; }
    h1 { border-bottom: 2px solid #0078d4; padding-bottom: 0.5rem; }
    section { margin: 1.5rem 0; }
    .meta { color: #666; font-size: 0.9em; border-top: 1px solid #ddd; padding-top: 1rem; margin-top: 2rem; }
    pre { background: #f4f4f4; padding: 1rem; overflow-x: auto; border-radius: 4px; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${body}
  <div class="meta">
    ${meta.join("\n    ")}
  </div>
</body>
</html>`;
}

function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 200);
}

async function main() {
  console.log("SharePoint Site Pages Export");
  console.log("===========================\n");

  console.log("Acquiring access token...");
  const token = await acquireToken();
  console.log("Token acquired.\n");

  console.log(`Resolving site: ${SHAREPOINT_HOSTNAME}`);
  const siteId = await resolveSiteId(token);

  console.log("\nListing all Site Pages...");
  const pages = await listAllPages(token, siteId);
  console.log(`Found ${pages.length} page(s).\n`);

  if (pages.length === 0) {
    console.log("No pages to export.");
    return;
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  let exported = 0;
  let failed = 0;
  const usedNames = new Set<string>();

  for (const page of pages) {
    const title = page.title || page.name || `page-${page.id}`;
    try {
      const detail = await getPageContent(token, siteId, page.id);
      const html = buildHtml(detail);

      let filename = sanitizeFilename(title) || `page-${page.id}`;
      if (usedNames.has(filename.toLowerCase())) {
        filename = `${filename}_${page.id}`;
      }
      usedNames.add(filename.toLowerCase());

      const filePath = path.join(OUTPUT_DIR, `${filename}.html`);
      await writeFile(filePath, html, "utf-8");
      console.log(`  [OK] ${title} -> ${filename}.html`);
      exported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [FAIL] ${title}: ${msg}`);
      failed++;
    }
  }

  console.log("\n===========================");
  console.log(`Export complete.`);
  console.log(`  Total pages: ${pages.length}`);
  console.log(`  Exported:    ${exported}`);
  console.log(`  Failed:      ${failed}`);
  console.log(`  Output dir:  ${OUTPUT_DIR}`);

  if (failed > 0) {
    console.log(
      "\nNote: If pages failed with 403 Forbidden, ensure the Entra app registration",
    );
    console.log(
      "has the following Microsoft Graph application permissions granted with admin consent:",
    );
    console.log("  - Sites.Read.All (required for /sites and /pages endpoints)");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
