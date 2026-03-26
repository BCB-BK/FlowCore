import { db, glossaryTermsTable } from "@workspace/db";
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

const EXCEL_PATH = path.resolve(
  import.meta.dirname,
  "../../attached_assets/BCB_Glossar_v2_1774520810292.xlsx",
);

async function importGlossary() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

  const dataRows = rows.slice(1);
  console.log(`Read ${dataRows.length} glossary terms from Excel`);

  const values = dataRows
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
        synonyms,
        abbreviation: abbreviation?.trim() || null,
      };
    });

  const inserted = await db
    .insert(glossaryTermsTable)
    .values(values)
    .onConflictDoNothing()
    .returning();

  console.log(
    `Result: ${inserted.length} inserted, ${values.length - inserted.length} skipped (already exist)`,
  );
  console.log(`Total terms processed: ${values.length}`);

  if (inserted.length > 0) {
    console.log("\nInserted terms:");
    for (const t of inserted) {
      console.log(
        `  + ${t.term} [${t.slug}] abbr=${t.abbreviation || "-"} synonyms=${t.synonyms?.length || 0}`,
      );
    }
  }

  process.exit(0);
}

importGlossary().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
