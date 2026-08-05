/**
 * Tabellenlesen für die Import-Skripte.
 *
 * Ersetzt `xlsx` (SheetJS), das auf npm nicht mehr gepflegt wird und zwei
 * offene Advisories ohne Fixpfad trägt — Audit-Befund A2. Die Skripte lesen
 * Dateien aus dem Dateisystem, nicht aus Benutzer-Uploads, sind also weniger
 * exponiert; das Paket soll aber vollständig aus dem Abhängigkeitsbaum
 * verschwinden.
 *
 * Liefert bewusst dieselbe Form wie früher `sheet_to_json(sheet, {header: 1})`:
 * ein Array von Zeilen, jede Zeile ein Array von Zellwerten als String.
 */
import ExcelJS from "exceljs";

/** Zellwert auf einen einfachen String reduzieren (Formeln, Rich Text, Links). */
function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("result" in v) return cellToString(v["result"]);
    if ("text" in v && typeof v["text"] === "string")
      return v["text"] as string;
    if (Array.isArray(v["richText"])) {
      return (v["richText"] as Array<{ text?: string }>)
        .map((f) => f.text ?? "")
        .join("");
    }
    if ("error" in v) return "";
  }
  return "";
}

export interface Arbeitsmappe {
  /** Namen aller Tabellenblätter, in Dateireihenfolge. */
  sheetNames: string[];
  /** Zeilen eines Blattes als String-Matrix; leeres Array, wenn unbekannt. */
  rows(sheetName: string): string[][];
}

export async function readWorkbook(pfad: string): Promise<Arbeitsmappe> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(pfad);

  const blaetter = new Map<string, string[][]>();
  const namen: string[] = [];

  for (const sheet of workbook.worksheets) {
    namen.push(sheet.name);
    const zeilen: string[][] = [];
    const spalten = sheet.columnCount;
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const werte: string[] = [];
      for (let col = 1; col <= spalten; col++) {
        werte.push(cellToString(row.getCell(col).value));
      }
      zeilen.push(werte);
    });
    blaetter.set(sheet.name, zeilen);
  }

  return {
    sheetNames: namen,
    rows: (name: string) => blaetter.get(name) ?? [],
  };
}
