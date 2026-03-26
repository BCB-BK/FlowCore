import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface QualityOverview {
  totalPages: number;
  publishedPages: number;
  draftPages: number;
  archivedPages: number;
  pagesWithoutOwner: number;
  overdueReviews: number;
  orphanedPages: number;
  incompletePagesCount: number;
  avgCompleteness: number;
}

export interface PageQualityRow {
  nodeId: string;
  title: string;
  displayCode: string;
  templateType: string;
  status: string;
  ownerId: string | null;
  hasCurrentRevision: boolean;
  hasPublishedRevision: boolean;
  completeness: number;
  isOrphan: boolean;
  reviewOverdue: boolean;
  nextReviewDate: string | null;
  updatedAt: string;
  childCount: number;
  relationCount: number;
}

export interface DuplicateGroup {
  title: string;
  nodes: {
    nodeId: string;
    displayCode: string;
    templateType: string;
    status: string;
    updatedAt: string;
  }[];
}

export interface MaintenanceHint {
  type:
    | "missing_owner"
    | "overdue_review"
    | "stale_content"
    | "orphan"
    | "no_revision"
    | "archived_reference"
    | "missing_mandatory_fields";
  severity: "critical" | "warning" | "info";
  nodeId: string;
  title: string;
  displayCode: string;
  detail: string;
}

export interface PersonalWorkItem {
  type:
    | "my_draft"
    | "pending_review"
    | "pending_approval"
    | "owned_unhealthy"
    | "my_page_overdue";
  nodeId: string;
  title: string;
  displayCode: string;
  templateType: string;
  status: string;
  detail: string;
  priority: "high" | "medium" | "low";
  updatedAt: string;
}

type R = Record<string, unknown>;

function str(row: R, key: string): string {
  return String(row[key] ?? "");
}

function num(row: R, key: string): number {
  return parseInt(String(row[key] ?? "0"), 10);
}

function bool(row: R, key: string): boolean {
  const v = row[key];
  return v === true || v === "t" || v === "true";
}

