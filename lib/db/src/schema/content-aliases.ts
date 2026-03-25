import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { contentNodesTable } from "./content-nodes";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentAliasesTable = pgTable("content_aliases", {
  id: uuid("id").defaultRandom().primaryKey(),
  nodeId: uuid("node_id")
    .notNull()
    .references(() => contentNodesTable.id),
  previousDisplayCode: text("previous_display_code").notNull(),
  reason: text("reason"),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  changedBy: text("changed_by"),
});

export const insertContentAliasSchema = createInsertSchema(
  contentAliasesTable,
).omit({ id: true, changedAt: true });
export type InsertContentAlias = z.infer<typeof insertContentAliasSchema>;
export type ContentAlias = typeof contentAliasesTable.$inferSelect;
