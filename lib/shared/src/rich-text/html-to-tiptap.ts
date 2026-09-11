/**
 * HTML nach TipTap/ProseMirror-JSON.
 *
 * HERKUNFT: Der Wandler lag bis 10.09.2026 skriptlokal in
 * `scripts/src/import-sharepoint-pages.ts`. Mit dem Import des Markensystems
 * braucht ihn ein zweiter Aufrufer — statt einer zweiten Kopie liegt er jetzt
 * hier (Kernvertrag Paragraph 3.7, keine doppelt gepflegte Logik).
 *
 * WOFUER: `structuredFields._editorContent` erwartet ein ProseMirror-Dokument.
 * Abschnittsfelder dagegen nehmen einfaches HTML direkt entgegen
 * (`looksLikeHtml` in ./index.ts) — dafuer wird dieser Wandler NICHT gebraucht.
 *
 * GRENZEN, bewusst: Der Parser arbeitet mit regulaeren Ausdruecken, nicht mit
 * einem DOM. Er deckt ab, was die Importquellen liefern — h1-h6, p, ul/ol,
 * table, blockquote, pre, div, figure sowie die Inline-Auszeichnungen. Fuer
 * beliebiges Fremd-HTML ist er nicht gedacht.
 */

export type TiptapMark = { type: string; attrs?: Record<string, unknown> };
export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

/** Leerraum wie im HTML: Zeilenumbrüche und Folgen von Leerzeichen sind ein Leerzeichen. */
function fasseLeerraum(text: string): string {
  return text.replace(/[ \t\r\n]+/g, " ");
}

