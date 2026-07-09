import { deleteExternalItem } from "./graph-schema-registration.service";
import { upsertSyncState } from "./graph-sync-state.service";
import { recordSyncLog } from "./graph-sync-log.service";
import { setCopilotIndexStatus } from "./copilot-index-status.service";
import { getGraphConnectorConfig } from "./graph-connector-config.service";
import { AppError } from "../lib/app-error";
import type { GraphSyncItemType } from "./graph-sync-state.service";

export interface DeindexInput {
  itemType: GraphSyncItemType;
  itemId: string;
  nodeId?: string | null;
  termId?: string | null;
  dryRun?: boolean;
  reason?: string;
  actor?: string;
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
  const actor = input.actor ?? "system";
  const graphConnectionId = getGraphConnectorConfig().connectionId || null;

  try {
    const result = await deleteExternalItem(input.itemId, dryRun);

    if (dryRun) {
      await recordSyncLog({
        itemId: input.itemId,
        itemType: input.itemType,
        nodeId: input.nodeId,
        termId: input.termId,
        operation: "delete",
        result: "skipped",
        reason: input.reason ?? "dry_run",
        dryRun: true,
        actor,
        graphConnectionId,
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
      termId: input.termId,
      operation: "delete",
      result: "success",
      reason: input.reason ?? null,
      graphResponse: result.graphResponse,
      dryRun: false,
      actor,
      graphConnectionId,
      graphResponseCode: result.graphResponseCode ?? null,
    });

    if (input.itemType === "page" && input.nodeId) {
      await setCopilotIndexStatus(input.nodeId, "not_indexed", null);
    }

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const graphResponseCode =
      err instanceof AppError
        ? ((err.details as { graphResponseCode?: number } | undefined)?.graphResponseCode ??
          (err.status >= 500 ? err.status : null))
        : null;
    await recordSyncLog({
      itemId: input.itemId,
      itemType: input.itemType,
      nodeId: input.nodeId,
      termId: input.termId,
      operation: "delete",
      result: "failed",
      reason: message,
      dryRun,
      actor,
      graphConnectionId,
      graphResponseCode,
    });
    throw err;
  }
}
