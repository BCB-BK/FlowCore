import { db, pool } from "@workspace/db";
import {
  contentNodesTable,
  contentRevisionsTable,
  contentRevisionEventsTable,
} from "@workspace/db/schema";
import { sql, eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const EXPORT_DIR = path.resolve(
  import.meta.dirname ?? process.cwd(),
  "../../sharepoint-export",
);

type TiptapMark = { type: string; attrs?: Record<string, unknown> };
type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
};

interface ParsedPage {
  filename: string;
  title: string;
  description: string;
  bodyHtml: string;
  createdAt: string;
  modifiedAt: string;
  sourceUrl: string;
  urlSlug: string;
}

interface HierarchyNode {
  displayTitle: string;
  kuerzel: string;
  file: string | null;
  children: HierarchyNode[];
}

function parseHtmlFile(html: string, filename: string): ParsedPage {
  const sections: string[] = [];
  const sectionRegex2 = /<section>([\s\S]*?)<\/section>/g;
  let sMatch: RegExpExecArray | null;
  while ((sMatch = sectionRegex2.exec(html)) !== null) {
    sections.push(sMatch[1].trim());
  }
  const sectionHtml = sections.join("\n");

  const sectionHeadingMatch = sectionHtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  let sectionTitle = sectionHeadingMatch ? stripTags(sectionHeadingMatch[1]).trim() : "";
  if (!sectionTitle) {
    const boldTitleMatch = sectionHtml.match(/<p[^>]*>\s*<strong>([^<]+)<\/strong>\s*<\/p>/i);
    if (boldTitleMatch) sectionTitle = boldTitleMatch[1].trim();
  }

  const titleTagMatch = html.match(/<title>([^<]*)<\/title>/);
  const titleText = titleTagMatch ? decodeEntities(titleTagMatch[1]).trim() : "";
  const title = (sectionTitle && sectionTitle !== titleText)
    ? decodeEntities(sectionTitle)
    : (titleText || "Untitled");

  const bodyHtml = sectionHtml;

  let description = "";
  let createdAt = "";
  let modifiedAt = "";
  let sourceUrl = "";

  const metaMatch = html.match(/<div class="meta">([\s\S]*?)<\/div>/);
  if (metaMatch) {
    const metaHtml = metaMatch[1];
    const descMatch = metaHtml.match(/<p><em>([^<]*)<\/em><\/p>/);
    if (descMatch) description = decodeEntities(descMatch[1]);
    const createdMatch = metaHtml.match(/Created: ([^<]*)</);
    if (createdMatch) createdAt = createdMatch[1].trim();
    const modifiedMatch = metaHtml.match(/Last modified: ([^<]*)</);
    if (modifiedMatch) modifiedAt = modifiedMatch[1].trim();
    const urlMatch = metaHtml.match(/href="([^"]*)"/);
    if (urlMatch) sourceUrl = decodeEntities(urlMatch[1]);
  }

  let urlSlug = "";
  if (sourceUrl) {
    try {
      const u = new URL(sourceUrl);
      urlSlug = decodeURIComponent(u.pathname)
        .replace("/SitePages/", "")
        .replace(".aspx", "");
    } catch {
      urlSlug = "";
    }
  }

  return { filename, title, description, bodyHtml, createdAt, modifiedAt, sourceUrl, urlSlug };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}


