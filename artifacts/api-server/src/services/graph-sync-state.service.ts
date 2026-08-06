import { db } from "@workspace/db";
import { graphSyncStateTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export type GraphSyncItemType = "page" | "glossary";
export type GraphSyncResult = "success" | "failed" | "skipped" | "deleted";

export interface UpsertSyncStateInput {
  itemId: string;
  itemType: GraphSyncItemType;
  nodeId: string | null;
  contentHash: string | null;
  lastResult: GraphSyncResult;
  lastError?: string | null;
}

export async function getSyncState(itemId: string) {
  const [row] = await db
    .select()
    .from(graphSyncStateTable)
    .where(eq(graphSyncStateTable.itemId, itemId));
  return row ?? null;
}

export async function upsertSyncState(
  input: UpsertSyncStateInput,
): Promise<void> {
  await db
    .insert(graphSyncStateTable)
    .values({
      itemId: input.itemId,
      itemType: input.itemType,
      nodeId: input.nodeId,
      contentHash: input.contentHash,
      lastResult: input.lastResult,
      lastError: input.lastError ?? null,
      lastSyncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: graphSyncStateTable.itemId,
      set: {
        itemType: input.itemType,
        nodeId: input.nodeId,
        contentHash: input.contentHash,
        lastResult: input.lastResult,
        lastError: input.lastError ?? null,
        lastSyncedAt: new Date(),
      },
    });
}

export async function deleteSyncState(itemId: string): Promise<void> {
  await db
    .delete(graphSyncStateTable)
    .where(eq(graphSyncStateTable.itemId, itemId));
}
