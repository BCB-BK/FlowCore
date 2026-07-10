import type { CopilotPageProjection } from "./copilot-content-projection.service";
import type { GlossaryTermProjection } from "./glossary-projection.service";
import type { GraphAclEntry } from "./graph-acl.service";
import {
  REQUIRED_PAGE_PROPERTY_NAMES,
  REQUIRED_GLOSSARY_PROPERTY_NAMES,
} from "../lib/graph-external-item-schema";
import { AppError } from "../lib/app-error";

export interface GraphExternalItem {
  id: string;
  acl: GraphAclEntry[];
  properties: Record<string, unknown>;
  content: {
    value: string;
    type: "text";
  };
}

/** Sanitizes a raw id fragment into a Graph-safe externalItem id fragment. */
function sanitizeIdFragment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function assertAclPresent(acl: GraphAclEntry[], context: string): void {
  if (!acl || acl.length === 0) {
    throw new AppError(
      400,
      `ACL fehlt oder ist leer für ${context}. Microsoft Graph verlangt eine nicht-leere ACL pro externalItem.`,
    );
  }
}

function assertRequiredProperties(
  properties: Record<string, unknown>,
  required: readonly string[],
  context: string,
): void {
  const missing = required.filter((name) => {
    const value = properties[name];
    return value === undefined || value === null || value === "";
  });
  if (missing.length > 0) {
    throw new AppError(
      400,
      `Pflichtfelder fehlen für ${context}: ${missing.join(", ")}`,
      { details: missing, exposeDetails: true },
    );
  }
}

function formatRelations(
  relations: CopilotPageProjection["relations"],
): string {
  if (relations.length === 0) return "";
  return relations
    .map(
      (r) =>
        `${r.relationType}: ${r.targetTitle ?? r.targetDisplayCode ?? r.targetNodeId}`,
    )
    .join("; ");
}

/** UUID v4-ish pattern used to strip raw technical IDs from visible content. */
const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** Removes bare UUIDs from free text; they must stay in technical properties only. */
function stripUuids(text: string): string {
  return text.replace(UUID_PATTERN, "").replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * Strips HTML markup and collapses whitespace so rich-text fields (glossary
 * definitions, kurzbeschreibung) read as plain prose in the Copilot content
 * block instead of leaking raw tags as "unnötiger technischer Ballast".
 */
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Combined cleanup applied to any free text before it enters the content block. */
function sanitizeForContent(text: string): string {
  return stripUuids(stripHtml(text));
}

/**
 * Keys inside `structuredFields` that are governance/technical metadata
 * already surfaced as dedicated Graph properties (authorityLevel, tags,
 * agentScope, ...). These must not be repeated inside the free-text
 * "Strukturierte Felder" content block, which is reserved for fachliche
 * process content (RACI, SIPOC, KPIs, Risiken, Kontrollen, Zuständigkeiten).
 */
const STRUCTURED_FIELD_CONTENT_EXCLUDE = new Set([
  "confidentiality",
  "authority_level",
  "source_priority",
  "agent_scope",
  "brand_scope",
  "agent_enabled",
  "decision_status",
  "copilot_summary",
  "copilot_keywords",
  "kurzbeschreibung",
  "summary",
  "scope",
  "sourceUrl",
  "sourceType",
  "sourceUrlSlug",
  "originalTitle",
  "originalCreatedAt",
  "originalModifiedAt",
  "description",
  "media",
  "_editorContent",
]);

/** Friendly German labels for the fachliche structured-field keys Copilot answers should surface. */
const STRUCTURED_FIELD_LABELS: Record<string, string> = {
  raci: "RACI",
  responsibilities: "Zuständigkeiten",
  role_definition: "Rollen",
  sipoc: "SIPOC",
  sipoc_light: "SIPOC (vereinfacht)",
  kpis: "KPIs / Kennzahlen",
  success_metrics: "Erfolgskriterien",
  risks: "Risiken",
  root_cause: "Ursache",
  corrective_action: "Korrekturmaßnahmen",
  preventive_action: "Präventivmaßnahmen",
  effectiveness_check: "Wirksamkeitskontrolle",
  compliance: "Kontrollen / Compliance",
  quality_criteria: "Qualitätskriterien",
  process_steps: "Prozessschritte",
  main_flow: "Hauptablauf",
};

function humanizeFieldKey(key: string): string {
  const label = STRUCTURED_FIELD_LABELS[key];
  if (label) return label;
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatStructuredFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        typeof entry === "string" ? entry : JSON.stringify(entry),
      )
      .join("; ");
  }
  return JSON.stringify(value);
}

