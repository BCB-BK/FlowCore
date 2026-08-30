import { describe, it, expect } from "vitest";
import { svgLaenge, viewBoxAusMassen } from "./svg-viewbox";

describe("svgLaenge", () => {
  it("liest blanke Zahlen", () => {
    expect(svgLaenge("1600")).toBe(1600);
  });

  it("liest Zahlen mit Einheit", () => {
    expect(svgLaenge("1600px")).toBe(1600);
    expect(svgLaenge(" 423.3mm ")).toBe(423.3);
    expect(svgLaenge("72pt")).toBe(72);
  });

  it("weist Prozentangaben ab — sie sagen nichts über das Seitenverhältnis", () => {
    expect(svgLaenge("100%")).toBeNull();
  });

  it("weist Fehlendes und Unsinniges ab", () => {
    expect(svgLaenge(null)).toBeNull();
    expect(svgLaenge(undefined)).toBeNull();
    expect(svgLaenge("")).toBeNull();
    expect(svgLaenge("auto")).toBeNull();
    expect(svgLaenge("0")).toBeNull();
    expect(svgLaenge("-100")).toBeNull();
  });
});

describe("viewBoxAusMassen", () => {
  it("baut die viewBox aus Pixelmaßen (der gemeldete Miro-Fall)", () => {
    expect(viewBoxAusMassen("1600px", "900px")).toBe("0 0 1600 900");
  });

  it("kommt mit blanken Zahlen und mit Millimetern zurecht", () => {
    expect(viewBoxAusMassen("1600", "900")).toBe("0 0 1600 900");
    expect(viewBoxAusMassen("297mm", "210mm")).toBe("0 0 297 210");
  });

  it("liefert null, wenn ein Maß fehlt — dann bleibt die Grafik unverändert", () => {
    expect(viewBoxAusMassen("1600px", null)).toBeNull();
    expect(viewBoxAusMassen(null, "900px")).toBeNull();
    expect(viewBoxAusMassen("100%", "100%")).toBeNull();
  });
});
