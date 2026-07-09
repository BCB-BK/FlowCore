import {
  buildPageExternalItem,
  buildGlossaryExternalItem,
  pushExternalItem,
} from "./graph-schema-registration.service";
import { getSyncState, upsertSyncState } from "./graph-sync-state.service";
import { recordSyncLog, type GraphSyncOperation } from "./graph-sync-log.service";
import { setCopilotIndexStatus } from "./copilot-index-status.service";
import { getGraphConnectorConfig } from "./graph-connector-config.service";
import { AppError } from "../lib/app-error";

export interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  /** Who/what triggered this sync - principal id/displayName, or "system"
   * for background jobs (default). Never omitted from the audit log. */
  actor?: string;
}

export interface SyncItemResult {
  itemId: string;
  status: "success" | "skipped" | "dry_run";
  dryRun: boolean;
  item?: unknown;
  reason?: string;
}

/**
 * Syncs a single published page to Graph. Skips the push (and Graph API
 * call) when the content hash is unchanged since the last successful sync,
 * unless `force` is set (used by full sync, which always force-pushes).
 * Never reports "success" without an actual Graph confirmation - on any
 * failure it records the failure and rethrows (no silent success).
 */
export async function syncPage(
  nodeId: string,
  options: SyncOptions = {},
): Promise<SyncItemResult> {
  const dryRun = options.dryRun ?? false;
  const actor = options.actor ?? "system";
  const operation: GraphSyncOperation = dryRun ? "dry_run" : "single_page";

  let built;
  try {
    built = await buildPageExternalItem(nodeId);
  } catch (err) {
    await handleBuildFailure(err, "page", nodeId, nodeId, operation, actor);
    throw err;
  }

  const { item, contentHash, version, revision, aclHash } = built;
  const itemId = item.id;
  const graphConnectionId = getGraphConnectorConfig().connectionId || null;

  if (!dryRun && !options.force) {
    const state = await getSyncState(itemId);
    if (state && state.contentHash === contentHash && state.lastResult === "success") {
      await recordSyncLog({
        itemId,
        itemType: "page",
        nodeId,
        operation,
        result: "skipped",
        reason: "content_hash_unchanged",
        contentHash,
        dryRun,
        actor,
        version,
        revision,
        aclHash,
        graphConnectionId,
      });
      return { itemId, status: "skipped", dryRun, reason: "content_hash_unchanged" };
    }
  }

  try {
    const pushed = await pushExternalItem(item, dryRun);

    if (dryRun) {
      await recordSyncLog({
        itemId,
        itemType: "page",
        nodeId,
        operation,
        result: "skipped",
        reason: "dry_run",
        contentHash,
        dryRun: true,
        actor,
        version,
        revision,
        aclHash,
        graphConnectionId,
      });
      return { itemId, status: "dry_run", dryRun: true, item };
    }

    await upsertSyncState({
      itemId,
      itemType: "page",
      nodeId,
      contentHash,
      lastResult: "success",
    });
    await recordSyncLog({
      itemId,
      itemType: "page",
      nodeId,
      operation,
      result: "success",
      contentHash,
      graphResponse: pushed.graphResponse,
      dryRun: false,
      actor,
      version,
      revision,
      aclHash,
      graphConnectionId,
      graphResponseCode: pushed.graphResponseCode ?? null,
    });
    await setCopilotIndexStatus(nodeId, "indexed", null);

    return { itemId, status: "success", dryRun: false, item };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await upsertSyncState({
      itemId,
      itemType: "page",
      nodeId,
      contentHash,
      lastResult: "failed",
      lastError: message,
    });
    await recordSyncLog({
      itemId,
      itemType: "page",
      nodeId,
      operation,
      result: "failed",
      reason: message,
      contentHash,
      dryRun,
      actor,
      version,
      revision,
      aclHash,
      graphConnectionId,
      graphResponseCode: extractGraphResponseCode(err),
    });
    await setCopilotIndexStatus(nodeId, "error", message);
    throw err;
  }
}

