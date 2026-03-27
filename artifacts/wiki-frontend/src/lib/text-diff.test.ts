import { describe, it, expect } from "vitest";
import { detectCompoundType, formatCompoundForDisplay } from "./text-diff";

describe("detectCompoundType", () => {
  it("returns null for plain strings", () => {
    expect(detectCompoundType("hello world")).toBe(null);
  });

  it("returns null for null/undefined", () => {
    expect(detectCompoundType(null)).toBe(null);
    expect(detectCompoundType(undefined)).toBe(null);
  });

  it("returns null for empty array", () => {
    expect(detectCompoundType([])).toBe(null);
  });

  it("returns null for empty object", () => {
    expect(detectCompoundType({})).toBe(null);
  });

  it("detects sipoc_cards from SipocEditor shape (string values)", () => {
    const sipoc = {
      suppliers: "Lieferant A, Lieferant B",
      inputs: "Rohmaterial",
      process: "Verarbeitung in 3 Schritten",
      outputs: "Fertigprodukt",
      customers: "Endkunde"
    };
    expect(detectCompoundType(sipoc)).toBe("sipoc_cards");
  });

  it("detects sipoc_cards from JSON string", () => {
    const sipocJson = JSON.stringify({
      suppliers: "Lieferant A",
      inputs: "",
      process: "Schritt 1",
      outputs: "",
      customers: ""
    });
    expect(detectCompoundType(sipocJson)).toBe("sipoc_cards");
  });

  it("detects sipoc_cards with partial keys", () => {
    expect(detectCompoundType({ suppliers: "Lieferant" })).toBe("sipoc_cards");
    expect(detectCompoundType({ process: "Schritt" })).toBe("sipoc_cards");
  });

  it("detects raci_matrix from RaciMatrix shape", () => {
    const raci = {
      roles: ["Manager", "Dev", "QA"],
      entries: [
        { activity: "Code Review", assignments: { Manager: "A", Dev: "R", QA: "C" } },
        { activity: "Testing", assignments: { Manager: "I", Dev: "C", QA: "R" } }
      ]
    };
    expect(detectCompoundType(raci)).toBe("raci_matrix");
  });

  it("detects raci_matrix from JSON string", () => {
    const raciJson = JSON.stringify({
      roles: ["PM"],
      entries: [{ activity: "Planung", assignments: { PM: "R" } }]
    });
    expect(detectCompoundType(raciJson)).toBe("raci_matrix");
  });

  it("detects qa_repeater from QaRepeater shape", () => {
    const qa = [
      { question: "Was ist SIPOC?", answer: "Ein Prozessmodell." },
      { question: "Wofür steht RACI?", answer: "Responsible, Accountable, Consulted, Informed" }
    ];
    expect(detectCompoundType(qa)).toBe("qa_repeater");
  });

  it("detects qa_repeater from JSON string", () => {
    const qaJson = JSON.stringify([{ question: "F1", answer: "A1" }]);
    expect(detectCompoundType(qaJson)).toBe("qa_repeater");
  });

  it("detects term_repeater from TermRepeater shape", () => {
    const terms = [
      { term: "SIPOC", definition: "Supplier-Input-Process-Output-Customer", synonyms: "Prozessübersicht" },
      { term: "RACI", definition: "Verantwortlichkeitsmatrix" }
    ];
    expect(detectCompoundType(terms)).toBe("term_repeater");
  });

  it("detects term_repeater with empty synonyms", () => {
    const terms = [{ term: "Test", definition: "Definition", synonyms: "" }];
    expect(detectCompoundType(terms)).toBe("term_repeater");
  });

  it("detects check_items from CheckItemsEditor shape", () => {
    const items = [
      { text: "Dokument geprüft", category: "Qualität", note: "siehe Anhang" },
      { text: "Freigabe erteilt" },
      { text: "Archiviert", category: "", note: "" }
    ];
    expect(detectCompoundType(items)).toBe("check_items");
  });

  it("detects check_items from JSON string", () => {
    const itemsJson = JSON.stringify([{ text: "Punkt 1" }, { text: "Punkt 2", note: "Hinweis" }]);
    expect(detectCompoundType(itemsJson)).toBe("check_items");
  });

  it("detects competency_areas from CompetencyAreas shape", () => {
    const areas = [
      { area: "Projektmanagement", tasks: "Planung, Steuerung, Kontrolle" },
      { area: "Qualitätssicherung", tasks: "Reviews durchführen, Audits begleiten" }
    ];
    expect(detectCompoundType(areas)).toBe("competency_areas");
  });

  it("detects competency_areas from JSON string", () => {
    const areasJson = JSON.stringify([{ area: "IT", tasks: "Entwicklung" }]);
    expect(detectCompoundType(areasJson)).toBe("competency_areas");
  });

  it("returns null for array of primitives", () => {
    expect(detectCompoundType([1, 2, 3])).toBe(null);
    expect(detectCompoundType(["a", "b"])).toBe(null);
  });

  it("returns null for unrelated object shape", () => {
    expect(detectCompoundType({ foo: "bar", baz: 42 })).toBe(null);
  });
});

