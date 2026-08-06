/**
 * Cluster 7 - GraphDeltaDetector.
 *
 * Pure decision logic: given a raw FlowCore change-feed event, decide which
 * GraphIndexQueue operation it should produce. Kept separate from the queue
 * and the feed so the "what does this event mean for Graph sync" policy is
 * in exactly one place and independently testable.
 */

export type GraphChangeFeedEventType =
  | "publish"
  | "revision"
  | "acl_change"
  | "archive"
  | "delete"
  | "agent_disabled"
  | "glossary_change";

export type GraphDeltaOperation = "upsert" | "acl_update" | "delete" | "skip";

/**
 * Maps a FlowCore event type to the Graph index operation it implies.
 * "archive", "delete" and "agent_disabled" all mean the item must be
 * removed from the Graph index (deindexed) - the sync layer resolves the
 * concrete item id at process time.
 */
export function detectOperation(
  eventType: GraphChangeFeedEventType,
): GraphDeltaOperation {
  switch (eventType) {
    case "publish":
    case "revision":
    case "glossary_change":
      return "upsert";
    case "acl_change":
      return "acl_update";
    case "archive":
    case "delete":
    case "agent_disabled":
      return "delete";
    default:
      return "skip";
  }
}
