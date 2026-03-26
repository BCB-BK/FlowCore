import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("=== Content Cleanup ===\n");

  const countBefore = await db.execute(
    sql`SELECT count(*) AS cnt FROM content_nodes`,
  );
  const beforeRow = countBefore.rows[0] as { cnt: string } | undefined;
  console.log(`Content nodes before cleanup: ${beforeRow?.cnt ?? 0}`);

  const glossaryBefore = await db.execute(
    sql`SELECT count(*) AS cnt FROM glossary_terms`,
  );
  const glossaryBeforeRow = glossaryBefore.rows[0] as { cnt: string } | undefined;
  console.log(`Glossary terms (will be preserved): ${glossaryBeforeRow?.cnt ?? 0}\n`);

  console.log("Deleting dependent tables in FK order...");

  const tables = [
    "working_copy_events",
    "content_working_copies",
    "approvals",
    "review_workflows",
    "content_revision_events",
    "media_asset_usages",
    "media_assets",
    "source_references",
    "node_ownership",
    "page_permissions",
    "notifications",
    "favorites",
    "page_verifications",
    "page_comments",
    "page_watchers",
    "content_node_context",
    "content_relations",
    "content_aliases",
    "content_node_tags",
    "content_revisions",
    "content_nodes",
  ];

  for (const table of tables) {
    try {
      const result = await db.execute(sql.raw(`DELETE FROM "${table}"`));
      const rowCount = (result as { rowCount?: number }).rowCount ?? 0;
      console.log(`  ${table}: ${rowCount} rows deleted`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("does not exist")) {
        console.log(`  ${table}: table does not exist (skipping)`);
      } else {
        throw err;
      }
    }
  }

  const countAfter = await db.execute(
    sql`SELECT count(*) AS cnt FROM content_nodes`,
  );
  const afterRow = countAfter.rows[0] as { cnt: string } | undefined;
  console.log(`\nContent nodes after cleanup: ${afterRow?.cnt ?? 0}`);

  const glossaryAfter = await db.execute(
    sql`SELECT count(*) AS cnt FROM glossary_terms`,
  );
  const glossaryAfterRow = glossaryAfter.rows[0] as { cnt: string } | undefined;
  console.log(`Glossary terms after cleanup: ${glossaryAfterRow?.cnt ?? 0}`);

  console.log("\n=== Cleanup complete ===");
  await pool.end();
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
