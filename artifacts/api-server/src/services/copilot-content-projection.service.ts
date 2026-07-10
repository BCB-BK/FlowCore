import { db } from "@workspace/db";
import {
  contentNodesTable,
  contentRevisionsTable,
  contentRevisionEventsTable,
  contentNodeTagsTable,
  contentTagsTable,
  contentRelationsTable,
  nodeOwnershipTable,
  glossaryTermsTable,
} from "@workspace/db/schema";
import { eq, and, desc, isNotNull } from "drizzle-orm";
import { serializeProseMirrorContent } from "../lib/prosemirror-serializer";
import { stableContentHash } from "../lib/content-hash";
import { getPrincipalById } from "./principal.service";
import {
  getAclMappingStatus,
  DEFAULT_CONFIDENTIALITY_LEVEL,
} from "./confidentiality.service";
import {
  extractAgentMetadata,
  evaluateIndexability,
} from "../lib/agent-metadata";

const SOURCE_BASE_URL = "https://flowcore.bildungscampus-backnang.de";

export interface CopilotPageProjection {
  itemType: "flowcore_page";
  nodeId: string;
  immutableId: string;
  displayCode: string;
  title: string;
  pageType: string;
  status: "published";
  version: string | null;
  revision: number;
  summary: string;
  contentText: string;
  contentMarkdown: string;
  structuredFields: Record<string, unknown>;
  tags: string[];
  relations: {
    targetNodeId: string;
    targetDisplayCode: string | null;
    targetTitle: string | null;
    relationType: string;
    description: string | null;
  }[];
  glossaryTerms: string[];
  owner: string | null;
  ownerName: string | null;
  reviewer: string | null;
  contentOwner: string | null;
  confidentiality: string | null;
  authorityLevel: string | null;
  sourcePriority: number;
  brandScope: string[];
  agentScope: string[];
  agentEnabled: boolean;
  decisionStatus: string;
  copilotSummary: string | null;
  copilotKeywords: string[];
  copilotIndexStatus: string;
  validFrom: string | null;
  reviewDue: string | null;
  sourceUrl: string;
  lastModifiedAt: string | null;
  publishedAt: string | null;
  contentHash: string;
  shortDescription: string;
  parentPath: string | null;
  hasChildren: boolean;
  childPageCount: number;
  childPageTitles: string[];
}

async function resolvePrincipalName(id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const principal = await getPrincipalById(id);
  return principal?.displayName ?? null;
}

export function deriveBrandScope(tags: string[]): string[] {
  const scope: string[] = [];
  for (const tag of tags) {
    const match = /^brand:(.+)$/i.exec(tag);
    if (match) scope.push(match[1]);
  }
  return scope;
}

async function findGlossaryTermsInText(
  plaintext: string,
): Promise<string[]> {
  if (!plaintext) return [];
  const terms = await db
    .select({ term: glossaryTermsTable.term, synonyms: glossaryTermsTable.synonyms })
    .from(glossaryTermsTable);
  const lowerText = plaintext.toLowerCase();
  const found = new Set<string>();
  for (const t of terms) {
    const candidates = [t.term, ...(t.synonyms ?? [])].filter(Boolean) as string[];
    for (const candidate of candidates) {
      const pattern = new RegExp(`\\b${escapeRegExp(candidate.toLowerCase())}\\b`);
      if (pattern.test(lowerText)) {
        found.add(t.term);
        break;
      }
    }
  }
  return [...found];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Walks parentNodeId up to the root, returning ancestor titles in
 * root-to-leaf order (excluding the node itself). Used to build a
 * human-readable breadcrumb for Copilot/Graph so an answer can say "this
 * page lives under X > Y" without needing a separate hierarchy lookup.
 */
export async function getAncestorTitles(nodeId: string): Promise<string[]> {
  const titles: string[] = [];
  let currentId: string | null = nodeId;

  const [startNode] = await db
    .select({ parentNodeId: contentNodesTable.parentNodeId })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, currentId));
  currentId = startNode?.parentNodeId ?? null;

  while (currentId) {
    const [parent] = await db
      .select({
        title: contentNodesTable.title,
        parentNodeId: contentNodesTable.parentNodeId,
      })
      .from(contentNodesTable)
      .where(
        and(
          eq(contentNodesTable.id, currentId),
          eq(contentNodesTable.isDeleted, false),
        ),
      );
    if (!parent) break;
    titles.unshift(parent.title);
    currentId = parent.parentNodeId;
  }

  return titles;
}

