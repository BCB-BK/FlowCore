import { deleteExternalItem } from "./graph-schema-registration.service";
import { upsertSyncState } from "./graph-sync-state.service";
import { recordSyncLog } from "./graph-sync-log.service";
import { setCopilotIndexStatus } from "./copilot-index-status.service";
import type { GraphSyncItemType } from "./graph-sync-state.service";

export interface DeindexInput {
  itemType: GraphSyncItemType;
  itemId: string;
  nodeId?: string | null;
  dryRun?: boolean;
  reason?: string;
}

/**
 * Removes/deindexes an item from Graph. Used for: page archived, page
 * deleted, glossary term deleted, or agent_enabled turned off (item no
 * longer indexable although the page itself still exists).
 * Only records "success" once Graph has confirmed removal (or 404 =
 * already absent). On failure, the item stays in its prior known state
 * and the failure is logged, never silently swallowed.
 */
export async function deindexItem(input: DeindexInput) {
  const dryRun = input.dryRun ?? false;

  try {
    const result = await deleteExternalItem(input.itemId, dryRun);

    if (dryRun) {
      await recordSyncLog({
        itemId: input.itemId,
        itemType: input.itemType,
        nodeId: input.nodeId,
        operation: "delete",
        result: "skipped",
        reason: input.reason ?? "dry_run",
        dryRun: true,
      });
      return result;
    }

    await upsertSyncState({
      itemId: input.itemId,
      itemType: input.itemType,
      nodeId: input.nodeId ?? null,
      contentHash: null,
      lastResult: "deleted",
    });

    await recordSyncLog({
      itemId: input.itemId,
      itemType: input.itemType,
      nodeId: input.nodeId,
      operation: "delete",
      result: "success",
      reason: input.reason ?? null,
      graphResponse: result.graphResponse,
      dryRun: false,
    });

    if (input.itemType === "page" && input.nodeId) {
      await setCopilotIndexStatus(input.nodeId, "not_indexed", null);
    }

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordSyncLog({
      itemId: input.itemId,
      itemType: input.itemType,
      nodeId: input.nodeId,
      operation: "delete",
      result: "failed",
      reason: message,
      dryRun,
    });
    throw err;
  }
}
