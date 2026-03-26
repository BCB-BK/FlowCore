import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function migrateToWorkingCopyModel() {
  logger.info("Starting working copy migration...");

  return await db.transaction(async (tx) => {
    const nodesWithoutPublished = await tx.execute(sql`
      WITH nodes_to_backfill AS (
        SELECT cn.id as node_id, cn.current_revision_id
        FROM content_nodes cn
        WHERE cn.is_deleted = false
          AND cn.current_revision_id IS NOT NULL
          AND cn.published_revision_id IS NULL
      )
      UPDATE content_nodes cn
      SET
        published_revision_id = ntb.current_revision_id,
        status = 'published',
        updated_at = NOW()
      FROM nodes_to_backfill ntb
      WHERE cn.id = ntb.node_id
      RETURNING cn.id
    `);
    const nodesBackfilled = nodesWithoutPublished.rows.length;

    if (nodesBackfilled > 0) {
      await tx.execute(sql`
        UPDATE content_revisions cr
        SET status = 'published', valid_from = COALESCE(cr.valid_from, cr.created_at)
        FROM content_nodes cn
        WHERE cr.id = cn.published_revision_id
          AND cr.status = 'draft'
      `);
    }

    const draftRevsResult = await tx.execute(sql`
      SELECT
        cr.id as revision_id,
        cr.node_id,
        cr.title,
        cr.content,
        cr.structured_fields,
        cr.change_type,
        cr.change_summary,
        cr.author_id,
        cr.based_on_revision_id,
        cr.created_at,
        cn.published_revision_id
      FROM content_revisions cr
      JOIN content_nodes cn ON cn.id = cr.node_id
      WHERE cr.status = 'draft'
        AND cn.is_deleted = false
        AND cn.published_revision_id IS NOT NULL
        AND cr.id = cn.current_revision_id
        AND cr.id != cn.published_revision_id
        AND NOT EXISTS (
          SELECT 1 FROM content_working_copies wc
          WHERE wc.node_id = cr.node_id
            AND wc.status NOT IN ('cancelled', 'published')
        )
    `);

    let draftsConverted = 0;
    for (const row of draftRevsResult.rows) {
      const r = row as Record<string, unknown>;
      const baseRevId = (r.based_on_revision_id as string) || (r.published_revision_id as string) || null;

      const contentJson = JSON.stringify(r.content || {});
      const structuredJson = JSON.stringify(r.structured_fields || {});

      await tx.execute(sql`
        INSERT INTO content_working_copies (
          node_id, base_revision_id, status, title, content,
          structured_fields, change_type, change_summary, author_id,
          created_at, updated_at
        ) VALUES (
          ${r.node_id as string},
          ${baseRevId},
          'draft',
          ${(r.title as string) || 'Unbenannt'},
          ${contentJson}::jsonb,
          ${structuredJson}::jsonb,
          ${(r.change_type as string) || 'editorial'},
          ${(r.change_summary as string) || null},
          ${(r.author_id as string) || 'system'},
          ${(r.created_at as string) || sql`NOW()`},
          NOW()
        )
      `);
      draftsConverted++;
    }

    logger.info(
      { nodesBackfilled, draftsConverted },
      "Working copy migration complete",
    );

    return { nodesBackfilled, draftsConverted };
  });
}
