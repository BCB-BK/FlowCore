import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function migrateToWorkingCopyModel() {
  logger.info("Starting working copy migration...");

  const result = await db.execute(sql`
    WITH nodes_to_migrate AS (
      SELECT cn.id as node_id, cn.current_revision_id, cn.published_revision_id
      FROM content_nodes cn
      WHERE cn.is_deleted = false
        AND cn.current_revision_id IS NOT NULL
        AND cn.published_revision_id IS NULL
    )
    UPDATE content_nodes cn
    SET
      published_revision_id = ntm.current_revision_id,
      status = 'published',
      updated_at = NOW()
    FROM nodes_to_migrate ntm
    WHERE cn.id = ntm.node_id
    RETURNING cn.id, cn.title
  `);

  const migratedNodes = result.rows.length;
  logger.info({ migratedNodes }, "Migrated nodes: set publishedRevisionId from currentRevisionId");

  const revResult = await db.execute(sql`
    UPDATE content_revisions cr
    SET status = 'published', valid_from = COALESCE(cr.valid_from, cr.created_at)
    FROM content_nodes cn
    WHERE cr.id = cn.published_revision_id
      AND cr.status = 'draft'
    RETURNING cr.id
  `);

  const migratedRevisions = revResult.rows.length;
  logger.info({ migratedRevisions }, "Migrated draft revisions to published status");

  return {
    migratedNodes,
    migratedRevisions,
  };
}