function extractGraphResponseCode(err: unknown): number | null {
  if (err instanceof AppError) {
    const details = err.details as { graphResponseCode?: number } | undefined;
    if (details?.graphResponseCode) return details.graphResponseCode;
    if (err.status >= 500) return err.status;
  }
  return null;
}

/**
 * Syncs a single glossary term to Graph, mirroring syncPage's semantics
 * (content-hash dedup, no success without Graph confirmation).
 */
export async function syncGlossaryTerm(
  termId: string,
  options: SyncOptions = {},
): Promise<SyncItemResult> {
  const dryRun = options.dryRun ?? false;
  const actor = options.actor ?? "system";
  const operation: GraphSyncOperation = dryRun ? "dry_run" : "single_glossary";

  let built;
  try {
    built = await buildGlossaryExternalItem(termId);
  } catch (err) {
    await handleBuildFailure(err, "glossary", termId, null, operation, actor, termId);
    throw err;
  }

  const { item, contentHash, version, revision, aclHash } = built;
  const itemId = item.id;
  const graphConnectionId = getGraphConnectorConfig().connectionId || null;

  if (!dryRun && !options.force) {
    const state = await getSyncState(itemId);
    if (state && state.contentHash === contentHash && state.lastResult === "success") {
      await recordSyncLog({
        itemId,
        itemType: "glossary",
        nodeId: null,
        termId,
        operation,
        result: "skipped",
        reason: "content_hash_unchanged",
        contentHash,
        dryRun,
        actor,
        version,
        revision,
        aclHash,
        graphConnectionId,
      });
      return { itemId, status: "skipped", dryRun, reason: "content_hash_unchanged" };
    }
  }

  try {
    const pushed = await pushExternalItem(item, dryRun);

    if (dryRun) {
      await recordSyncLog({
        itemId,
        itemType: "glossary",
        nodeId: null,
        termId,
        operation,
        result: "skipped",
        reason: "dry_run",
        contentHash,
        dryRun: true,
        actor,
        version,
        revision,
        aclHash,
        graphConnectionId,
      });
      return { itemId, status: "dry_run", dryRun: true, item };
    }

    await upsertSyncState({
      itemId,
      itemType: "glossary",
      nodeId: null,
      contentHash,
      lastResult: "success",
    });
    await recordSyncLog({
      itemId,
      itemType: "glossary",
      nodeId: null,
      termId,
      operation,
      result: "success",
      contentHash,
      graphResponse: pushed.graphResponse,
      dryRun: false,
      actor,
      version,
      revision,
      aclHash,
      graphConnectionId,
      graphResponseCode: pushed.graphResponseCode ?? null,
    });

    return { itemId, status: "success", dryRun: false, item };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await upsertSyncState({
      itemId,
      itemType: "glossary",
      nodeId: null,
      contentHash,
      lastResult: "failed",
      lastError: message,
    });
    await recordSyncLog({
      itemId,
      itemType: "glossary",
      nodeId: null,
      termId,
      operation,
      result: "failed",
      reason: message,
      contentHash,
      dryRun,
      actor,
      version,
      revision,
      aclHash,
      graphConnectionId,
      graphResponseCode: extractGraphResponseCode(err),
    });
    throw err;
  }
}

/**
 * When an item can no longer be built (e.g. no longer indexable - archived,
 * agent_enabled turned off, ACL not exportable), that is treated as a
 * deindex signal rather than a bare failure IF the item was previously
 * synced. If it was never synced, it is simply logged as a failed attempt.
 */
async function handleBuildFailure(
  err: unknown,
  itemType: "page" | "glossary",
  logicalId: string,
  nodeId: string | null,
  operation: GraphSyncOperation,
  actor = "system",
  termId: string | null = null,
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const notFound = err instanceof AppError && err.status === 404;

  await recordSyncLog({
    itemId: itemType === "page" ? `flowcore_page_pending_${logicalId}` : `flowcore_glossary_pending_${logicalId}`,
    itemType,
    nodeId,
    termId,
    operation,
    result: notFound ? "skipped" : "failed",
    reason: message,
    actor,
  });
}