/**
 * Returns the titles of direct child pages that are themselves published
 * and non-deleted (a child that is still a draft must not leak into the
 * exported content or metadata of its parent).
 */
export async function getPublishedChildTitles(nodeId: string): Promise<string[]> {
  const rows = await db
    .select({ title: contentNodesTable.title })
    .from(contentNodesTable)
    .where(
      and(
        eq(contentNodesTable.parentNodeId, nodeId),
        eq(contentNodesTable.isDeleted, false),
        eq(contentNodesTable.status, "published"),
      ),
    );
  return rows.map((r) => r.title);
}

/**
 * Builds the Copilot/Graph-ready projection for a single node's published
 * revision. Returns null if the node has no published_revision_id, is
 * deleted, or does not exist (i.e. strictly published-only export).
 */
export async function projectPublishedPage(
  nodeId: string,
): Promise<CopilotPageProjection | null> {
  const [node] = await db
    .select()
    .from(contentNodesTable)
    .where(
      and(
        eq(contentNodesTable.id, nodeId),
        eq(contentNodesTable.isDeleted, false),
        isNotNull(contentNodesTable.publishedRevisionId),
      ),
    );
  if (!node || !node.publishedRevisionId) return null;
  if (node.status !== "published") return null;

  const [revision] = await db
    .select()
    .from(contentRevisionsTable)
    .where(
      and(
        eq(contentRevisionsTable.id, node.publishedRevisionId),
        eq(contentRevisionsTable.status, "published"),
      ),
    );
  if (!revision) return null;

  const [ownership] = await db
    .select()
    .from(nodeOwnershipTable)
    .where(eq(nodeOwnershipTable.nodeId, node.id));

  const tagRows = await db
    .select({ name: contentTagsTable.name })
    .from(contentNodeTagsTable)
    .innerJoin(contentTagsTable, eq(contentNodeTagsTable.tagId, contentTagsTable.id))
    .where(eq(contentNodeTagsTable.nodeId, node.id));
  const tags = tagRows.map((t) => t.name);

  const relationRows = await db
    .select({
      targetNodeId: contentRelationsTable.targetNodeId,
      relationType: contentRelationsTable.relationType,
      description: contentRelationsTable.description,
      targetDisplayCode: contentNodesTable.displayCode,
      targetTitle: contentNodesTable.title,
    })
    .from(contentRelationsTable)
    .innerJoin(
      contentNodesTable,
      eq(contentRelationsTable.targetNodeId, contentNodesTable.id),
    )
    .where(eq(contentRelationsTable.sourceNodeId, node.id));

  const [publishEvent] = await db
    .select()
    .from(contentRevisionEventsTable)
    .where(
      and(
        eq(contentRevisionEventsTable.revisionId, revision.id),
        eq(contentRevisionEventsTable.eventType, "published"),
      ),
    )
    .orderBy(desc(contentRevisionEventsTable.createdAt))
    .limit(1);

  const { plaintext, markdown, media } = serializeProseMirrorContent(
    revision.content ?? null,
  );

  const structuredFields = {
    ...(revision.structuredFields ?? {}),
    media,
  };

  const glossaryTerms = await findGlossaryTermsInText(plaintext);

  const [owner, reviewer, contentOwner, ancestorTitles, childPageTitles] =
    await Promise.all([
      resolvePrincipalName(ownership?.ownerId ?? null),
      resolvePrincipalName(ownership?.reviewerId ?? null),
      resolvePrincipalName(revision.authorId ?? null),
      getAncestorTitles(node.id),
      getPublishedChildTitles(node.id),
    ]);
  const parentPath = ancestorTitles.length > 0 ? ancestorTitles.join(" > ") : null;
  const hasChildren = childPageTitles.length > 0;
  const childPageCount = childPageTitles.length;

  const sf = (revision.structuredFields ?? {}) as Record<string, unknown>;
  const confidentiality =
    typeof sf.confidentiality === "string"
      ? sf.confidentiality
      : DEFAULT_CONFIDENTIALITY_LEVEL;
  const authorityLevel =
    typeof sf.authority_level === "string" ? sf.authority_level : null;
  const sourcePriority =
    typeof sf.source_priority === "number" ? sf.source_priority : 1;
  const agentScope = Array.isArray(sf.agent_scope)
    ? (sf.agent_scope as unknown[]).filter((v) => typeof v === "string")
    : [];
  const summary =
    typeof sf.summary === "string" && sf.summary.trim().length > 0
      ? sf.summary
      : plaintext.slice(0, 400);
  const shortDescription =
    typeof sf.kurzbeschreibung === "string" && sf.kurzbeschreibung.trim().length > 0
      ? sf.kurzbeschreibung
      : summary;

  const agentMetadata = extractAgentMetadata(sf);
  const aclStatus = await getAclMappingStatus(node.id);
  const { indexable } = evaluateIndexability({
    nodeStatus: node.status,
    isDeleted: node.isDeleted,
    publishedRevisionId: node.publishedRevisionId,
    confidentialityMapsToAcl: aclStatus.confidentialityMapsToAcl,
    aclPresent: aclStatus.aclPresent,
  });
  if (!indexable) return null;

  const contentHash = stableContentHash({
    content: revision.content ?? null,
    structuredFields: revision.structuredFields ?? null,
    title: revision.title,
    versionLabel: revision.versionLabel ?? null,
  });

  return {
    itemType: "flowcore_page",
    nodeId: node.id,
    immutableId: node.immutableId,
    displayCode: node.displayCode,
    title: revision.title,
    pageType: node.templateType,
    status: "published",
    version: revision.versionLabel ?? null,
    revision: revision.revisionNo,
    summary,
    contentText: plaintext,
    contentMarkdown: markdown,
    structuredFields,
    tags,
    relations: relationRows.map((r) => ({
      targetNodeId: r.targetNodeId,
      targetDisplayCode: r.targetDisplayCode ?? null,
      targetTitle: r.targetTitle ?? null,
      relationType: r.relationType,
      description: r.description ?? null,
    })),
    glossaryTerms,
    owner,
    ownerName: owner,
    reviewer,
    contentOwner,
    confidentiality,
    authorityLevel,
    sourcePriority,
    brandScope: deriveBrandScope(tags),
    agentScope: agentScope as string[],
    agentEnabled: agentMetadata.agentEnabled,
    decisionStatus: agentMetadata.decisionStatus,
    copilotSummary: agentMetadata.copilotSummary,
    copilotKeywords: agentMetadata.copilotKeywords,
    copilotIndexStatus: node.copilotIndexStatus,
    validFrom: revision.validFrom ? revision.validFrom.toISOString() : null,
    reviewDue: revision.nextReviewDate
      ? revision.nextReviewDate.toISOString()
      : null,
    sourceUrl: `${SOURCE_BASE_URL}/nodes/${node.id}`,
    lastModifiedAt: node.updatedAt ? node.updatedAt.toISOString() : null,
    publishedAt: publishEvent
      ? publishEvent.createdAt.toISOString()
      : revision.createdAt
        ? revision.createdAt.toISOString()
        : null,
    contentHash,
    shortDescription,
    parentPath,
    hasChildren,
    childPageCount,
    childPageTitles,
  };
}
