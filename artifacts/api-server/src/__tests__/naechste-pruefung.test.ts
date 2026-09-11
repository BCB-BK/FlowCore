/**
 * Laufzeitbeweis: Beim Veröffentlichen entsteht aus dem Prüfzyklus eine
 * nächste Prüfung, auf die Erinnerungen und Qualitätsdashboard reagieren
 * (Audit FC-MSA-20260911, AP-06: quartalsweise Systemprüfung).
 */
import { describe, it, expect } from "vitest";
import { berechneNaechstePruefung } from "../lib/review-date";

const tag = (iso: string) => new Date(`${iso}T09:00:00Z`);
const datum = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;

describe("berechneNaechstePruefung", () => {
  it("Quartal: Start 11.09.2026 → spätestens 11.12.2026", () => {
    expect(
      datum(
        berechneNaechstePruefung({ review_cycle_months: 3 }, tag("2026-09-11")),
      ),
    ).toBe("2026-12-11");
  });

  it("Jahr: 12 Monate, auch als Zeichenkette gepflegt", () => {
    expect(
      datum(
        berechneNaechstePruefung(
          { review_cycle_months: "12" },
          tag("2026-09-11"),
        ),
      ),
    ).toBe("2027-09-11");
  });

  it("Monatsende: 31.08. plus drei Monate ergibt 30.11.", () => {
    expect(
      datum(
        berechneNaechstePruefung({ review_cycle_months: 3 }, tag("2026-08-31")),
      ),
    ).toBe("2026-11-30");
  });

  it("Zyklus hat Vorrang vor einem aus der Vorversion übernommenen Datum", () => {
    expect(
      datum(
        berechneNaechstePruefung(
          { review_cycle_months: 3, next_review_date: "2026-01-01" },
          tag("2026-09-11"),
        ),
      ),
    ).toBe("2026-12-11");
  });

  it("ohne Zyklus gilt ein ausdrücklich gesetztes Datum; ohne beides keine Prüfung", () => {
    expect(
      datum(
        berechneNaechstePruefung(
          { next_review_date: "2027-01-15" },
          tag("2026-09-11"),
        ),
      ),
    ).toBe("2027-01-15");
    expect(berechneNaechstePruefung({}, tag("2026-09-11"))).toBeNull();
    expect(berechneNaechstePruefung(null, tag("2026-09-11"))).toBeNull();
  });
});
