/**
 * Tabellen-Ein- und -Ausgabe (XLSX).
 *
 * Bewusst gekapselt: Zuvor wurde `xlsx` (SheetJS) direkt in den Routen genutzt.
 * Dieses Paket wird auf npm seit Jahren nicht mehr gepflegt und trägt zwei
 * offene Advisories (Prototype Pollution, ReDoS) ohne Fixpfad über npm —
 * Audit-Befund A2. Ersetzt durch `exceljs`.
 *
 * Der Import-Endpunkt verarbeitet vom Benutzer hochgeladene Dateien; die
 * Normalisierung unten ist deshalb defensiv: ExcelJS liefert je nach Zelle
 * Strings, Zahlen, Datumswerte, Formel-Ergebnisse, Hyperlink-Objekte oder
 * Rich-Text-Fragmente. Alles wird auf einen schlichten String reduziert.
 */
import ExcelJS from "exceljs";

/** Zellwerte aus ExcelJS auf einen einfachen String normalisieren. */
export function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    // Formelzelle: { formula, result }
    if ("result" in v) return cellToString(v["result"]);
    // Hyperlink-Zelle: { text, hyperlink }
    if ("text" in v && typeof v["text"] === "string") return v["text"] as string;
    // Rich Text: { richText: [{ text }, ...] }
    if (Array.isArray(v["richText"])) {
      return (v["richText"] as Array<{ text?: string }>)
        .map((f) => f.text ?? "")
        .join("");
    }
    // Fehlerzelle: { error: '#REF!' }
    if ("error" in v) return "";
  }
  return "";
}

/**
 * Liest das erste Tabellenblatt und gibt die Zeilen als Objekte zurück,
 * mit der ersten Zeile als Spaltenüberschriften.
 *
 * Wirft, wenn die Datei nicht lesbar ist oder kein Blatt enthält — die
 * aufrufende Route übersetzt das in eine 400-Antwort.
 */
export async function readFirstSheetAsObjects(
  buffer: Buffer,
): Promise<Array<Record<string, string>>> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("Keine Tabellenblätter in der Datei");
  }

  // ExcelJS-Zeilen und -Spalten sind 1-basiert; Index 0 bleibt leer.
  const kopfzeile = sheet.getRow(1);
  const spalten: string[] = [];
  kopfzeile.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    spalten[colNumber] = cellToString(cell.value).trim();
  });

  const zeilen: Array<Record<string, string>> = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const eintrag: Record<string, string> = {};
    let hatInhalt = false;
    for (let col = 1; col < spalten.length; col++) {
      const name = spalten[col];
      if (!name) continue;
      const wert = cellToString(row.getCell(col).value);
      eintrag[name] = wert;
      if (wert.trim() !== "") hatInhalt = true;
    }
    // Vollständig leere Zeilen überspringen — Excel liefert davon reichlich.
    if (hatInhalt) zeilen.push(eintrag);
  });

  return zeilen;
}

/**
 * Liest ein benanntes Tabellenblatt als Zeilen-Array (ohne Kopfzeilen-Zuordnung).
 * Entspricht dem früheren `sheet_to_json(sheet, { header: 1 })`.
 */
export async function readSheetAsRows(
  buffer: Buffer,
  sheetName?: string,
): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheet = sheetName
    ? workbook.getWorksheet(sheetName)
    : workbook.worksheets[0];
  if (!sheet) {
    throw new Error(`Tabellenblatt nicht gefunden: ${sheetName ?? "(erstes)"}`);
  }

  const zeilen: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const werte: string[] = [];
    const anzahl = sheet.columnCount;
    for (let col = 1; col <= anzahl; col++) {
      werte.push(cellToString(row.getCell(col).value));
    }
    zeilen.push(werte);
  });
  return zeilen;
}

/**
 * Schreibt Objekte als XLSX-Datei und gibt den Puffer zurück.
 * Die Reihenfolge der Spalten folgt `header`.
 */
export async function writeSheetFromObjects(
  rows: Array<Record<string, unknown>>,
  header: string[],
  sheetName: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = header.map((h) => ({ header: h, key: h }));
  for (const row of rows) {
    sheet.addRow(header.map((h) => row[h] ?? ""));
  }

  const puffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(puffer);
}
