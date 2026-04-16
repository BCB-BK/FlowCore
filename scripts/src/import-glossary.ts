import { db, glossaryTermsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import XLSX from "xlsx";
import path from "path";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const OLD_EXCEL_PATH = path.resolve(
  import.meta.dirname,
  "../../attached_assets/BCB_Glossar_v5_final_1774525714408.xlsx",
);

const NEW_EXCEL_PATH = path.resolve(
  import.meta.dirname,
  "../../attached_assets/Begriffe_1776326457078.xlsx",
);

async function importGlossary() {
  // Step 1: Load OLD terms (BCB_Glossar_v5_final) and insert without deleting
  const oldWb = XLSX.readFile(OLD_EXCEL_PATH);
  const oldWs = oldWb.Sheets[oldWb.SheetNames[0]];
  const oldRows = XLSX.utils.sheet_to_json<string[]>(oldWs, { header: 1 });

  const oldValues = oldRows
    .slice(1)
    .filter((row) => row[0] && row[1])
    .map((row) => {
      const [term, definition, synonymsRaw, abbreviation] = row;
      const synonyms = synonymsRaw
        ? synonymsRaw
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : null;
      return {
        term: term.trim(),
        slug: slugify(term.trim()),
        definition: definition.trim(),
        synonyms: synonyms && synonyms.length > 0 ? synonyms : null,
        abbreviation: abbreviation?.trim() || null,
      };
    });

  console.log(`Old file: ${oldValues.length} terms`);

  // Insert old terms, skip if already exists
  const oldInserted = await db
    .insert(glossaryTermsTable)
    .values(oldValues)
    .onConflictDoNothing()
    .returning();
  console.log(`Restored ${oldInserted.length} old terms`);

  // Step 2: Load NEW terms (Begriffe) and upsert — overwrite duplicates
  const newWb = XLSX.readFile(NEW_EXCEL_PATH);
  const newWs = newWb.Sheets[newWb.SheetNames[0]];
  const newRows = XLSX.utils.sheet_to_json<string[]>(newWs, { header: 1 });

  const newValues = newRows
    .slice(1)
    .filter((row) => row[0] && row[1])
    .map((row) => {
      const [term, definition, verweisRaw] = row;
      const synonyms = verweisRaw
        ? verweisRaw
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : null;
      return {
        term: term.trim(),
        slug: slugify(term.trim()),
        definition: definition.trim(),
        synonyms: synonyms && synonyms.length > 0 ? synonyms : null,
        abbreviation: null as string | null,
      };
    });

  console.log(`New file: ${newValues.length} terms`);

  let upserted = 0;
  for (const v of newValues) {
    await db
      .insert(glossaryTermsTable)
      .values(v)
      .onConflictDoUpdate({
        target: glossaryTermsTable.slug,
        set: {
          term: v.term,
          definition: v.definition,
          synonyms: v.synonyms,
          abbreviation: v.abbreviation,
          updatedAt: new Date(),
        },
      });
    upserted++;
  }
  console.log(`Upserted ${upserted} new terms (new added, duplicates overwritten)`);

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(glossaryTermsTable);
  console.log(`\nTotal terms now in DB: ${total[0]?.count}`);

  process.exit(0);
}

importGlossary().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
