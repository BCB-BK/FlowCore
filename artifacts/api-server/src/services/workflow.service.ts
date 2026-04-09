import { db } from "@workspace/db";
import {
  workflowTemplatesTable,
  workflowStepsTable,
  pageTypeWorkflowAssignmentsTable,
  notificationRulesTable,
  systemSettingsTable,
} from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { logger } from "../lib/logger";

export interface WorkflowTemplateWithSteps {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  enforceSoD: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  steps: Array<{
    id: string;
    stepNumber: number;
    name: string;
    roles: string[];
  }>;
}

export async function listWorkflowTemplates(): Promise<WorkflowTemplateWithSteps[]> {
  const templates = await db
    .select()
    .from(workflowTemplatesTable)
    .orderBy(asc(workflowTemplatesTable.createdAt));

  const steps = await db
    .select()
    .from(workflowStepsTable)
    .orderBy(asc(workflowStepsTable.stepNumber));

  return templates.map((t) => ({
    ...t,
    steps: steps
      .filter((s) => s.workflowId === t.id)
      .map((s) => ({
        id: s.id,
        stepNumber: s.stepNumber,
        name: s.name,
        roles: s.roles ?? [],
      })),
  }));
}

export async function getWorkflowTemplate(id: string): Promise<WorkflowTemplateWithSteps | null> {
  const [template] = await db
    .select()
    .from(workflowTemplatesTable)
    .where(eq(workflowTemplatesTable.id, id));

  if (!template) return null;

  const steps = await db
    .select()
    .from(workflowStepsTable)
    .where(eq(workflowStepsTable.workflowId, id))
    .orderBy(asc(workflowStepsTable.stepNumber));

  return {
    ...template,
    steps: steps.map((s) => ({
      id: s.id,
      stepNumber: s.stepNumber,
      name: s.name,
      roles: s.roles ?? [],
    })),
  };
}

export async function createWorkflowTemplate(input: {
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  enforceSoD?: boolean;
  createdBy?: string;
  steps: Array<{ stepNumber: number; name: string; roles: string[] }>;
}): Promise<WorkflowTemplateWithSteps> {
  return db.transaction(async (tx) => {
    if (input.isDefault) {
      await tx
        .update(workflowTemplatesTable)
        .set({ isDefault: false });
    }

    const [template] = await tx
      .insert(workflowTemplatesTable)
      .values({
        name: input.name,
        description: input.description ?? null,
        isDefault: input.isDefault ?? false,
        isActive: input.isActive ?? true,
        enforceSoD: input.enforceSoD ?? false,
        createdBy: input.createdBy ?? null,
      })
      .returning();

    const insertedSteps = [];
    for (const step of input.steps) {
      const [s] = await tx
        .insert(workflowStepsTable)
        .values({
          workflowId: template.id,
          stepNumber: step.stepNumber,
          name: step.name,
          roles: step.roles,
        })
        .returning();
      insertedSteps.push(s);
    }

    logger.info({ workflowId: template.id }, "Workflow template created");

    return {
      ...template,
      steps: insertedSteps.map((s) => ({
        id: s.id,
        stepNumber: s.stepNumber,
        name: s.name,
        roles: s.roles ?? [],
      })),
    };
  });
}

export async function updateWorkflowTemplate(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
    enforceSoD?: boolean;
    steps?: Array<{ stepNumber: number; name: string; roles: string[] }>;
  },
): Promise<WorkflowTemplateWithSteps | null> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(workflowTemplatesTable)
      .where(eq(workflowTemplatesTable.id, id));

    if (!existing) return null;

    if (input.isDefault) {
      await tx
        .update(workflowTemplatesTable)
        .set({ isDefault: false });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.enforceSoD !== undefined) updateData.enforceSoD = input.enforceSoD;

    const [updated] = await tx
      .update(workflowTemplatesTable)
      .set(updateData)
      .where(eq(workflowTemplatesTable.id, id))
      .returning();

    let steps;
    if (input.steps !== undefined) {
      await tx
        .delete(workflowStepsTable)
        .where(eq(workflowStepsTable.workflowId, id));

      steps = [];
      for (const step of input.steps) {
        const [s] = await tx
          .insert(workflowStepsTable)
          .values({
            workflowId: id,
            stepNumber: step.stepNumber,
            name: step.name,
            roles: step.roles,
          })
          .returning();
        steps.push(s);
      }
    } else {
      steps = await tx
        .select()
        .from(workflowStepsTable)
        .where(eq(workflowStepsTable.workflowId, id))
        .orderBy(asc(workflowStepsTable.stepNumber));
    }

    logger.info({ workflowId: id }, "Workflow template updated");

    return {
      ...updated,
      steps: steps.map((s) => ({
        id: s.id,
        stepNumber: s.stepNumber,
        name: s.name,
        roles: s.roles ?? [],
      })),
    };
  });
}