export async function getQualityOverview(): Promise<QualityOverview> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE NOT is_deleted) as total_pages,
      COUNT(*) FILTER (WHERE status = 'published' AND NOT is_deleted) as published_pages,
      COUNT(*) FILTER (WHERE status = 'draft' AND NOT is_deleted) as draft_pages,
      COUNT(*) FILTER (WHERE status = 'archived' AND NOT is_deleted) as archived_pages,
      COUNT(*) FILTER (WHERE owner_id IS NULL AND NOT is_deleted) as pages_without_owner
    FROM content_nodes
  `);
  const row = (result.rows[0] ?? {}) as R;

  const overdueResult = await db.execute(sql`
    SELECT COUNT(DISTINCT cn.id) as cnt
    FROM content_nodes cn
    JOIN content_revisions cr ON cn.current_revision_id = cr.id
    WHERE NOT cn.is_deleted
      AND cr.next_review_date IS NOT NULL
      AND cr.next_review_date < NOW()
  `);

  const orphanResult = await db.execute(sql`
    SELECT COUNT(*) as cnt
    FROM content_nodes cn
    WHERE NOT cn.is_deleted
      AND cn.parent_node_id IS NULL
      AND cn.template_type NOT IN ('core_process_overview', 'dashboard')
      AND NOT EXISTS (
        SELECT 1 FROM content_relations cr
        WHERE cr.source_node_id = cn.id OR cr.target_node_id = cn.id
      )
  `);

  const totalPages = num(row, "total_pages");
  const publishedPages = num(row, "published_pages");

  return {
    totalPages,
    publishedPages,
    draftPages: num(row, "draft_pages"),
    archivedPages: num(row, "archived_pages"),
    pagesWithoutOwner: num(row, "pages_without_owner"),
    overdueReviews: num((overdueResult.rows[0] ?? {}) as R, "cnt"),
    orphanedPages: num((orphanResult.rows[0] ?? {}) as R, "cnt"),
    incompletePagesCount: 0,
    avgCompleteness:
      totalPages > 0 ? Math.round((publishedPages / totalPages) * 100) : 0,
  };
}

export async function getPageQualityList(
  filter?: string,
  limit = 50,
  offset = 0,
): Promise<{ items: PageQualityRow[]; total: number }> {
  let whereClause = sql`WHERE NOT cn.is_deleted`;
  if (filter === "no_owner") {
    whereClause = sql`WHERE NOT cn.is_deleted AND cn.owner_id IS NULL`;
  } else if (filter === "overdue_review") {
    whereClause = sql`WHERE NOT cn.is_deleted AND cr.next_review_date IS NOT NULL AND cr.next_review_date < NOW()`;
  } else if (filter === "orphan") {
    whereClause = sql`WHERE NOT cn.is_deleted AND cn.parent_node_id IS NULL
      AND cn.template_type NOT IN ('core_process_overview', 'dashboard')
      AND NOT EXISTS (SELECT 1 FROM content_relations rel WHERE rel.source_node_id = cn.id OR rel.target_node_id = cn.id)`;
  } else if (filter === "draft") {
    whereClause = sql`WHERE NOT cn.is_deleted AND cn.status = 'draft'`;
  } else if (filter === "stale") {
    whereClause = sql`WHERE NOT cn.is_deleted AND cn.updated_at < NOW() - INTERVAL '180 days'`;
  }

  const countResult = await db.execute(sql`
    SELECT COUNT(*) as cnt
    FROM content_nodes cn
    LEFT JOIN content_revisions cr ON cn.current_revision_id = cr.id
    ${whereClause}
  `);
  const total = num((countResult.rows[0] ?? {}) as R, "cnt");

  const result = await db.execute(sql`
    SELECT
      cn.id as node_id,
      cn.title,
      cn.display_code,
      cn.template_type,
      cn.status,
      cn.owner_id,
      (cn.current_revision_id IS NOT NULL) as has_current_revision,
      (cn.published_revision_id IS NOT NULL) as has_published_revision,
      cr.next_review_date::text as next_review_date,
      cn.updated_at::text as updated_at,
      (SELECT COUNT(*) FROM content_nodes ch WHERE ch.parent_node_id = cn.id AND NOT ch.is_deleted)::text as child_count,
      (SELECT COUNT(*) FROM content_relations rel WHERE rel.source_node_id = cn.id OR rel.target_node_id = cn.id)::text as relation_count,
      (cn.parent_node_id IS NULL
        AND cn.template_type NOT IN ('core_process_overview', 'dashboard')
        AND NOT EXISTS (SELECT 1 FROM content_relations rel WHERE rel.source_node_id = cn.id OR rel.target_node_id = cn.id)
      ) as is_orphan,
      (cr.next_review_date IS NOT NULL AND cr.next_review_date < NOW()) as review_overdue
    FROM content_nodes cn
    LEFT JOIN content_revisions cr ON cn.current_revision_id = cr.id
    ${whereClause}
    ORDER BY cn.updated_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const items: PageQualityRow[] = result.rows.map((raw) => {
    const r = raw as R;
    let completeness = 0;
    const hasCurRev = bool(r, "has_current_revision");
    const hasPubRev = bool(r, "has_published_revision");
    const overdue = bool(r, "review_overdue");
    if (hasCurRev) completeness += 25;
    if (hasPubRev) completeness += 25;
    if (r.owner_id) completeness += 25;
    if (!overdue && hasCurRev) completeness += 25;

    return {
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      templateType: str(r, "template_type"),
      status: str(r, "status"),
      ownerId: r.owner_id ? String(r.owner_id) : null,
      hasCurrentRevision: hasCurRev,
      hasPublishedRevision: hasPubRev,
      completeness,
      isOrphan: bool(r, "is_orphan"),
      reviewOverdue: overdue,
      nextReviewDate: r.next_review_date ? String(r.next_review_date) : null,
      updatedAt: str(r, "updated_at"),
      childCount: num(r, "child_count"),
      relationCount: num(r, "relation_count"),
    };
  });

  return { items, total };
}

export async function getDuplicates(): Promise<DuplicateGroup[]> {
  const result = await db.execute(sql`
    SELECT cn.title, cn.id as node_id, cn.display_code, cn.template_type, cn.status, cn.updated_at::text as updated_at
    FROM content_nodes cn
    WHERE NOT cn.is_deleted
      AND cn.title IN (
        SELECT title FROM content_nodes WHERE NOT is_deleted GROUP BY title HAVING COUNT(*) > 1
      )
    ORDER BY cn.title, cn.updated_at DESC
  `);

  const groups = new Map<string, DuplicateGroup>();
  for (const raw of result.rows) {
    const r = raw as R;
    const title = str(r, "title");
    if (!groups.has(title)) {
      groups.set(title, { title, nodes: [] });
    }
    groups.get(title)!.nodes.push({
      nodeId: str(r, "node_id"),
      displayCode: str(r, "display_code"),
      templateType: str(r, "template_type"),
      status: str(r, "status"),
      updatedAt: str(r, "updated_at"),
    });
  }

  return Array.from(groups.values());
}