/**
 * Renders the fachliche structured-field content (RACI, SIPOC, KPIs,
 * Risiken, Kontrollen, Zuständigkeiten, ...) as a readable list, skipping
 * governance/technical keys that are already dedicated properties. Returns
 * "" when nothing fachlich relevant is present, so the caller can omit the
 * whole section instead of printing an empty header.
 */
function renderStructuredFieldsBlock(
  structuredFields: Record<string, unknown>,
): string {
  const entries = Object.entries(structuredFields ?? {}).filter(
    ([key, value]) =>
      !STRUCTURED_FIELD_CONTENT_EXCLUDE.has(key) &&
      value !== null &&
      value !== undefined &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0),
  );
  if (entries.length === 0) return "";
  return entries
    .map(([key, value]) => `${humanizeFieldKey(key)}: ${formatStructuredFieldValue(value)}`)
    .join("\n");
}

/**
 * Renders the "Unterseiten / Detailseiten" section: each relevant child
 * page with its displayCode, title and short description, so Copilot can
 * disambiguate between a parent overview and its detail pages when
 * answering, and can point to a specific child by its FlowCore-Code
 * (Task 5). When the full list was too large to inline (`childPages` is
 * `null`), a representative sample (`topChildPages`) plus the search hint
 * is rendered instead — never silently empty.
 */
function renderChildPagesBlock(projection: {
  childPages: CopilotPageProjection["childPages"];
  topChildPages: CopilotPageProjection["topChildPages"];
  childPagesSearchHint: string | null;
}): string {
  const list = projection.childPages ?? projection.topChildPages ?? [];
  if (list.length === 0) return "keine";
  const lines = list.map((c) =>
    c.shortDescription
      ? `- ${c.displayCode} ${c.title}: ${c.shortDescription}`
      : `- ${c.displayCode} ${c.title}`,
  );
  if (projection.childPages === null && projection.childPagesSearchHint) {
    lines.push(`(${projection.childPagesSearchHint})`);
  }
  return lines.join("\n");
}

/**
 * Renders the "Trefferkontext" line surfaced in every content block so
 * Copilot can weigh/disambiguate between multiple hits using the same
 * signals that are also exposed as dedicated Graph properties (Task 3):
 * brandScope, agentScope, sourcePriority, and whether the item has child
 * pages. Kept compact and always present — an empty scope reads as
 * "übergreifend" rather than being silently omitted.
 */
function renderTrefferkontext(fields: {
  brandScope: string[];
  agentScope: string[];
  sourcePriority: number;
  hasChildren: boolean;
  childPageCount: number;
}): string {
  return [
    "Trefferkontext:",
    `Marken-Scope: ${fields.brandScope.length > 0 ? fields.brandScope.join(", ") : "übergreifend"}`,
    `Agenten-Scope: ${fields.agentScope.length > 0 ? fields.agentScope.join(", ") : "übergreifend"}`,
    `Quellenpriorität: ${fields.sourcePriority}`,
    `Unterseiten vorhanden: ${fields.hasChildren ? `ja (${fields.childPageCount})` : "nein"}`,
  ].join("\n");
}

/**
 * Renders the mandatory "Quellenhinweis" block appended to every
 * externalItem's content text. Format is fixed so downstream consumers
 * (Copilot Studio answers, Microsoft Search snippets) can rely on it. Status
 * `published` is intentionally NOT repeated here — it lives only in the
 * technical `status` property, not in the prominent content block.
 */
function buildQuellenhinweis(fields: {
  sourceUrl: string;
  version: string | null;
  ownerName: string | null;
  authorityLevel: string | null;
}): string {
  return [
    "Quellenhinweis:",
    `FlowCore-Quelle: ${fields.sourceUrl}`,
    `Version: ${fields.version ?? "nicht vergeben"}`,
    `Owner: ${fields.ownerName ?? "nicht zugewiesen"}`,
    `Authority: ${fields.authorityLevel ?? "nicht klassifiziert"}`,
  ].join("\n");
}

