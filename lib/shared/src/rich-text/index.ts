/**
 * Hilfsfunktionen für Abschnittsinhalte, die entweder als reiner Text oder
 * als einfaches HTML vorliegen können.
 *
 * Hintergrund: Abschnittsfelder wurden ursprünglich ausschließlich als
 * Klartext gespeichert. Beim Einfügen formatierter Inhalte (Aufzählungen,
 * Fettungen, Überschriften) ging die Formatierung verloren. Felder können
 * ihren Inhalt daher wahlweise als HTML ablegen — bestehende Klartext-Inhalte
 * bleiben unverändert gültig und werden weiterhin korrekt dargestellt.
 */

/** Block- und Inline-Tags, die als "formatierter Inhalt" gelten. */
const HTML_TAG_PATTERN =
  /<\/?(p|br|ul|ol|li|strong|b|em|i|u|s|h1|h2|h3|h4|h5|h6|blockquote|code|pre|mark|a|table|tr|td|th|img|span|div)\b[^>]*>/i;

/**
 * Erkennt, ob ein gespeicherter Wert formatiertes HTML enthält.
 * Bewusst konservativ: Ein einzelnes "<" oder mathematische Vergleiche
 * ("a < b") werden nicht als HTML interpretiert.
 */
export function looksLikeHtml(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  return HTML_TAG_PATTERN.test(value);
}

const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeEntities(text: string): string {
  let out = text;
  for (const [entity, char] of Object.entries(NAMED_ENTITIES)) {
    out = out.split(entity).join(char);
  }
  return out.replace(/&#(\d+);/g, (_m, code) =>
    String.fromCharCode(Number(code)),
  );
}

/**
 * Wandelt einfaches HTML in lesbaren Klartext um — für Suche, Export,
 * KI-Kontext und Vergleichsansichten, in denen Markup nur stören würde.
 * Aufzählungspunkte bleiben als "• " erhalten, Blockwechsel als Zeilenumbruch.
 */
export function htmlToPlainText(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  if (!looksLikeHtml(value)) return value;

  const text = value
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<\s*\/\s*(p|div|h[1-6]|li|tr|blockquote)\s*>/gi, "\n")
    .replace(/<\s*\/?\s*(td|th)[^>]*>/gi, "\t")
    .replace(/<[^>]+>/g, "");

  return decodeEntities(text)
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Wandelt Klartext in einfaches HTML um (Absätze je Zeile). Wird verwendet,
 * wenn ein bislang unformatiertes Feld in den Formatierungsmodus wechselt.
 */
export function plainTextToHtml(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) return "";
  if (looksLikeHtml(value)) return value;

  return value
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").map(escapeHtml);
      return `<p>${lines.join("<br>")}</p>`;
    })
    .join("");
}

/** Ist der Wert inhaltlich leer (auch bei leerem HTML-Gerüst)? */
export function isRichTextEmpty(value: unknown): boolean {
  if (typeof value !== "string") return true;
  if (value.trim().length === 0) return true;
  return htmlToPlainText(value).trim().length === 0;
}

// HTML -> TipTap/ProseMirror (fuer structuredFields._editorContent).
// Liegt in einer eigenen Datei, weil es ein Wandler ist und keine
// Textabfrage — hier nur durchgereicht.
export {
  htmlToTiptapJson,
  parseInlineContent,
  parseListItems,
  parseHtmlTable,
  decodeEntities,
  stripTags,
} from "./html-to-tiptap";
export type { TiptapNode, TiptapMark } from "./html-to-tiptap";

export {
  extractWikiLinkTargets,
  extractHtmlLinkTargets,
  extractAllWikiLinkTargets,
} from "./wiki-link-targets";
