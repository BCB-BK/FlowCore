import {
  pgTable,
  uuid,
  serial,
  text,
  jsonb,
  timestamp,
  unique,
  index,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { principalsTable } from "./principals";

/**
 * Which pool of Entra identities an externalItem's ACL is granted to.
 * See Cluster 5 (ACL-Mapping FlowCore -> Microsoft Entra/Graph):
 *  - internal_standard: default group for public/internal content (never
 *    "everyone").
 *  - restricted: explicit groups/users resolved per-node for "confidential".
 *  - executive: a single dedicated executive/GF/Prokuristen group for
 *    "strictly_confidential".
 */
export type GraphAclTier = "internal_standard" | "restricted" | "executive";

export const graphGroupMappingsTable = pgTable(
  "graph_group_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tier: text("tier").notNull(),
    entraGroupId: text("entra_group_id").notNull(),
    label: text("label"),
    updatedBy: uuid("updated_by").references(() => principalsTable.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("uq_graph_group_mapping_tier").on(table.tier)],
);

export type GraphGroupMapping = typeof graphGroupMappingsTable.$inferSelect;

/**
 * Append-only log of every ACL resolution attempt for a Graph externalItem
 * (page or glossary term), successful or not. Surfaced in the admin UI's
 * "Sync Log" so operators can see exactly which ACL/tier was applied (or why
 * an item was skipped/failed) without re-deriving it from raw RBAC tables.
 */
export const graphAclSyncLogTable = pgTable(
  "graph_acl_sync_log",
  {
    id: serial("id").primaryKey(),
    itemId: text("item_id").notNull(),
    itemType: text("item_type").notNull(),
    nodeId: uuid("node_id"),
    confidentialityLevel: text("confidentiality_level"),
    tier: text("tier"),
    aclSummary: jsonb("acl_summary"),
    result: text("result").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_graph_acl_sync_log_item").on(table.itemId),
    index("idx_graph_acl_sync_log_created").on(table.createdAt),
  ],
);

export type GraphAclSyncLogEntry = typeof graphAclSyncLogTable.$inferSelect;

/**
 * Cluster 6 (Graph Sync Engine): last known synced state per externalItem
 * (page or glossary term). Used by delta sync / single-item sync to skip
 * pushing to Graph when the content hash has not changed since the last
 * successful sync (avoids unnecessary writes / API calls).
 */
export const graphSyncStateTable = pgTable("graph_sync_state", {
  itemId: text("item_id").primaryKey(),
  itemType: text("item_type").notNull(),
  nodeId: uuid("node_id"),
  contentHash: text("content_hash"),
  lastResult: text("last_result").notNull(),
  lastError: text("last_error"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GraphSyncState = typeof graphSyncStateTable.$inferSelect;

/**
 * Cluster 6: append-only audit log of every sync attempt (full/delta/single
 * page/single glossary/acl_update/delete/dry_run), successful or not,
 * including the raw Graph response where applicable. This is intentionally
 * separate from graph_acl_sync_log (Cluster 5), which only records ACL
 * *resolution* decisions - this table records the actual sync/push outcome.
 */
export const graphSyncLogTable = pgTable(
  "graph_sync_log",
  {
    id: serial("id").primaryKey(),
    itemId: text("item_id").notNull(),
    itemType: text("item_type").notNull(),
    nodeId: uuid("node_id"),
    operation: text("operation").notNull(),
    result: text("result").notNull(),
    reason: text("reason"),
    contentHash: text("content_hash"),
    graphResponse: jsonb("graph_response"),
    dryRun: boolean("dry_run").notNull().default(false),
    attempt: integer("attempt").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_graph_sync_log_item").on(table.itemId),
    index("idx_graph_sync_log_created").on(table.createdAt),
  ],
);

export type GraphSyncLogEntry = typeof graphSyncLogTable.$inferSelect;

/**
 * Cluster 6/7 (GraphIndexQueue): durable work queue for delta sync. Fed by
 * GraphIndexEventHandler (Cluster 7 change feed) as well as legacy direct
 * enqueue calls; the delta sync job drains it with retry-with-limit
 * semantics. Status vocabulary: queued -> processing -> (synced | failed |
 * skipped | deleted). Operations: upsert | acl_update | delete | skip.
 */
export const graphSyncQueueTable = pgTable(
  "graph_sync_queue",
  {
    id: serial("id").primaryKey(),
    itemType: text("item_type").notNull(),
    nodeId: uuid("node_id"),
    termId: uuid("term_id"),
    operation: text("operation").notNull(),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastError: text("last_error"),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_graph_sync_queue_status").on(table.status, table.availableAt),
    index("idx_graph_sync_queue_node").on(table.nodeId),
  ],
);

export type GraphSyncQueueEntry = typeof graphSyncQueueTable.$inferSelect;

/**
 * Cluster 7 (Change Feed / Index Queue aus FlowCore-Events):
 * append-only, persistent log of raw FlowCore domain events (publish, new
 * revision, ACL/rights change, archive, delete, agent_enabled toggle,
 * glossary change, ...) that *may* require a Graph index change. This is
 * intentionally separate from graph_sync_queue: the change feed records the
 * fact that something happened in FlowCore, before any decision is made
 * about whether/how to sync it. GraphDeltaDetector consumes unprocessed rows
 * here, decides the operation (upsert/acl_update/delete/skip), and
 * GraphIndexEventHandler enqueues the result into graph_sync_queue.
 *
 * Deduplication: a unique `dedup_key` (itemType + item ref + eventType,
 * collapsed while a row is still unprocessed) means repeated identical
 * FlowCore events collapse onto a single feed row instead of piling up.
 */
export const graphChangeFeedTable = pgTable(
  "graph_change_feed",
  {
    id: serial("id").primaryKey(),
    itemType: text("item_type").notNull(),
    nodeId: uuid("node_id"),
    termId: uuid("term_id"),
    eventType: text("event_type").notNull(),
    dedupKey: text("dedup_key").notNull(),
    status: text("status").notNull().default("queued"),
    detectedOperation: text("detected_operation"),
    lastError: text("last_error"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_graph_change_feed_status").on(table.status, table.createdAt),
    index("idx_graph_change_feed_dedup").on(table.dedupKey),
  ],
);

export type GraphChangeFeedEntry = typeof graphChangeFeedTable.$inferSelect;
