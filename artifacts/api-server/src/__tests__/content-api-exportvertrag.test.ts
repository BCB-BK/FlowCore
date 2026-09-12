/**
 * Laufzeitbeweis für den Exportvertrag (Reaudit FC-RA-20260911, T-02/T-03/T-04):
 * fachliche Metadaten, Registerordnung, Statusherkunft und portable Links.
 * Statuswerte werden dabei nicht erfunden — fehlt ein Feld, sagt die Antwort das.
 */
import { describe, it, expect } from "vitest";
import {
  EXPORTVERTRAG,
  absoluteLinksImMarkdown,
  absoluteUrl,
  fachlicheMetadaten,
  governanceAngaben,
  sortiereKindseiten,
} from "../lib/content-api-contract";
import { formatiereSeite } from "../lib/content-api-page-format";
import type { CopilotPageProjection } from "../services/copilot-content-projection.service";

const BASIS = "https://flowcore.onecampusgroup.de";

describe("fachliche Metadaten (T-02)", () => {
  it("liefert Marke, Markenebene, Herkunftsfassung und Prüfzyklus aus dem Speicher", () => {
    expect(
      fachlicheMetadaten({
        brand_name: "EHiP academy",
        brand_level: "submarke",
        quellfassung: "1.0 / 09.09.2026",
        review_cycle_months: 3,
        source_of_truth: "FlowCore",
        owner_display: "Tobias Wenninger",
      }),
    ).toEqual({
      brandName: "EHiP academy",
      brandLevel: "submarke",
      sourceVersion: "1.0 / 09.09.2026",
      reviewCycleMonths: 3,
      sourceOfTruth: "FlowCore",
      ownerDisplay: "Tobias Wenninger",
    });
  });

  it("macht fehlende Werte als null kenntlich, statt sie zu raten", () => {
    const m = fachlicheMetadaten({ review_cycle_months: 12 });
    expect(m).toMatchObject({
      brandName: null,
      brandLevel: null,
      sourceVersion: null,
    });
    expect(m.reviewCycleMonths).toBe(12);
  });
});

describe("Statussemantik (T-04)", () => {
  it("weist Standardwerte als Standardwerte aus", () => {
    const g = governanceAngaben({}, "policy");
    expect(g.decisionStatus.wert).toBe("proposed");
    expect(g.decisionStatus.herkunft).toMatch(/standardwert/);
    expect(g.authorityLevel.wert).toBeNull();
    expect(g.authorityLevel.herkunft).toBe("nicht gepflegt");
    expect(g.sourcePriority.wert).toBe(1);
    expect(g.sourcePriority.herkunft).toMatch(/standardwert/);
    expect(g.publicationStatus.wert).toBe("published");
  });

  it("nennt das Speicherfeld, sobald ein Wert gepflegt ist", () => {
    const g = governanceAngaben(
      {
        decision_status: "decided",
        authority_level: "binding",
        source_priority: 2,
      },
      "policy",
    );
    expect(g.decisionStatus).toMatchObject({
      wert: "decided",
      herkunft: "structuredFields.decision_status",
    });
    expect(g.authorityLevel).toMatchObject({
      wert: "binding",
      herkunft: "structuredFields.authority_level",
    });
    expect(g.sourcePriority.wert).toBe(2);
  });

  it("unterscheidet Register von Inhaltsseiten", () => {
    expect(governanceAngaben({}, "doc_registry").contentRole.wert).toBe(
      "navigation",
    );
    expect(governanceAngaben({}, "brand_profile").contentRole.wert).toBe(
      "content",
    );
  });
});

describe("Registerordnung und Links (T-03)", () => {
  it("sortiert Kindseiten nach sortOrder, dann Titel, dann ID", () => {
    const kinder = [
      { id: "c", title: "Bildsprache", sortOrder: 2 },
      { id: "a", title: "Markenprofil", sortOrder: 0 },
      { id: "b", title: "Zielgruppen", sortOrder: 1 },
      { id: "d", title: "Anhang", sortOrder: 2 },
    ];
    expect(sortiereKindseiten(kinder).map((k) => k.id)).toEqual([
      "a",
      "b",
      "d",
      "c",
    ]);
  });

  it("löst wurzelrelative Links gegen die Basis auf", () => {
    expect(absoluteUrl("/node/x", BASIS)).toBe(`${BASIS}/node/x`);
    expect(absoluteUrl("https://extern.example/x", BASIS)).toBe(
      "https://extern.example/x",
    );
    expect(
      absoluteLinksImMarkdown(
        "| [T](/node/abc) | [D](/api/media/files/x.zip) |",
        BASIS,
      ),
    ).toBe(`| [T](${BASIS}/node/abc) | [D](${BASIS}/api/media/files/x.zip) |`);
  });
});

