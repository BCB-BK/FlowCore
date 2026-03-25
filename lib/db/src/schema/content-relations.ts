import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relationTypeEnum } from "./enums";
import { contentNodesTable } from "./content-nodes";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentRelationsTable = pgTable(
  "content_relations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceNodeId: uuid("source_node_id")
      .notNull()
      .references(() => contentNodesTable.id),
    targetNodeId: uuid("target_node_id")
      .notNull()
      .references(() => contentNodesTable.id),
    relationType: relationTypeEnum("relation_type").notNull(),
    description: text("description"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_content_relations_unique").on(
      table.sourceNodeId,
      table.targetNodeId,
      table.relationType,
    ),
  ],
);

export const insertContentRelationSchema = createInsertSchema(
  contentRelationsTable,
).omit({ id: true, createdAt: true });
export type InsertContentRelation = z.infer<typeof insertContentRelationSchema>;
export type ContentRelation = typeof contentRelationsTable.$inferSelect;