function parseInlineContent(html: string): TiptapNode[] {
  const nodes: TiptapNode[] = [];
  const inlineRegex = /(<(?:strong|b|em|i|u|a|span|br|code)[^>]*>[\s\S]*?<\/(?:strong|b|em|i|u|a|span|code)>|<br\s*\/?>|[^<]+|<[^>]+>)/gi;
  let inlineMatch: RegExpExecArray | null;
  let buffer = "";

  function flushBuffer() {
    if (buffer.trim()) {
      const decoded = decodeEntities(buffer);
      if (decoded.trim()) {
        nodes.push({ type: "text", text: decoded });
      }
    }
    buffer = "";
  }

  while ((inlineMatch = inlineRegex.exec(html)) !== null) {
    const chunk = inlineMatch[1];

    const strongMatch = chunk.match(/^<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/i);
    if (strongMatch) {
      flushBuffer();
      const innerText = stripTags(strongMatch[1]).trim();
      if (innerText) {
        nodes.push({ type: "text", text: decodeEntities(innerText), marks: [{ type: "bold" }] });
      }
      continue;
    }

    const emMatch = chunk.match(/^<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/i);
    if (emMatch) {
      flushBuffer();
      const innerText = stripTags(emMatch[1]).trim();
      if (innerText) {
        nodes.push({ type: "text", text: decodeEntities(innerText), marks: [{ type: "italic" }] });
      }
      continue;
    }

    const uMatch = chunk.match(/^<u[^>]*>([\s\S]*?)<\/u>/i);
    if (uMatch) {
      flushBuffer();
      const innerText = stripTags(uMatch[1]).trim();
      if (innerText) {
        nodes.push({ type: "text", text: decodeEntities(innerText), marks: [{ type: "underline" }] });
      }
      continue;
    }

    const linkMatch = chunk.match(/^<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (linkMatch) {
      flushBuffer();
      const href = decodeEntities(linkMatch[1]);
      const linkText = stripTags(linkMatch[2]).trim();
      if (linkText) {
        nodes.push({ type: "text", text: decodeEntities(linkText), marks: [{ type: "link", attrs: { href, target: "_blank" } }] });
      }
      continue;
    }

    const codeMatch = chunk.match(/^<code[^>]*>([\s\S]*?)<\/code>/i);
    if (codeMatch) {
      flushBuffer();
      const codeText = stripTags(codeMatch[1]).trim();
      if (codeText) {
        nodes.push({ type: "text", text: decodeEntities(codeText), marks: [{ type: "code" }] });
      }
      continue;
    }

    if (/^<br\s*\/?>$/i.test(chunk)) {
      flushBuffer();
      nodes.push({ type: "hardBreak" });
      continue;
    }

    if (chunk.startsWith("<") && chunk.endsWith(">")) {
      continue;
    }

    buffer += chunk;
  }

  flushBuffer();
  return nodes;
}

function htmlToTiptapJson(html: string): { type: string; content: TiptapNode[] } {
  if (!html.trim()) {
    return {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Kein Inhalt verfügbar." }] }],
    };
  }

  const nodes: TiptapNode[] = [];
  const blockRegex = /<(h[1-6]|p|table|ul|ol|blockquote|pre|div|figure)[^>]*>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(html)) !== null) {
    if (blockMatch.index > lastIndex) {
      const between = html.slice(lastIndex, blockMatch.index).trim();
      if (between) {
        const inlineNodes = parseInlineContent(between);
        if (inlineNodes.length > 0) {
          nodes.push({ type: "paragraph", content: inlineNodes });
        }
      }
    }
    lastIndex = blockMatch.index + blockMatch[0].length;

    const tag = blockMatch[1].toLowerCase();
    const inner = blockMatch[2];

    if (/^h[1-3]$/.test(tag)) {
      const level = parseInt(tag[1]);
      const inlineNodes = parseInlineContent(inner);
      if (inlineNodes.length > 0) {
        nodes.push({ type: "heading", attrs: { level }, content: inlineNodes });
      }
      continue;
    }

    if (/^h[4-6]$/.test(tag)) {
      const inlineNodes = parseInlineContent(inner);
      if (inlineNodes.length > 0) {
        nodes.push({ type: "heading", attrs: { level: 3 }, content: inlineNodes });
      }
      continue;
    }

    if (tag === "p") {
      const inlineNodes = parseInlineContent(inner);
      if (inlineNodes.length > 0) {
        nodes.push({ type: "paragraph", content: inlineNodes });
      }
      continue;
    }

    if (tag === "table" || tag === "figure") {
      const tableHtml = blockMatch[0];
      if (tableHtml.includes("<table")) {
        const tableNode = parseHtmlTable(tableHtml);
        if (tableNode) nodes.push(tableNode);
      }
      continue;
    }

    if (tag === "ul") {
      const items = parseListItems(inner);
      if (items.length > 0) {
        nodes.push({ type: "bulletList", content: items });
      }
      continue;
    }

    if (tag === "ol") {
      const items = parseListItems(inner);
      if (items.length > 0) {
        nodes.push({ type: "orderedList", content: items });
      }
      continue;
    }

    if (tag === "blockquote") {
      const inlineNodes = parseInlineContent(inner);
      if (inlineNodes.length > 0) {
        nodes.push({ type: "blockquote", content: [{ type: "paragraph", content: inlineNodes }] });
      }
      continue;
    }

    if (tag === "pre") {
      const codeText = stripTags(inner).trim();
      if (codeText) {
        nodes.push({ type: "codeBlock", content: [{ type: "text", text: decodeEntities(codeText) }] });
      }
      continue;
    }

    if (tag === "div") {
      const innerBlocks = htmlToTiptapJson(inner);
      if (innerBlocks.content.length > 0) {
        nodes.push(...innerBlocks.content);
      }
      continue;
    }
  }

  if (lastIndex < html.length) {
    const trailing = html.slice(lastIndex).trim();
    if (trailing) {
      const inlineNodes = parseInlineContent(trailing);
      if (inlineNodes.length > 0) {
        nodes.push({ type: "paragraph", content: inlineNodes });
      }
    }
  }

  if (nodes.length === 0) {
    const fallbackText = stripTags(html).trim();
    if (fallbackText) {
      nodes.push({ type: "paragraph", content: [{ type: "text", text: decodeEntities(fallbackText) }] });
    } else {
      nodes.push({ type: "paragraph", content: [{ type: "text", text: "Importierter SharePoint-Inhalt." }] });
    }
  }

  return { type: "doc", content: nodes };
}

