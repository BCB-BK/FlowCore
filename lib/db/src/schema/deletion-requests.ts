import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { deletionRequestStatusEnum } from "./enums";
import { contentNodesTable } from "./content-nodes";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const deletionRequestsTable = pgTable(
  "deletion_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => contentNodesTable.id),
    requestedBy: text("requested_by").notNull(),
    reason: text("reason").notNull(),
    status: deletionRequestStatusEnum("status").notNull().default("pending"),
    reviewedBy: text("reviewed_by"),
    reviewComment: text("review_comment"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_deletion_requests_node").on(table.nodeId),
    index("idx_deletion_requests_status").on(table.status),
    index("idx_deletion_requests_requested_by").on(table.requestedBy),
  ],
);

export const insertDeletionRequestSchema = createInsertSchema(deletionRequestsTable);
export const selectDeletionRequestSchema = createSelectSchema(deletionRequestsTable);
