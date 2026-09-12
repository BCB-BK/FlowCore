/**
 * Laufzeitbeweis für T-01 (Reaudit FC-RA-20260911): Seitenlinks in Tabellen
 * behalten ihre Ziel-UUID. Vorher lief über Tabellenzellen nur ein
 * Klartextpfad — aus 171 nativen Verweisen in 20 Dateien wurde die bloße
 * Beschriftung, und 58 Zielbeziehungen verschwanden ganz aus dem Abzug.
 */
import { describe, it, expect } from "vitest";
import { serializeProseMirrorContent } from "../lib/prosemirror-serializer";
import { buildPageFullText } from "../lib/page-full-text";

const ZIEL = "4f26bec2-1be4-4bc1-bf58-97bebd9c16bc";
const ZIEL2 = "a37f7676-d3e0-4fbc-8197-90e14e9db0ae";

const zelle = (inhalt: unknown[]) => ({
  type: "tableCell",
  content: [{ type: "paragraph", content: inhalt }],
});
const kopf = (text: string) => ({
  type: "tableHeader",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});
const wiki = (nodeId: string, title: string) => ({
  type: "wikiLink",
  attrs: { nodeId, title, displayCode: null },
});

const doc = {
  type: "doc",
  content: [
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [kopf("Feld"), kopf("Verbindliche Zuordnung")],
        },
        {
          type: "tableRow",
          content: [
            zelle([{ type: "text", text: "Sprachquelle" }]),
            zelle([
              wiki(ZIEL, "Gemeinsamer B2B-Kommunikationsstandard"),
              { type: "text", text: ", inhaltlich freigegebene Revision" },
            ]),
          ],
        },
        {
          type: "tableRow",
          content: [
            zelle([{ type: "text", text: "Rolle | Kanal" }]),
            zelle([
              wiki(ZIEL2, "Gemeinsame B2B-Zielgruppenprofile"),
              { type: "hardBreak" },
              { type: "text", text: "zweite Zeile" },
            ]),
          ],
        },
      ],
    },
    {
      type: "paragraph",
      content: [wiki(ZIEL, "Gemeinsamer B2B-Kommunikationsstandard")],
    },
  ],
};

describe("Tabellenzellen (T-01)", () => {
  const r = serializeProseMirrorContent(
    doc as unknown as Record<string, unknown>,
  );
  const zeilen = r.markdown.split("\n");

  it("hält den Seitenlink mit Ziel-UUID in der Zelle", () => {
    expect(zeilen[2]).toContain(
      `[Gemeinsamer B2B-Kommunikationsstandard](/node/${ZIEL})`,
    );
    expect(zeilen[2]).toContain(", inhaltlich freigegebene Revision");
  });

  it("verändert die Spaltenzahl nicht: Pipe maskiert, Umbruch als <br>", () => {
    const spalten = (z: string) => z.split(/(?<!\\)\|/).length - 2; // führende und schließende Pipe
    const tabellenzeilen = zeilen.filter((z) => z.startsWith("|"));
    expect(tabellenzeilen).toHaveLength(4); // Kopf, Trenner, zwei Zeilen
    expect(tabellenzeilen.every((z) => spalten(z) === 2)).toBe(true);
    expect(zeilen[3]).toContain("Rolle \\| Kanal");
    expect(zeilen[3]).toContain("<br>zweite Zeile");
  });

  it("erfasst jedes Vorkommen mit Fundstelle", () => {
    expect(r.linkOccurrences).toHaveLength(3);
    expect(r.linkOccurrences[0]).toMatchObject({
      targetNodeId: ZIEL,
      kind: "wikiLink",
      inTable: true,
      table: 1,
      row: 2,
      column: 2,
    });
    expect(r.linkOccurrences[2]).toMatchObject({
      inTable: false,
      table: null,
      row: null,
    });
    expect(r.linkedNodeIds).toEqual([ZIEL, ZIEL2]);
  });

  it("lässt den Klartext unverändert (Zelltexte, Reihenfolge)", () => {
    expect(r.plaintext).toContain(
      "Sprachquelle | Gemeinsamer B2B-Kommunikationsstandard, inhaltlich freigegebene Revision",
    );
    expect(r.plaintext).not.toContain("/node/");
  });
});

describe("Verweisvorkommen im Volltext", () => {
  it("nennt das Feld, in dem der Verweis steht — auch aus HTML-Abschnitten", () => {
    const volltext = buildPageFullText(
      "policy",
      {
        purpose: `<p>Siehe <a href="/node/${ZIEL}">Kommunikationsstandard</a></p>`,
        _editorContent: doc,
      },
      doc as unknown as Record<string, unknown>,
    );
    const felder = volltext.links.map((v) => v.section);
    expect(felder).toContain("purpose");
    expect(felder.filter((f) => f === "_editorContent")).toHaveLength(3);
    const ausHtml = volltext.links.find((v) => v.section === "purpose");
    expect(ausHtml).toMatchObject({ targetNodeId: ZIEL, kind: "href" });
    expect(volltext.markdown).toContain(`](/node/${ZIEL})`);
  });
});