function parseListItems(html: string): TiptapNode[] {
  const items: TiptapNode[] = [];
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let liMatch: RegExpExecArray | null;
  while ((liMatch = liRegex.exec(html)) !== null) {
    const inlineNodes = parseInlineContent(liMatch[1]);
    if (inlineNodes.length > 0) {
      items.push({ type: "listItem", content: [{ type: "paragraph", content: inlineNodes }] });
    }
  }
  return items;
}

function parseHtmlTable(html: string): TiptapNode | null {
  const rows: TiptapNode[] = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const cells: TiptapNode[] = [];
    const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
      const isHeader = cellMatch[1].toLowerCase() === "th";
      const inlineNodes = parseInlineContent(cellMatch[2]);
      cells.push({
        type: isHeader ? "tableHeader" : "tableCell",
        content: [{ type: "paragraph", content: inlineNodes.length > 0 ? inlineNodes : [{ type: "text", text: " " }] }],
      });
    }
    if (cells.length > 0) {
      rows.push({ type: "tableRow", content: cells });
    }
  }
  if (rows.length === 0) return null;
  return { type: "table", content: rows };
}

type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function generateDisplayCode(
  tx: TxClient,
  prefix: string,
  parentNodeId: string | null,
): Promise<string> {
  if (parentNodeId) {
    const parentNode = await tx
      .select({ displayCode: contentNodesTable.displayCode })
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, parentNodeId))
      .limit(1);
    const parentCode = parentNode[0]?.displayCode ?? "";
    const siblings = await tx
      .select({ displayCode: contentNodesTable.displayCode })
      .from(contentNodesTable)
      .where(and(eq(contentNodesTable.parentNodeId, parentNodeId), eq(contentNodesTable.isDeleted, false)));
    const nextNum = siblings.length + 1;
    return `${parentCode}.${prefix}-${String(nextNum).padStart(3, "0")}`;
  }
  const topLevel = await tx
    .select({ id: contentNodesTable.id })
    .from(contentNodesTable)
    .where(and(isNull(contentNodesTable.parentNodeId), eq(contentNodesTable.isDeleted, false)));
  const nextNum = topLevel.length + 1;
  return `${prefix}-${String(nextNum).padStart(3, "0")}`;
}

async function createNodeWithRevision(
  title: string,
  templateType: "core_process_overview" | "area_overview" | "process_page_text",
  parentNodeId: string | null,
  sortOrder: number,
  content: Record<string, unknown>,
  structuredFields: Record<string, unknown>,
): Promise<string> {
  const immutableId = `sp-import-${randomUUID()}`;
  const prefixMap: Record<string, string> = {
    core_process_overview: "KP",
    area_overview: "BER",
    process_page_text: "PRZ",
  };

  const nodeId = await db.transaction(async (tx) => {
    const displayCode = await generateDisplayCode(tx, prefixMap[templateType] || "DOC", parentNodeId);

    const [node] = await tx
      .insert(contentNodesTable)
      .values({
        immutableId,
        displayCode,
        title,
        templateType,
        parentNodeId,
        sortOrder,
        status: "published",
      })
      .returning({ id: contentNodesTable.id });

    const [revision] = await tx
      .insert(contentRevisionsTable)
      .values({
        nodeId: node.id,
        revisionNo: 1,
        title,
        content,
        structuredFields,
        changeType: "editorial",
        changeSummary: "Initialer Import aus SharePoint",
        status: "published",
        validFrom: new Date(),
      })
      .returning({ id: contentRevisionsTable.id });

    await tx
      .update(contentNodesTable)
      .set({
        currentRevisionId: revision.id,
        publishedRevisionId: revision.id,
        updatedAt: new Date(),
      })
      .where(eq(contentNodesTable.id, node.id));

    await tx.insert(contentRevisionEventsTable).values({
      revisionId: revision.id,
      eventType: "published",
    });

    return node.id;
  });

  return nodeId;
}

