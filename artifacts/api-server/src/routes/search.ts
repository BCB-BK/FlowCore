import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  contentNodesTable,
  contentNodeTagsTable,
  contentAliasesTable,
  searchQueriesTable,
  searchClicksTable,
} from "@workspace/db/schema";
import { eq, sql, and, desc, gte, lte, ilike, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";

const router: IRouter = Router();

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
    const tagId = req.query.tagId as string | undefined;
    const ownerId = req.query.ownerId as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const conditions = [eq(contentNodesTable.isDeleted, false)];

    if (templateType) {
      conditions.push(sql`${contentNodesTable.templateType} = ${templateType}`);
    }
    if (status) {
      conditions.push(sql`${contentNodesTable.status} = ${status}`);
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

    const facetResults = await db
      .select({
        templateType: contentNodesTable.templateType,
        status: contentNodesTable.status,
        ownerId: contentNodesTable.ownerId,
        count: sql<number>`count(*)`,
      })
      .from(contentNodesTable)
      .where(eq(contentNodesTable.isDeleted, false))
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

    if (q.trim().length > 0) {
      await db
        .insert(searchQueriesTable)
        .values({
          query: q.trim(),
          resultCount: totalCount,
          userId: req.user?.principalId || null,
        })
        .catch(() => {});
    }

    res.json({
      results,
      total: totalCount,
      limit,
      offset,
      facets: {
        templateType: typeFacets,
        status: statusFacets,
        owner: ownerFacets,
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
    if (q.trim().length < 2) {
      res.json({ nodes: [], aliases: [] });
      return;
    }

    const suggestions = await db
      .select({
        id: contentNodesTable.id,
        title: contentNodesTable.title,
        displayCode: contentNodesTable.displayCode,
        templateType: contentNodesTable.templateType,
      })
      .from(contentNodesTable)
      .where(
        and(
          eq(contentNodesTable.isDeleted, false),
          or(
            ilike(contentNodesTable.title, `%${q}%`),
            ilike(contentNodesTable.displayCode, `%${q}%`),
          ),
        ),
      )
      .orderBy(contentNodesTable.title)
      .limit(10);

    const aliasSuggestions = await db
      .select({
        nodeId: contentAliasesTable.nodeId,
        previousDisplayCode: contentAliasesTable.previousDisplayCode,
      })
      .from(contentAliasesTable)
      .where(ilike(contentAliasesTable.previousDisplayCode, `%${q}%`))
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