export function parseInlineContent(html: string): TiptapNode[] {
  const nodes: TiptapNode[] = [];
  // Tagnamen mit Grenze `(?=[\s>])`: Ohne sie galt `<br>` als `<b>` — der Text
  // bis zum nächsten `</strong>` wurde fett, und der Umbruch fiel weg. Die
  // Rückreferenz `\2` schließt ein Element erst an seinem eigenen Endtag.
  const inlineRegex =
    /(<br\s*\/?>|<(strong|b|em|i|u|a|span|code)(?=[\s>])[^>]*>[\s\S]*?<\/\2\s*>|[^<]+|<[^>]+>)/gi;
  let inlineMatch: RegExpExecArray | null;
  let buffer = "";

  /**
   * `zwischenraum`: Der Puffer steht VOR einer Inline-Auszeichnung. Besteht er
   * nur aus Leerraum und folgt er auf Text, trennt er zwei Auszeichnungen
   * (`<strong>a:</strong> <a>b</a>`) und bleibt als ein Leerzeichen erhalten.
   * Am Absatzrand und vor `<br>` wird reiner Leerraum weiter verworfen.
   */
  function flushBuffer(zwischenraum = false) {
    if (buffer.trim()) {
      let text = fasseLeerraum(decodeEntities(buffer));
      const vorher = nodes[nodes.length - 1];
      if (!vorher || vorher.type === "hardBreak") text = text.trimStart();
      if (text) {
        nodes.push({ type: "text", text });
      }
    } else if (
      zwischenraum &&
      buffer.length > 0 &&
      nodes[nodes.length - 1]?.type === "text"
    ) {
      nodes.push({ type: "text", text: " " });
    }
    buffer = "";
  }

  /** Leerraum vor einem Umbruch und am Ende ist nicht sichtbar gemeint. */
  function schneideEnde() {
    const letzter = nodes[nodes.length - 1];
    if (letzter?.type !== "text" || letzter.text === undefined) return;
    letzter.text = letzter.text.trimEnd();
    if (!letzter.text) nodes.pop();
  }

  while ((inlineMatch = inlineRegex.exec(html)) !== null) {
    const chunk = inlineMatch[1];

    const strongMatch = chunk.match(
      /^<(?:strong|b)(?=[\s>])[^>]*>([\s\S]*?)<\/(?:strong|b)>/i,
    );
    if (strongMatch) {
      flushBuffer(true);
      const innerText = fasseLeerraum(stripTags(strongMatch[1])).trim();
      if (innerText) {
        nodes.push({
          type: "text",
          text: decodeEntities(innerText),
          marks: [{ type: "bold" }],
        });
      }
      continue;
    }

    const emMatch = chunk.match(
      /^<(?:em|i)(?=[\s>])[^>]*>([\s\S]*?)<\/(?:em|i)>/i,
    );
    if (emMatch) {
      flushBuffer(true);
      const innerText = fasseLeerraum(stripTags(emMatch[1])).trim();
      if (innerText) {
        nodes.push({
          type: "text",
          text: decodeEntities(innerText),
          marks: [{ type: "italic" }],
        });
      }
      continue;
    }

    const uMatch = chunk.match(/^<u(?=[\s>])[^>]*>([\s\S]*?)<\/u>/i);
    if (uMatch) {
      flushBuffer(true);
      const innerText = fasseLeerraum(stripTags(uMatch[1])).trim();
      if (innerText) {
        nodes.push({
          type: "text",
          text: decodeEntities(innerText),
          marks: [{ type: "underline" }],
        });
      }
      continue;
    }

    const linkMatch = chunk.match(
      /^<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i,
    );
    if (linkMatch) {
      flushBuffer(true);
      const href = decodeEntities(linkMatch[1]);
      const linkText = fasseLeerraum(stripTags(linkMatch[2])).trim();
      if (linkText) {
        nodes.push({
          type: "text",
          text: decodeEntities(linkText),
          marks: [{ type: "link", attrs: { href, target: "_blank" } }],
        });
      }
      continue;
    }

    const codeMatch = chunk.match(/^<code(?=[\s>])[^>]*>([\s\S]*?)<\/code>/i);
    if (codeMatch) {
      flushBuffer(true);
      const codeText = fasseLeerraum(stripTags(codeMatch[1])).trim();
      if (codeText) {
        nodes.push({
          type: "text",
          text: decodeEntities(codeText),
          marks: [{ type: "code" }],
        });
      }
      continue;
    }

    if (/^<br\s*\/?>$/i.test(chunk)) {
      flushBuffer();
      schneideEnde();
      nodes.push({ type: "hardBreak" });
      continue;
    }

    // Übriges Element mit Endtag (etwa `<span>`): Text behalten, Auszeichnung
    // verwerfen. Bisher fiel hier der ganze Inhalt weg.
    if (/^<([a-z][a-z0-9]*)(?=[\s>])[^>]*>[\s\S]*<\/\1\s*>$/i.test(chunk)) {
      buffer += stripTags(chunk);
      continue;
    }

    if (chunk.startsWith("<") && chunk.endsWith(">")) {
      continue;
    }

    buffer += chunk;
  }

  flushBuffer();
  schneideEnde();
  return nodes;
}

