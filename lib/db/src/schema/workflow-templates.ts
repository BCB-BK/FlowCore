import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationEventTypeEnum = pgEnum("notification_event_type", [
  "working_copy_submitted",
  "working_copy_approved",
  "working_copy_returned",
  "working_copy_published",
  "review_overdue",
  "review_overdue_escalation",
  "task_overdue",
  "open_review_overdue",
]);

export const notificationRecipientTypeEnum = pgEnum(
  "notification_recipient_type",
  [
    "owner",
    "deputy",
    "reviewer",
    "approver",
    "process_manager",
    "role_based",
    "explicit",
  ],
);

export const workflowTemplatesTable = pgTable("workflow_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  enforceSoD: boolean("enforce_so_d").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: text("created_by"),
});

export const workflowStepsTable = pgTable("workflow_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflowTemplatesTable.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  name: text("name").notNull(),
  roles: text("roles").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const pageTypeWorkflowAssignmentsTable = pgTable(
  "page_type_workflow_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageType: text("page_type").notNull().unique(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflowTemplatesTable.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const notificationRulesTable = pgTable("notification_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: notificationEventTypeEnum("event_type").notNull(),
  recipientTypes: text("recipient_types").array().notNull().default([]),
  channels: text("channels").array().notNull().default(["in_app"]),
  reminderAfterDays: integer("reminder_after_days"),
  escalationAfterDays: integer("escalation_after_days"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const systemSettingsTable = pgTable("system_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: text("updated_by"),
});

export const insertWorkflowTemplateSchema = createInsertSchema(
  workflowTemplatesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const selectWorkflowTemplateSchema = createSelectSchema(
  workflowTemplatesTable,
);
export type InsertWorkflowTemplate = z.infer<
  typeof insertWorkflowTemplateSchema
>;
export type WorkflowTemplate = typeof workflowTemplatesTable.$inferSelect;

export const insertWorkflowStepSchema = createInsertSchema(
  workflowStepsTable,
).omit({ id: true, createdAt: true });
export const selectWorkflowStepSchema = createSelectSchema(workflowStepsTable);
export type InsertWorkflowStep = z.infer<typeof insertWorkflowStepSchema>;
export type WorkflowStep = typeof workflowStepsTable.$inferSelect;

export const insertPageTypeWorkflowAssignmentSchema = createInsertSchema(
  pageTypeWorkflowAssignmentsTable,
).omit({ id: true, updatedAt: true });
export type InsertPageTypeWorkflowAssignment = z.infer<
  typeof insertPageTypeWorkflowAssignmentSchema
>;
export type PageTypeWorkflowAssignment =
  typeof pageTypeWorkflowAssignmentsTable.$inferSelect;

export const insertNotificationRuleSchema = createInsertSchema(
  notificationRulesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const selectNotificationRuleSchema =
  createSelectSchema(notificationRulesTable);
export type InsertNotificationRule = z.infer<
  typeof insertNotificationRuleSchema
>;
export type NotificationRule = typeof notificationRulesTable.$inferSelect;

export const insertSystemSettingSchema = createInsertSchema(
  systemSettingsTable,
).omit({ id: true, updatedAt: true });
export type SystemSetting = typeof systemSettingsTable.$inferSelect;
