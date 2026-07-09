import { db } from "@workspace/db";
import { contentNodesTable, glossaryTermsTable } from "@workspace/db/schema";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import {
  projectPublishedPage,
  type CopilotPageProjection,
} from "./copilot-content-projection.service";
import {
  projectGlossaryTerm,
  type GlossaryTermProjection,
} from "./glossary-projection.service";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const MAX_LIMIT = 200;

function clampPagination(limit: number, offset: number) {
  return {
    limit: Math.min(Math.max(limit || 50, 1), MAX_LIMIT),
    offset: Math.max(offset || 0, 0),
  };
}

/**
 * Batch export of all strictly-published pages (nodes with a
 * published_revision_id, not soft-deleted), paginated by node id order
 * for stable results across pages.
 */
export async function exportPublishedPages(
  rawLimit: number,
  rawOffset: number,
): Promise<PaginatedResult<CopilotPageProjection>> {
  const { limit, offset } = clampPagination(rawLimit, rawOffset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contentNodesTable)
    .where(
      and(
        eq(contentNodesTable.isDeleted, false),
        isNotNull(contentNodesTable.publishedRevisionId),
      ),
    );

  const rows = await db
    .select({ id: contentNodesTable.id })
    .from(contentNodesTable)
    .where(
      and(
        eq(contentNodesTable.isDeleted, false),
        isNotNull(contentNodesTable.publishedRevisionId),
      ),
    )
    .orderBy(contentNodesTable.id)
    .limit(limit)
    .offset(offset);

  const projections = await Promise.all(
    rows.map((r) => projectPublishedPage(r.id)),
  );
  const items = projections.filter(
    (p): p is CopilotPageProjection => p !== null,
  );

  return {
    items,
    total: count,
    limit,
    offset,
    hasMore: offset + rows.length < count,
  };
}

/**
 * Batch export of all glossary terms, paginated. See
 * glossary-projection.service.ts for the "published" status assumption.
 */
export async function exportGlossaryTerms(
  rawLimit: number,
  rawOffset: number,
): Promise<PaginatedResult<GlossaryTermProjection>> {
  const { limit, offset } = clampPagination(rawLimit, rawOffset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(glossaryTermsTable);

  const rows = await db
    .select({ id: glossaryTermsTable.id })
    .from(glossaryTermsTable)
    .orderBy(glossaryTermsTable.id)
    .limit(limit)
    .offset(offset);

  const projections = await Promise.all(
    rows.map((r) => projectGlossaryTerm(r.id)),
  );
  const items = projections.filter(
    (p): p is GlossaryTermProjection => p !== null,
  );

  return {
    items,
    total: count,
    limit,
    offset,
    hasMore: offset + rows.length < count,
  };
}
