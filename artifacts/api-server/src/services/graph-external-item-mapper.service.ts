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

/**
 * Builds the full-text `content` field for a page externalItem. Per spec,
 * this must contain: title, short description, main content, structured
 * fields, relations, glossary terms, the FlowCore source URL, version /
 * revision, status, authority level, owner, and the review hint. It is
 * derived strictly from the published-revision projection, so a working
 * copy (unpublished draft) can never leak into the indexed content.
 */
/**
 * Renders the mandatory citation block appended to every externalItem's
 * content text (Cluster 10). Format is fixed so downstream consumers
 * (Copilot Studio answers, Microsoft Search snippets) can rely on it:
 *
 *   Quelle: <sourceUrl>
 *   FlowCore-ID: <stable id>
 *   Version: <version>
 *   Revision: <revision>
 *   Status: <status>
 *   Authority: <binding/guidance/...>
 *   Owner: <owner>
 *   Review fällig: <reviewDue>
 */
function buildQuellenblock(fields: {
  sourceUrl: string;
  flowcoreId: string;
  version: string | null;
  revision: number | null;
  status: string;
  authorityLevel: string | null;
  owner: string | null;
  reviewDue: string | null;
}): string {
  return [
    "Quellenblock:",
    `Quelle: ${fields.sourceUrl}`,
    `FlowCore-ID: ${fields.flowcoreId}`,
    `Version: ${fields.version ?? "nicht vergeben"}`,
    `Revision: ${fields.revision ?? "nicht vergeben"}`,
    `Status: ${fields.status}`,
    `Authority: ${fields.authorityLevel ?? "nicht klassifiziert"}`,
    `Owner: ${fields.owner ?? "nicht zugewiesen"}`,
    `Review fällig: ${fields.reviewDue ?? "nicht geplant"}`,
  ].join("\n");
}

function buildPageContent(projection: CopilotPageProjection): string {
  const parts = [
    `Titel: ${projection.title}`,
    projection.summary ? `Kurzbeschreibung: ${projection.summary}` : "",
    `Hauptinhalt:\n${projection.contentText}`,
    Object.keys(projection.structuredFields ?? {}).length > 0
      ? `Strukturierte Felder: ${JSON.stringify(projection.structuredFields)}`
      : "",
    projection.relations.length > 0
      ? `Relationen: ${formatRelations(projection.relations)}`
      : "",
    projection.glossaryTerms.length > 0
      ? `Glossarbegriffe: ${projection.glossaryTerms.join(", ")}`
      : "",
    projection.parentPath ? `Übergeordnet: ${projection.parentPath}` : "",
    projection.hasChildren
      ? `Unterseiten: ${projection.childPageTitles.join(", ")}`
      : "",
    buildQuellenblock({
      sourceUrl: projection.sourceUrl,
      flowcoreId: projection.immutableId,
      version: projection.version,
      revision: projection.revision,
      status: projection.status,
      authorityLevel: projection.authorityLevel,
      owner: projection.owner,
      reviewDue: projection.reviewDue,
    }),
  ];
  return parts.filter(Boolean).join("\n");
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

function buildGlossaryContent(projection: GlossaryTermProjection): string {
  const parts = [
    `Begriff: ${projection.term}`,
    `Definition: ${projection.definition}`,
    projection.synonyms.length > 0
      ? `Synonyme: ${projection.synonyms.join(", ")}`
      : "",
    projection.relatedTerms.length > 0
      ? `Verwandte Begriffe: ${projection.relatedTerms.join(", ")}`
      : "",
    buildQuellenblock({
      sourceUrl: projection.sourceUrl,
      flowcoreId: projection.displayCode,
      version: projection.version,
      revision: projection.revision,
      status: projection.status,
      authorityLevel: projection.authorityLevel,
      owner: projection.owner,
      reviewDue: projection.reviewDue,
    }),
  ];
  return parts.filter(Boolean).join("\n");
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
