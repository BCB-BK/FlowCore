/**
 * Exportvertrag der Content-API: welche fachlichen Angaben eine Seite nach
 * außen trägt und woher jeder Wert stammt.
 *
 * WARUM (Reaudit FC-RA-20260911, T-02/T-03/T-04): Der Abzug enthielt zwar den
 * vollständigen Text, aber nicht die strukturierten Speicherwerte — Marke und
 * Markenebene, Herkunftsfassung, Prüfzyklus, Eltern-ID und Sortierung fehlten,
 * und die Statuswerte waren ohne Herkunft nicht deutbar. Geraten wird hier
 * nichts: Jeder Wert kommt aus einem benannten Speicherfeld, und fehlt er,
 * sagt die Antwort das ausdrücklich (`herkunft: "nicht gepflegt"`).
 */
import { AUTHORITY_LEVELS, DECISION_STATUSES } from "./agent-metadata";

export const EXPORTVERTRAG = {
  name: "flowcore.content-api.page",
  version: "2.1",
  stand: "2026-09-12",
} as const;

/** Fachliche Metadaten aus `content_revisions.content` (Metadatenblock der Seite). */
export interface FachlicheMetadaten {
  /** Markenname laut `meta.brand_name`; null, wenn die Seite keine Marke führt. */
  brandName: string | null;
  /** `dachmarke` | `einzelmarke` | `submarke` laut `meta.brand_level`. */
  brandLevel: string | null;
  /** Historische Herkunftsfassung laut `meta.quellfassung` — nicht die FlowCore-Revision. */
  sourceVersion: string | null;
  /** Wiederholungsregel der Prüfung in Monaten laut `meta.review_cycle_months`. */
  reviewCycleMonths: number | null;
  /** Führendes System laut `meta.source_of_truth`. */
  sourceOfTruth: string | null;
  /** Verantwortliche Person laut `meta.owner_display`. */
  ownerDisplay: string | null;
}

function text(wert: unknown): string | null {
  return typeof wert === "string" && wert.trim() !== "" ? wert : null;
}

export function fachlicheMetadaten(meta: unknown): FachlicheMetadaten {
  const m = (meta ?? {}) as Record<string, unknown>;
  return {
    brandName: text(m.brand_name),
    brandLevel: text(m.brand_level),
    sourceVersion: text(m.quellfassung),
    reviewCycleMonths:
      typeof m.review_cycle_months === "number" ? m.review_cycle_months : null,
    sourceOfTruth: text(m.source_of_truth),
    ownerDisplay: text(m.owner_display),
  };
}

/** Ein Wert mit seiner Quelle — ohne Herkunft ist ein Statuswert nicht deutbar. */
export interface Herkunftswert<T> {
  wert: T;
  /** Gespeichertes Feld oder `"standardwert"` / `"nicht gepflegt"`. */
  herkunft: string;
  bedeutung: string;
}

export interface GovernanceAngaben {
  /** Veröffentlichungsstand aus `content_nodes.status` + veröffentlichter Revision. */
  publicationStatus: Herkunftswert<string>;
  /** Redaktioneller Entscheidungsstand; `null`, solange nicht gepflegt. */
  decisionStatus: Herkunftswert<string | null>;
  /** Normative Verbindlichkeit; `null`, solange nicht gepflegt. */
  authorityLevel: Herkunftswert<string | null>;
  /** Quellenrang 1–5; `null`, solange nicht gepflegt. */
  sourcePriority: Herkunftswert<number | null>;
  /** Strukturelle Rolle, abgeleitet aus dem Seitentyp — kein Freigabeurteil. */
  contentRole: Herkunftswert<"navigation" | "content">;
}

const NAVIGATIONSTYPEN = new Set([
  "doc_registry",
  "area_overview",
  "core_process_overview",
]);

