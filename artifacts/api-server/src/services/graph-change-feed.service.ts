/**
 * Cluster 7 - GraphChangeFeedService.
 *
 * Persistent, append-only record of raw FlowCore domain events that may
 * require a Graph index change. Triggers call `recordEvent()` instead of
 * enqueuing a sync job directly; this both gives an auditable feed of "what
 * happened in FlowCore" (independent of what the sync engine later decided
 * to do about it) and dedupes repeated identical events before they ever
 * reach the queue.
 */
import { db } from "@workspace/db";
import { graphChangeFeedTable, contentNodesTable, contentRevisionsTable } from "@workspace/db/schema";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { GraphSyncItemType } from "./graph-sync-state.service";
import type { GraphChangeFeedEventType } from "./graph-delta-detector.service";
import { processChangeFeedEntry } from "./graph-index-event-handler.service";

export interface RecordEventInput {
  itemType: GraphSyncItemType;
  nodeId?: string | null;
  termId?: string | null;
  eventType: GraphChangeFeedEventType;
}

function buildDedupKey(input: RecordEventInput): string {
  const ref = input.itemType === "page" ? input.nodeId : input.termId;
  return `${input.itemType}:${ref}:${input.eventType}`;
}

/**
 * Records a FlowCore event. If an unprocessed ("queued") feed row already
 * exists for the same item + event type, the event is deduplicated - no
 * new row is inserted and the existing one is left to be processed once.
 * Otherwise a new row is inserted and immediately handed to
 * GraphIndexEventHandler to decide + enqueue the resulting Graph operation.
 */
export async function recordEvent(input: RecordEventInput): Promise<{ deduplicated: boolean }> {
  const dedupKey = buildDedupKey(input);

  const [existing] = await db
    .select({ id: graphChangeFeedTable.id })
    .from(graphChangeFeedTable)
    .where(
      and(eq(graphChangeFeedTable.dedupKey, dedupKey), eq(graphChangeFeedTable.status, "queued")),
    );

  if (existing) {
    return { deduplicated: true };
  }

  const [row] = await db
    .insert(graphChangeFeedTable)
    .values({
      itemType: input.itemType,
      nodeId: input.nodeId ?? null,
      termId: input.termId ?? null,
      eventType: input.eventType,
      dedupKey,
      status: "queued",
    })
    .returning({ id: graphChangeFeedTable.id });

  await processChangeFeedEntry(row.id);

  return { deduplicated: false };
}

/**
 * Fans out an "acl_change" event to every currently-published page whose
 * confidentiality level matches - used when a principal's access to a
 * confidentiality level is granted/revoked (all pages of that level need
 * their ACL entry recomputed and re-pushed to Graph).
 */
export async function recordAclChangeForConfidentialityLevel(level: string): Promise<number> {
  const rows = await db
    .select({ nodeId: contentNodesTable.id })
    .from(contentNodesTable)
    .innerJoin(
      contentRevisionsTable,
      eq(contentRevisionsTable.id, contentNodesTable.publishedRevisionId),
    )
    .where(
      and(
        eq(contentNodesTable.isDeleted, false),
        isNotNull(contentNodesTable.publishedRevisionId),
        sql`${contentRevisionsTable.structuredFields}->>'confidentiality' = ${level}`,
      ),
    );

  for (const row of rows) {
    await recordEvent({ itemType: "page", nodeId: row.nodeId, eventType: "acl_change" });
  }
  return rows.length;
}

export async function listChangeFeed(status?: string) {
  let query = db.select().from(graphChangeFeedTable).$dynamic();
  if (status) query = query.where(eq(graphChangeFeedTable.status, status));
  return query.orderBy(graphChangeFeedTable.createdAt);
}