export async function getMaintenanceHints(): Promise<MaintenanceHint[]> {
  const hints: MaintenanceHint[] = [];

  const noOwner = await db.execute(sql`
    SELECT id as node_id, title, display_code
    FROM content_nodes
    WHERE NOT is_deleted AND owner_id IS NULL
    ORDER BY updated_at DESC
    LIMIT 50
  `);
  for (const raw of noOwner.rows) {
    const r = raw as R;
    hints.push({
      type: "missing_owner",
      severity: "warning",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      detail: "Seite hat keinen zugewiesenen Verantwortlichen",
    });
  }

  const overdueReviews = await db.execute(sql`
    SELECT cn.id as node_id, cn.title, cn.display_code, cr.next_review_date::text as next_review_date
    FROM content_nodes cn
    JOIN content_revisions cr ON cn.current_revision_id = cr.id
    WHERE NOT cn.is_deleted
      AND cr.next_review_date IS NOT NULL
      AND cr.next_review_date < NOW()
    ORDER BY cr.next_review_date ASC
    LIMIT 50
  `);
  for (const raw of overdueReviews.rows) {
    const r = raw as R;
    hints.push({
      type: "overdue_review",
      severity: "critical",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      detail: `Review fällig seit ${str(r, "next_review_date")}`,
    });
  }

  const stale = await db.execute(sql`
    SELECT id as node_id, title, display_code, updated_at::text as updated_at
    FROM content_nodes
    WHERE NOT is_deleted AND updated_at < NOW() - INTERVAL '180 days'
    ORDER BY updated_at ASC
    LIMIT 50
  `);
  for (const raw of stale.rows) {
    const r = raw as R;
    hints.push({
      type: "stale_content",
      severity: "info",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      detail: `Letzte Aktualisierung: ${str(r, "updated_at")}`,
    });
  }

  const orphans = await db.execute(sql`
    SELECT cn.id as node_id, cn.title, cn.display_code
    FROM content_nodes cn
    WHERE NOT cn.is_deleted
      AND cn.parent_node_id IS NULL
      AND cn.template_type NOT IN ('core_process_overview', 'dashboard')
      AND NOT EXISTS (
        SELECT 1 FROM content_relations rel
        WHERE rel.source_node_id = cn.id OR rel.target_node_id = cn.id
      )
    LIMIT 50
  `);
  for (const raw of orphans.rows) {
    const r = raw as R;
    hints.push({
      type: "orphan",
      severity: "warning",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      detail: "Verwaiste Seite ohne Elternknoten oder Verknüpfungen",
    });
  }

  const noRevision = await db.execute(sql`
    SELECT id as node_id, title, display_code
    FROM content_nodes
    WHERE NOT is_deleted AND current_revision_id IS NULL
    LIMIT 50
  `);
  for (const raw of noRevision.rows) {
    const r = raw as R;
    hints.push({
      type: "no_revision",
      severity: "warning",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      detail: "Seite hat keine aktuelle Revision",
    });
  }

  const archivedRefs = await db.execute(sql`
    SELECT cn.id as node_id, cn.title, cn.display_code, target.title as target_title
    FROM content_relations rel
    JOIN content_nodes cn ON rel.source_node_id = cn.id
    JOIN content_nodes target ON rel.target_node_id = target.id
    WHERE NOT cn.is_deleted
      AND (target.is_deleted OR target.status = 'archived')
    LIMIT 50
  `);
  for (const raw of archivedRefs.rows) {
    const r = raw as R;
    hints.push({
      type: "archived_reference",
      severity: "warning",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      detail: `Referenziert archivierte/gelöschte Seite: ${str(r, "target_title")}`,
    });
  }

  hints.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return hints;
}

