import { db } from "@workspace/db";
import {
  graphSyncQueueTable,
  contentNodesTable,
  contentRevisionsTable,
} from "@workspace/db/schema";
import { and, asc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import type { GraphSyncItemType } from "./graph-sync-state.service";

export type GraphSyncQueueOperation = "upsert" | "acl_update" | "delete" | "skip";
export type GraphSyncQueueStatus =
  | "queued"
  | "processing"
  | "synced"
  | "failed"
  | "skipped"
  | "deleted";

export interface EnqueueSyncInput {
  itemType: GraphSyncItemType;
  nodeId?: string | null;
  termId?: string | null;
  operation: GraphSyncQueueOperation;
}

/**
 * Enqueues a sync job. If a pending job for the same (nodeId/termId,
 * operation) already exists, it is left in place rather than duplicated -
 * the delta sync will pick up the latest state when it runs anyway.
 */
export async function enqueueSync(input: EnqueueSyncInput): Promise<void> {
  const existing = await db
    .select({ id: graphSyncQueueTable.id })
    .from(graphSyncQueueTable)
    .where(
      and(
        eq(graphSyncQueueTable.itemType, input.itemType),
        eq(graphSyncQueueTable.operation, input.operation),
        eq(graphSyncQueueTable.status, "queued"),
        input.nodeId
          ? eq(graphSyncQueueTable.nodeId, input.nodeId)
          : sql`${graphSyncQueueTable.nodeId} is null`,
        input.termId
          ? eq(graphSyncQueueTable.termId, input.termId)
          : sql`${graphSyncQueueTable.termId} is null`,
      ),
    );

  if (existing.length > 0) return;

  await db.insert(graphSyncQueueTable).values({
    itemType: input.itemType,
    nodeId: input.nodeId ?? null,
    termId: input.termId ?? null,
    operation: input.operation,
  });
}

/**
 * Enqueues an ACL-update sync for every currently-published page whose
 * confidentiality level matches (used when a principal's access to a
 * confidentiality level is granted/revoked - all pages of that level need
 * their ACL entry recomputed and re-pushed to Graph).
 */
export async function enqueueSyncForConfidentialityLevel(level: string): Promise<number> {
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
    await enqueueSync({ itemType: "page", nodeId: row.nodeId, operation: "acl_update" });
  }
  return rows.length;
}

export async function listQueue(status?: string) {
  let query = db.select().from(graphSyncQueueTable).$dynamic();
  if (status) query = query.where(eq(graphSyncQueueTable.status, status));
  return query.orderBy(asc(graphSyncQueueTable.createdAt));
}

/**
 * Claims up to `limit` pending, available jobs by marking them "processing".
 * Returns the claimed rows.
 */
export async function claimBatch(limit = 25) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(graphSyncQueueTable)
      .where(
        and(
          eq(graphSyncQueueTable.status, "queued"),
          lte(graphSyncQueueTable.availableAt, new Date()),
        ),
      )
      .orderBy(asc(graphSyncQueueTable.createdAt))
      .limit(limit);

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    await tx
      .update(graphSyncQueueTable)
      .set({ status: "processing", updatedAt: new Date() })
      .where(inArray(graphSyncQueueTable.id, ids));

    return rows;
  });
}

export async function completeSuccess(id: number): Promise<void> {
  await db
    .update(graphSyncQueueTable)
    .set({ status: "synced", updatedAt: new Date(), lastError: null })
    .where(eq(graphSyncQueueTable.id, id));
}

/**
 * Marks a job as skipped (e.g. content-hash dedup determined nothing
 * changed). Terminal, non-error outcome.
 */
export async function completeSkipped(id: number): Promise<void> {
  await db
    .update(graphSyncQueueTable)
    .set({ status: "skipped", updatedAt: new Date(), lastError: null })
    .where(eq(graphSyncQueueTable.id, id));
}

/**
 * Marks a job as deleted (the item was deindexed from Graph). Terminal,
 * non-error outcome, distinct from "synced" (upsert confirmed).
 */
export async function completeDeleted(id: number): Promise<void> {
  await db
    .update(graphSyncQueueTable)
    .set({ status: "deleted", updatedAt: new Date(), lastError: null })
    .where(eq(graphSyncQueueTable.id, id));
}

/**
 * Marks a job failed. Increments the attempt counter; if the job has
 * exhausted maxAttempts it is left in terminal "failed" status, otherwise
 * it goes back to "queued" with a short backoff so the next delta sync
 * run retries it (retry-with-limit).
 */
export async function completeFailure(id: number, error: string): Promise<void> {
  const [row] = await db
    .select()
    .from(graphSyncQueueTable)
    .where(eq(graphSyncQueueTable.id, id));
  if (!row) return;

  const attempts = row.attempts + 1;
  const exhausted = attempts >= row.maxAttempts;

  await db
    .update(graphSyncQueueTable)
    .set({
      attempts,
      status: exhausted ? "failed" : "queued",
      lastError: error,
      availableAt: exhausted
        ? row.availableAt
        : new Date(Date.now() + attempts * 5000),
      updatedAt: new Date(),
    })
    .where(eq(graphSyncQueueTable.id, id));
}
