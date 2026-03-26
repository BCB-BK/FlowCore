import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  contentNodesTable,
  contentNodeTagsTable,
  contentTagsTable,
  contentAliasesTable,
  searchQueriesTable,
  searchClicksTable,
} from "@workspace/db/schema";
import { eq, sql, and, desc, gte, lte, ilike, or, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import {
  getHighestRole,
  getSearchVisibilityForRole,
  type SearchVisibility,
} from "../services/rbac.service";

const router: IRouter = Router();

type NodeStatus = "draft" | "in_review" | "approved" | "published" | "archived" | "deleted";

const REVIEW_STATUSES: NodeStatus[] = ["published", "in_review", "approved"];

function buildStatusCondition(
  visibility: SearchVisibility,
  explicitStatus?: string,
  includeUnpublished?: boolean,
) {
  if (explicitStatus) {
    const s = explicitStatus as NodeStatus;
    if (visibility === "all") {
      return eq(contentNodesTable.status, s);
    }
    if (visibility === "include_review") {
      if (REVIEW_STATUSES.includes(s)) {
        return eq(contentNodesTable.status, s);
      }
      return sql`false`;
    }
    if (s === "published") {
      return eq(contentNodesTable.status, "published");
    }
    return sql`false`;
  }

  if (includeUnpublished && visibility !== "published_only") {
    if (visibility === "all") return undefined;
    return inArray(contentNodesTable.status, REVIEW_STATUSES);
  }

  return eq(contentNodesTable.status, "published");
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

router.get(
  "/",
  requireAuth,
  requirePermission("read_page"),
  async (req, res) => {
    const q = (req.query.q as string) || "";
    const templateType = req.query.templateType as string | undefined;
    const status = req.query.status as string | undefined;
    const includeUnpublished = req.query.includeUnpublished === "true";
    const tagId = req.query.tagId as string | undefined;
    const ownerId = req.query.ownerId as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const principalId = req.user?.principalId || "";
    const highestRole = await getHighestRole(principalId);
    const visibility = getSearchVisibilityForRole(highestRole);

    const conditions = [eq(contentNodesTable.isDeleted, false)];

    const statusCond = buildStatusCondition(visibility, status, includeUnpublished);
    if (statusCond) {
      conditions.push(statusCond);
    }

    if (templateType) {
      conditions.push(sql`${contentNodesTable.templateType} = ${templateType}`);
    }
    if (ownerId) {
      conditions.push(eq(contentNodesTable.ownerId, ownerId));
    }
    if (dateFrom) {
      conditions.push(gte(contentNodesTable.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(contentNodesTable.createdAt, new Date(dateTo)));
    }

    const searchConditions = [...conditions];
    let tsQuery: string | null = null;

    if (q.trim().length > 0) {
      tsQuery = q
        .trim()
        .split(/\s+/)
        .map((w) => w.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "") + ":*")
        .filter((w) => w.length > 2)
        .join(" & ");

      const aliasMatch = sql`${contentNodesTable.id} IN (
        SELECT node_id FROM content_aliases WHERE ${ilike(contentAliasesTable.previousDisplayCode, `%${q}%`)}
      )`;

      if (tsQuery) {
        searchConditions.push(
          or(
            sql`search_vector @@ to_tsquery('german', ${tsQuery})`,
            ilike(contentNodesTable.title, `%${q}%`),
            ilike(contentNodesTable.displayCode, `%${q}%`),
            aliasMatch,
          )!,
        );
      } else {
        searchConditions.push(
          or(
            ilike(contentNodesTable.title, `%${q}%`),
            ilike(contentNodesTable.displayCode, `%${q}%`),
            aliasMatch,
          )!,
        );
      }
    }

    if (tagId) {
      searchConditions.push(
        sql`${contentNodesTable.id} IN (
          SELECT node_id FROM content_node_tags WHERE tag_id = ${tagId}
        )`,
      );
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(contentNodesTable)
      .where(and(...searchConditions));
    const totalCount = Number(countResult[0]?.count ?? 0);

    let results;
    if (tsQuery) {
      results = await db
        .select({
          id: contentNodesTable.id,
          title: contentNodesTable.title,
          displayCode: contentNodesTable.displayCode,
          templateType: contentNodesTable.templateType,
          status: contentNodesTable.status,
          ownerId: contentNodesTable.ownerId,
          parentNodeId: contentNodesTable.parentNodeId,
          createdAt: contentNodesTable.createdAt,
          updatedAt: contentNodesTable.updatedAt,
          rank: sql<number>`ts_rank(search_vector, to_tsquery('german', ${tsQuery}))`.as(
            "rank",
          ),
          headline:
            sql<string>`ts_headline('german', ${contentNodesTable.title}, to_tsquery('german', ${tsQuery}), 'StartSel=<b>, StopSel=</b>')`.as(
              "headline",
            ),
        })
        .from(contentNodesTable)
        .where(and(...searchConditions))
        .orderBy(sql`rank DESC`)
        .limit(limit)
        .offset(offset);
    } else {
      results = await db
        .select({
          id: contentNodesTable.id,
          title: contentNodesTable.title,
          displayCode: contentNodesTable.displayCode,
          templateType: contentNodesTable.templateType,
          status: contentNodesTable.status,
          ownerId: contentNodesTable.ownerId,
          parentNodeId: contentNodesTable.parentNodeId,
          createdAt: contentNodesTable.createdAt,
          updatedAt: contentNodesTable.updatedAt,
          rank: sql<number>`0`.as("rank"),
          headline: contentNodesTable.title,
        })
        .from(contentNodesTable)
        .where(and(...searchConditions))
        .orderBy(desc(contentNodesTable.updatedAt))
        .limit(limit)
        .offset(offset);
    }

    const baseConditions = [eq(contentNodesTable.isDeleted, false)];

    const facetStatusCond = buildStatusCondition(visibility, status, includeUnpublished);
    if (facetStatusCond) {
      baseConditions.push(facetStatusCond);
    }

    if (q.trim().length > 0 && tsQuery) {
      baseConditions.push(
        or(
          sql`search_vector @@ to_tsquery('german', ${tsQuery})`,
          ilike(contentNodesTable.title, `%${q}%`),
          ilike(contentNodesTable.displayCode, `%${q}%`),
        )!,
      );
    } else if (q.trim().length > 0) {
      baseConditions.push(
        or(
          ilike(contentNodesTable.title, `%${q}%`),
          ilike(contentNodesTable.displayCode, `%${q}%`),
        )!,
      );
    }

    const facetResults = await db
      .select({
        templateType: contentNodesTable.templateType,
        status: contentNodesTable.status,
        ownerId: contentNodesTable.ownerId,
        count: sql<number>`count(*)`,
      })
      .from(contentNodesTable)
      .where(and(...baseConditions))
      .groupBy(
        contentNodesTable.templateType,
        contentNodesTable.status,
        contentNodesTable.ownerId,
      );

    const typeFacets: Record<string, number> = {};
    const statusFacets: Record<string, number> = {};
    const ownerFacets: Record<string, number> = {};
    for (const row of facetResults) {
      typeFacets[row.templateType] =
        (typeFacets[row.templateType] || 0) + Number(row.count);
      statusFacets[row.status] =
        (statusFacets[row.status] || 0) + Number(row.count);
      if (row.ownerId) {
        ownerFacets[row.ownerId] =
          (ownerFacets[row.ownerId] || 0) + Number(row.count);
      }
    }

    const tagFacetResults = await db
      .select({
        tagId: contentNodeTagsTable.tagId,
        tagName: contentTagsTable.name,
        count: sql<number>`count(*)`,
      })
      .from(contentNodeTagsTable)
      .innerJoin(
        contentTagsTable,
        eq(contentNodeTagsTable.tagId, contentTagsTable.id),
      )
      .innerJoin(
        contentNodesTable,
        eq(contentNodeTagsTable.nodeId, contentNodesTable.id),
      )
      .where(and(...baseConditions))
      .groupBy(contentNodeTagsTable.tagId, contentTagsTable.name);

    const tagFacets: Record<string, number> = {};
    for (const row of tagFacetResults) {
      tagFacets[row.tagName] = Number(row.count);
    }

    let queryId: string | null = null;
    if (q.trim().length > 0) {
      try {
        const [inserted] = await db
          .insert(searchQueriesTable)
          .values({
            query: q.trim(),
            resultCount: totalCount,
            userId: req.user?.principalId || null,
          })
          .returning({ id: searchQueriesTable.id });
        queryId = inserted?.id || null;
      } catch {
        queryId = null;
      }
    }

    res.json({
      results,
      total: totalCount,
      limit,
      offset,
      queryId,
      visibility,
      facets: {
        templateType: typeFacets,
        status: statusFacets,
        owner: ownerFacets,
        tags: tagFacets,
      },
    });
  },
);

router.get(
  "/suggestions",
  requireAuth,
  requirePermission("read_page"),
  async (req, res) => {
    const q = (req.query.q as string) || "";
    const includeUnpublished = req.query.includeUnpublished === "true";
    if (q.trim().length < 2) {
      res.json({ nodes: [], aliases: [] });
      return;
    }

    const principalId = req.user?.principalId || "";
    const highestRole = await getHighestRole(principalId);
    const visibility = getSearchVisibilityForRole(highestRole);
    const statusCond = buildStatusCondition(visibility, undefined, includeUnpublished);

    const suggestionConditions = [
      eq(contentNodesTable.isDeleted, false),
      or(
        ilike(contentNodesTable.title, `%${q}%`),
        ilike(contentNodesTable.displayCode, `%${q}%`),
      )!,
    ];
    if (statusCond) {
      suggestionConditions.push(statusCond);
    }

    const suggestions = await db
      .select({
        id: contentNodesTable.id,
        title: contentNodesTable.title,
        displayCode: contentNodesTable.displayCode,
        templateType: contentNodesTable.templateType,
      })
      .from(contentNodesTable)
      .where(and(...suggestionConditions))
      .orderBy(contentNodesTable.title)
      .limit(10);

    const aliasConditions = [
      ilike(contentAliasesTable.previousDisplayCode, `%${q}%`),
      eq(contentNodesTable.isDeleted, false),
    ];
    const aliasStatusCond = buildStatusCondition(visibility, undefined, includeUnpublished);
    if (aliasStatusCond) {
      aliasConditions.push(aliasStatusCond);
    }

    const aliasSuggestions = await db
      .select({
        nodeId: contentAliasesTable.nodeId,
        previousDisplayCode: contentAliasesTable.previousDisplayCode,
      })
      .from(contentAliasesTable)
      .innerJoin(
        contentNodesTable,
        eq(contentAliasesTable.nodeId, contentNodesTable.id),
      )
      .where(and(...aliasConditions))
      .limit(5);

    res.json({ nodes: suggestions, aliases: aliasSuggestions });
  },
);

router.get(
  "/analytics",
  requireAuth,
  requirePermission("view_audit_log"),
  async (req, res) => {
    const days = parseInt(req.query.days as string) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const popularQueries = await db
      .select({
        query: searchQueriesTable.query,
        count: sql<number>`count(*)`,
        avgResults: sql<number>`avg(result_count)::int`,
      })
      .from(searchQueriesTable)
      .where(gte(searchQueriesTable.createdAt, since))
      .groupBy(searchQueriesTable.query)
      .orderBy(sql`count(*) DESC`)
      .limit(20);

    const zeroResultQueries = await db
      .select({
        query: searchQueriesTable.query,
        count: sql<number>`count(*)`,
      })
      .from(searchQueriesTable)
      .where(
        and(
          gte(searchQueriesTable.createdAt, since),
          eq(searchQueriesTable.resultCount, 0),
        ),
      )
      .groupBy(searchQueriesTable.query)
      .orderBy(sql`count(*) DESC`)
      .limit(20);

    const totalSearches = await db
      .select({ count: sql<number>`count(*)` })
      .from(searchQueriesTable)
      .where(gte(searchQueriesTable.createdAt, since));

    res.json({
      period: { days, since: since.toISOString() },
      totalSearches: Number(totalSearches[0]?.count ?? 0),
      popularQueries,
      zeroResultQueries,
    });
  },
);

router.post(
  "/click",
  requireAuth,
  requirePermission("read_page"),
  async (req, res) => {
    const { queryId, nodeId, position } = req.body;

    if (!isUUID(nodeId)) {
      res.status(400).json({ error: "nodeId must be a valid UUID" });
      return;
    }

    await db
      .insert(searchClicksTable)
      .values({
        queryId: queryId || null,
        nodeId,
        position: typeof position === "number" ? position : null,
        userId: req.user?.principalId || null,
      })
      .catch(() => {});

    res.status(201).json({ ok: true });
  },
);

export { router as searchRouter };
