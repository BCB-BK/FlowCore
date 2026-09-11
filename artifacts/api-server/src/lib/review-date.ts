/**
 * Nächste Prüfung einer Revision, berechnet beim Veröffentlichen.
 *
 * WARUM: `review_cycle_months` ist ein Pflichtfeld, wurde aber nirgends
 * ausgewertet. Erinnerungen (`review-cycle.service.ts`) und das
 * Qualitätsdashboard lesen `content_revisions.next_review_date` — diese Spalte
 * setzte beim Veröffentlichen niemand. Eine Prüfregel wie die quartalsweise
 * Systemprüfung des Markensystems löste deshalb nie etwas aus
 * (Audit FC-MSA-20260911, Befund F06).
 *
 * REGEL: Gültig-ab-Datum plus Prüfzyklus in Monaten. Nur wenn kein Zyklus
 * gepflegt ist, gilt ein ausdrücklich gesetztes `next_review_date`. Der Zyklus
 * hat Vorrang, weil ein aus der Vorversion übernommenes Datum sonst bei jeder
 * neuen Veröffentlichung veralten würde.
 */
export function berechneNaechstePruefung(
  metadaten: unknown,
  gueltigAb: Date,
): Date | null {
  if (!metadaten || typeof metadaten !== "object") return null;
  const m = metadaten as Record<string, unknown>;

  const zyklus =
    typeof m.review_cycle_months === "number"
      ? m.review_cycle_months
      : Number.parseInt(String(m.review_cycle_months ?? ""), 10);
  if (Number.isInteger(zyklus) && zyklus > 0) {
    const tag = gueltigAb.getUTCDate();
    const ziel = new Date(
      Date.UTC(gueltigAb.getUTCFullYear(), gueltigAb.getUTCMonth() + zyklus, 1),
    );
    const letzterTag = new Date(
      Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, 0),
    ).getUTCDate();
    ziel.setUTCDate(Math.min(tag, letzterTag));
    return ziel;
  }

  const fest = m.next_review_date;
  if (typeof fest === "string" && /^\d{4}-\d{2}-\d{2}/.test(fest)) {
    const datum = new Date(fest.length === 10 ? `${fest}T00:00:00Z` : fest);
    if (!Number.isNaN(datum.getTime())) return datum;
  }
  return null;
}
