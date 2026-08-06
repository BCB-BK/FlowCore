import { db } from "@workspace/db";
import {
  glossaryTermsTable,
  contentNodesTable,
  contentRevisionsTable,
  contentNodeTagsTable,
  contentTagsTable,
  nodeOwnershipTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { stableContentHash } from "../lib/content-hash";
import { getPrincipalById } from "./principal.service";
import {
  getAncestorTitles,
  deriveBrandScope,
} from "./copilot-content-projection.service";

const SOURCE_BASE_URL =
  process.env["APP_PUBLIC_URL"]?.replace(/\/$/, "") ||
  "https://flowcore.bildungscampus-backnang.de";

export interface GlossaryTermProjection {
  itemType: "glossary_term";
  termId: string;
  nodeId: string | null;
  term: string;
  definition: string;
  synonyms: string[];
  relatedTerms: string[];
  tags: string[];
  sourceUrl: string;
  status: "published";
  contentHash: string;
  displayCode: string;
  version: string | null;
  revision: number | null;
  authorityLevel: string | null;
  owner: string | null;
  ownerName: string | null;
  reviewDue: string | null;
  lastModifiedAt: string;
  shortDescription: string;
  pageType: string;
  sourcePriority: number;
  brandScope: string[];
  agentScope: string[];
  parentPath: string | null;
  hasChildren: boolean;
  childPageCount: number;
  childPageTitles: string[];
}

function synthesizeDisplayCode(slug: string): string {
  return `GL-${slug
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

/**
 * The glossary schema has no draft/review workflow of its own (no status
 * column), so every non-deleted term is treated as "published". If a term
 * is linked to a content node (nodeId), that node must not be soft-deleted
 * for the term to be exported, and its tags are inherited on the item.
 */
export async function projectGlossaryTerm(
  termId: string,
): Promise<GlossaryTermProjection | null> {
  const [term] = await db
    .select()
    .from(glossaryTermsTable)
    .where(eq(glossaryTermsTable.id, termId));
  if (!term) return null;

  let displayCode: string | null = null;
  let version: string | null = null;
  let revisionNo: number | null = null;
  let authorityLevel: string | null = null;
  let owner: string | null = null;
  let reviewDue: string | null = null;
  let sourcePriority = 1;
  let agentScope: string[] = [];
  let pageType = "glossary_term";
  let parentPath: string | null = null;

  if (term.nodeId) {
    const [node] = await db
      .select()
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, term.nodeId));
    if (!node || node.isDeleted) return null;
    displayCode = node.displayCode;

    if (node.publishedRevisionId) {
      const [revision] = await db
        .select()
        .from(contentRevisionsTable)
        .where(
          and(
            eq(contentRevisionsTable.id, node.publishedRevisionId),
            eq(contentRevisionsTable.status, "published"),
          ),
        );
      if (revision) {
        version = revision.versionLabel ?? null;
        revisionNo = revision.revisionNo;
        reviewDue = revision.nextReviewDate
          ? revision.nextReviewDate.toISOString()
          : null;
        const sf = revision.structuredFields ?? {};
        authorityLevel =
          typeof sf.authority_level === "string" ? sf.authority_level : null;
        sourcePriority =
          typeof sf.source_priority === "number" ? sf.source_priority : 1;
        agentScope = Array.isArray(sf.agent_scope)
          ? (sf.agent_scope as unknown[]).filter(
              (v): v is string => typeof v === "string",
            )
          : [];
      }
    }
    pageType = node.templateType;

    const ancestorTitles = await getAncestorTitles(node.id);
    parentPath = ancestorTitles.length > 0 ? ancestorTitles.join(" > ") : null;

    const [ownership] = await db
      .select()
      .from(nodeOwnershipTable)
      .where(eq(nodeOwnershipTable.nodeId, node.id));
    if (ownership?.ownerId) {
      const principal = await getPrincipalById(ownership.ownerId);
      owner = principal?.displayName ?? null;
    }
  }

  const tags = term.nodeId
    ? (
        await db
          .select({ name: contentTagsTable.name })
          .from(contentNodeTagsTable)
          .innerJoin(
            contentTagsTable,
            eq(contentNodeTagsTable.tagId, contentTagsTable.id),
          )
          .where(eq(contentNodeTagsTable.nodeId, term.nodeId))
      ).map((t) => t.name)
    : [];

  const contentHash = stableContentHash({
    term: term.term,
    definition: term.definition,
    synonyms: term.synonyms ?? [],
    abbreviation: term.abbreviation ?? null,
  });

  const shortDescription = term.definition.slice(0, 400);

  return {
    itemType: "glossary_term",
    termId: term.id,
    nodeId: term.nodeId ?? null,
    term: term.term,
    definition: term.definition,
    synonyms: term.synonyms ?? [],
    relatedTerms: [],
    tags,
    sourceUrl: `${SOURCE_BASE_URL}/glossary/${term.slug}`,
    status: "published",
    contentHash,
    displayCode: displayCode ?? synthesizeDisplayCode(term.slug),
    version,
    revision: revisionNo,
    authorityLevel,
    owner,
    ownerName: owner,
    reviewDue,
    shortDescription,
    pageType,
    sourcePriority,
    brandScope: deriveBrandScope(tags),
    agentScope,
    parentPath,
    hasChildren: false,
    childPageCount: 0,
    childPageTitles: [],
    lastModifiedAt: term.updatedAt.toISOString(),
  };
}

export async function isGlossaryTermExportable(
  termId: string,
): Promise<boolean> {
  const projection = await projectGlossaryTerm(termId);
  return projection !== null;
}
