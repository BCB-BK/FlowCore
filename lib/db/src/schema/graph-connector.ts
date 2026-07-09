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
 * Cluster 6: durable work queue for delta sync. Triggers (publish, ACL
 * change, tag/relation change, glossary change, archive/delete, ...) enqueue
 * an upsert or delete operation here instead of syncing inline; the delta
 * sync job drains this queue with retry-with-limit semantics.
 */
export const graphSyncQueueTable = pgTable(
  "graph_sync_queue",
  {
    id: serial("id").primaryKey(),
    itemType: text("item_type").notNull(),
    nodeId: uuid("node_id"),
    termId: uuid("term_id"),
    operation: text("operation").notNull(),
    status: text("status").notNull().default("pending"),
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
