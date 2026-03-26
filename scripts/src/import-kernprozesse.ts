import { db, pool } from "@workspace/db";
import {
  contentNodesTable,
  contentRevisionsTable,
  contentRevisionEventsTable,
} from "@workspace/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import XLSX from "xlsx";
import path from "path";

const EXCEL_PATH = path.resolve(
  import.meta.dirname,
  "../../attached_assets/Kern-,_Teilprozesse_und_Use-Cases_–_BCB_gesamt_1774518924814.xlsx",
);

const RELEVANT_TABS = [
  "AZAV (MASTER)",
  "TN-B2C",
  "MA-SB2C",
  "MA-SA",
  "MA-SB2G",
  "AZAV",
  "IN - (Interessent)",
  "MA-VB2C",
  "MA - VB2B",
  "MA-PER (Personalreferent)",
  "KO (Korrektor_in)",
  "TU (Tutor_in)",
  "DO (Dozent_in)",
  "Buchhaltung",
  "Marketing",
  "MA-P (Produkt)",
  "MA-PJ (Projekt)",
  "Undefinierte Prozesse",
];

const SYSTEM_OWNER_ID = "00000000-0000-0000-0000-000000000001";

interface ParsedRow {
  level: number;
  bezeichnung: string;
  beschreibung: string;
  rollen: string;
  erwartetesErgebnis: string;
}

function getTabShortName(tabName: string): string {
  if (tabName === "AZAV (MASTER)") return "AZAV-MASTER";
  return tabName;
}

interface TabLayout {
  headerRow: number;
  levelCols: number[];
  bezeichnungCol: number;
  beschreibungCol: number;
  rollenCol: number;
  erwartetesErgebnisCol: number;
}

function detectLayout(data: unknown[][]): TabLayout | null {
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    let firstLevelCol = -1;
    for (let c = 0; c < row.length; c++) {
      if (String(row[c]).trim() === "#1") {
        firstLevelCol = c;
        break;
      }
    }
    if (firstLevelCol < 0) continue;

    let levelCount = 0;
    for (let c = firstLevelCol; c < row.length; c++) {
      const val = String(row[c]).trim();
      if (/^#\d+$/.test(val)) {
        levelCount++;
      } else {
        break;
      }
    }
    if (levelCount < 1) continue;

    const levelCols: number[] = [];
    for (let c = firstLevelCol; c < firstLevelCol + levelCount; c++) {
      levelCols.push(c);
    }

    const hasLevel0 = firstLevelCol > 0 &&
      String(row[firstLevelCol - 1] ?? "").trim() === "#0";
    if (hasLevel0) {
      levelCols.unshift(firstLevelCol - 1);
    }

    let bezeichnungCol = -1;
    for (let c = firstLevelCol + levelCount; c < row.length; c++) {
      const val = String(row[c]).toLowerCase().trim();
      if (val.includes("bezeichnung")) {
        bezeichnungCol = c;
        break;
      }
    }
    if (bezeichnungCol < 0) {
      bezeichnungCol = firstLevelCol + levelCount;
    }

    let beschreibungCol = bezeichnungCol + 1;
    let rollenCol = bezeichnungCol + 2;
    let erwartetesErgebnisCol = bezeichnungCol + 3;

    for (let c = bezeichnungCol + 1; c < Math.min(row.length, bezeichnungCol + 6); c++) {
      const val = String(row[c]).toLowerCase().trim();
      if (val.includes("beschreibung")) beschreibungCol = c;
      if (val.includes("rolle")) rollenCol = c;
      if (val.includes("ergebnis") || val.includes("erwartetes")) erwartetesErgebnisCol = c;
    }

    return {
      headerRow: i,
      levelCols,
      bezeichnungCol,
      beschreibungCol,
      rollenCol,
      erwartetesErgebnisCol,
    };
  }

  return null;
}

