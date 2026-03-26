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
  brokenLinks: number;
  unreferencedMedia: number;
  pagesWithoutTags: number;
  zeroResultSearches: number;
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
  tagCount: number;
}

export interface DuplicateGroup {
  title: string;
  matchType: "exact" | "similar";
  similarityScore: number;
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
    | "missing_mandatory_fields"
    | "broken_link"
    | "unreferenced_media"
    | "stale_policy_reference"
    | "missing_tags"
    | "violated_review_cycle"
    | "contradictory_roles";
  severity: "critical" | "warning" | "info";
  nodeId: string;
  title: string;
  displayCode: string;
  detail: string;
  targetType?: "page" | "media";
}

export interface ProcessQualityRow {
  templateType: string;
  totalPages: number;
  publishedPages: number;
  draftPages: number;
  avgCompleteness: number;
  pagesWithoutOwner: number;
  overdueReviews: number;
  pagesWithoutTags: number;
}

export interface PersonalWorkItem {
  type:
    | "my_draft"
    | "pending_review"
    | "pending_approval"
    | "pending_pm_review"
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

  const incompleteResult = await db.execute(sql`
    SELECT COUNT(*) as cnt
    FROM content_nodes cn
    LEFT JOIN content_revisions cr ON cn.current_revision_id = cr.id
    WHERE NOT cn.is_deleted
      AND (
        cn.owner_id IS NULL
        OR cn.current_revision_id IS NULL
        OR cn.published_revision_id IS NULL
        OR NOT EXISTS (SELECT 1 FROM content_node_tags t WHERE t.node_id = cn.id)
      )
  `);

  const brokenLinksResult = await db.execute(sql`
    SELECT COUNT(*) as cnt
    FROM content_relations rel
    JOIN content_nodes src ON rel.source_node_id = src.id
    JOIN content_nodes tgt ON rel.target_node_id = tgt.id
    WHERE NOT src.is_deleted
      AND (tgt.is_deleted OR tgt.status = 'archived')
  `);

  const unreferencedMediaResult = await db.execute(sql`
    SELECT COUNT(*) as cnt
    FROM media_assets ma
    WHERE NOT ma.is_deleted
      AND NOT EXISTS (
        SELECT 1 FROM media_asset_usages mau WHERE mau.asset_id = ma.id
      )
  `);

  const noTagsResult = await db.execute(sql`
    SELECT COUNT(*) as cnt
    FROM content_nodes cn
    WHERE NOT cn.is_deleted
      AND NOT EXISTS (SELECT 1 FROM content_node_tags t WHERE t.node_id = cn.id)
  `);

  const zeroSearchResult = await db.execute(sql`
    SELECT COUNT(*) as cnt
    FROM search_queries
    WHERE result_count = 0
      AND created_at > NOW() - INTERVAL '30 days'
  `);

  const totalPages = num(row, "total_pages");
  const incompletePagesCount = num(
    (incompleteResult.rows[0] ?? {}) as R,
    "cnt",
  );

  const completenessResult = await db.execute(sql`
    SELECT
      ROUND(AVG(
        CASE WHEN cn.owner_id IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN cn.current_revision_id IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN cn.published_revision_id IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM content_node_tags t WHERE t.node_id = cn.id) THEN 20 ELSE 0 END +
        CASE WHEN cn.current_revision_id IS NOT NULL AND (cr.next_review_date IS NULL OR cr.next_review_date >= NOW()) THEN 20 ELSE 0 END
      )) as avg_completeness
    FROM content_nodes cn
    LEFT JOIN content_revisions cr ON cn.current_revision_id = cr.id
    WHERE NOT cn.is_deleted
  `);