export async function deleteWorkflowTemplate(id: string): Promise<boolean> {
  const [template] = await db
    .select({ isDefault: workflowTemplatesTable.isDefault })
    .from(workflowTemplatesTable)
    .where(eq(workflowTemplatesTable.id, id));

  if (!template) return false;
  if (template.isDefault) {
    throw new Error("Der Standard-Workflow kann nicht gelöscht werden.");
  }

  await db
    .delete(workflowTemplatesTable)
    .where(eq(workflowTemplatesTable.id, id));

  logger.info({ workflowId: id }, "Workflow template deleted");
  return true;
}

export async function listPageTypeAssignments() {
  return db
    .select()
    .from(pageTypeWorkflowAssignmentsTable);
}

export async function upsertPageTypeAssignment(pageType: string, workflowId: string) {
  const [existing] = await db
    .select()
    .from(pageTypeWorkflowAssignmentsTable)
    .where(eq(pageTypeWorkflowAssignmentsTable.pageType, pageType));

  if (existing) {
    const [updated] = await db
      .update(pageTypeWorkflowAssignmentsTable)
      .set({ workflowId, updatedAt: new Date() })
      .where(eq(pageTypeWorkflowAssignmentsTable.pageType, pageType))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(pageTypeWorkflowAssignmentsTable)
    .values({ pageType, workflowId })
    .returning();
  return inserted;
}

export async function removePageTypeAssignment(pageType: string) {
  await db
    .delete(pageTypeWorkflowAssignmentsTable)
    .where(eq(pageTypeWorkflowAssignmentsTable.pageType, pageType));
}

export const DEFAULT_NOTIFICATION_RULES: Array<{
  eventType: string;
  recipientTypes: string[];
  channels: string[];
  reminderAfterDays: number | null;
  escalationAfterDays: number | null;
}> = [
  {
    eventType: "working_copy_submitted",
    recipientTypes: ["owner", "reviewer", "approver"],
    channels: ["in_app", "teams"],
    reminderAfterDays: null,
    escalationAfterDays: null,
  },
  {
    eventType: "working_copy_approved",
    recipientTypes: ["owner"],
    channels: ["in_app"],
    reminderAfterDays: null,
    escalationAfterDays: null,
  },
  {
    eventType: "working_copy_returned",
    recipientTypes: ["owner"],
    channels: ["in_app", "teams"],
    reminderAfterDays: null,
    escalationAfterDays: null,
  },
  {
    eventType: "working_copy_published",
    recipientTypes: ["owner", "reviewer", "approver"],
    channels: ["in_app"],
    reminderAfterDays: null,
    escalationAfterDays: null,
  },
  {
    eventType: "review_overdue",
    recipientTypes: ["owner", "reviewer"],
    channels: ["in_app", "teams"],
    reminderAfterDays: 3,
    escalationAfterDays: 7,
  },
  {
    eventType: "review_overdue_escalation",
    recipientTypes: ["owner", "process_manager"],
    channels: ["in_app", "teams"],
    reminderAfterDays: null,
    escalationAfterDays: null,
  },
  {
    eventType: "task_overdue",
    recipientTypes: ["owner", "deputy"],
    channels: ["in_app"],
    reminderAfterDays: 2,
    escalationAfterDays: 5,
  },
  {
    eventType: "open_review_overdue",
    recipientTypes: ["reviewer", "approver"],
    channels: ["in_app", "teams"],
    reminderAfterDays: 3,
    escalationAfterDays: 7,
  },
];

export async function seedNotificationRules(): Promise<{ created: number; existing: number }> {
  const existing = await db
    .select({ eventType: notificationRulesTable.eventType })
    .from(notificationRulesTable);
  const existingTypes = new Set(existing.map((r) => r.eventType));

  const toCreate = DEFAULT_NOTIFICATION_RULES.filter(
    (r) => !existingTypes.has(r.eventType as (typeof notificationRulesTable.$inferInsert)["eventType"]),
  );

  if (toCreate.length > 0) {
    await db.insert(notificationRulesTable).values(
      toCreate.map((r) => ({
        eventType: r.eventType as (typeof notificationRulesTable.$inferInsert)["eventType"],
        recipientTypes: r.recipientTypes,
        channels: r.channels,
        reminderAfterDays: r.reminderAfterDays,
        escalationAfterDays: r.escalationAfterDays,
        isEnabled: true,
      })),
    );
    logger.info({ created: toCreate.length }, "Seeded default notification rules");
  }

  return { created: toCreate.length, existing: existingTypes.size };
}

export async function listNotificationRules() {
  return db
    .select()
    .from(notificationRulesTable)
    .orderBy(asc(notificationRulesTable.eventType));
}

export async function upsertNotificationRule(input: {
  id?: string;
  eventType: string;
  recipientTypes: string[];
  channels: string[];
  reminderAfterDays?: number | null;
  escalationAfterDays?: number | null;
  isEnabled?: boolean;
}) {
  if (input.id) {
    const [updated] = await db
      .update(notificationRulesTable)
      .set({
        recipientTypes: input.recipientTypes,
        channels: input.channels,
        reminderAfterDays: input.reminderAfterDays ?? null,
        escalationAfterDays: input.escalationAfterDays ?? null,
        isEnabled: input.isEnabled ?? true,
        updatedAt: new Date(),
      })
      .where(eq(notificationRulesTable.id, input.id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(notificationRulesTable)
    .values({
      eventType: input.eventType as (typeof notificationRulesTable.$inferInsert)["eventType"],
      recipientTypes: input.recipientTypes,
      channels: input.channels,
      reminderAfterDays: input.reminderAfterDays ?? null,
      escalationAfterDays: input.escalationAfterDays ?? null,
      isEnabled: input.isEnabled ?? true,
    })
    .returning();
  return inserted;
}

export async function deleteNotificationRule(id: string): Promise<boolean> {
  const result = await db
    .delete(notificationRulesTable)
    .where(eq(notificationRulesTable.id, id))
    .returning({ id: notificationRulesTable.id });
  return result.length > 0;
}

export async function isWorkflowActiveForPageType(templateType: string): Promise<boolean> {
  const [assignment] = await db
    .select({ workflowId: pageTypeWorkflowAssignmentsTable.workflowId })
    .from(pageTypeWorkflowAssignmentsTable)
    .where(eq(pageTypeWorkflowAssignmentsTable.pageType, templateType));

  if (!assignment) {
    const [defaultWf] = await db
      .select({ isActive: workflowTemplatesTable.isActive })
      .from(workflowTemplatesTable)
      .where(eq(workflowTemplatesTable.isDefault, true));
    return defaultWf?.isActive ?? true;
  }

  const [wf] = await db
    .select({ isActive: workflowTemplatesTable.isActive })
    .from(workflowTemplatesTable)
    .where(eq(workflowTemplatesTable.id, assignment.workflowId));
  return wf?.isActive ?? true;
}

export async function getSystemSetting(key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: systemSettingsTable.value })
    .from(systemSettingsTable)
    .where(eq(systemSettingsTable.key, key));
  return row?.value ?? null;
}

export async function setSystemSetting(key: string, value: string | null, updatedBy?: string) {
  const [existing] = await db
    .select({ id: systemSettingsTable.id })
    .from(systemSettingsTable)
    .where(eq(systemSettingsTable.key, key));

  if (existing) {
    await db
      .update(systemSettingsTable)
      .set({ value, updatedAt: new Date(), updatedBy: updatedBy ?? null })
      .where(eq(systemSettingsTable.key, key));
  } else {
    await db
      .insert(systemSettingsTable)
      .values({ key, value, updatedBy: updatedBy ?? null });
  }
}
