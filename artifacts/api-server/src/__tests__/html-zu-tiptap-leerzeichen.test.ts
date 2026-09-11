/**
 * Laufzeitbeweis: Inline-Auszeichnungen, Leerraum und Zeilenumbrüche kommen
 * so an, wie das HTML sie meint.
 *
 * Gefunden am 11.09.2026 im Audit des Markensystem-Imports:
 *   - Aus `**Inhaltliche Grundlage:** [Q00 …](…)` wurde »Inhaltliche
 *     Grundlage:Q00« — `flushBuffer` verwarf Puffer aus reinem Leerraum auch
 *     zwischen zwei Auszeichnungen.
 *   - In 37 Beispieltexten galt `<br>` als `<b>`: Der Umbruch nach der fetten
 *     Überschrift fehlte, und der Text bis zum nächsten `</strong>` wurde fett.
 */
import { describe, it, expect } from "vitest";
import { htmlToTiptapJson, type TiptapNode } from "@workspace/shared/rich-text";

function ersterAbsatz(html: string): TiptapNode[] {
  const [absatz] = htmlToTiptapJson(html).content;
  return absatz?.content ?? [];
}

function textDesErstenAbsatzes(html: string): string {
  return ersterAbsatz(html)
    .map((n) => (n.type === "hardBreak" ? "⏎" : (n.text ?? "")))
    .join("");
}

describe("htmlToTiptapJson – Leerraum zwischen Inline-Auszeichnungen", () => {
  it("behält das Leerzeichen zwischen Fettdruck und Link", () => {
    expect(
      textDesErstenAbsatzes(
        '<p><strong>Inhaltliche Grundlage:</strong> <a href="/a">Q00</a>; <a href="/b">Q01</a>.</p>',
      ),
    ).toBe("Inhaltliche Grundlage: Q00; Q01.");
  });

  it("behält das Leerzeichen zwischen zwei Auszeichnungen", () => {
    expect(
      textDesErstenAbsatzes('<p><a href="/a">eins</a> <em>zwei</em></p>'),
    ).toBe("eins zwei");
  });

  it("erzeugt am Anfang und Ende eines Absatzes keinen Leerraum", () => {
    expect(ersterAbsatz("<p>\n<strong>Satz</strong>\n</p>")).toEqual([
      { type: "text", text: "Satz", marks: [{ type: "bold" }] },
    ]);
  });
});

describe("htmlToTiptapJson – Zeilenumbrüche und Elementgrenzen", () => {
  it("hält <br> nicht für <b>: Umbruch bleibt, nur die Überschrift ist fett", () => {
    // So rendert markdown-it `> **Kopf**␣␣\n> Text der Zeile\n> **Aufruf**`.
    expect(
      ersterAbsatz(
        "<p><strong>Kopf</strong><br>\nText der Zeile\n<strong>Aufruf</strong></p>",
      ),
    ).toEqual([
      { type: "text", text: "Kopf", marks: [{ type: "bold" }] },
      { type: "hardBreak" },
      { type: "text", text: "Text der Zeile " },
      { type: "text", text: "Aufruf", marks: [{ type: "bold" }] },
    ]);
  });

  it("fasst einen weichen Zeilenumbruch im Text zu einem Leerzeichen zusammen", () => {
    expect(textDesErstenAbsatzes("<p>eins\nzwei</p>")).toBe("eins zwei");
  });

  it("verliert keinen Text in verschachtelten oder unbekannten Elementen", () => {
    expect(
      textDesErstenAbsatzes(
        '<p><strong><a href="/x">Ziel</a></strong> und <span class="x">mitte</span> nach</p>',
      ),
    ).toBe("Ziel und mitte nach");
  });
});
