import {
  pgTable,
  uuid,
  serial,
  text,
  jsonb,
  timestamp,
  unique,
  index,
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
