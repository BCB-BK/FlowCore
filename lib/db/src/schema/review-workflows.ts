import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { reviewStatusEnum, approvalDecisionEnum } from "./enums";
import { contentRevisionsTable } from "./content-revisions";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewWorkflowsTable = pgTable("review_workflows", {
  id: uuid("id").defaultRandom().primaryKey(),
  revisionId: uuid("revision_id")
    .notNull()
    .references(() => contentRevisionsTable.id),
  status: reviewStatusEnum("status").notNull().default("pending"),
  requiredApprovals: integer("required_approvals").notNull().default(1),
  currentStep: integer("current_step").notNull().default(1),
  initiatedBy: text("initiated_by"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const approvalsTable = pgTable("approvals", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => reviewWorkflowsTable.id),
  revisionId: uuid("revision_id")
    .notNull()
    .references(() => contentRevisionsTable.id),
  stepNumber: integer("step_number").notNull().default(1),
  reviewerId: text("reviewer_id"),
  decision: approvalDecisionEnum("decision"),
  comment: text("comment"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertReviewWorkflowSchema = createInsertSchema(
  reviewWorkflowsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const selectReviewWorkflowSchema =
  createSelectSchema(reviewWorkflowsTable);
export type InsertReviewWorkflow = z.infer<typeof insertReviewWorkflowSchema>;
export type ReviewWorkflow = typeof reviewWorkflowsTable.$inferSelect;

export const insertApprovalSchema = createInsertSchema(approvalsTable).omit({
  id: true,
  createdAt: true,
});
export const selectApprovalSchema = createSelectSchema(approvalsTable);
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type Approval = typeof approvalsTable.$inferSelect;
