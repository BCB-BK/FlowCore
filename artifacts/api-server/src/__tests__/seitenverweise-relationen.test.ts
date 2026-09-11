/**
 * Laufzeitbeweis: Jeder interne Seitenverweis wird als Beziehung erkannt —
 * gleich, ob er als nativer Seitenlink im Inhaltsbereich oder als HTML-Link in
 * einem Abschnittsfeld gespeichert ist.
 *
 * Gegenprobe zum Audit FC-MSA-20260911, Befund F02: Im Markenprofil der
 * Academy of Sports stand der Link auf die Zielgruppenprofile nur als
 * `<a href="/node/…">` im Feld »Primäre Zielgruppen«. Die bisherige Ermittlung
 * las nur TipTap-JSON und übersah ihn; die Beziehung fehlte.
 */
import { describe, it, expect } from "vitest";
import {
  extractAllWikiLinkTargets,
  extractHtmlLinkTargets,
  extractWikiLinkTargets,
} from "@workspace/shared/rich-text";

const AOS_PROFIL = "327984bf-d644-44ce-a0fe-be5016f0b628";
const AOS_ZIELGRUPPEN = "8f1c6be1-4063-4464-8b65-8f26caf93a72";
const B2B_STANDARD = "4f26bec2-1be4-4bc1-bf58-97bebd9c16bc";

describe("Seitenverweise – HTML-Abschnittsfelder", () => {
  it("erkennt den Link im Abschnittsfeld (Gegenprobe F02)", () => {
    const felder = {
      primary_target_groups: `<p>Siehe <a href="/node/${AOS_ZIELGRUPPEN}">Academy of Sports – Zielgruppenprofile</a>.</p>`,
    };
    expect(extractAllWikiLinkTargets(felder)).toEqual([AOS_ZIELGRUPPEN]);
  });

  it("erkennt absolute Adressen, Anker, einfache Anführungszeichen und Großschreibung", () => {
    const html =
      `<a href="https://flowcore.onecampusgroup.de/node/${B2B_STANDARD}#anrede">x</a>` +
      `<a href='/node/${AOS_ZIELGRUPPEN.toUpperCase()}'>y</a>`;
    expect(extractHtmlLinkTargets(html).sort()).toEqual(
      [AOS_ZIELGRUPPEN, B2B_STANDARD].sort(),
    );
  });

  it("ignoriert externe und nicht-interne Links", () => {
    expect(
      extractHtmlLinkTargets(
        '<a href="https://example.org/seite">a</a><a href="/media/123">b</a><a href="mailto:x@y.de">c</a>',
      ),
    ).toEqual([]);
  });
});

describe("Seitenverweise – Inhaltsbereich (TipTap)", () => {
  const doc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "wikiLink", attrs: { nodeId: AOS_ZIELGRUPPEN, title: "Z" } },
          {
            type: "text",
            text: "Standard",
            marks: [{ type: "link", attrs: { href: `/node/${B2B_STANDARD}` } }],
          },
        ],
      },
    ],
  };

  it("erkennt native Seitenlinks und interne Link-Markierungen", () => {
    expect(extractWikiLinkTargets(doc).sort()).toEqual(
      [AOS_ZIELGRUPPEN, B2B_STANDARD].sort(),
    );
  });

  it("liest TipTap-JSON auch als gespeicherten String und dedupliziert über alle Felder", () => {
    const felder = {
      _editorContent: doc,
      relations: JSON.stringify(doc),
      brand_role: `<a href="/node/${AOS_ZIELGRUPPEN}">doppelt</a>`,
      confidentiality: "internal",
    };
    expect(extractAllWikiLinkTargets(felder).sort()).toEqual(
      [AOS_ZIELGRUPPEN, B2B_STANDARD].sort(),
    );
  });

  it("erkennt Seiteneinträge unter »Mitgeltende Seiten« (Verweisliste als JSON-String)", () => {
    const felder = {
      references: JSON.stringify([
        {
          type: "node",
          title: "System und Geltung",
          url: "/node/6bc27150-8590-4200-ac25-b22821481bfb",
          nodeId: "6bc27150-8590-4200-ac25-b22821481bfb",
        },
        { type: "url", title: "Extern", url: "https://example.org" },
      ]),
    };
    expect(extractAllWikiLinkTargets(felder)).toEqual([
      "6bc27150-8590-4200-ac25-b22821481bfb",
    ]);
  });

  it("liefert den Selbstbezug mit — ausgeschlossen wird er beim Speichern", () => {
    expect(
      extractAllWikiLinkTargets({
        x: `<a href="/node/${AOS_PROFIL}">selbst</a>`,
      }),
    ).toEqual([AOS_PROFIL]);
  });
});
