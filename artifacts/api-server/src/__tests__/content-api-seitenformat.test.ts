/**
 * Laufzeitbeweis: Die Seitenantwort der Content-API liefert den Inhalt nur noch
 * einmal und ohne Editor-JSON — ohne dabei Daten zu verlieren, die nicht im
 * Volltext stehen (gemeldet am 11.09.2026: zu große Antworten im Abgleich).
 */
import { describe, it, expect } from "vitest";
import {
  formatiereSeite,
  parseSeitenformat,
} from "../lib/content-api-page-format";
import type { CopilotPageProjection } from "../services/copilot-content-projection.service";

const grosserEditor = {
  type: "doc",
  content: Array.from({ length: 200 }, (_, i) => ({
    type: "paragraph",
    content: [{ type: "text", text: `Absatz ${i}` }],
  })),
};

const seite = {
  itemType: "flowcore_page",
  nodeId: "6bc27150-8590-4200-ac25-b22821481bfb",
  displayCode: "KP-017.REG-002.REG-003.RL-001",
  title: "System und Geltung",
  pageType: "policy",
  version: "2.0",
  revision: 2,
  summary: "Zweck …",
  contentText: "ZWECK\nDieses Markensystem …",
  contentMarkdown: "# Zweck\n\nDieses Markensystem …",
  shortDescription: "Zweck …",
  scopeContext: "Gruppe, alle Marken und alle Kanäle",
  childPageTitles: [],
  relations: [
    {
      targetNodeId: "a",
      targetDisplayCode: null,
      targetTitle: "Kanalhandbuch",
      relationType: "inline_wiki_link",
      description: null,
    },
  ],
  contentHash: "abc",
  structuredFields: {
    _editorContent: grosserEditor,
    purpose: "<p>Dieses Markensystem verbindet …</p>",
    scope: "Gruppe, alle Marken und alle Kanäle",
    references:
      '[{"type":"upload","title":"Externes Herkunftsarchiv","url":"/api/media/files/x.zip"}]',
    raci: { rows: [{ activity: "Freigabe", responsible: "Markenführung" }] },
    confidentiality: "internal",
    media: [
      {
        kind: "file",
        assetId: "m1",
        title: "Archiv",
        description: "",
        altText: "",
        url: "/api/media/files/x.zip",
      },
    ],
  },
} as unknown as CopilotPageProjection;

describe("parseSeitenformat", () => {
  it("nimmt markdown als Standard und erkennt die drei Formate", () => {
    expect(parseSeitenformat(undefined)).toBe("markdown");
    expect(parseSeitenformat("TEXT")).toBe("text");
    expect(parseSeitenformat(" full ")).toBe("full");
  });
  it("lehnt unbekannte und mehrfache Werte ab", () => {
    expect(parseSeitenformat("xml")).toBeNull();
    expect(parseSeitenformat(["markdown", "text"])).toBeNull();
  });
});

describe("formatiereSeite", () => {
  it("markdown: Inhalt nur einmal, kein Editor-JSON, keine HTML-Felder", () => {
    const f = formatiereSeite(seite, "markdown");
    expect(f.contentMarkdown).toBe(seite.contentMarkdown);
    expect(f).not.toHaveProperty("contentText");
    expect(f).not.toHaveProperty("structuredFields");
    expect(f).not.toHaveProperty("scopeContext");
    expect(JSON.stringify(f)).not.toContain("Absatz 199");
    expect(f.format).toBe("markdown");
  });

  it("markdown: behält Daten, die nicht im Volltext stehen, und die Medienliste", () => {
    const f = formatiereSeite(seite, "markdown") as {
      structuredData: Record<string, unknown>;
      media: unknown[];
      relations: unknown[];
    };
    expect(f.structuredData.references).toEqual([
      {
        type: "upload",
        title: "Externes Herkunftsarchiv",
        url: "/api/media/files/x.zip",
      },
    ]);
    expect(f.structuredData.raci).toEqual({
      rows: [{ activity: "Freigabe", responsible: "Markenführung" }],
    });
    expect(f.structuredData).not.toHaveProperty("purpose");
    expect(f.structuredData).not.toHaveProperty("confidentiality");
    expect(f.media).toHaveLength(1);
    expect(f.relations).toHaveLength(1);
  });

  it("text: Klartext statt Markdown", () => {
    const f = formatiereSeite(seite, "text");
    expect(f.contentText).toBe(seite.contentText);
    expect(f).not.toHaveProperty("contentMarkdown");
  });

  it("full: alle Felder, aber ohne Editor-JSON", () => {
    const f = formatiereSeite(seite, "full") as {
      structuredFields: Record<string, unknown>;
    };
    expect(f.structuredFields).not.toHaveProperty("_editorContent");
    expect(f.structuredFields.purpose).toBe(
      "<p>Dieses Markensystem verbindet …</p>",
    );
    expect(f).toHaveProperty("contentText");
    expect(f).toHaveProperty("contentMarkdown");
  });

  it("wird deutlich kleiner als die bisherige Antwort", () => {
    const vorher = JSON.stringify(seite).length;
    expect(
      JSON.stringify(formatiereSeite(seite, "markdown")).length,
    ).toBeLessThan(vorher / 3);
  });
});
