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
import { getSystemSetting, setSystemSetting } from "./system-settings.service";
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
        {
          templateId: inserted.id,
          name: wf.template.name,
          steps: wf.steps.length,
        },
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

  logger.info({ count: profiles.length }, "Seeded AI field profiles");
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

export async function reimportGlossarySeedTerms(): Promise<{
  upserted: number;
}> {
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

  const dupes: {
    dup_id: string;
    canonical_id: string;
    display_name: string;
  }[] = (await db.execute(dsql`
    SELECT p1.id AS dup_id, p2.id AS canonical_id, p1.display_name
    FROM principals p1
    JOIN principals p2
      ON p1.external_id = p2.external_id
      AND p2.external_provider = 'entra'
      AND p2.status = 'active'
    WHERE p1.external_provider = 'entra_id'
      AND p1.status = 'active'
      AND p1.id <> p2.id
  `)) as any;

  const rows = Array.isArray(dupes) ? dupes : ((dupes as any).rows ?? []);
  for (const row of rows) {
    await db
      .update(principalsTable)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(principalsTable.id, String(row.dup_id)));
    logger.info(
      {
        duplicateId: row.dup_id,
        canonicalId: row.canonical_id,
        name: row.display_name,
      },
      "Deactivated duplicate entra_id principal",
    );
  }
}

async function migrateExternalMediaUrls(): Promise<void> {
  const MIGRATION_KEY = "migration.external_media_urls_completed";
  // Bump MIGRATION_VERSION whenever the lookup logic changes so the migration
  // re-runs even if a previous (broken) version already set the flag.
  const MIGRATION_VERSION = "v2";
  const alreadyDone = await getSystemSetting(MIGRATION_KEY);
  if (alreadyDone === MIGRATION_VERSION) {
    logger.info("Media URL migration already completed — skipping");
    return;
  }

  // The media_assets table has no "url" column. The SharePoint WebUrl was only ever
  // embedded inside TipTap JSON as "src":"https://...".
  // IMPORTANT: The actual TipTap body lives in `structured_fields._editorContent`,
  // NOT in `content` (which only holds metadata like {"owner":...,"templateVariant":...}).

  // Build a set of known storage_keys (the SharePoint URL ends with the storage_key
  // as its filename, e.g. ".../FlowCore%20Ablage/07607f99-...uuid....png").
  // original_filename ("Screenshot 2026-06-24.png") is NOT in the URL path.
  const assets = (await db.execute(
    sql`SELECT storage_key FROM media_assets WHERE is_deleted = false`,
  )) as unknown as { rows: { storage_key: string }[] };

  if ((assets.rows ?? []).length === 0) {
    logger.info(
      "No media assets found — marking media URL migration as complete",
    );
    await setSystemSetting(MIGRATION_KEY, MIGRATION_VERSION);
    return;
  }

  // Map: lowercase storage_key → canonical storage_key (preserves original casing)
  const storageKeyMap = new Map<string, string>();
  for (const a of assets.rows) {
    storageKeyMap.set(a.storage_key.toLowerCase(), a.storage_key);
  }

  // Walk TipTap JSON recursively, replacing any "src":"https://..." with internal URL.
  function fixNode(node: unknown): boolean {
    if (!node || typeof node !== "object") return false;
    let changed = false;
    const obj = node as Record<string, unknown>;

    if (typeof obj.src === "string" && obj.src.startsWith("https://")) {
      // The SharePoint URL ends with the storage_key as its filename:
      // e.g. ".../FlowCore%20%20Ablage/07607f99-77c2-457b-81e2-f1264733508d.png"
      // Strip query string, decode percent-encoding, extract filename portion.
      const rawPath = obj.src.split("?")[0];
      const rawFilename = rawPath.split("/").pop() ?? "";
      const filename = decodeURIComponent(rawFilename).toLowerCase();
      const key = storageKeyMap.get(filename);
      if (key) {
        const oldSrc = obj.src;
        obj.src = `/api/media/files/${key}`;
        changed = true;
        logger.info(
          { oldSrc, newSrc: obj.src, key },
          "Replaced SharePoint src in TipTap node",
        );
      }
    }

    for (const k of Object.keys(obj)) {
      if (k === "src") continue;
      const val = obj[k];
      if (Array.isArray(val)) {
        for (const item of val) {
          if (fixNode(item)) changed = true;
        }
      } else if (val && typeof val === "object") {
        if (fixNode(val)) changed = true;
      }
    }
    return changed;
  }

  // Scan structured_fields (contains _editorContent with TipTap image nodes).
  // PostgreSQL's jsonb::text adds spaces after colons/commas; LIKE '%"src"%' is
  // still safe because the key name itself is not spaced.
  const wcs = (await db.execute(
    sql`SELECT id, structured_fields FROM content_working_copies WHERE structured_fields IS NOT NULL AND structured_fields::text LIKE '%"src"%'`,
  )) as unknown as { rows: { id: string; structured_fields: unknown }[] };

  const revs = (await db.execute(
    sql`SELECT id, structured_fields FROM content_revisions WHERE structured_fields IS NOT NULL AND structured_fields::text LIKE '%"src"%'`,
  )) as unknown as { rows: { id: string; structured_fields: unknown }[] };

  const allDocs = [
    ...(wcs.rows ?? []).map((r) => ({
      id: r.id,
      data: r.structured_fields,
      table: "content_working_copies" as const,
    })),
    ...(revs.rows ?? []).map((r) => ({
      id: r.id,
      data: r.structured_fields,
      table: "content_revisions" as const,
    })),
  ];

  if (allDocs.length === 0) {
    logger.info(
      "No docs with external src found — marking media URL migration as complete",
    );
    await setSystemSetting(MIGRATION_KEY, MIGRATION_VERSION);
    return;
  }
  logger.info(
    { count: allDocs.length },
    "Starting media URL migration — docs with external src found",
  );

  let totalFixed = 0;
  for (const doc of allDocs) {
    const data = doc.data;
    const changed = fixNode(data);
    if (changed) {
      const json = JSON.stringify(data);
      if (doc.table === "content_working_copies") {
        await db.execute(
          sql`UPDATE content_working_copies SET structured_fields = ${json}::jsonb WHERE id = ${doc.id}`,
        );
      } else {
        await db.execute(
          sql`UPDATE content_revisions SET structured_fields = ${json}::jsonb WHERE id = ${doc.id}`,
        );
      }
      totalFixed++;
      logger.info(
        { id: doc.id, table: doc.table },
        "Fixed SharePoint image URLs in doc",
      );
    }
  }

  logger.info(
    { totalFixed, docsScanned: allDocs.length },
    "Media URL migration complete",
  );
  await setSystemSetting(MIGRATION_KEY, MIGRATION_VERSION);
  logger.info(
    { key: MIGRATION_KEY },
    "Media URL migration flag set — will skip on next startup",
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
