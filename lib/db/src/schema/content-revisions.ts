import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { changeTypeEnum, nodeStatusEnum, revisionEventTypeEnum } from "./enums";
import { contentNodesTable } from "./content-nodes";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentRevisionsTable = pgTable(
  "content_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => contentNodesTable.id),
    revisionNo: integer("revision_no").notNull(),
    versionLabel: text("version_label"),
    status: nodeStatusEnum("status").notNull().default("draft"),
    changeType: changeTypeEnum("change_type").notNull().default("editorial"),
    changeSummary: text("change_summary"),
    changedFields: jsonb("changed_fields").$type<string[]>(),
    title: text("title").notNull(),
    content: jsonb("content").$type<Record<string, unknown>>(),
    structuredFields:
      jsonb("structured_fields").$type<Record<string, unknown>>(),
    basedOnRevisionId: uuid("based_on_revision_id"),
    authorId: text("author_id"),
    reviewerId: text("reviewer_id"),
    approverId: text("approver_id"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    nextReviewDate: timestamp("next_review_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_content_revisions_node_revision").on(
      table.nodeId,
      table.revisionNo,
    ),
    index("idx_content_revisions_node").on(table.nodeId),
    index("idx_content_revisions_author").on(table.authorId),
    index("idx_content_revisions_reviewer").on(table.reviewerId),
    index("idx_content_revisions_approver").on(table.approverId),
  ],
);

export const contentRevisionEventsTable = pgTable("content_revision_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  revisionId: uuid("revision_id")
    .notNull()
    .references(() => contentRevisionsTable.id),
  eventType: revisionEventTypeEnum("event_type").notNull(),
  actorId: text("actor_id"),
  comment: text("comment"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertContentRevisionSchema = createInsertSchema(
  contentRevisionsTable,
).omit({ id: true, createdAt: true });
export const selectContentRevisionSchema = createSelectSchema(
  contentRevisionsTable,
);
export type InsertContentRevision = z.infer<typeof insertContentRevisionSchema>;
export type ContentRevision = typeof contentRevisionsTable.$inferSelect;

export const insertRevisionEventSchema = createInsertSchema(
  contentRevisionEventsTable,
).omit({ id: true, createdAt: true });
export type InsertRevisionEvent = z.infer<typeof insertRevisionEventSchema>;
export type RevisionEvent = typeof contentRevisionEventsTable.$inferSelect;
