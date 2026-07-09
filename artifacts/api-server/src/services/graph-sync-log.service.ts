import { db } from "@workspace/db";
import { graphSyncLogTable } from "@workspace/db/schema";
import { desc, eq, and, type SQL } from "drizzle-orm";
import type { GraphSyncItemType, GraphSyncResult } from "./graph-sync-state.service";

export type GraphSyncOperation =
  | "full_sync"
  | "delta_sync"
  | "single_page"
  | "single_glossary"
  | "acl_update"
  | "delete"
  | "dry_run";

export interface RecordSyncLogInput {
  itemId: string;
  itemType: GraphSyncItemType;
  nodeId?: string | null;
  termId?: string | null;
  operation: GraphSyncOperation;
  result: GraphSyncResult;
  reason?: string | null;
  contentHash?: string | null;
  graphResponse?: unknown;
  dryRun?: boolean;
  attempt?: number;
  /** Who/what triggered this export/sync - a principal id/displayName, or
   * "system" for background jobs (full sync, delta sync, reconciliation). */
  actor?: string | null;
  version?: string | null;
  revision?: number | null;
  aclHash?: string | null;
  graphConnectionId?: string | null;
  graphResponseCode?: number | null;
}

export async function recordSyncLog(input: RecordSyncLogInput): Promise<void> {
  await db.insert(graphSyncLogTable).values({
    itemId: input.itemId,
    itemType: input.itemType,
    nodeId: input.nodeId ?? null,
    termId: input.termId ?? null,
    operation: input.operation,
    result: input.result,
    reason: input.reason ?? null,
    contentHash: input.contentHash ?? null,
    graphResponse: input.graphResponse ?? null,
    dryRun: input.dryRun ?? false,
    attempt: input.attempt ?? 1,
    actor: input.actor ?? "system",
    version: input.version ?? null,
    revision: input.revision ?? null,
    aclHash: input.aclHash ?? null,
    graphConnectionId: input.graphConnectionId ?? null,
    graphResponseCode: input.graphResponseCode ?? null,
  });
}

export interface ListSyncLogFilter {
  itemId?: string;
  operation?: GraphSyncOperation;
  result?: GraphSyncResult;
  limit?: number;
}

export async function listSyncLog(filter: ListSyncLogFilter = {}) {
  const conditions: SQL[] = [];
  if (filter.itemId) conditions.push(eq(graphSyncLogTable.itemId, filter.itemId));
  if (filter.operation) conditions.push(eq(graphSyncLogTable.operation, filter.operation));
  if (filter.result) conditions.push(eq(graphSyncLogTable.result, filter.result));

  const limit = Math.min(filter.limit ?? 50, 200);

  let query = db.select().from(graphSyncLogTable).$dynamic();
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  return query.orderBy(desc(graphSyncLogTable.createdAt)).limit(limit);
}
