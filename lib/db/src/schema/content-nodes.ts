import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { nodeStatusEnum, templateTypeEnum } from "./enums";
import { contentTemplatesTable } from "./content-templates";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentNodesTable = pgTable(
  "content_nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    immutableId: text("immutable_id").notNull().unique(),
    displayCode: text("display_code").notNull(),
    title: text("title").notNull(),
    templateType: templateTypeEnum("template_type").notNull(),
    templateId: uuid("template_id").references(() => contentTemplatesTable.id),
    parentNodeId: uuid("parent_node_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: nodeStatusEnum("status").notNull().default("draft"),
    currentRevisionId: uuid("current_revision_id"),
    publishedRevisionId: uuid("published_revision_id"),
    ownerId: text("owner_id"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_content_nodes_display_code")
      .on(table.displayCode)
      .where(sql`is_deleted = false`),
  ],
);

export const insertContentNodeSchema = createInsertSchema(
  contentNodesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const selectContentNodeSchema = createSelectSchema(contentNodesTable);
export type InsertContentNode = z.infer<typeof insertContentNodeSchema>;
export type ContentNode = typeof contentNodesTable.$inferSelect;