describe("formatCompoundForDisplay", () => {
  it("formats sipoc_cards with string values (SipocEditor)", () => {
    const sipoc = {
      suppliers: "Lieferant A, Lieferant B",
      inputs: "Rohmaterial",
      process: "Verarbeitung",
      outputs: "Fertigprodukt",
      customers: "Endkunde"
    };
    const result = formatCompoundForDisplay(sipoc, "sipoc_cards");
    expect(result).toContain("S: Lieferant A, Lieferant B");
    expect(result).toContain("I: Rohmaterial");
    expect(result).toContain("P: Verarbeitung");
    expect(result).toContain("O: Fertigprodukt");
    expect(result).toContain("C: Endkunde");
  });

  it("formats sipoc_cards from JSON string", () => {
    const sipocJson = JSON.stringify({
      suppliers: "X",
      inputs: "",
      process: "Y",
      outputs: "",
      customers: ""
    });
    const result = formatCompoundForDisplay(sipocJson, "sipoc_cards");
    expect(result).toContain("S: X");
    expect(result).toContain("P: Y");
    expect(result).not.toContain("I:");
  });

  it("formats sipoc_cards with empty data as (leer)", () => {
    expect(formatCompoundForDisplay({}, "sipoc_cards")).toBe("(leer)");
  });

  it("formats raci_matrix (RaciMatrix)", () => {
    const raci = {
      roles: ["Manager", "Dev"],
      entries: [
        { activity: "Code Review", assignments: { Manager: "A", Dev: "R" } }
      ]
    };
    const result = formatCompoundForDisplay(raci, "raci_matrix");
    expect(result).toContain("Rollen: Manager, Dev");
    expect(result).toContain("Code Review: Manager=A, Dev=R");
  });

  it("formats empty raci_matrix as (leer)", () => {
    expect(formatCompoundForDisplay({ roles: [], entries: [] }, "raci_matrix")).toBe("(leer)");
  });

  it("formats qa_repeater (QaRepeater)", () => {
    const qa = [
      { question: "Was ist SIPOC?", answer: "Ein Prozessmodell." }
    ];
    const result = formatCompoundForDisplay(qa, "qa_repeater");
    expect(result).toContain("1. F: Was ist SIPOC?");
    expect(result).toContain("A: Ein Prozessmodell.");
  });

  it("formats term_repeater with string synonyms (TermRepeater)", () => {
    const terms = [
      { term: "SIPOC", definition: "Prozessübersicht", synonyms: "Lieferantenmatrix" }
    ];
    const result = formatCompoundForDisplay(terms, "term_repeater");
    expect(result).toContain("SIPOC: Prozessübersicht");
    expect(result).toContain("(Syn: Lieferantenmatrix)");
  });

  it("formats term_repeater without synonyms", () => {
    const terms = [{ term: "RACI", definition: "Matrix", synonyms: "" }];
    const result = formatCompoundForDisplay(terms, "term_repeater");
    expect(result).toBe("RACI: Matrix");
    expect(result).not.toContain("Syn:");
  });

  it("formats check_items with text/category/note (CheckItemsEditor)", () => {
    const items = [
      { text: "Dokument geprüft", category: "Qualität", note: "siehe Anhang" },
      { text: "Freigabe erteilt" }
    ];
    const result = formatCompoundForDisplay(items, "check_items");
    expect(result).toContain("1. Dokument geprüft [Qualität] – siehe Anhang");
    expect(result).toContain("2. Freigabe erteilt");
  });

  it("formats check_items from JSON string", () => {
    const json = JSON.stringify([{ text: "Punkt A", category: "", note: "" }]);
    const result = formatCompoundForDisplay(json, "check_items");
    expect(result).toContain("1. Punkt A");
    expect(result).not.toContain("[");
  });

  it("formats competency_areas with area/tasks (CompetencyAreas)", () => {
    const areas = [
      { area: "Projektmanagement", tasks: "Planung, Steuerung" },
      { area: "QA", tasks: "Reviews, Audits" }
    ];
    const result = formatCompoundForDisplay(areas, "competency_areas");
    expect(result).toContain("Projektmanagement: Planung, Steuerung");
    expect(result).toContain("QA: Reviews, Audits");
  });

  it("handles malformed JSON string gracefully", () => {
    const result = formatCompoundForDisplay("{broken", "sipoc_cards");
    expect(result).toBe("{broken");
  });

  it("handles null gracefully", () => {
    const result = formatCompoundForDisplay(null, "sipoc_cards");
    expect(typeof result).toBe("string");
  });
});