/**
 * Builds the full-text `content` field for a page externalItem as a
 * semantically structured knowledge unit for Copilot, not raw dump text:
 *
 *   Titel / FlowCore-Code / Kurzbeschreibung / Seitentyp / Geltungsbereich
 *   Inhalt: <bereinigter Hauptinhalt, ohne UUIDs>
 *   Strukturierte Felder: <RACI, SIPOC, KPIs, Risiken, Kontrollen, ...>
 *   Unterseiten / Detailseiten: <Hinweis zur fachlichen Relevanz + FlowCore-Code + Titel + Kurzbeschreibung je Kind>
 *   Glossarbegriffe: <referenzierte Begriffe>
 *   Quellenhinweis: <Quelle, Version, Owner, Authority>
 *
 * Working copies/drafts can never leak in, since this is derived strictly
 * from the published-revision projection. No UUIDs and no prominent
 * "Status: published" clutter — those stay in technical properties only.
 */
function buildPageContent(projection: CopilotPageProjection): string {
  const structuredFieldsBlock = renderStructuredFieldsBlock(
    projection.structuredFields,
  );
  const childPagesBlock = renderChildPagesBlock({
    childPages: projection.childPages,
    topChildPages: projection.topChildPages,
    childPagesSearchHint: projection.childPagesSearchHint,
  });

  const parts = [
    `Titel: ${projection.title}`,
    `FlowCore-Code: ${projection.displayCode}`,
    `Kurzbeschreibung: ${
      projection.shortDescription
        ? sanitizeForContent(projection.shortDescription)
        : "nicht vorhanden"
    }`,
    `Seitentyp: ${projection.pageType}`,
    projection.scopeContext
      ? `Geltungsbereich / Kontext: ${sanitizeForContent(projection.scopeContext)}`
      : "",
    `\nInhalt:\n${sanitizeForContent(projection.contentText)}`,
    structuredFieldsBlock ? `\nStrukturierte Felder:\n${structuredFieldsBlock}` : "",
    `\nUnterseiten / Detailseiten:${
      projection.childPagesGuidance ? `\n${projection.childPagesGuidance}` : ""
    }\n${childPagesBlock}`,
    `\nGlossarbegriffe:\n${
      projection.glossaryTerms.length > 0
        ? projection.glossaryTerms.join(", ")
        : "keine"
    }`,
    projection.relations.length > 0
      ? `\nRelationen: ${formatRelations(projection.relations)}`
      : "",
    projection.parentPath
      ? `\nÜbergeordnet: ${projection.parentPath}`
      : "",
    `\n${renderTrefferkontext({
      brandScope: projection.brandScope,
      agentScope: projection.agentScope,
      sourcePriority: projection.sourcePriority,
      hasChildren: projection.hasChildren,
      childPageCount: projection.childPageCount,
    })}`,
    `\n${buildQuellenhinweis({
      sourceUrl: projection.sourceUrl,
      version: projection.version,
      ownerName: projection.ownerName,
      authorityLevel: projection.authorityLevel,
    })}`,
  ];
  return parts.filter((p) => p !== "").join("\n");
}

/**
 * Maps a published page projection (Cluster 3 output) plus its resolved
 * ACL into a Microsoft Graph externalItem payload. Throws AppError(400) if
 * required fields or the ACL are missing — errors are never swallowed.
 */
export function mapPageToExternalItem(
  projection: CopilotPageProjection,
  acl: GraphAclEntry[],
): GraphExternalItem {
  assertAclPresent(acl, `Seite ${projection.nodeId}`);

  const properties: Record<string, unknown> = {
    title: projection.title,
    sourceUrl: projection.sourceUrl,
    nodeId: projection.nodeId,
    immutableId: projection.immutableId,
    displayCode: projection.displayCode,
    itemType: projection.itemType,
    pageType: projection.pageType,
    status: projection.status,
    shortDescription: projection.shortDescription,
    version: projection.version,
    revision: projection.revision,
    owner: projection.owner,
    ownerName: projection.ownerName,
    contentOwner: projection.contentOwner,
    reviewer: projection.reviewer,
    validFrom: projection.validFrom,
    reviewDue: projection.reviewDue,
    brandScope: projection.brandScope,
    agentScope: projection.agentScope,
    authorityLevel: projection.authorityLevel,
    sourcePriority: projection.sourcePriority,
    confidentiality: projection.confidentiality,
    decisionStatus: projection.decisionStatus,
    tags: projection.tags,
    relations: projection.relations.map(
      (r) => `${r.relationType}:${r.targetNodeId}`,
    ),
    lastModifiedAt: projection.lastModifiedAt,
    publishedAt: projection.publishedAt,
    contentHash: projection.contentHash,
    parentPath: projection.parentPath,
    hasChildren: projection.hasChildren,
    childPageCount: projection.childPageCount,
    childPageTitles: projection.childPageTitles,
  };

  assertRequiredProperties(
    properties,
    REQUIRED_PAGE_PROPERTY_NAMES,
    `Seite ${projection.nodeId}`,
  );

  return {
    id: `flowcore_page_${sanitizeIdFragment(projection.immutableId)}`,
    acl,
    properties,
    content: { value: buildPageContent(projection), type: "text" },
  };
}

