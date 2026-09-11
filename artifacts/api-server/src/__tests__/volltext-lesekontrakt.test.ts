/**
 * Laufzeitbeweis für den Lesekontrakt (Audit FC-MSA-20260911, AP-03, Befund F03):
 * Wer eine Seite über Export, Content-API, Copilot, Graph oder KI liest, erhält
 * die beschrifteten Abschnittsfelder UND den Inhaltsbereich mit Tabellen — und
 * bei Richtlinien nie den Auszug `policy_text` als »die Richtlinie«.
 */
import { describe, it, expect } from "vitest";
import { buildPageFullText, istTextAbschnitt } from "../lib/page-full-text";
import { getContentHeading } from "@workspace/shared/page-types";

const inhalt = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Die Leistungsidentität" }],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Kompetenzfeld" }],
                },
              ],
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Wert" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Didaktisches Design" }],
                },
              ],
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Lernen passt" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("Volltext – Markenprofil", () => {
  const ergebnis = buildPageFullText(
    "brand_profile",
    {
      primary_target_groups:
        '<h3>Lernendenprofile</h3><ul><li>AOS-P1: Leidenschaft beruflich entwickeln</li></ul><p><a href="/node/8f1c6be1-4063-4464-8b65-8f26caf93a72">Academy of Sports – Zielgruppenprofile</a></p>',
      tonality: "<p>Souverän, unternehmerisch, zugewandt.</p>",
      references:
        '[{"type":"node","title":"System und Geltung","nodeId":"6bc27150-8590-4200-ac25-b22821481bfb"}]',
      confidentiality: "internal",
      _editorContent: inhalt,
    },
    inhalt,
  );

  it("führt Abschnittsfelder mit ihrer Beschriftung und in Registry-Reihenfolge", () => {
    expect(ergebnis.markdown).toContain("# Primäre Zielgruppen");
    expect(ergebnis.markdown).toContain(
      "AOS-P1: Leidenschaft beruflich entwickeln",
    );
    expect(ergebnis.markdown).toContain("# Tonalitätskern");
    expect(ergebnis.markdown.indexOf("# Primäre Zielgruppen")).toBeLessThan(
      ergebnis.markdown.indexOf("# Tonalitätskern"),
    );
  });

  it("hängt den Inhaltsbereich mit Tabellenkopf und Zeilenzuordnung an", () => {
    expect(ergebnis.markdown).toContain("# Inhalt");
    expect(ergebnis.markdown).toMatch(/\| Kompetenzfeld \| Wert \|/);
    expect(ergebnis.markdown).toMatch(
      /\| Didaktisches Design \| Lernen passt \|/,
    );
    expect(ergebnis.plaintext).toContain("Primäre Zielgruppen\n");
  });

  it("gibt Widget-JSON nicht als Fließtext aus", () => {
    expect(ergebnis.markdown).not.toContain('"nodeId"');
    expect(ergebnis.plaintext).not.toContain("internal");
  });
});

describe("Volltext – Richtlinie", () => {
  const felder = {
    purpose: "<p>Zweck der Richtlinie.</p>",
    scope: "Gruppe, alle Marken und alle Kanäle",
    policy_text:
      "<p><em>Auszug aus Kapitel „Status“ – der vollständige Richtlinientext steht im Inhaltsbereich dieser Seite.</em></p>",
  };

  it("führt Zweck und Geltungsbereich, dann den Richtlinientext aus dem Inhaltsbereich", () => {
    const e = buildPageFullText(
      "policy",
      { ...felder, _editorContent: inhalt },
      inhalt,
    );
    expect(e.markdown.indexOf("# Zweck")).toBeLessThan(
      e.markdown.indexOf("# Geltungsbereich"),
    );
    expect(e.markdown).toContain("Gruppe, alle Marken und alle Kanäle");
    expect(e.markdown).toContain(`# ${getContentHeading("policy")}`);
    expect(getContentHeading("policy")).toBe("Richtlinientext");
  });

  it("gibt den Auszug nicht zusätzlich aus, wenn der Volltext vorhanden ist", () => {
    const e = buildPageFullText(
      "policy",
      { ...felder, _editorContent: inhalt },
      inhalt,
    );
    expect(e.plaintext).not.toContain("Auszug aus Kapitel");
  });

  it("nutzt policy_text nur, wenn es keinen Inhaltsbereich gibt", () => {
    const e = buildPageFullText("policy", felder, null);
    expect(e.plaintext).toContain("Auszug aus Kapitel");
  });
});

describe("Textabschnitt oder Widget-Daten", () => {
  it("unterscheidet HTML/Klartext von gespeichertem JSON", () => {
    expect(istTextAbschnitt("<p>x</p>")).toBe(true);
    expect(istTextAbschnitt("[Hinweis] kein JSON")).toBe(true);
    expect(istTextAbschnitt('[{"type":"node"}]')).toBe(false);
    expect(istTextAbschnitt("   ")).toBe(false);
  });
});
