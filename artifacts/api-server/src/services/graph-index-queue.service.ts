/**
 * Cluster 7 - GraphIndexQueue facade.
 *
 * Thin, purpose-named re-export over the underlying persistent queue
 * (graph_sync_queue / graph-sync-queue.service). Kept as a separate module
 * so callers reason about it as "the index queue that GraphIndexEventHandler
 * feeds and delta sync drains" rather than an internal Cluster 6 detail.
 */
export {
  enqueueSync,
  enqueueSyncForConfidentialityLevel,
  listQueue,
  claimBatch,
  completeSuccess,
  completeSkipped,
  completeDeleted,
  completeFailure,
  type GraphSyncQueueOperation,
  type GraphSyncQueueStatus,
  type EnqueueSyncInput,
} from "./graph-sync-queue.service";