function parseTab(tabName: string, sheet: XLSX.WorkSheet): ParsedRow[] {
  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  const layout = detectLayout(data);
  if (!layout) {
    console.warn(`  WARNING: No header row found in tab "${tabName}", skipping`);
    return [];
  }

  const { headerRow, levelCols, bezeichnungCol, beschreibungCol, rollenCol, erwartetesErgebnisCol } = layout;
  const rows: ParsedRow[] = [];

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    let detectedLevel = -1;
    let levelBezeichnung = "";

    for (let lvlIdx = 0; lvlIdx < levelCols.length; lvlIdx++) {
      const cellVal = String(row[levelCols[lvlIdx]] ?? "").trim();
      if (cellVal === "" || cellVal === "0") continue;

      const level = lvlIdx + 1;

      if (
        cellVal.toLowerCase() === "x" ||
        /^\d+$/.test(cellVal)
      ) {
        detectedLevel = level;
        for (let nextIdx = lvlIdx + 1; nextIdx < levelCols.length; nextIdx++) {
          const nextVal = String(row[levelCols[nextIdx]] ?? "").trim();
          if (!nextVal) continue;
          if (nextVal.toLowerCase() !== "x" && !/^\d+$/.test(nextVal)) {
            levelBezeichnung = nextVal;
          }
          break;
        }
        break;
      } else {
        detectedLevel = level;
        levelBezeichnung = cellVal;
        break;
      }
    }

    if (detectedLevel < 0) continue;

    const bezeichnung =
      String(row[bezeichnungCol] ?? "").trim() || levelBezeichnung;
    if (!bezeichnung) continue;

    const beschreibung = String(row[beschreibungCol] ?? "").trim();
    const rollen = String(row[rollenCol] ?? "").trim();
    const erwartetesErgebnis = String(
      row[erwartetesErgebnisCol] ?? "",
    ).trim();

    rows.push({
      level: detectedLevel,
      bezeichnung,
      beschreibung,
      rollen,
      erwartetesErgebnis,
    });
  }

  return rows;
}

function getTemplateType(level: number): "core_process_overview" | "process_page_text" | "use_case" {
  if (level === 1) return "core_process_overview";
  if (level === 2) return "process_page_text";
  return "use_case";
}

function buildTitle(
  tabShortName: string,
  level: number,
  bezeichnung: string,
): string {
  if (level === 1) {
    return `${tabShortName}: ${bezeichnung}`;
  }
  return bezeichnung;
}

function buildRevisionContent(row: ParsedRow): Record<string, unknown> {
  const parts: string[] = [];

  if (row.beschreibung) {
    parts.push(row.beschreibung);
  }

  if (row.rollen) {
    parts.push(`\n**Rollen:** ${row.rollen}`);
  }

  if (row.erwartetesErgebnis) {
    parts.push(`\n**Erwartetes Ergebnis:** ${row.erwartetesErgebnis}`);
  }

  return {
    description: parts.join("\n") || undefined,
    owner: row.rollen || undefined,
  };
}

async function findExistingNodeByTitle(
  title: string,
  templateType: string,
  parentNodeId: string | null,
): Promise<string | null> {
  const conditions = [
    eq(contentNodesTable.title, title),
    eq(contentNodesTable.templateType, templateType as any),
    eq(contentNodesTable.isDeleted, false),
  ];

  if (parentNodeId) {
    conditions.push(eq(contentNodesTable.parentNodeId, parentNodeId));
  } else {
    conditions.push(sql`${contentNodesTable.parentNodeId} IS NULL`);
  }

  const existing = await db
    .select({ id: contentNodesTable.id })
    .from(contentNodesTable)
    .where(and(...conditions))
    .limit(1);

  return existing.length > 0 ? existing[0].id : null;
}

async function createNodeWithRevision(
  title: string,
  templateType: "core_process_overview" | "process_page_text" | "use_case",
  parentNodeId: string | null,
  sortOrder: number,
  revisionContent: Record<string, unknown>,
): Promise<string> {
  const immutableId = `import-kp-${randomUUID()}`;

  const nodeId = await db.transaction(async (tx) => {
    const displayCode = await generateDisplayCode(tx, templateType, parentNodeId);

    const [node] = await tx
      .insert(contentNodesTable)
      .values({
        immutableId,
        displayCode,
        title,
        templateType,
        parentNodeId,
        sortOrder,
        status: "draft",
        ownerId: SYSTEM_OWNER_ID,
      })
      .returning({ id: contentNodesTable.id });

    const hasContent = revisionContent.description || revisionContent.owner;
    if (hasContent) {
      const [revision] = await tx
        .insert(contentRevisionsTable)
        .values({
          nodeId: node.id,
          revisionNo: 1,
          title,
          content: revisionContent,
          changeType: "editorial",
          changeSummary: "Initiale Revision aus Excel-Import",
          status: "draft",
        })
        .returning({ id: contentRevisionsTable.id });

      await tx
        .update(contentNodesTable)
        .set({
          currentRevisionId: revision.id,
          updatedAt: new Date(),
        })
        .where(eq(contentNodesTable.id, node.id));

      await tx.insert(contentRevisionEventsTable).values({
        revisionId: revision.id,
        eventType: "created",
      });
    }

    return node.id;
  });

  return nodeId;
}

