import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { principalsTable } from "./principals";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * API keys for the FlowCore Custom Connector (Cluster 13, optional).
 * Distinct from `api_tokens` (which map to a human/service principal via
 * requireAuth for the main FlowCore UI/API). These keys authenticate
 * Copilot Studio "specialist agents" that call FlowCore as a Tool/Action
 * via a Power Platform Custom Connector, each scoped to a fixed subset of
 * agent_scope / brand_scope and a maximum confidentiality level.
 */
export const copilotConnectorKeysTable = pgTable(
  "copilot_connector_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
    agentScopes: text("agent_scopes").array().notNull().default([]),
    brandScopes: text("brand_scopes").array().notNull().default([]),
    maxConfidentialityLevel: varchar("max_confidentiality_level", {
      length: 32,
    })
      .notNull()
      .default("internal"),
    revoked: boolean("revoked").notNull().default(false),
    createdBy: uuid("created_by").references(() => principalsTable.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_copilot_connector_keys_created_by").on(table.createdBy),
    index("idx_copilot_connector_keys_hash").on(table.keyHash),
  ],
);

export const insertCopilotConnectorKeySchema = createInsertSchema(
  copilotConnectorKeysTable,
).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});
export const selectCopilotConnectorKeySchema = createSelectSchema(
  copilotConnectorKeysTable,
);
export type InsertCopilotConnectorKey = z.infer<
  typeof insertCopilotConnectorKeySchema
>;
export type CopilotConnectorKey = typeof copilotConnectorKeysTable.$inferSelect;