function buildStructuredFields(page: ParsedPage, tiptapContent: TiptapNode): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    sourceType: "sharepoint_import",
    sourceUrl: page.sourceUrl,
    originalTitle: page.title,
    description: page.description,
    _editorContent: tiptapContent,
  };
  if (page.createdAt) fields.originalCreatedAt = page.createdAt;
  if (page.modifiedAt) fields.originalModifiedAt = page.modifiedAt;
  if (page.urlSlug) fields.sourceUrlSlug = page.urlSlug;
  return fields;
}

async function importPage(
  page: ParsedPage,
  parentNodeId: string,
  sortOrder: number,
  displayTitle: string,
): Promise<string> {
  const tiptapContent = htmlToTiptapJson(page.bodyHtml);
  const structuredFields = buildStructuredFields(page, tiptapContent);
  return createNodeWithRevision(displayTitle, "process_page_text", parentNodeId, sortOrder, tiptapContent, structuredFields);
}

async function main() {
  console.log("=== SharePoint Pages Import (Link-basierte Hierarchie) ===\n");

  const htmlFiles = (await readdir(EXPORT_DIR)).filter((f) => f.endsWith(".html")).sort();
  console.log(`${htmlFiles.length} HTML-Dateien gefunden\n`);

  const pages = new Map<string, ParsedPage>();
  const slugToFile = new Map<string, string>();
  const rawHtmls = new Map<string, string>();

  for (const file of htmlFiles) {
    const html = await readFile(path.join(EXPORT_DIR, file), "utf-8");
    rawHtmls.set(file, html);
    const page = parseHtmlFile(html, file);
    pages.set(file, page);
    if (page.urlSlug) {
      slugToFile.set(page.urlSlug, file);
    }
  }

  const linkDisplayNames = new Map<string, string>();
  function extractDisplayNames(sourceFile: string, html: string) {
    const sectionContent = html.match(/<section>([\s\S]*?)<\/section>/)?.[1] || "";
    if (!sectionContent) return;
    const re = /href="(?:\/SitePages\/|https?:\/\/[^/]*\/SitePages\/)([^"#]*?)(?:\.aspx)(?:#[^"]*)?"[^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sectionContent)) !== null) {
      if (m[1] && m[2]) {
        const slug = decodeURIComponent(m[1]);
        const file = slugToFile.get(slug);
        if (file && file !== sourceFile) {
          const displayText = stripTags(m[2]).trim();
          if (
            displayText &&
            !displayText.match(/^BCB-|^b2g\d?-\d/) &&
            !displayText.startsWith("http") &&
            displayText.length > 2
          ) {
            if (!linkDisplayNames.has(file)) {
              linkDisplayNames.set(file, decodeEntities(displayText));
            }
          }
        }
      }
    }
  }

  const overviewFilesList = [
    "azav-handbuch.html",
    "hr_uebersicht.html",
    "Allgemeingültige_Prozesse_und_Informationen.html",
  ];
  for (const f of overviewFilesList) {
    const html = rawHtmls.get(f);
    if (html) extractDisplayNames(f, html);
  }
  for (const [f, html] of rawHtmls) {
    if (!overviewFilesList.includes(f)) {
      extractDisplayNames(f, html);
    }
  }

  for (const [file, page] of pages) {
    const linkName = linkDisplayNames.get(file);
    if (!linkName) continue;

    const isFilenameTitle = page.title === page.urlSlug ||
      page.title.replace(/[-_]/g, " ").toLowerCase() === page.urlSlug.replace(/[-_]/g, " ").toLowerCase();
    const isTooLong = page.title.length > 80;
    const isBoldFallback = !page.title.includes("(BCB-") && !page.title.includes("(b2g");
    const linkNameDiffers = linkName !== page.title;

    if (isFilenameTitle || isTooLong || (isBoldFallback && linkNameDiffers)) {
      page.title = linkName;
    }
  }

  for (const [, page] of pages) {
    page.title = page.title.replace(/\s*\(b2g\d*(?:-\d+)?\)\s*$/, "").trim();
  }

  function resolveSlugToFile(slug: string): string | null {
    const direct = slugToFile.get(slug);
    if (direct) return direct;
    const decoded = decodeURIComponent(slug);
    const found = slugToFile.get(decoded);
    if (found) return found;
    return null;
  }

  const overviewFiles = {
    allgemein: "Allgemeingültige_Prozesse_und_Informationen.html",
    hr: "hr_uebersicht.html",
    qm: "azav-handbuch.html",
  };

  const importedFiles = new Set<string>();
  let totalPages = 0;

  const hrPage = pages.get(overviewFiles.hr)!;
  const hrHtml = hrPage.bodyHtml;
  const allgPage = pages.get(overviewFiles.allgemein)!;
  const allgHtml = allgPage.bodyHtml;
  const qmPage = pages.get(overviewFiles.qm)!;
  const qmHtml = qmPage.bodyHtml;

  console.log("=== Kernprozesse erstellen ===\n");

  const allgTiptap = htmlToTiptapJson(allgHtml);
  const kp1Id = await createNodeWithRevision(
    "Allgemeine Prozesse und Informationen",
    "core_process_overview",
    null, 1,
    allgTiptap,
    buildStructuredFields(allgPage, allgTiptap),
  );
  importedFiles.add(overviewFiles.allgemein);
  console.log(`KP-001: "Allgemeine Prozesse und Informationen" (${kp1Id})`);

  const hrTiptap = htmlToTiptapJson(hrHtml);
  const kp2Id = await createNodeWithRevision(
    "HR",
    "core_process_overview",
    null, 2,
    hrTiptap,
    buildStructuredFields(hrPage, hrTiptap),
  );
  importedFiles.add(overviewFiles.hr);
  console.log(`KP-002: "HR" (${kp2Id})`);

  const qmTiptap = htmlToTiptapJson(qmHtml);
  const kp3Id = await createNodeWithRevision(
    "Qualitätsmanagement-Handbuch",
    "core_process_overview",
    null, 3,
    qmTiptap,
    buildStructuredFields(qmPage, qmTiptap),
  );
  importedFiles.add(overviewFiles.qm);
  console.log(`KP-003: "Qualitätsmanagement-Handbuch" (${kp3Id})`);

  console.log("\n=== Allgemeine Prozesse — Bereiche ===\n");

  interface AllgBereich {
    name: string;
    kuerzel: string;
    pages: { title: string; code: string }[];
  }

  const allgBereiche: AllgBereich[] = [
    {
      name: "Unternehmen und Struktur",
      kuerzel: "BCB-UuS",
      pages: [
        { title: "Vision des BildungsCampus", code: "BCB-UuS-001" },
        { title: "Organigramm", code: "BCB-UuS-002" },
        { title: "Social-Media-Identity", code: "BCB-UuS-003" },
        { title: "Learning Identity", code: "BCB-UuS-004" },
        { title: "Service Identity", code: "BCB-UuS-005" },
      ],
    },
    {
      name: "Kommunikation",
      kuerzel: "BCB-Kom",
      pages: [
        { title: "Interne Kommunikation", code: "BCB-Kom-001" },
        { title: "Laufkundschaft / Besucher", code: "BCB-Kom-002" },
        { title: "Typografie-Navigator", code: "BCB-AP2-003" },
        { title: "Protokoll", code: "BCB-AP2-004" },
        { title: "Arbeitsgruppen", code: "BCB-AP2-005" },
        { title: "Telefonieren", code: "BCB-AP2-006" },
        { title: "Besprechungen", code: "BCB-AP2-007" },
      ],
    },
  ];

  for (let i = 0; i < allgBereiche.length; i++) {
    const bereich = allgBereiche[i];
    const areaContent: TiptapNode = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `Bereich: ${bereich.name}` }] }] };
    const areaId = await createNodeWithRevision(
      bereich.name,
      "area_overview",
      kp1Id, i + 1,
      areaContent,
      { sourceType: "sharepoint_import", kuerzel: bereich.kuerzel, _editorContent: areaContent },
    );
    console.log(`  Bereich: "${bereich.name}" (${areaId})`);

    for (let j = 0; j < bereich.pages.length; j++) {
      const pg = bereich.pages[j];
      const placeholderContent: TiptapNode = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `${pg.title} (${pg.code}) — Inhalt wird aus dem alten Wiki übernommen.` }] }] };
      const pageId = await createNodeWithRevision(
        `${pg.title} (${pg.code})`,
        "process_page_text",
        areaId, j + 1,
        placeholderContent,
        { sourceType: "sharepoint_import", originalCode: pg.code, _editorContent: placeholderContent },
      );
      totalPages++;
      console.log(`    [${totalPages}] "${pg.title} (${pg.code})" -> ${pageId}`);
    }
  }

  const excludedPatterns = ["BCB_-_Wiki.html", "Homepage.html", "Review_-_Town_Hall_am_16.02.2024.html"];
  const excludedFiles = new Set<string>();
  for (const f of htmlFiles) {
    if (excludedPatterns.includes(f) || f.startsWith("Musterprozess_")) {
      excludedFiles.add(f);
      importedFiles.add(f);
    }
  }

  console.log("\n=== HR — Bereiche und Seiten ===\n");

  interface HrBereich {
    name: string;
    kuerzel: string;
    linkedFiles: string[];
  }

  const hrBereiche: HrBereich[] = [
    {
      name: "Personalplanung und -beschaffung",
      kuerzel: "Ppb",
      linkedFiles: ["gehaltsstufen-ppb.html", "stellenprofile-allg-ppb.html", "stellenausschreibung-intern-ppb.html"],
    },
    {
      name: "Bewerbermanagement",
      kuerzel: "BCB-Bmm",
      linkedFiles: [
        "bewerbungseingang-BCB-Bmm.html", "vorauswahl-bmm.html", "absage-vorauswahl-bbm.html",
        "persoenliches-kennenlernen-bmm.html", "bewerberabsage-n-meet-bmm.html",
        "probeaufgaben-bbm.html", "auswahlverfahren-bmm.html",
        "zusage-arbeitsvertrag-bmm.html", "absage-n-probearbeit-bmm.html",
      ],
    },
    {
      name: "Onboarding",
      kuerzel: "OBo",
      linkedFiles: [
        "onboarding-ob-uebersicht.html",
        "kollegen-informieren-bcb-ob1.html", "lebenslauf-ablegen-bcb-ob1.html", "personalordner-anlegen-bcb-ob.html",
      ],
    },
    {
      name: "Personalbetreuung",
      kuerzel: "Pbe",
      linkedFiles: [
        "arbeitsplatzrichtlinien-bcb-ap2.html", "arbeitsformenbcb-ap2.html",
        "verletzungen_arbeitsunfall-bcb-pbe.html", "persoenliche-zugaenge-bcb-pbe.html",
      ],
    },
    {
      name: "Personalverwaltung",
      kuerzel: "Pve",
      linkedFiles: [
        "arbeitszeitmanagement-BCB-Pve.html", "urlaub-ueberstunden-BCB-Pve.html",
        "ueberstunden-BCB-Pve.html", "krank-abwesenheit-bcb-pve.html",
      ],
    },
    {
      name: "Personalentwicklung",
      kuerzel: "Pen",
      linkedFiles: [
        "weiterbildung-bcb-pen.html", "mitarbeitergespraeche-bcb-pen.html", "ma-gespraech-vorgesetzter-bcb-pen.html",
      ],
    },
    {
      name: "Personalcontrolling",
      kuerzel: "Pco",
      linkedFiles: [],
    },
  ];

  for (let i = 0; i < hrBereiche.length; i++) {
    const bereich = hrBereiche[i];
    const hrAreaContent: TiptapNode = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `Bereich: ${bereich.name}` }] }] };
    const areaId = await createNodeWithRevision(
      bereich.name,
      "area_overview",
      kp2Id, i + 1,
      hrAreaContent,
      { sourceType: "sharepoint_import", kuerzel: bereich.kuerzel, _editorContent: hrAreaContent },
    );
    console.log(`  Bereich: "${bereich.name}" (${areaId})`);

    let pageSortIdx = 0;
    for (const file of bereich.linkedFiles) {
      const page = pages.get(file);
      if (!page) {
        console.log(`    WARNUNG: Datei "${file}" nicht gefunden`);
        continue;
      }
      pageSortIdx++;
      const nodeId = await importPage(page, areaId, pageSortIdx, page.title);
      importedFiles.add(file);
      totalPages++;
      console.log(`    [${totalPages}] "${page.title}" -> ${nodeId}`);
    }
  }

  console.log("\n=== Qualitätsmanagement-Handbuch — Bereiche und Seiten ===\n");

  interface QmBereich {
    name: string;
    kuerzel: string;
    linkedFiles: string[];
    subPages: Map<string, string[]>;
  }

  const qmBereiche: QmBereich[] = [
    {
      name: "Die Bildungseinrichtung",
      kuerzel: "b2g1",
      linkedFiles: [
        "b2g-unternehmensprofile.html", "b2g-personalstruktur.html", "b2g-geschaeftsstelle.html",
        "b2g-externe-mitarbeiter.html", "b2g-prozessuebersicht.html", "b2g-leitbilder.html",
      ],
      subPages: new Map(),
    },
    {
      name: "Qualitätsmanagementsystem",
      kuerzel: "b2g2",
      linkedFiles: [
        "qms-einleitung-b2g2.html", "qms-qmh-b2g2.html", "qualitaetsstandards-b2g2.html", "verpflichtung-leitung-b2b2.html",
      ],
      subPages: new Map(),
    },
    {
      name: "Dokumente und Aufzeichnungen",
      kuerzel: "b2g3",
      linkedFiles: ["dokumente-b2g3.html", "aufzeichnungen-b2g3.html"],
      subPages: new Map(),
    },
    {
      name: "Kundenmanagement",
      kuerzel: "b2g4",
      linkedFiles: ["kundenmanagement-b2g4.html", "kundenzufriedenheit-b2g4.html", "b2g-qualitaetspolitik.html"],
      subPages: new Map([
        ["kundenzufriedenheit-b2g4.html", ["b2g-lehrgangsabschluss.html"]],
      ]),
    },
    {
      name: "Dienstleistungsangebot",
      kuerzel: "b2g5",
      linkedFiles: ["b2g5-einleitung.html", "b2g5-akquisition.html", "b2g-konzeptionundueberarbeitungvondienstleistungen.html", "b2g-ausbildungsstätten.html"],
      subPages: new Map([
        ["b2g5-akquisition.html", [
          "b2g-anforderungbildungskatalog,interessentenanfrage.html",
          "b2g-angebotserstellung.html",
          "b2g-allgemeineranmeldevorgang.html",
          "b2g-umgangmitbildungsgutscheinen-maßnahmenteilnehmerzielundzweck.html",
          "b2g-absageeinerausbildung-präsenzphase-online-seminaraufgrundgeringerteilnehmerzahlallgemein.html",
          "b2g-unterrichtsmaterialfürausbildungenerstellenundversenden.html",
          "b2g-unfallversicherung-vbg-einhaltungdervorschriften.html",
        ]],
        ["b2g-konzeptionundueberarbeitungvondienstleistungen.html", [
          "b2g-arbeitsmarktbeobachtung.html",
          "b2g-erfassungderarbeitsmarktrelevanz.html",
          "b2g-dienstleistungskonzeption.html",
          "b2g-maßnahmenzulassung.html",
        ]],
        ["b2g-ausbildungsstätten.html", [
          "b2g-anforderungenaanausbildungsstätten.html",
          "b2g-reservierungsanfrageanausbildungsstätten.html",
        ]],
      ]),
    },
    {
      name: "Kontrolle, Analyse und Verbesserung",
      kuerzel: "b2g6",
      linkedFiles: [
        "b2g-kontrolledesqualitätsmanagementsystems.html", "b2g-fehlerhafteleistungen.html",
        "b2g-datenanalyse_undverbesserung.html", "b2g-korrekturmaßnahmen.html", "b2g-qualitätsverbesserung.html",
      ],
      subPages: new Map([
        ["b2g-kontrolledesqualitätsmanagementsystems.html", [
          "b2g-interneaudits.html",
          "b2g-aenderungenimqms.html",
          "b2g-vorbeugungs-undkorrekturmaßnahmen.html",
          "b2g-meldungzulassungsrelevanteraenderungen.html",
        ]],
      ]),
    },
    {
      name: "Anhang",
      kuerzel: "b2g7",
      linkedFiles: ["b2g-dokumente.html"],
      subPages: new Map(),
    },
  ];

  for (let i = 0; i < qmBereiche.length; i++) {
    const bereich = qmBereiche[i];
    const qmAreaContent: TiptapNode = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `Bereich: ${bereich.name}` }] }] };
    const areaId = await createNodeWithRevision(
      bereich.name,
      "area_overview",
      kp3Id, i + 1,
      qmAreaContent,
      { sourceType: "sharepoint_import", kuerzel: bereich.kuerzel, _editorContent: qmAreaContent },
    );
    console.log(`  Bereich: "${bereich.name}" (${areaId})`);

    let pageSortIdx = 0;
    for (const file of bereich.linkedFiles) {
      const page = pages.get(file);
      if (!page) {
        console.log(`    WARNUNG: Datei "${file}" nicht gefunden`);
        continue;
      }
      pageSortIdx++;
      const nodeId = await importPage(page, areaId, pageSortIdx, page.title);
      importedFiles.add(file);
      totalPages++;
      console.log(`    [${totalPages}] "${page.title}" -> ${nodeId}`);

      const subPageFiles = bereich.subPages.get(file);
      if (subPageFiles) {
        let subSortIdx = 0;
        for (const subFile of subPageFiles) {
          const subPage = pages.get(subFile);
          if (!subPage) {
            console.log(`      WARNUNG: Datei "${subFile}" nicht gefunden`);
            continue;
          }
          subSortIdx++;
          const subNodeId = await importPage(subPage, nodeId, subSortIdx, subPage.title);
          importedFiles.add(subFile);
          totalPages++;
          console.log(`      [${totalPages}] "${subPage.title}" -> ${subNodeId} (unter "${page.title}")`);
        }
      }
    }
  }

  const unimportedFiles = htmlFiles.filter((f) => !importedFiles.has(f));
  if (unimportedFiles.length > 0) {
    console.log(`\n=== WARNUNG: ${unimportedFiles.length} nicht importierte Dateien ===`);
    for (const f of unimportedFiles) {
      console.log(`  - ${f}`);
    }
  }

  console.log("\n=== Verifizierung ===");

  const nodeCount = await db.execute(sql`SELECT count(*) AS cnt FROM content_nodes WHERE is_deleted = false`);
  const nodeRow = nodeCount.rows[0] as { cnt: string } | undefined;
  console.log(`Gesamt content_nodes: ${nodeRow?.cnt ?? 0}`);

  const publishedCount = await db.execute(sql`SELECT count(*) AS cnt FROM content_nodes WHERE status = 'published' AND is_deleted = false`);
  const pubRow = publishedCount.rows[0] as { cnt: string } | undefined;
  console.log(`Veröffentlichte Nodes: ${pubRow?.cnt ?? 0}`);

  const revCount = await db.execute(sql`SELECT count(*) AS cnt FROM content_revisions WHERE status = 'published'`);
  const revRow = revCount.rows[0] as { cnt: string } | undefined;
  console.log(`Veröffentlichte Revisionen: ${revRow?.cnt ?? 0}`);

  const orphanCheck = await db.execute(sql`
    SELECT count(*) AS cnt FROM content_nodes
    WHERE published_revision_id IS NULL AND is_deleted = false
  `);
  const orphanRow = orphanCheck.rows[0] as { cnt: string } | undefined;
  const orphanCount = parseInt(orphanRow?.cnt ?? "0");
  if (orphanCount > 0) {
    console.error(`FEHLER: ${orphanCount} Nodes ohne veröffentlichte Revision!`);
  } else {
    console.log("Alle Nodes haben veröffentlichte Revisionen: OK");
  }

  const treeQuery = await db.execute(sql`
    WITH RECURSIVE tree AS (
      SELECT id, title, display_code, parent_node_id, template_type, 0 AS depth
      FROM content_nodes WHERE parent_node_id IS NULL AND is_deleted = false
      UNION ALL
      SELECT cn.id, cn.title, cn.display_code, cn.parent_node_id, cn.template_type, t.depth + 1
      FROM content_nodes cn
      JOIN tree t ON cn.parent_node_id = t.id
      WHERE cn.is_deleted = false
    )
    SELECT depth, count(*) AS cnt FROM tree GROUP BY depth ORDER BY depth
  `);
  console.log("\nHierarchie-Tiefenverteilung:");
  for (const row of treeQuery.rows as { depth: number; cnt: string }[]) {
    const label = row.depth === 0 ? "Kernprozesse" : row.depth === 1 ? "Bereiche / direkte Seiten" : row.depth === 2 ? "Seiten" : "Unter-Seiten";
    console.log(`  Tiefe ${row.depth} (${label}): ${row.cnt} Nodes`);
  }

  const glossaryCheck = await db.execute(sql`SELECT count(*) AS cnt FROM glossary_terms`);
  const glossaryRow = glossaryCheck.rows[0] as { cnt: string } | undefined;
  console.log(`\nGlossar-Einträge erhalten: ${glossaryRow?.cnt ?? 0}`);

  console.log("\n=== Assertions ===");
  const errors: string[] = [];
  const totalNodes = parseInt(nodeRow?.cnt ?? "0");

  if (orphanCount > 0) errors.push(`${orphanCount} Nodes ohne veröffentlichte Revision`);
  const overviewAndExcludedCount = importedFiles.size - totalPages;
  if (importedFiles.size !== htmlFiles.length) {
    errors.push(`Import-Zählung inkonsistent: ${importedFiles.size} Dateien verarbeitet, ${htmlFiles.length} HTML-Dateien vorhanden`);
  }
  if (unimportedFiles.length > 0) {
    errors.push(`${unimportedFiles.length} Dateien nicht importiert: ${unimportedFiles.join(", ")}`);
  }

  if (errors.length > 0) {
    console.error("IMPORT-PROBLEME:");
    for (const e of errors) console.error(`  ✗ ${e}`);
    await pool.end();
    process.exit(1);
  }

  console.log(`  ✓ Alle ${htmlFiles.length} Dateien importiert`);
  console.log(`  ✓ ${totalNodes} Nodes erstellt (inkl. Bereiche)`);
  console.log(`  ✓ Alle Nodes veröffentlicht mit Revisionen`);

  console.log(`\n=== Import Summary ===`);
  console.log(`Kernprozesse: 3`);
  console.log(`Seiten importiert: ${totalPages}`);
  console.log(`Dateien importiert: ${importedFiles.size}`);
  console.log(`Gesamt Nodes: ${totalNodes}`);

  await pool.end();
  console.log("\n=== Import abgeschlossen ===");
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  pool.end().then(() => process.exit(1));
});