export async function getPersonalWorkItems(
  principalId: string,
): Promise<PersonalWorkItem[]> {
  const items: PersonalWorkItem[] = [];

  const myDrafts = await db.execute(sql`
    SELECT cn.id as node_id, cn.title, cn.display_code, cn.template_type, cn.updated_at::text as updated_at
    FROM content_nodes cn
    WHERE NOT cn.is_deleted
      AND cn.status = 'draft'
      AND cn.owner_id = ${principalId}
    ORDER BY cn.updated_at DESC
    LIMIT 20
  `);
  for (const raw of myDrafts.rows) {
    const r = raw as R;
    items.push({
      type: "my_draft",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      templateType: str(r, "template_type"),
      status: "draft",
      detail: "Entwurf wartet auf Fertigstellung",
      priority: "medium",
      updatedAt: str(r, "updated_at"),
    });
  }

  const pendingReviews = await db.execute(sql`
    SELECT cn.id as node_id, cn.title, cn.display_code, cn.template_type, cn.status, cn.updated_at::text as updated_at
    FROM content_nodes cn
    JOIN content_revisions cr ON cn.current_revision_id = cr.id
    WHERE NOT cn.is_deleted
      AND cn.status = 'in_review'
      AND cr.reviewer_id = ${principalId}
    ORDER BY cn.updated_at DESC
    LIMIT 20
  `);
  for (const raw of pendingReviews.rows) {
    const r = raw as R;
    items.push({
      type: "pending_review",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      templateType: str(r, "template_type"),
      status: str(r, "status"),
      detail: "Review ausstehend",
      priority: "high",
      updatedAt: str(r, "updated_at"),
    });
  }

  const pendingApprovals = await db.execute(sql`
    SELECT cn.id as node_id, cn.title, cn.display_code, cn.template_type, cn.status, cn.updated_at::text as updated_at
    FROM content_nodes cn
    JOIN content_revisions cr ON cn.current_revision_id = cr.id
    WHERE NOT cn.is_deleted
      AND cr.approver_id = ${principalId}
      AND cn.status IN ('in_review', 'approved')
      AND cn.published_revision_id IS DISTINCT FROM cn.current_revision_id
    ORDER BY cn.updated_at DESC
    LIMIT 20
  `);
  for (const raw of pendingApprovals.rows) {
    const r = raw as R;
    items.push({
      type: "pending_approval",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      templateType: str(r, "template_type"),
      status: str(r, "status"),
      detail: "Genehmigung ausstehend",
      priority: "high",
      updatedAt: str(r, "updated_at"),
    });
  }

  const ownedUnhealthy = await db.execute(sql`
    SELECT cn.id as node_id, cn.title, cn.display_code, cn.template_type, cn.status, cn.updated_at::text as updated_at,
           cr.next_review_date::text as next_review_date
    FROM content_nodes cn
    LEFT JOIN content_revisions cr ON cn.current_revision_id = cr.id
    WHERE NOT cn.is_deleted
      AND cn.owner_id = ${principalId}
      AND (
        cn.current_revision_id IS NULL
        OR cn.published_revision_id IS NULL
        OR (cr.next_review_date IS NOT NULL AND cr.next_review_date < NOW())
        OR cn.updated_at < NOW() - INTERVAL '180 days'
      )
    ORDER BY cn.updated_at ASC
    LIMIT 20
  `);
  for (const raw of ownedUnhealthy.rows) {
    const r = raw as R;
    let detail = "Seite benötigt Aufmerksamkeit";
    let priority: "high" | "medium" | "low" = "medium";
    const nrd = r.next_review_date ? String(r.next_review_date) : null;
    if (nrd && new Date(nrd) < new Date()) {
      detail = `Review überfällig seit ${nrd}`;
      priority = "high";
    }
    items.push({
      type: "owned_unhealthy",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      templateType: str(r, "template_type"),
      status: str(r, "status"),
      detail,
      priority,
      updatedAt: str(r, "updated_at"),
    });
  }

  items.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return items;
}

export interface SearchInsights {
  totalSearches: number;
  zeroResultSearches: number;
  topQueries: { query: string; count: number }[];
  topClickedNodes: { nodeId: string; clicks: number }[];
}

export async function getSearchInsights(days = 30): Promise<SearchInsights> {
  const safeDays = Math.max(1, Math.min(Math.floor(days), 365));

  const totalResult = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE result_count = 0) as zero_results
    FROM search_queries
    WHERE created_at > NOW() - make_interval(days => ${safeDays})
  `);

  const topQueriesResult = await db.execute(sql`
    SELECT query, COUNT(*) as cnt
    FROM search_queries
    WHERE created_at > NOW() - make_interval(days => ${safeDays})
    GROUP BY query
    ORDER BY cnt DESC
    LIMIT 20
  `);

  const topClicksResult = await db.execute(sql`
    SELECT node_id, COUNT(*) as clicks
    FROM search_clicks
    WHERE created_at > NOW() - make_interval(days => ${safeDays})
    GROUP BY node_id
    ORDER BY clicks DESC
    LIMIT 20
  `);

  const tr = (totalResult.rows[0] ?? {}) as R;

  return {
    totalSearches: num(tr, "total"),
    zeroResultSearches: num(tr, "zero_results"),
    topQueries: topQueriesResult.rows.map((raw) => {
      const r = raw as R;
      return { query: str(r, "query"), count: num(r, "cnt") };
    }),
    topClickedNodes: topClicksResult.rows.map((raw) => {
      const r = raw as R;
      return { nodeId: str(r, "node_id"), clicks: num(r, "clicks") };
    }),
  };
}