export function htmlToTiptapJson(html: string): {
  type: string;
  content: TiptapNode[];
} {
  if (!html.trim()) {
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Kein Inhalt verfügbar." }],
        },
      ],
    };
  }

  const nodes: TiptapNode[] = [];
  const blockRegex =
    /<(h[1-6]|p|table|ul|ol|blockquote|pre|div|figure)[^>]*>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(html)) !== null) {
    if (blockMatch.index > lastIndex) {
      const between = html.slice(lastIndex, blockMatch.index).trim();
      if (between) {
        const inlineNodes = parseInlineContent(between);
        if (inlineNodes.length > 0) {
          nodes.push({ type: "paragraph", content: inlineNodes });
        }
      }
    }
    lastIndex = blockMatch.index + blockMatch[0].length;

    const tag = blockMatch[1].toLowerCase();
    const inner = blockMatch[2];

    if (/^h[1-3]$/.test(tag)) {
      const level = parseInt(tag[1]);
      const inlineNodes = parseInlineContent(inner);
      if (inlineNodes.length > 0) {
        nodes.push({ type: "heading", attrs: { level }, content: inlineNodes });
      }
      continue;
    }

    if (/^h[4-6]$/.test(tag)) {
      const inlineNodes = parseInlineContent(inner);
      if (inlineNodes.length > 0) {
        nodes.push({
          type: "heading",
          attrs: { level: 3 },
          content: inlineNodes,
        });
      }
      continue;
    }

    if (tag === "p") {
      const inlineNodes = parseInlineContent(inner);
      if (inlineNodes.length > 0) {
        nodes.push({ type: "paragraph", content: inlineNodes });
      }
      continue;
    }

    if (tag === "table" || tag === "figure") {
      const tableHtml = blockMatch[0];
      if (tableHtml.includes("<table")) {
        const tableNode = parseHtmlTable(tableHtml);
        if (tableNode) nodes.push(tableNode);
      }
      continue;
    }

    if (tag === "ul") {
      const items = parseListItems(inner);
      if (items.length > 0) {
        nodes.push({ type: "bulletList", content: items });
      }
      continue;
    }

    if (tag === "ol") {
      const items = parseListItems(inner);
      if (items.length > 0) {
        nodes.push({ type: "orderedList", content: items });
      }
      continue;
    }

    if (tag === "blockquote") {
      const inlineNodes = parseInlineContent(inner);
      if (inlineNodes.length > 0) {
        nodes.push({
          type: "blockquote",
          content: [{ type: "paragraph", content: inlineNodes }],
        });
      }
      continue;
    }

    if (tag === "pre") {
      const codeText = stripTags(inner).trim();
      if (codeText) {
        nodes.push({
          type: "codeBlock",
          content: [{ type: "text", text: decodeEntities(codeText) }],
        });
      }
      continue;
    }

    if (tag === "div") {
      const innerBlocks = htmlToTiptapJson(inner);
      if (innerBlocks.content.length > 0) {
        nodes.push(...innerBlocks.content);
      }
      continue;
    }
  }

  if (lastIndex < html.length) {
    const trailing = html.slice(lastIndex).trim();
    if (trailing) {
      const inlineNodes = parseInlineContent(trailing);
      if (inlineNodes.length > 0) {
        nodes.push({ type: "paragraph", content: inlineNodes });
      }
    }
  }

  if (nodes.length === 0) {
    const fallbackText = stripTags(html).trim();
    if (fallbackText) {
      nodes.push({
        type: "paragraph",
        content: [{ type: "text", text: decodeEntities(fallbackText) }],
      });
    } else {
      nodes.push({
        type: "paragraph",
        content: [{ type: "text", text: "Importierter SharePoint-Inhalt." }],
      });
    }
  }

  return { type: "doc", content: nodes };
}

export function parseListItems(html: string): TiptapNode[] {
  const items: TiptapNode[] = [];
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let liMatch: RegExpExecArray | null;
  while ((liMatch = liRegex.exec(html)) !== null) {
    const inlineNodes = parseInlineContent(liMatch[1]);
    if (inlineNodes.length > 0) {
      items.push({
        type: "listItem",
        content: [{ type: "paragraph", content: inlineNodes }],
      });
    }
  }
  return items;
}

export function parseHtmlTable(html: string): TiptapNode | null {
  const rows: TiptapNode[] = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const cells: TiptapNode[] = [];
    const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
      const isHeader = cellMatch[1].toLowerCase() === "th";
      const inlineNodes = parseInlineContent(cellMatch[2]);
      cells.push({
        type: isHeader ? "tableHeader" : "tableCell",
        content: [
          {
            type: "paragraph",
            content:
              inlineNodes.length > 0
                ? inlineNodes
                : [{ type: "text", text: " " }],
          },
        ],
      });
    }
    if (cells.length > 0) {
      rows.push({ type: "tableRow", content: cells });
    }
  }
  if (rows.length === 0) return null;
  return { type: "table", content: rows };
}
