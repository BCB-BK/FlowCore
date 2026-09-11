/**
 * Ziele interner Seitenverweise in den gespeicherten Feldern einer Seite.
 *
 * HERKUNFT: Die Ermittlung lag in `working-copy.service.ts` und las nur
 * TipTap-JSON (`wikiLink`-Knoten). Interne Links in HTML-Abschnittsfeldern
 * (`<a href="/node/<uuid>">`) und Seiteneinträge unter »Mitgeltende Seiten«
 * wurden nicht erfasst; die Seitenbeziehung fehlte dann im Relationenmodell,
 * obwohl der Link im Text funktionierte (Audit FC-MSA-20260911, Befund F02:
 * 10 von 193 Beziehungen fehlten). Jetzt liegt die Ermittlung hier, rein und
 * testbar.
 *
 * ERFASST werden:
 *   - `wikiLink`-Knoten (attrs.nodeId)
 *   - Link-Markierungen in TipTap-Text mit Ziel `/node/<uuid>`
 *   - Seiteneinträge der Verweisliste (`{ type: "node", nodeId }`)
 *   - `href="…/node/<uuid>"` in HTML-Feldern (relativ oder mit Host)
 *   - Felder, die JSON als String speichern
 *
 * NICHT hier: Selbstbezug und Existenz des Ziels — das prüft der Aufrufer, weil
 * er die Seiten-ID und die Datenbank kennt.
 */

const UUID_MUSTER =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

/** `/node/<uuid>` als Pfad, optional mit Host, Anker oder Parametern. */
const KNOTEN_PFAD = new RegExp(
  `^(?:https?://[^/\\s"'<>]+)?/node/(${UUID_MUSTER})(?:[#?][^\\s"'<>]*)?$`,
);
const NUR_UUID = new RegExp(`^${UUID_MUSTER}$`);

const HTML_HREF = /href\s*=\s*["']([^"']*)["']/gi;

function zielAusPfad(href: string): string | null {
  const treffer = KNOTEN_PFAD.exec(href.trim());
  return treffer?.[1] ? treffer[1].toLowerCase() : null;
}

/** Ziele aus einem TipTap-Dokument oder einer Verweisliste. */
export function extractWikiLinkTargets(content: unknown): string[] {
  const ziele = new Set<string>();
  const besuche = (knoten: unknown): void => {
    if (Array.isArray(knoten)) {
      knoten.forEach(besuche);
      return;
    }
    if (!knoten || typeof knoten !== "object") return;
    const n = knoten as Record<string, unknown>;
    const attrs = n.attrs as Record<string, unknown> | undefined;
    if (
      n.type === "wikiLink" &&
      typeof attrs?.nodeId === "string" &&
      NUR_UUID.test(attrs.nodeId)
    ) {
      ziele.add(attrs.nodeId.toLowerCase());
    }
    if (
      n.type === "node" &&
      typeof n.nodeId === "string" &&
      NUR_UUID.test(n.nodeId)
    ) {
      ziele.add(n.nodeId.toLowerCase());
    }
    if (Array.isArray(n.marks)) {
      for (const mark of n.marks as Array<Record<string, unknown>>) {
        const href = (mark?.attrs as Record<string, unknown> | undefined)?.href;
        if (mark?.type === "link" && typeof href === "string") {
          const ziel = zielAusPfad(href);
          if (ziel) ziele.add(ziel);
        }
      }
    }
    besuche(n.content);
  };
  besuche(content);
  return [...ziele];
}

/** Ziele aus einem HTML-String (Abschnittsfelder). */
export function extractHtmlLinkTargets(html: string): string[] {
  const ziele = new Set<string>();
  for (const treffer of html.matchAll(HTML_HREF)) {
    const ziel = zielAusPfad(treffer[1] ?? "");
    if (ziel) ziele.add(ziel);
  }
  return [...ziele];
}

/**
 * Alle Verweisziele über sämtliche Felder: TipTap-JSON und Verweislisten (als
 * Objekt oder als String gespeichert) sowie HTML-Strings. Dedupliziert,
 * Kleinschreibung.
 */
export function extractAllWikiLinkTargets(
  structuredFields: Record<string, unknown> | null | undefined,
): string[] {
  if (!structuredFields) return [];
  const ziele = new Set<string>();
  for (const wert of Object.values(structuredFields)) {
    if (typeof wert === "string") {
      const kopf = wert.trimStart()[0];
      if (kopf === "{" || kopf === "[") {
        try {
          extractWikiLinkTargets(JSON.parse(wert)).forEach((z) => ziele.add(z));
          continue;
        } catch {
          // Kein JSON — dann als HTML behandeln.
        }
      }
      extractHtmlLinkTargets(wert).forEach((z) => ziele.add(z));
    } else if (wert && typeof wert === "object") {
      extractWikiLinkTargets(wert).forEach((z) => ziele.add(z));
    }
  }
  return [...ziele];
}
