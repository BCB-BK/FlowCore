/**
 * Antwortformate der Content-API für eine einzelne Seite (`GET /v1/pages/:id`).
 *
 * WARUM: Die Seitenantwort trug denselben Inhalt mehrfach — als Editor-JSON
 * (`structuredFields._editorContent`, bei den Markenseiten 88 % der Felder),
 * als HTML-Abschnitte, als `contentText` und als `contentMarkdown`. Seit dem
 * kanonischen Volltext (`page-full-text.ts`) enthält `contentMarkdown` alle
 * Textabschnitte beschriftet, Tabellen und Seitenlinks mit Ziel. Die Kopien
 * blähen jede Antwort auf, ohne Information hinzuzufügen.
 *
 * FORMATE (`?format=`):
 *   markdown (Standard)  Metadaten, Beziehungen, `contentMarkdown`, `media`,
 *                        `structuredData` (nur Felder, die kein Fließtext sind)
 *   text                 wie markdown, aber `contentText` statt `contentMarkdown`
 *   full                 die vollständige Projektion ohne Editor-JSON und ohne
 *                        interne `_`-Felder — für Systeme, die einzelne Felder brauchen
 *
 * LINKS (Reaudit FC-RA-20260911, T-03): Jede Antwort löst wurzelrelative
 * FlowCore-Links gegen `linkBase` auf. Verbraucher bekommen portable absolute
 * URLs und brauchen keinen eigenen Resolver. `structuredFields` in `full`
 * bleibt bewusst der unveränderte Speicherwert.
 *
 * Nicht betroffen: Copilot-Export, Copilot-Connector und Graph-Konnektor lesen
 * die Projektion weiterhin direkt.
 */
import type { CopilotPageProjection } from "../services/copilot-content-projection.service";
import { istTextAbschnitt } from "./page-full-text";
import {
  EXPORTVERTRAG,
  absoluteLinksImMarkdown,
  absoluteUrl,
} from "./content-api-contract";
import { FLOWCORE_BASE_URL } from "./flowcore-base-url";

export const SEITENFORMATE = ["markdown", "text", "full"] as const;
export type Seitenformat = (typeof SEITENFORMATE)[number];

/** `undefined` → Standard `markdown`; unbekannte oder mehrfache Werte → `null`. */
export function parseSeitenformat(wert: unknown): Seitenformat | null {
  if (wert === undefined || wert === "") return "markdown";
  if (typeof wert !== "string") return null;
  const f = wert.trim().toLowerCase();
  return (SEITENFORMATE as readonly string[]).includes(f)
    ? (f as Seitenformat)
    : null;
}

/** Interne Felder (`_editorContent` u. a.) verlassen die API nicht. */
function ohneInterneFelder(
  felder: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(felder).filter(([k]) => !k.startsWith("_")),
  );
}

/**
 * Felder, die nicht als Fließtext im Volltext stehen: Verweislisten, Tabellen-
 * Widgets (RACI, SIPOC, Kennzahlen) und sonstige Datenstrukturen. JSON, das als
 * String gespeichert ist, wird geparst ausgeliefert.
 */
function datenfelder(felder: Record<string, unknown>): Record<string, unknown> {
  const aus: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(felder)) {
    if (k.startsWith("_") || k === "media" || v === null || v === undefined) {
      continue;
    }
    if (typeof v === "string") {
      if (v.trim() === "" || istTextAbschnitt(v)) continue;
      try {
        aus[k] = JSON.parse(v);
      } catch {
        aus[k] = v;
      }
      continue;
    }
    aus[k] = v;
  }
  return aus;
}

function istRecord(wert: unknown): wert is Record<string, unknown> {
  return !!wert && typeof wert === "object" && !Array.isArray(wert);
}

/** URLs in Medien- und Verweislisten gegen die Basis auflösen. */
function mitAbsolutenUrls(wert: unknown, basis: string): unknown {
  if (Array.isArray(wert)) return wert.map((e) => mitAbsolutenUrls(e, basis));
  if (!istRecord(wert)) return wert;
  const aus: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(wert)) {
    aus[k] =
      (k === "url" || k === "sourceUrl") && typeof v === "string"
        ? absoluteUrl(v, basis)
        : mitAbsolutenUrls(v, basis);
  }
  return aus;
}

export function formatiereSeite(
  seite: CopilotPageProjection,
  format: Seitenformat,
  basis: string = FLOWCORE_BASE_URL,
): Record<string, unknown> {
  const felder = seite.structuredFields ?? {};
  const kopf = {
    contract: EXPORTVERTRAG,
    format,
    linkBase: basis,
  };
  const links = seite.contentLinks.map((v) => ({
    ...v,
    url: `${basis.replace(/\/$/, "")}/node/${v.targetNodeId}`,
  }));

  if (format === "full") {
    return {
      ...kopf,
      ...seite,
      contentMarkdown: absoluteLinksImMarkdown(seite.contentMarkdown, basis),
      structuredFields: ohneInterneFelder(felder),
      childPages: mitAbsolutenUrls(seite.childPages, basis),
      topChildPages: mitAbsolutenUrls(seite.topChildPages, basis),
      contentLinks: links,
    };
  }

  const {
    contentText,
    contentMarkdown,
    structuredFields: _felder,
    shortDescription: _kurz,
    scopeContext: _geltung,
    childPageTitles: _kinderTitel,
    contentLinks: _verweise,
    ...rest
  } = seite;
  return {
    ...kopf,
    ...rest,
    ...(format === "markdown"
      ? { contentMarkdown: absoluteLinksImMarkdown(contentMarkdown, basis) }
      : { contentText }),
    childPages: mitAbsolutenUrls(rest.childPages, basis),
    topChildPages: mitAbsolutenUrls(rest.topChildPages, basis),
    media: mitAbsolutenUrls(
      Array.isArray(felder.media) ? felder.media : [],
      basis,
    ),
    structuredData: mitAbsolutenUrls(datenfelder(felder), basis),
    contentLinks: links,
  };
}
