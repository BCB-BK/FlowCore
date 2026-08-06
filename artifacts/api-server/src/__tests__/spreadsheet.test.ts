/**
 * Tests des Tabellen-Helfers (Audit-Befund A2).
 *
 * Der Import-Endpunkt verarbeitet vom Benutzer hochgeladene Dateien. Nach dem
 * Wechsel von `xlsx` auf `exceljs` muss belegt sein, dass Zellwerte in allen
 * Ausprägungen, die Excel liefert, korrekt und ohne Objektdurchreichung
 * ankommen.
 */
import { describe, it, expect } from "vitest";
import {
  cellToString,
  readFirstSheetAsObjects,
  writeSheetFromObjects,
} from "../lib/spreadsheet";

describe("cellToString", () => {
  it("gibt Strings unverändert zurück", () => {
    expect(cellToString("Kernprozess")).toBe("Kernprozess");
  });

  it("wandelt Zahlen und Wahrheitswerte", () => {
    expect(cellToString(42)).toBe("42");
    expect(cellToString(0)).toBe("0");
    expect(cellToString(true)).toBe("true");
  });

  it("behandelt leere Werte als leeren String", () => {
    expect(cellToString(null)).toBe("");
    expect(cellToString(undefined)).toBe("");
  });

  it("nimmt bei Formelzellen das Ergebnis, nicht die Formel", () => {
    expect(cellToString({ formula: "A1+A2", result: 42 })).toBe("42");
  });

  it("nimmt bei Hyperlink-Zellen den Anzeigetext", () => {
    expect(
      cellToString({ text: "Zur Seite", hyperlink: "https://example.org" }),
    ).toBe("Zur Seite");
  });

  it("fügt Rich-Text-Fragmente zusammen", () => {
    expect(
      cellToString({ richText: [{ text: "Teil A " }, { text: "Teil B" }] }),
    ).toBe("Teil A Teil B");
  });

  it("liefert bei Fehlerzellen einen leeren String statt eines Objekts", () => {
    expect(cellToString({ error: "#REF!" })).toBe("");
  });

  it("gibt niemals ein Objekt zurück", () => {
    for (const wert of [{}, { seltsam: 1 }, [], Symbol("x")]) {
      expect(typeof cellToString(wert as unknown)).toBe("string");
    }
  });
});

describe("Rundlauf schreiben und lesen", () => {
  it("erhält Werte, Umlaute und Sonderzeichen", async () => {
    const zeilen = [
      {
        term: "Kernprozess",
        definition: "Ein zentraler Ablauf",
        synonyms: "Hauptprozess; Leitprozess",
        abbreviation: "KP",
      },
      {
        term: "Sonderzeichen äöüß",
        definition: "Zeichen: <>&\"'",
        synonyms: "",
        abbreviation: "",
      },
    ];
    const kopf = ["term", "definition", "synonyms", "abbreviation"];

    const puffer = await writeSheetFromObjects(zeilen, kopf, "Glossar");
    expect(puffer.length).toBeGreaterThan(0);

    const zurueck = await readFirstSheetAsObjects(puffer);
    expect(zurueck).toHaveLength(2);
    expect(zurueck[0]).toMatchObject(zeilen[0]);
    expect(zurueck[1]?.term).toBe("Sonderzeichen äöüß");
    expect(zurueck[1]?.definition).toBe("Zeichen: <>&\"'");
    expect(zurueck[1]?.abbreviation).toBe("");
  });

  it("überspringt vollständig leere Zeilen", async () => {
    const puffer = await writeSheetFromObjects(
      [
        { a: "eins", b: "x" },
        { a: "", b: "" },
        { a: "zwei", b: "y" },
      ],
      ["a", "b"],
      "Blatt",
    );
    const zurueck = await readFirstSheetAsObjects(puffer);
    expect(zurueck.map((z) => z.a)).toEqual(["eins", "zwei"]);
  });

  it("wirft bei einer unlesbaren Datei, statt stillschweigend leer zu liefern", async () => {
    await expect(
      readFirstSheetAsObjects(Buffer.from("das ist kein xlsx")),
    ).rejects.toThrow();
  });
});
