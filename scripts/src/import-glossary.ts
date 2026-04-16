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

const EXCEL_PATH = path.resolve(
  import.meta.dirname,
  "../../attached_assets/Begriffe_1776326457078.xlsx",
);

async function importGlossary() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

  const dataRows = rows.slice(1);

  const values = dataRows
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

  console.log(`Read ${values.length} valid terms from Excel`);

  const deleted = await db.delete(glossaryTermsTable).returning();
  console.log(`Deleted ${deleted.length} existing glossary terms`);

  const inserted = await db
    .insert(glossaryTermsTable)
    .values(values)
    .returning();

  console.log(`Inserted ${inserted.length} new terms`);

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(glossaryTermsTable);
  console.log(`Total terms now in DB: ${total[0]?.count}`);

  process.exit(0);
}

importGlossary().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