/**
 * Builds the full-text `content` field for a glossary term externalItem,
 * mirroring the page content structure (title/code/short description/type,
 * cleaned content, related-terms, source hint) so Copilot handles both item
 * types with a consistent, disambiguation-friendly shape.
 */
function buildGlossaryContent(projection: GlossaryTermProjection): string {
  const parts = [
    `Titel: ${projection.term}`,
    `FlowCore-Code: ${projection.displayCode}`,
    `Kurzbeschreibung: ${
      projection.shortDescription
        ? sanitizeForContent(projection.shortDescription)
        : "nicht vorhanden"
    }`,
    `Seitentyp: ${projection.pageType}`,
    `\nInhalt:\n${sanitizeForContent(projection.definition)}`,
    `\nSynonyme:\n${
      projection.synonyms.length > 0 ? projection.synonyms.join(", ") : "keine"
    }`,
    `\nGlossarbegriffe:\n${
      projection.relatedTerms.length > 0
        ? projection.relatedTerms.join(", ")
        : "keine"
    }`,
    `\n${renderTrefferkontext({
      brandScope: projection.brandScope,
      agentScope: projection.agentScope,
      sourcePriority: projection.sourcePriority,
      hasChildren: projection.hasChildren,
      childPageCount: projection.childPageCount,
    })}`,
    `\n${buildQuellenhinweis({
      sourceUrl: projection.sourceUrl,
      version: projection.version,
      ownerName: projection.ownerName,
      authorityLevel: projection.authorityLevel,
    })}`,
  ];
  return parts.filter((p) => p !== "").join("\n");
}

/**
 * Maps a glossary term projection plus its resolved ACL into a Microsoft
 * Graph externalItem payload.
 */
export function mapGlossaryToExternalItem(
  projection: GlossaryTermProjection,
  acl: GraphAclEntry[],
): GraphExternalItem {
  assertAclPresent(acl, `Glossarbegriff ${projection.termId}`);

  const properties: Record<string, unknown> = {
    title: projection.term,
    sourceUrl: projection.sourceUrl,
    nodeId: projection.termId,
    itemType: projection.itemType,
    pageType: projection.pageType,
    status: projection.status,
    shortDescription: projection.shortDescription,
    term: projection.term,
    definition: projection.definition,
    synonyms: projection.synonyms,
    relatedTerms: projection.relatedTerms,
    tags: projection.tags,
    contentHash: projection.contentHash,
    displayCode: projection.displayCode,
    version: projection.version,
    revision: projection.revision,
    authorityLevel: projection.authorityLevel,
    sourcePriority: projection.sourcePriority,
    owner: projection.owner,
    ownerName: projection.ownerName,
    reviewDue: projection.reviewDue,
    brandScope: projection.brandScope,
    agentScope: projection.agentScope,
    parentPath: projection.parentPath,
    hasChildren: projection.hasChildren,
    childPageCount: projection.childPageCount,
    childPageTitles: projection.childPageTitles,
    lastModifiedAt: projection.lastModifiedAt,
  };

  assertRequiredProperties(
    properties,
    REQUIRED_GLOSSARY_PROPERTY_NAMES,
    `Glossarbegriff ${projection.termId}`,
  );

  return {
    id: `flowcore_glossary_${sanitizeIdFragment(projection.termId)}`,
    acl,
    properties,
    content: { value: buildGlossaryContent(projection), type: "text" },
  };
}