const seite = {
  itemType: "flowcore_page",
  nodeId: "6bc27150-8590-4200-ac25-b22821481bfb",
  displayCode: "KP-017.REG-002.REG-001.RL-001",
  title: "System und Geltung",
  pageType: "policy",
  version: "3.0",
  revision: 3,
  summary: "Zweck …",
  contentText: "ZWECK\nDieses Markensystem …",
  contentMarkdown: "# Zweck\n\n| Ziel | [Kanalhandbuch](/node/dcf285cb) |",
  shortDescription: "Zweck …",
  scopeContext: "Gruppe",
  childPageTitles: [],
  childPages: [
    {
      id: "dcf285cb",
      title: "Kanalhandbuch",
      displayCode: "RL-004",
      pageType: "policy",
      sortOrder: 3,
      shortDescription: "",
      sourceUrl: "/node/dcf285cb",
    },
  ],
  topChildPages: null,
  relations: [
    {
      targetNodeId: "105136cc",
      targetDisplayCode: null,
      targetTitle: "Qualität und Freigabe",
      relationType: "implements_policy",
      description: null,
    },
  ],
  parentNodeId: "0b1609cd",
  sortOrder: 0,
  pageMetadata: fachlicheMetadaten({
    quellfassung: "1.0 / 09.09.2026",
    review_cycle_months: 12,
  }),
  governance: governanceAngaben({}, "policy"),
  contentLinks: [
    {
      targetNodeId: "dcf285cb",
      label: "Kanalhandbuch",
      kind: "wikiLink",
      inTable: true,
      table: 1,
      row: 1,
      column: 2,
      section: "_editorContent",
    },
  ],
  contentHash: "abc",
  structuredFields: {
    _editorContent: { type: "doc", content: [] },
    purpose: "<p>Zweck …</p>",
    references:
      '[{"type":"upload","title":"Archiv","url":"/api/media/files/x.zip"}]',
    media: [
      {
        kind: "file",
        assetId: "m1",
        title: "Archiv",
        url: "/api/media/files/x.zip",
      },
    ],
  },
} as unknown as CopilotPageProjection;

describe("Seitenantwort", () => {
  it("nennt den Vertrag und die Linkbasis", () => {
    const f = formatiereSeite(seite, "markdown", BASIS);
    expect(f.contract).toEqual(EXPORTVERTRAG);
    expect(f.linkBase).toBe(BASIS);
  });

  it("liefert Struktur, Metadaten, Beziehungstyp und Verweisvorkommen", () => {
    const f = formatiereSeite(seite, "markdown", BASIS) as Record<
      string,
      unknown
    >;
    expect(f.parentNodeId).toBe("0b1609cd");
    expect(f.sortOrder).toBe(0);
    expect((f.pageMetadata as Record<string, unknown>).sourceVersion).toBe(
      "1.0 / 09.09.2026",
    );
    expect((f.relations as { relationType: string }[])[0].relationType).toBe(
      "implements_policy",
    );
    const links = f.contentLinks as { url: string; table: number }[];
    expect(links[0]).toMatchObject({ url: `${BASIS}/node/dcf285cb`, table: 1 });
  });

  it("gibt alle Links absolut aus — Inhalt, Medien, Verweisliste, Unterseiten", () => {
    const f = formatiereSeite(seite, "markdown", BASIS) as Record<
      string,
      unknown
    >;
    expect(f.contentMarkdown).toBe(
      `# Zweck\n\n| Ziel | [Kanalhandbuch](${BASIS}/node/dcf285cb) |`,
    );
    expect((f.media as { url: string }[])[0].url).toBe(
      `${BASIS}/api/media/files/x.zip`,
    );
    expect(
      (f.structuredData as Record<string, { url: string }[]>).references[0].url,
    ).toBe(`${BASIS}/api/media/files/x.zip`);
    expect((f.childPages as { sourceUrl: string }[])[0].sourceUrl).toBe(
      `${BASIS}/node/dcf285cb`,
    );
  });

  it("behält die Speicherwerte in format=full und liefert dort ebenfalls absolute Links", () => {
    const f = formatiereSeite(seite, "full", BASIS) as Record<string, unknown>;
    expect(f).toHaveProperty("structuredFields");
    expect(
      (f.structuredFields as Record<string, unknown>)._editorContent,
    ).toBeUndefined();
    expect((f.structuredFields as Record<string, string>).purpose).toBe(
      "<p>Zweck …</p>",
    );
    expect(f.contentMarkdown).toContain(`${BASIS}/node/dcf285cb`);
  });
});
