/**
 * Konservativer HTML-Sanitizer für benutzergenerierte Rich-Text-Inhalte
 * (z.B. Glossar-Definitionen), die per dangerouslySetInnerHTML gerendert
 * werden. Erlaubt nur einfache Formatierungs-Tags; alle Attribute außer
 * href (nur http/https/mailto und relative Pfade) werden entfernt.
 */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "code",
  "pre",
  "mark",
  "sub",
  "sup",
  "ul",
  "ol",
  "li",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

function isSafeHref(href: string): boolean {
  const trimmed = href.trim().toLowerCase();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("#")
  );
}

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.importNode(node, false);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tag)) {
    // Unerlaubtes Element: Tag verwerfen, Kinder (rekursiv bereinigt) behalten
    const fragment = doc.createDocumentFragment();
    for (const child of Array.from(el.childNodes)) {
      const clean = sanitizeNode(child, doc);
      if (clean) fragment.appendChild(clean);
    }
    return fragment;
  }

  const cleanEl = doc.createElement(tag);
  if (tag === "a") {
    const href = el.getAttribute("href");
    if (href && isSafeHref(href)) {
      cleanEl.setAttribute("href", href);
      cleanEl.setAttribute("rel", "noopener noreferrer");
      cleanEl.setAttribute("target", "_blank");
    }
  }
  for (const child of Array.from(el.childNodes)) {
    const clean = sanitizeNode(child, doc);
    if (clean) cleanEl.appendChild(clean);
  }
  return cleanEl;
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const container = parsed.createElement("div");
  for (const child of Array.from(parsed.body.childNodes)) {
    const clean = sanitizeNode(child, parsed);
    if (clean) container.appendChild(clean);
  }
  return container.innerHTML;
}
