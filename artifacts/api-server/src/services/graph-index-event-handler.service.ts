/**
 * Cluster 7 - GraphIndexEventHandler.
 *
 * Consumes rows from the graph_change_feed (GraphChangeFeedService),
 * resolves the intended operation via GraphDeltaDetector, and enqueues the
 * result into the GraphIndexQueue (graph_sync_queue). Marks the feed row
 * "synced" (handed off) once enqueued, or "failed" if enqueueing itself
 * throws - the feed row's own status is about "did we get this into the
 * queue", not about whether the eventual Graph push succeeded (that is
 * tracked on the queue job / sync log).
 */
import { db } from "@workspace/db";
import { graphChangeFeedTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { detectOperation, type GraphChangeFeedEventType } from "./graph-delta-detector.service";
import { enqueueSync } from "./graph-sync-queue.service";

export async function processChangeFeedEntry(feedId: number): Promise<void> {
  const [row] = await db
    .select()
    .from(graphChangeFeedTable)
    .where(eq(graphChangeFeedTable.id, feedId));
  if (!row) return;

  try {
    const operation = detectOperation(row.eventType as GraphChangeFeedEventType);

    if (operation !== "skip") {
      await enqueueSync({
        itemType: row.itemType as "page" | "glossary",
        nodeId: row.nodeId,
        termId: row.termId,
        operation,
      });
    }

    await db
      .update(graphChangeFeedTable)
      .set({
        status: operation === "skip" ? "skipped" : "synced",
        detectedOperation: operation,
        processedAt: new Date(),
      })
      .where(eq(graphChangeFeedTable.id, feedId));
  } catch (err) {
    await db
      .update(graphChangeFeedTable)
      .set({
        status: "failed",
        lastError: err instanceof Error ? err.message : String(err),
        processedAt: new Date(),
      })
      .where(eq(graphChangeFeedTable.id, feedId));
    throw err;
  }
}
