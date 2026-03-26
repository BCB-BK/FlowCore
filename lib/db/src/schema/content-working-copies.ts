import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workingCopyStatusEnum, changeTypeEnum, workingCopyEventTypeEnum } from "./enums";
import { contentNodesTable } from "./content-nodes";
import { contentRevisionsTable } from "./content-revisions";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentWorkingCopiesTable = pgTable(
  "content_working_copies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => contentNodesTable.id),
    baseRevisionId: uuid("base_revision_id").references(
      () => contentRevisionsTable.id,
    ),
    status: workingCopyStatusEnum("status").notNull().default("draft"),
    title: text("title").notNull(),
    content: jsonb("content").$type<Record<string, unknown>>(),
    structuredFields: jsonb("structured_fields").$type<Record<string, unknown>>(),
    editorSnapshot: jsonb("editor_snapshot").$type<Record<string, unknown>>(),
    changeType: changeTypeEnum("change_type").notNull().default("editorial"),
    changeSummary: text("change_summary"),
    authorId: text("author_id").notNull(),
    lockedBy: text("locked_by"),
    lastAiSummary: text("last_ai_summary"),
    lastManualSummary: text("last_manual_summary"),
    reviewerId: text("reviewer_id"),
    approverId: text("approver_id"),
    diffCache: jsonb("diff_cache").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_working_copies_node_id").on(table.nodeId),
    index("idx_working_copies_author_id").on(table.authorId),
    index("idx_working_copies_status").on(table.status),
    uniqueIndex("idx_working_copies_active_per_node")
      .on(table.nodeId)
      .where(
        sql`status NOT IN ('cancelled', 'published')`,
      ),
  ],
);

export const workingCopyEventsTable = pgTable("working_copy_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  workingCopyId: uuid("working_copy_id")
    .notNull()
    .references(() => contentWorkingCopiesTable.id),
  eventType: workingCopyEventTypeEnum("event_type").notNull(),
  actorId: text("actor_id"),
  comment: text("comment"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertWorkingCopySchema = createInsertSchema(
  contentWorkingCopiesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const selectWorkingCopySchema = createSelectSchema(
  contentWorkingCopiesTable,
);
export type InsertWorkingCopy = z.infer<typeof insertWorkingCopySchema>;
export type WorkingCopy = typeof contentWorkingCopiesTable.$inferSelect;

export const insertWorkingCopyEventSchema = createInsertSchema(
  workingCopyEventsTable,
).omit({ id: true, createdAt: true });
export type InsertWorkingCopyEvent = z.infer<
  typeof insertWorkingCopyEventSchema
>;
export type WorkingCopyEvent = typeof workingCopyEventsTable.$inferSelect;
