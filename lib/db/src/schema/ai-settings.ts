import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiSettingsTable = pgTable("ai_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  model: text("model").notNull().default("gpt-5.2"),
  sourceMode: text("source_mode").notNull().default("wiki_only"),
  webSearchEnabled: boolean("web_search_enabled").notNull().default(false),
  maxCompletionTokens: integer("max_completion_tokens").notNull().default(8192),
  systemPrompt: text("system_prompt"),
  promptPolicies: jsonb("prompt_policies").$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: text("updated_by"),
});

export const aiUsageLogsTable = pgTable(
  "ai_usage_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    principalId: text("principal_id").notNull(),
    action: text("action").notNull(),
    model: text("model").notNull(),
    sourceMode: text("source_mode").notNull(),
    webSearchUsed: boolean("web_search_used").notNull().default(false),
    sourcesCount: integer("sources_count").notNull().default(0),
    latencyMs: integer("latency_ms"),
    tokensUsed: integer("tokens_used"),
    hasError: boolean("has_error").notNull().default(false),
    errorMessage: text("error_message"),
    zeroResults: boolean("zero_results").notNull().default(false),
    nodeId: uuid("node_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_ai_usage_logs_principal").on(table.principalId),
    index("idx_ai_usage_logs_action").on(table.action),
    index("idx_ai_usage_logs_created").on(table.createdAt),
  ],
);

export const insertAiSettingsSchema = createInsertSchema(aiSettingsTable).omit({
  id: true,
  updatedAt: true,
});
export const selectAiSettingsSchema = createSelectSchema(aiSettingsTable);
export type AiSettings = typeof aiSettingsTable.$inferSelect;
export type InsertAiSettings = z.infer<typeof insertAiSettingsSchema>;

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLogsTable).omit(
  { id: true, createdAt: true },
);
export type AiUsageLog = typeof aiUsageLogsTable.$inferSelect;
export type InsertAiUsageLog = z.infer<typeof insertAiUsageLogSchema>;