async function generateDisplayCode(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  templateType: string,
  parentNodeId: string | null,
): Promise<string> {
  const prefixMap: Record<string, string> = {
    core_process_overview: "KP",
    process_page_text: "PRZ",
    use_case: "UC",
  };
  const prefix = prefixMap[templateType] || "XX";

  if (parentNodeId) {
    const parentNode = await tx
      .select({ displayCode: contentNodesTable.displayCode })
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, parentNodeId))
      .limit(1);

    const parentCode = parentNode[0]?.displayCode ?? "";

    const siblings = await tx
      .select({ displayCode: contentNodesTable.displayCode })
      .from(contentNodesTable)
      .where(
        and(
          eq(contentNodesTable.parentNodeId, parentNodeId),
          eq(contentNodesTable.isDeleted, false),
        ),
      );

    const nextNum = siblings.length + 1;
    return `${parentCode}.${prefix}-${String(nextNum).padStart(3, "0")}`;
  }

  const topLevel = await tx
    .select({ id: contentNodesTable.id })
    .from(contentNodesTable)
    .where(
      and(
        sql`${contentNodesTable.parentNodeId} IS NULL`,
        eq(contentNodesTable.isDeleted, false),
        eq(contentNodesTable.templateType, templateType as any),
      ),
    );

  const nextNum = topLevel.length + 1;
  return `${prefix}-${String(nextNum).padStart(3, "0")}`;
}

async function importTab(tabName: string, sheet: XLSX.WorkSheet): Promise<{ created: number; skipped: number }> {
  const rows = parseTab(tabName, sheet);
  const tabShort = getTabShortName(tabName);

  console.log(`\n  Tab "${tabName}" — ${rows.length} rows parsed`);

  let created = 0;
  let skipped = 0;

  const parentStack: { level: number; nodeId: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const templateType = getTemplateType(row.level);
    const title = buildTitle(tabShort, row.level, row.bezeichnung);

    while (
      parentStack.length > 0 &&
      parentStack[parentStack.length - 1].level >= row.level
    ) {
      parentStack.pop();
    }

    const parentNodeId =
      parentStack.length > 0
        ? parentStack[parentStack.length - 1].nodeId
        : null;

    const existingId = await findExistingNodeByTitle(
      title,
      templateType,
      parentNodeId,
    );

    if (existingId) {
      parentStack.push({ level: row.level, nodeId: existingId });
      skipped++;
      continue;
    }

    const content = buildRevisionContent(row);
    const nodeId = await createNodeWithRevision(title, templateType, parentNodeId, i + 1, content);

    parentStack.push({ level: row.level, nodeId });
    created++;

    console.log(
      `    CREATE [${templateType}]: "${title}"${parentNodeId ? " (child)" : ""}`,
    );
  }

  return { created, skipped };
}

async function main() {
  console.log("=== Kernprozess-Struktur Import ===");
  console.log(`Reading: ${EXCEL_PATH}\n`);

  const workbook = XLSX.readFile(EXCEL_PATH);
  const availableTabs = workbook.SheetNames;

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const tabName of RELEVANT_TABS) {
    let matchedTab = availableTabs.find((t) => t === tabName);
    if (!matchedTab) {
      matchedTab = availableTabs.find(
        (t) => t.startsWith(tabName) && !RELEVANT_TABS.includes(t),
      );
    }

    if (!matchedTab) {
      console.warn(`  WARNING: Tab "${tabName}" not found, skipping`);
      continue;
    }

    const sheet = workbook.Sheets[matchedTab];
    const { created, skipped } = await importTab(tabName, sheet);

    totalCreated += created;
    totalSkipped += skipped;

    console.log(
      `  → ${tabName}: ${created} created, ${skipped} skipped`,
    );
  }

  console.log("\n=== Import Summary ===");
  console.log(`Total pages created: ${totalCreated}`);
  console.log(`Total pages skipped: ${totalSkipped}`);
  console.log(`Total processed: ${totalCreated + totalSkipped}`);
}

main()
  .then(() => {
    console.log("\nImport complete.");
    return pool.end();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Import failed:", err);
    pool.end().then(() => process.exit(1));
  });
