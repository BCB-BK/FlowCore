import { db } from "@workspace/db";
import {
  workflowTemplatesTable,
  workflowStepsTable,
  aiFieldProfilesTable,
} from "@workspace/db/schema";
import { logger } from "../lib/logger";
import { seedNotificationRules } from "./workflow.service";
import workflowSeedData from "../seed-data/workflow-templates.json";
import aiProfilesSeedData from "../seed-data/ai-field-profiles.json";

interface WorkflowSeed {
  template: {
    name: string;
    description: string;
    is_default: boolean;
    enforce_so_d: boolean;
    created_by: string;
  };
  steps: Array<{
    step_number: number;
    name: string;
    roles: string[];
  }>;
}

interface AiFieldProfileSeed {
  page_type: string;
  field_key: string;
  label: string;
  purpose: string;
  prompt_instruction: string;
  style: string | null;
  guardrails: string | null;
  allowed_operations: string[] | null;
  is_active: boolean;
}

async function seedWorkflowTemplates(): Promise<void> {
  const existing = await db.select().from(workflowTemplatesTable);
  if (existing.length > 0) {
    logger.info(
      { count: existing.length },
      "Workflow templates already exist, skipping seed",
    );
    return;
  }

  const templates = workflowSeedData as WorkflowSeed[];

  for (const wf of templates) {
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(workflowTemplatesTable)
        .values({
          name: wf.template.name,
          description: wf.template.description,
          isDefault: wf.template.is_default,
          enforceSoD: wf.template.enforce_so_d,
          createdBy: wf.template.created_by,
        })
        .returning();

      for (const step of wf.steps) {
        await tx.insert(workflowStepsTable).values({
          workflowId: inserted.id,
          stepNumber: step.step_number,
          name: step.name,
          roles: step.roles,
        });
      }

      logger.info(
        { templateId: inserted.id, name: wf.template.name, steps: wf.steps.length },
        "Seeded workflow template",
      );
    });
  }
}

async function seedAiFieldProfiles(): Promise<void> {
  const existing = await db.select().from(aiFieldProfilesTable);
  if (existing.length > 0) {
    logger.info(
      { count: existing.length },
      "AI field profiles already exist, skipping seed",
    );
    return;
  }

  const profiles = aiProfilesSeedData as AiFieldProfileSeed[];

  const batchSize = 50;
  for (let i = 0; i < profiles.length; i += batchSize) {
    const batch = profiles.slice(i, i + batchSize);
    await db.insert(aiFieldProfilesTable).values(
      batch.map((p) => ({
        pageType: p.page_type,
        fieldKey: p.field_key,
        label: p.label,
        purpose: p.purpose,
        promptInstruction: p.prompt_instruction,
        style: p.style,
        guardrails: p.guardrails,
        allowedOperations: p.allowed_operations,
        isActive: p.is_active,
      })),
    );
  }

  logger.info(
    { count: profiles.length },
    "Seeded AI field profiles",
  );
}

export async function runStartupSeed(): Promise<void> {
  logger.info("Running startup data seed...");

  try {
    await seedWorkflowTemplates();
  } catch (err) {
    logger.error({ err }, "Failed to seed workflow templates");
  }

  try {
    await seedAiFieldProfiles();
  } catch (err) {
    logger.error({ err }, "Failed to seed AI field profiles");
  }

  try {
    await seedNotificationRules();
  } catch (err) {
    logger.error({ err }, "Failed to seed notification rules");
  }

  logger.info("Startup data seed complete");
}