  return {
    totalPages,
    publishedPages: num(row, "published_pages"),
    draftPages: num(row, "draft_pages"),
    archivedPages: num(row, "archived_pages"),
    pagesWithoutOwner: num(row, "pages_without_owner"),
    overdueReviews: num((overdueResult.rows[0] ?? {}) as R, "cnt"),
    orphanedPages: num((orphanResult.rows[0] ?? {}) as R, "cnt"),
    incompletePagesCount,
    avgCompleteness: num(
      (completenessResult.rows[0] ?? {}) as R,
      "avg_completeness",
    ),
    brokenLinks: num((brokenLinksResult.rows[0] ?? {}) as R, "cnt"),
    unreferencedMedia: num((unreferencedMediaResult.rows[0] ?? {}) as R, "cnt"),
    pagesWithoutTags: num((noTagsResult.rows[0] ?? {}) as R, "cnt"),
    zeroResultSearches: num((zeroSearchResult.rows[0] ?? {}) as R, "cnt"),
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
  } else if (filter === "no_tags") {
    whereClause = sql`WHERE NOT cn.is_deleted AND NOT EXISTS (SELECT 1 FROM content_node_tags t WHERE t.node_id = cn.id)`;
  } else if (filter === "broken_refs") {
    whereClause = sql`WHERE NOT cn.is_deleted AND EXISTS (
      SELECT 1 FROM content_relations rel
      JOIN content_nodes tgt ON rel.target_node_id = tgt.id
      WHERE rel.source_node_id = cn.id AND (tgt.is_deleted OR tgt.status = 'archived')
    )`;
  } else if (filter === "incomplete") {
    whereClause = sql`WHERE NOT cn.is_deleted AND (
      cn.owner_id IS NULL
      OR cn.current_revision_id IS NULL
      OR cn.published_revision_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM content_node_tags t WHERE t.node_id = cn.id)
    )`;
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
      (SELECT COUNT(*) FROM content_node_tags t WHERE t.node_id = cn.id)::text as tag_count,
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
    const hasCurRev = bool(r, "has_current_revision");
    const hasPubRev = bool(r, "has_published_revision");
    const overdue = bool(r, "review_overdue");
    const hasOwner = !!r.owner_id;
    const tagCount = num(r, "tag_count");

    let completeness = 0;
    if (hasOwner) completeness += 20;
    if (hasCurRev) completeness += 20;
    if (hasPubRev) completeness += 20;
    if (tagCount > 0) completeness += 20;
    if (!overdue && hasCurRev) completeness += 20;

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
      tagCount,
    };
  });

  return { items, total };
}

