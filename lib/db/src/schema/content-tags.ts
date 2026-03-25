import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { contentNodesTable } from "./content-nodes";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentTagsTable = pgTable("content_tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const contentNodeTagsTable = pgTable(
  "content_node_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => contentNodesTable.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => contentTagsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_content_node_tags_unique").on(table.nodeId, table.tagId),
  ],
);

export const insertContentTagSchema = createInsertSchema(contentTagsTable).omit(
  { id: true, createdAt: true },
);
export type InsertContentTag = z.infer<typeof insertContentTagSchema>;
export type ContentTag = typeof contentTagsTable.$inferSelect;

export const insertContentNodeTagSchema = createInsertSchema(
  contentNodeTagsTable,
).omit({ id: true, createdAt: true });
export type InsertContentNodeTag = z.infer<typeof insertContentNodeTagSchema>;