export function governanceAngaben(
  structuredFields: Record<string, unknown> | null | undefined,
  pageType: string,
): GovernanceAngaben {
  const sf = structuredFields ?? {};
  const decisionGepflegt =
    typeof sf.decision_status === "string" &&
    (DECISION_STATUSES as readonly string[]).includes(sf.decision_status);
  const authorityGepflegt =
    typeof sf.authority_level === "string" &&
    (AUTHORITY_LEVELS as readonly string[]).includes(sf.authority_level);
  const prioritaetGepflegt =
    typeof sf.source_priority === "number" &&
    Number.isInteger(sf.source_priority) &&
    sf.source_priority >= 1 &&
    sf.source_priority <= 5;
  const navigation = NAVIGATIONSTYPEN.has(pageType);

  return {
    publicationStatus: {
      wert: "published",
      herkunft: "content_nodes.status + published_revision_id",
      bedeutung:
        "Die Seite ist in FlowCore veröffentlicht. Das ist kein Urteil über die fachliche Freigabe einzelner Produkt-, Zulassungs- oder Förderaussagen.",
    },
    // Ein nicht gepflegtes Feld wird als null ausgeliefert, nicht als
    // Standardwert: Ein leeres Feld wird von einem Zielsystem ignoriert, ein
    // gefülltes ausgewertet. Der frühere Standardwert "proposed" ließ ein
    // angebundenes System schließen, im gesamten Bestand sei nichts beschlossen
    // (Rückfrage vom 12.09.2026, Punkt 3b).
    decisionStatus: {
      wert: decisionGepflegt ? (sf.decision_status as string) : null,
      herkunft: decisionGepflegt
        ? "structuredFields.decision_status"
        : "nicht gepflegt (keine Eingabe dafür in der Oberfläche)",
      bedeutung: `Redaktioneller Entscheidungsstand, unabhängig vom Veröffentlichungsstand. Erlaubt: ${DECISION_STATUSES.join(", ")}. null heißt: kein Wert hinterlegt — kein Standardwert und keine Aussage über die fachliche Freigabe.`,
    },
    authorityLevel: {
      wert: authorityGepflegt ? (sf.authority_level as string) : null,
      herkunft: authorityGepflegt
        ? "structuredFields.authority_level"
        : "nicht gepflegt",
      bedeutung: `Normative Verbindlichkeit, sofern gepflegt. Erlaubt: ${AUTHORITY_LEVELS.join(", ")}. null heißt: kein Wert hinterlegt — nicht »unverbindlich«.`,
    },
    sourcePriority: {
      wert: prioritaetGepflegt ? (sf.source_priority as number) : null,
      herkunft: prioritaetGepflegt
        ? "structuredFields.source_priority"
        : "nicht gepflegt (keine Eingabe dafür in der Oberfläche)",
      bedeutung:
        "Quellenrang 1–5 für die Gewichtung mehrerer Treffer. null heißt: kein Wert hinterlegt — daraus folgt keine Rangaussage.",
    },
    contentRole: {
      wert: navigation ? "navigation" : "content",
      herkunft: `abgeleitet aus pageType=${pageType}`,
      bedeutung:
        "navigation = Register oder Übersicht, das Unterseiten führt; content = Seite mit eigenem fachlichem Inhalt. Ein Register ist damit keine Marken- oder Kommunikationsregel.",
    },
  };
}

/** Direkte Kindseiten in stabiler Reihenfolge: sortOrder, dann Titel, dann ID. */
export function sortiereKindseiten<
  T extends { sortOrder: number; title: string; id: string },
>(kinder: T[]): T[] {
  return [...kinder].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      a.title.localeCompare(b.title, "de") ||
      a.id.localeCompare(b.id),
  );
}

/**
 * Wurzelrelative FlowCore-Links (`/node/…`, `/api/media/…`) gegen die
 * FlowCore-Basis-URL auflösen. T-03 verlangt genau eine verbindliche Variante:
 * Die Content-API liefert portable absolute URLs.
 */
export function absoluteUrl(url: string | null, basis: string): string | null {
  if (!url || !url.startsWith("/")) return url;
  return `${basis.replace(/\/$/, "")}${url}`;
}

export function absoluteLinksImMarkdown(
  markdown: string,
  basis: string,
): string {
  const b = basis.replace(/\/$/, "");
  return markdown.replace(/\]\((\/(?:node|api)\/[^)\s]*)\)/g, `](${b}$1)`);
}
