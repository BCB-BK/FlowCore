import { db } from "@workspace/db";
import {
  workflowTemplatesTable,
  workflowStepsTable,
  aiFieldProfilesTable,
  glossaryTermsTable,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { seedNotificationRules } from "./workflow.service";
import workflowSeedData from "../seed-data/workflow-templates.json";
import aiProfilesSeedData from "../seed-data/ai-field-profiles.json";
import glossarySeedData from "../data/glossary-seed.json";

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
        allowedOperations: p.allowed_operations ?? [],
        isActive: p.is_active,
      })),
    );
  }

  logger.info(
    { count: profiles.length },
    "Seeded AI field profiles",
  );
}

interface GlossaryTermSeed {
  term: string;
  slug: string;
  definition: string;
  synonyms: string[] | null;
  abbreviation: string | null;
}

async function seedGlossaryTerms(): Promise<void> {
  const terms = glossarySeedData as GlossaryTermSeed[];
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(glossaryTermsTable);

  if (Number(count) >= terms.length) {
    logger.info(
      { count, expected: terms.length },
      "Glossary terms already up to date, skipping seed",
    );
    return;
  }

  logger.info(
    { current: count, expected: terms.length },
    "Upserting glossary terms...",
  );

  for (const t of terms) {
    await db
      .insert(glossaryTermsTable)
      .values(t)
      .onConflictDoUpdate({
        target: glossaryTermsTable.slug,
        set: {
          term: t.term,
          definition: t.definition,
          synonyms: t.synonyms,
          abbreviation: t.abbreviation,
          updatedAt: new Date(),
        },
      });
  }

  logger.info({ count: terms.length }, "Glossary terms seeded");
}

export async function reimportGlossarySeedTerms(): Promise<{ upserted: number }> {
  const terms = glossarySeedData as GlossaryTermSeed[];

  for (const t of terms) {
    await db
      .insert(glossaryTermsTable)
      .values(t)
      .onConflictDoUpdate({
        target: glossaryTermsTable.slug,
        set: {
          term: t.term,
          definition: t.definition,
          synonyms: t.synonyms,
          abbreviation: t.abbreviation,
          updatedAt: new Date(),
        },
      });
  }

  logger.info({ count: terms.length }, "Glossary seed terms force-reimported");
  return { upserted: terms.length };
}


async function deduplicatePrincipals(): Promise<void> {
  const { principalsTable } = await import("@workspace/db/schema");
  const { eq, sql: dsql } = await import("drizzle-orm");

  const dupes: { dup_id: string; canonical_id: string; display_name: string }[] = await db.execute(dsql`
    SELECT p1.id AS dup_id, p2.id AS canonical_id, p1.display_name
    FROM principals p1
    JOIN principals p2
      ON p1.external_id = p2.external_id
      AND p2.external_provider = 'entra'
      AND p2.status = 'active'
    WHERE p1.external_provider = 'entra_id'
      AND p1.status = 'active'
      AND p1.id <> p2.id
  `) as any;

  const rows = Array.isArray(dupes) ? dupes : (dupes as any).rows ?? [];
  for (const row of rows) {
    await db
      .update(principalsTable)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(principalsTable.id, String(row.dup_id)));
    logger.info(
      { duplicateId: row.dup_id, canonicalId: row.canonical_id, name: row.display_name },
      "Deactivated duplicate entra_id principal",
    );
  }
}

async function migrateExternalMediaUrls(): Promise<void> {
  // Only fetch assets whose `url` column still points to an external (https://) URL.
  // These are assets uploaded before the fix that stored SharePoint WebUrls instead of
  // the internal /api/media/files/{key} path. The old storage_key-based regex was wrong
  // because the storage_key UUID never appears inside a SharePoint WebUrl.
  const assets = await db.execute(
    sql`SELECT id, storage_key, url FROM media_assets WHERE is_deleted = false AND url LIKE 'https://%'`,
  ) as unknown as { rows: { id: string; storage_key: string; url: string }[] };

  const rows = assets.rows ?? [];
  if (rows.length === 0) return;

  logger.info({ count: rows.length }, "Starting media URL migration for assets with external URLs");
  let totalFixed = 0;

  for (const asset of rows) {
    const key = asset.storage_key;
    const oldUrl = asset.url;
    const internalUrl = `/api/media/files/${key}`;

    // Update the url column in media_assets itself
    await db.execute(sql`
      UPDATE media_assets SET url = ${internalUrl} WHERE id = ${asset.id}
    `);

    // Update TipTap JSON content: replace "src":"<old SharePoint URL>" with internal URL.
    // We use a literal string replace (not regex) to avoid issues with special chars in the URL.
    const wcResult = await db.execute(sql`
      UPDATE content_working_copies
      SET content = replace(content::text, ${'"src":"' + oldUrl + '"'}, ${'"src":"' + internalUrl + '"'})::jsonb
      WHERE content IS NOT NULL
        AND content::text LIKE ${'%' + oldUrl + '%'}
    `) as unknown as { rowCount: number };

    const revResult = await db.execute(sql`
      UPDATE content_revisions
      SET content = replace(content::text, ${'"src":"' + oldUrl + '"'}, ${'"src":"' + internalUrl + '"'})::jsonb
      WHERE content IS NOT NULL
        AND content::text LIKE ${'%' + oldUrl + '%'}
    `) as unknown as { rowCount: number };

    const fixed = (wcResult.rowCount ?? 0) + (revResult.rowCount ?? 0);
    logger.info({ storageKey: key, oldUrl, internalUrl, docsFixed: fixed }, "Migrated external media URL to internal");
    totalFixed += fixed;
  }

  logger.info({ totalFixed, assetsFixed: rows.length }, "Media URL migration complete");
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

  try {
    await seedGlossaryTerms();
  } catch (err) {
    logger.error({ err }, "Failed to seed glossary terms");
  }

  try {
    await deduplicatePrincipals();
  } catch (err) {
    logger.error({ err }, "Failed to deduplicate principals");
  }

  try {
    await migrateExternalMediaUrls();
  } catch (err) {
    logger.error({ err }, "Failed to migrate external media URLs");
  }

  logger.info("Startup data seed complete");
}