export async function getDuplicates(): Promise<DuplicateGroup[]> {
  const exactResult = await db.execute(sql`
    SELECT cn.title, cn.id as node_id, cn.display_code, cn.template_type, cn.status, cn.updated_at::text as updated_at
    FROM content_nodes cn
    WHERE NOT cn.is_deleted
      AND cn.title IN (
        SELECT title FROM content_nodes WHERE NOT is_deleted GROUP BY title HAVING COUNT(*) > 1
      )
    ORDER BY cn.title, cn.updated_at DESC
  `);

  const exactGroups = new Map<string, DuplicateGroup>();
  for (const raw of exactResult.rows) {
    const r = raw as R;
    const title = str(r, "title");
    if (!exactGroups.has(title)) {
      exactGroups.set(title, {
        title,
        matchType: "exact",
        similarityScore: 1.0,
        nodes: [],
      });
    }
    exactGroups.get(title)!.nodes.push({
      nodeId: str(r, "node_id"),
      displayCode: str(r, "display_code"),
      templateType: str(r, "template_type"),
      status: str(r, "status"),
      updatedAt: str(r, "updated_at"),
    });
  }
  const groups = Array.from(exactGroups.values());

  try {
    const similarResult = await db.execute(sql`
      SELECT
        a.id as node_id_a, a.title as title_a, a.display_code as code_a,
        a.template_type as type_a, a.status as status_a, a.updated_at::text as updated_a,
        b.id as node_id_b, b.title as title_b, b.display_code as code_b,
        b.template_type as type_b, b.status as status_b, b.updated_at::text as updated_b,
        similarity(LOWER(a.title), LOWER(b.title)) as title_sim,
        CASE WHEN a.template_type = b.template_type THEN 1.0 ELSE 0.0 END as type_match,
        COALESCE((
          SELECT COUNT(*)::float / GREATEST(
            (SELECT COUNT(*) FROM content_node_tags WHERE node_id = a.id) +
            (SELECT COUNT(*) FROM content_node_tags WHERE node_id = b.id) -
            COUNT(*), 1
          )
          FROM content_node_tags ta
          JOIN content_node_tags tb ON ta.tag_id = tb.tag_id
          WHERE ta.node_id = a.id AND tb.node_id = b.id
        ), 0) as tag_jaccard,
        CASE WHEN cra.id IS NOT NULL AND crb.id IS NOT NULL THEN
          similarity(
            COALESCE(LEFT(cra.content::text, 500), ''),
            COALESCE(LEFT(crb.content::text, 500), '')
          )
        ELSE 0.0 END as content_sim,
        CASE
          WHEN cra.structured_fields IS NOT NULL AND crb.structured_fields IS NOT NULL THEN
            similarity(
              COALESCE(LEFT(cra.structured_fields::text, 300), ''),
              COALESCE(LEFT(crb.structured_fields::text, 300), '')
            )
          ELSE 0.0
        END as desc_sim,
        CASE
          WHEN a.parent_node_id IS NOT NULL AND a.parent_node_id = b.parent_node_id THEN 1.0
          ELSE 0.0
        END as same_parent
      FROM content_nodes a
      JOIN content_nodes b ON a.id < b.id
      LEFT JOIN content_revisions cra ON a.current_revision_id = cra.id
      LEFT JOIN content_revisions crb ON b.current_revision_id = crb.id
      WHERE NOT a.is_deleted AND NOT b.is_deleted
        AND a.title != b.title
        AND similarity(LOWER(a.title), LOWER(b.title)) > 0.25
      ORDER BY similarity(LOWER(a.title), LOWER(b.title)) DESC
      LIMIT 100
    `);

    const exactTitles = new Set(exactGroups.keys());
    const seenPairs = new Set<string>();
    for (const raw of similarResult.rows) {
      const r = raw as R;
      const titleA = str(r, "title_a");
      const titleB = str(r, "title_b");
      if (exactTitles.has(titleA) && exactTitles.has(titleB)) continue;

      const pairKey = [str(r, "node_id_a"), str(r, "node_id_b")]
        .sort()
        .join("|");
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const titleSim = parseFloat(String(r.title_sim ?? "0"));
      const typeMatch = parseFloat(String(r.type_match ?? "0"));
      const tagJaccard = parseFloat(String(r.tag_jaccard ?? "0"));
      const contentSim = parseFloat(String(r.content_sim ?? "0"));
      const descSim = parseFloat(String(r.desc_sim ?? "0"));
      const sameParent = parseFloat(String(r.same_parent ?? "0"));

      const compositeScore =
        titleSim * 0.35 +
        typeMatch * 0.1 +
        tagJaccard * 0.1 +
        contentSim * 0.2 +
        descSim * 0.15 +
        sameParent * 0.1;

      if (compositeScore < 0.3) continue;

      groups.push({
        title: `${titleA} / ${titleB}`,
        matchType: "similar",
        similarityScore: Math.round(compositeScore * 100) / 100,
        nodes: [
          {
            nodeId: str(r, "node_id_a"),
            displayCode: str(r, "code_a"),
            templateType: str(r, "type_a"),
            status: str(r, "status_a"),
            updatedAt: str(r, "updated_a"),
          },
          {
            nodeId: str(r, "node_id_b"),
            displayCode: str(r, "code_b"),
            templateType: str(r, "type_b"),
            status: str(r, "status_b"),
            updatedAt: str(r, "updated_b"),
          },
        ],
      });
    }
  } catch {
    // pg_trgm extension not available — exact matches only
  }

  groups.sort((a, b) => b.similarityScore - a.similarityScore);
  return groups;
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
      type: "broken_link",
      severity: "critical",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      detail: `Referenziert archivierte/gelöschte Seite: ${str(r, "target_title")}`,
    });
  }

  const unreferencedMedia = await db.execute(sql`
    SELECT ma.id as asset_id, ma.filename, ma.original_filename
    FROM media_assets ma
    WHERE NOT ma.is_deleted
      AND NOT EXISTS (
        SELECT 1 FROM media_asset_usages mau WHERE mau.asset_id = ma.id
      )
    LIMIT 30
  `);
  for (const raw of unreferencedMedia.rows) {
    const r = raw as R;
    hints.push({
      type: "unreferenced_media",
      severity: "info",
      nodeId: str(r, "asset_id"),
      title: str(r, "original_filename"),
      displayCode: str(r, "filename"),
      detail: "Medien-Datei wird von keiner Seite referenziert",
      targetType: "media",
    });
  }

  const noTags = await db.execute(sql`
    SELECT cn.id as node_id, cn.title, cn.display_code
    FROM content_nodes cn
    WHERE NOT cn.is_deleted
      AND cn.status IN ('published', 'approved')
      AND NOT EXISTS (SELECT 1 FROM content_node_tags t WHERE t.node_id = cn.id)
    LIMIT 50
  `);
  for (const raw of noTags.rows) {
    const r = raw as R;
    hints.push({
      type: "missing_tags",
      severity: "info",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      detail: "Veröffentlichte Seite ohne Tags — erschwert Auffindbarkeit",
    });
  }

  const stalePolicyRefs = await db.execute(sql`
    SELECT
      proc.id as node_id, proc.title, proc.display_code,
      pol.title as policy_title, pol.updated_at::text as policy_updated
    FROM content_relations rel
    JOIN content_nodes proc ON rel.source_node_id = proc.id
    JOIN content_nodes pol ON rel.target_node_id = pol.id
    WHERE NOT proc.is_deleted AND NOT pol.is_deleted
      AND rel.relation_type = 'implements_policy'
      AND pol.updated_at > proc.updated_at
    LIMIT 30
  `);
  for (const raw of stalePolicyRefs.rows) {
    const r = raw as R;
    hints.push({
      type: "stale_policy_reference",
      severity: "warning",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      detail: `Referenzierte Richtlinie "${str(r, "policy_title")}" wurde aktualisiert (${str(r, "policy_updated")})`,
    });
  }

  const violatedReviewCycles = await db.execute(sql`
    SELECT cn.id as node_id, cn.title, cn.display_code,
           cr.next_review_date::text as next_review_date,
           (NOW() - cr.next_review_date)::text as overdue_interval
    FROM content_nodes cn
    JOIN content_revisions cr ON cn.current_revision_id = cr.id
    WHERE NOT cn.is_deleted
      AND cr.next_review_date IS NOT NULL
      AND cr.next_review_date < NOW() - INTERVAL '30 days'
    ORDER BY cr.next_review_date ASC
    LIMIT 20
  `);
  for (const raw of violatedReviewCycles.rows) {
    const r = raw as R;
    hints.push({
      type: "violated_review_cycle",
      severity: "critical",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      detail: `Review-Zyklus massiv verletzt — fällig seit ${str(r, "next_review_date")}`,
    });
  }

  const contradictoryRoles = await db.execute(sql`
    SELECT cn.id as node_id, cn.title, cn.display_code,
           cr.reviewer_id, cr.approver_id, cn.owner_id
    FROM content_nodes cn
    JOIN content_revisions cr ON cn.current_revision_id = cr.id
    WHERE NOT cn.is_deleted
      AND (
        (cn.owner_id IS NOT NULL AND cr.reviewer_id IS NOT NULL AND cn.owner_id = cr.reviewer_id)
        OR (cr.reviewer_id IS NOT NULL AND cr.approver_id IS NOT NULL AND cr.reviewer_id = cr.approver_id)
      )
    LIMIT 30
  `);
  for (const raw of contradictoryRoles.rows) {
    const r = raw as R;
    let detail = "";
    if (
      r.owner_id &&
      r.reviewer_id &&
      String(r.owner_id) === String(r.reviewer_id)
    ) {
      detail =
        "Verantwortlicher ist gleichzeitig Reviewer (Vier-Augen-Prinzip verletzt)";
    } else if (
      r.reviewer_id &&
      r.approver_id &&
      String(r.reviewer_id) === String(r.approver_id)
    ) {
      detail =
        "Reviewer ist gleichzeitig Genehmiger (Rollen-Trennung verletzt)";
    }
    if (detail) {
      hints.push({
        type: "contradictory_roles",
        severity: "warning",
        nodeId: str(r, "node_id"),
        title: str(r, "title"),
        displayCode: str(r, "display_code"),
        detail,
      });
    }
  }

  const missingMandatory = await db.execute(sql`
    SELECT cn.id as node_id, cn.title, cn.display_code, cn.template_type,
           cn.owner_id, cn.current_revision_id, cn.published_revision_id
    FROM content_nodes cn
    WHERE NOT cn.is_deleted
      AND cn.status IN ('published', 'approved')
      AND (
        cn.owner_id IS NULL
        OR cn.current_revision_id IS NULL
        OR cn.published_revision_id IS NULL
      )
    LIMIT 30
  `);
  for (const raw of missingMandatory.rows) {
    const r = raw as R;
    const missing: string[] = [];
    if (!r.owner_id) missing.push("Verantwortlicher");
    if (!r.current_revision_id) missing.push("aktuelle Revision");
    if (!r.published_revision_id) missing.push("veröffentlichte Revision");
    hints.push({
      type: "missing_mandatory_fields",
      severity: "warning",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      detail: `Pflichtfelder fehlen: ${missing.join(", ")}`,
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
  roles: string[] = [],
): Promise<PersonalWorkItem[]> {
  const items: PersonalWorkItem[] = [];

  const myWcDrafts = await db.execute(sql`
    SELECT wc.node_id, wc.title, cn.display_code, cn.template_type, wc.status as wc_status, wc.updated_at::text as updated_at
    FROM content_working_copies wc
    JOIN content_nodes cn ON wc.node_id = cn.id
    WHERE wc.author_id = ${principalId}
      AND wc.status IN ('draft', 'changes_requested')
      AND NOT cn.is_deleted
    ORDER BY wc.updated_at DESC
    LIMIT 20
  `);
  for (const raw of myWcDrafts.rows) {
    const r = raw as R;
    items.push({
      type: "my_draft",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      templateType: str(r, "template_type"),
      status: str(r, "wc_status"),
      detail: str(r, "wc_status") === "changes_requested" ? "Änderung zurückgegeben" : "Entwurf wartet auf Fertigstellung",
      priority: "medium",
      updatedAt: str(r, "updated_at"),
    });
  }

  const myOldDrafts = await db.execute(sql`
    SELECT cn.id as node_id, cn.title, cn.display_code, cn.template_type, cn.updated_at::text as updated_at
    FROM content_nodes cn
    WHERE NOT cn.is_deleted
      AND cn.status = 'draft'
      AND cn.owner_id = ${principalId}
      AND cn.id NOT IN (SELECT wc.node_id FROM content_working_copies wc WHERE wc.status IN ('draft', 'changes_requested'))
    ORDER BY cn.updated_at DESC
    LIMIT 20
  `);
  for (const raw of myOldDrafts.rows) {
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

  const wcPendingReviews = await db.execute(sql`
    SELECT wc.node_id, wc.title, cn.display_code, cn.template_type, wc.status as wc_status, wc.updated_at::text as updated_at
    FROM content_working_copies wc
    JOIN content_nodes cn ON wc.node_id = cn.id
    WHERE wc.status = 'submitted'
      AND wc.reviewer_id = ${principalId}
      AND NOT cn.is_deleted
    ORDER BY wc.updated_at DESC
    LIMIT 20
  `);
  for (const raw of wcPendingReviews.rows) {
    const r = raw as R;
    items.push({
      type: "pending_review",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      templateType: str(r, "template_type"),
      status: str(r, "wc_status"),
      detail: "Review ausstehend",
      priority: "high",
      updatedAt: str(r, "updated_at"),
    });
  }

  const wcPendingApprovals = await db.execute(sql`
    SELECT wc.node_id, wc.title, cn.display_code, cn.template_type, wc.status as wc_status, wc.updated_at::text as updated_at
    FROM content_working_copies wc
    JOIN content_nodes cn ON wc.node_id = cn.id
    WHERE wc.status = 'approved_for_publish'
      AND wc.approver_id = ${principalId}
      AND NOT cn.is_deleted
    ORDER BY wc.updated_at DESC
    LIMIT 20
  `);
  for (const raw of wcPendingApprovals.rows) {
    const r = raw as R;
    items.push({
      type: "pending_approval",
      nodeId: str(r, "node_id"),
      title: str(r, "title"),
      displayCode: str(r, "display_code"),
      templateType: str(r, "template_type"),
      status: str(r, "wc_status"),
      detail: "Veröffentlichung ausstehend",
      priority: "high",
      updatedAt: str(r, "updated_at"),
    });
  }

  const isProcessManager =
    roles.includes("process_manager") || roles.includes("system_admin");
  if (isProcessManager) {
    const existingNodeIds = new Set(items.map((i) => i.nodeId));
    const wcSubmitted = await db.execute(sql`
      SELECT wc.node_id, wc.title, cn.display_code, cn.template_type, wc.status as wc_status, wc.updated_at::text as updated_at
      FROM content_working_copies wc
      JOIN content_nodes cn ON wc.node_id = cn.id
      WHERE wc.status IN ('submitted', 'approved_for_publish')
        AND NOT cn.is_deleted
      ORDER BY wc.updated_at DESC
    `);
    for (const raw of wcSubmitted.rows) {
      const r = raw as R;
      const nodeId = str(r, "node_id");
      if (!existingNodeIds.has(nodeId)) {
        items.push({
          type: "pending_pm_review",
          nodeId,
          title: str(r, "title"),
          displayCode: str(r, "display_code"),
          templateType: str(r, "template_type"),
          status: str(r, "wc_status"),
          detail: "Zur Freigabe eingereicht",
          priority: "high",
          updatedAt: str(r, "updated_at"),
        });
      }
    }
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

export async function getQualityByProcess(): Promise<ProcessQualityRow[]> {
  const result = await db.execute(sql`
    SELECT
      cn.template_type,
      COUNT(*) as total_pages,
      COUNT(*) FILTER (WHERE cn.status = 'published') as published_pages,
      COUNT(*) FILTER (WHERE cn.status = 'draft') as draft_pages,
      COUNT(*) FILTER (WHERE cn.owner_id IS NULL) as pages_without_owner,
      COUNT(*) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM content_node_tags t WHERE t.node_id = cn.id
      )) as pages_without_tags,
      COUNT(DISTINCT cn.id) FILTER (WHERE cr.next_review_date IS NOT NULL AND cr.next_review_date < NOW()) as overdue_reviews,
      ROUND(AVG(
        CASE WHEN cn.owner_id IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN cn.current_revision_id IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN cn.published_revision_id IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM content_node_tags t WHERE t.node_id = cn.id) THEN 20 ELSE 0 END +
        CASE WHEN cn.current_revision_id IS NOT NULL AND (cr.next_review_date IS NULL OR cr.next_review_date >= NOW()) THEN 20 ELSE 0 END
      )) as avg_completeness
    FROM content_nodes cn
    LEFT JOIN content_revisions cr ON cn.current_revision_id = cr.id
    WHERE NOT cn.is_deleted
    GROUP BY cn.template_type
    ORDER BY total_pages DESC
  `);

  return result.rows.map((raw) => {
    const r = raw as R;
    return {
      templateType: str(r, "template_type"),
      totalPages: num(r, "total_pages"),
      publishedPages: num(r, "published_pages"),
      draftPages: num(r, "draft_pages"),
      avgCompleteness: num(r, "avg_completeness"),
      pagesWithoutOwner: num(r, "pages_without_owner"),
      overdueReviews: num(r, "overdue_reviews"),
      pagesWithoutTags: num(r, "pages_without_tags"),
    };
  });
}
