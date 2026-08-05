/**
 * Converts Tiptap/ProseMirror JSON documents (as stored in
 * content_revisions.content / content_working_copies.content) into
 * plaintext and Markdown representations suitable for Copilot / Graph
 * connector ingestion, plus a list of referenced media items.
 *
 * This is a best-effort structural serializer covering the node types
 * used by the wiki editor (see artifacts/wiki-frontend/src/components/editor/extensions/*).
 * Unknown node types fall back to serializing their text content only.
 */

export interface MediaReference {
  kind: "file" | "video" | "image" | "gallery";
  assetId: string | null;
  title: string;
  description: string;
  altText: string;
  url: string | null;
}

export interface ProseMirrorSerializationResult {
  plaintext: string;
  markdown: string;
  media: MediaReference[];
  /** Titles/labels of internal wiki-link references found in the content. */
  linkedNodeIds: string[];
}

interface PMNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

class Serializer {
  plaintextParts: string[] = [];
  markdownParts: string[] = [];
  media: MediaReference[] = [];
  linkedNodeIds: string[] = [];

  serializeText(node: PMNode): { plain: string; md: string } {
    let plain = node.text ?? "";
    let md = plain;
    for (const mark of node.marks ?? []) {
      switch (mark.type) {
        case "bold":
          md = `**${md}**`;
          break;
        case "italic":
          md = `_${md}_`;
          break;
        case "code":
          md = `\`${md}\``;
          break;
        case "strike":
          md = `~~${md}~~`;
          break;
        case "link": {
          const href = str(mark.attrs?.href, "");
          md = href ? `[${md}](${href})` : md;
          break;
        }
        default:
          break;
      }
    }
    return { plain, md };
  }

  serializeInlineChildren(nodes: PMNode[] | undefined): {
    plain: string;
    md: string;
  } {
    let plain = "";
    let md = "";
    for (const child of nodes ?? []) {
      const { plain: cp, md: cm } = this.serializeNode(child, 0, true);
      plain += cp;
      md += cm;
    }
    return { plain, md };
  }

  addMedia(ref: MediaReference) {
    this.media.push(ref);
  }

  /**
   * Serializes a single node, returning inline text fragments when
   * `inline` is true (used for building paragraph/heading text), or
   * emitting block-level output via the shared parts arrays otherwise.
   */
  serializeNode(
    node: PMNode,
    listDepth = 0,
    inline = false,
  ): { plain: string; md: string } {
    const type = node.type ?? "";

    switch (type) {
      case "text":
        return this.serializeText(node);

      case "hardBreak":
        return { plain: "\n", md: "  \n" };

      case "paragraph": {
        const { plain, md } = this.serializeInlineChildren(node.content);
        if (inline) return { plain, md };
        if (plain.trim().length > 0) {
          this.plaintextParts.push(plain);
          this.markdownParts.push(md);
        }
        return { plain: "", md: "" };
      }

      case "heading": {
        const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6);
        const { plain, md } = this.serializeInlineChildren(node.content);
        if (inline) return { plain, md };
        this.plaintextParts.push(plain.toUpperCase());
        this.markdownParts.push(`${"#".repeat(level)} ${md}`);
        return { plain: "", md: "" };
      }

      case "bulletList":
      case "orderedList": {
        if (inline) return { plain: "", md: "" };
        let idx = 1;
        for (const item of node.content ?? []) {
          const marker = type === "orderedList" ? `${idx}.` : "-";
          const { plain, md } = this.collectListItem(item, listDepth);
          const indent = "  ".repeat(listDepth);
          this.plaintextParts.push(`${indent}- ${plain}`);
          this.markdownParts.push(`${indent}${marker} ${md}`);
          idx += 1;
        }
        return { plain: "", md: "" };
      }

      case "table": {
        if (inline) return { plain: "", md: "" };
        this.serializeTable(node);
        return { plain: "", md: "" };
      }

      case "blockquote": {
        if (inline) return { plain: "", md: "" };
        const inner = this.captureBlock(node.content);
        this.plaintextParts.push(
          inner.plain
            .split("\n")
            .map((l) => `> ${l}`)
            .join("\n"),
        );
        this.markdownParts.push(
          inner.md
            .split("\n")
            .map((l) => `> ${l}`)
            .join("\n"),
        );
        return { plain: "", md: "" };
      }

      case "codeBlock": {
        if (inline) return { plain: "", md: "" };
        const code = (node.content ?? []).map((c) => c.text ?? "").join("");
        this.plaintextParts.push(code);
        this.markdownParts.push(`\`\`\`\n${code}\n\`\`\``);
        return { plain: "", md: "" };
      }

      case "horizontalRule": {
        if (inline) return { plain: "", md: "" };
        this.plaintextParts.push("---");
        this.markdownParts.push("---");
        return { plain: "", md: "" };
      }

      case "callout": {
        if (inline) return { plain: "", md: "" };
        const calloutType = str(node.attrs?.type, "info");
        const { plain, md } = this.serializeInlineChildren(node.content);
        this.plaintextParts.push(`[${calloutType.toUpperCase()}] ${plain}`);
        this.markdownParts.push(`> **${calloutType.toUpperCase()}:** ${md}`);
        return { plain: "", md: "" };
      }

      case "image": {
        if (inline) return { plain: "", md: "" };
        const src = str(node.attrs?.src, "");
        const alt = str(node.attrs?.alt, "");
        const title = str(node.attrs?.title, alt || "Bild");
        this.addMedia({
          kind: "image",
          assetId: str(node.attrs?.assetId, "") || null,
          title,
          description: "",
          altText: alt,
          url: src || null,
        });
        this.plaintextParts.push(`[Bild: ${title}]`);
        this.markdownParts.push(`![${alt}](${src})`);
        return { plain: "", md: "" };
      }

      case "fileBlock": {
        if (inline) return { plain: "", md: "" };
        const filename = str(node.attrs?.filename, "Datei");
        const caption = str(node.attrs?.caption, "");
        const altText = str(node.attrs?.altText, "");
        const src = str(node.attrs?.src, "");
        this.addMedia({
          kind: "file",
          assetId: str(node.attrs?.assetId, "") || null,
          title: filename,
          description: caption,
          altText,
          url: src || null,
        });
        this.plaintextParts.push(
          `[Datei: ${filename}${caption ? ` – ${caption}` : ""}]`,
        );
        this.markdownParts.push(`[${filename}](${src})`);
        return { plain: "", md: "" };
      }

      case "videoBlock": {
        if (inline) return { plain: "", md: "" };
        const caption = str(node.attrs?.caption, "Video");
        const altText = str(node.attrs?.altText, "");
        const src = str(node.attrs?.src, "");
        this.addMedia({
          kind: "video",
          assetId: str(node.attrs?.assetId, "") || null,
          title: caption,
          description: caption,
          altText,
          url: src || null,
        });
        this.plaintextParts.push(`[Video: ${caption}]`);
        this.markdownParts.push(`[Video: ${caption}](${src})`);
        return { plain: "", md: "" };
      }

      case "galleryBlock": {
        if (inline) return { plain: "", md: "" };
        const images = Array.isArray(node.attrs?.images)
          ? (node.attrs?.images as Record<string, unknown>[])
          : [];
        const caption = str(node.attrs?.caption, "Galerie");
        for (const img of images) {
          this.addMedia({
            kind: "gallery",
            assetId: str(img.id, "") || null,
            title: str(img.caption, caption),
            description: str(img.caption, ""),
            altText: str(img.alt, ""),
            url: str(img.src, "") || null,
          });
        }
        this.plaintextParts.push(
          `[Galerie: ${caption} (${images.length} Bilder)]`,
        );
        this.markdownParts.push(
          `[Galerie: ${caption} (${images.length} Bilder)]`,
        );
        return { plain: "", md: "" };
      }

      case "embedBlock":
      case "diagramBlock": {
        if (inline) return { plain: "", md: "" };
        const label = type === "diagramBlock" ? "Diagramm" : "Einbettung";
        this.plaintextParts.push(`[${label}]`);
        this.markdownParts.push(`[${label}]`);
        return { plain: "", md: "" };
      }

      case "wikiLink": {
        const nodeId = str(node.attrs?.nodeId, "");
        const title = str(node.attrs?.title, nodeId);
        const displayCode = str(node.attrs?.displayCode, "");
        if (nodeId) this.linkedNodeIds.push(nodeId);
        const label = displayCode ? `${displayCode} ${title}` : title;
        if (inline) return { plain: label, md: `[${label}](/node/${nodeId})` };
        this.plaintextParts.push(label);
        this.markdownParts.push(`[${label}](/node/${nodeId})`);
        return { plain: "", md: "" };
      }

      case "doc": {
        for (const child of node.content ?? []) {
          this.serializeNode(child, listDepth, false);
        }
        return { plain: "", md: "" };
      }

      default: {
        // Unknown node type: recurse into children as a best-effort fallback.
        const { plain, md } = this.serializeInlineChildren(node.content);
        if (inline) return { plain, md };
        if (plain.trim().length > 0) {
          this.plaintextParts.push(plain);
          this.markdownParts.push(md);
        }
        return { plain: "", md: "" };
      }
    }
  }

  collectListItem(item: PMNode, depth: number): { plain: string; md: string } {
    const before = {
      p: this.plaintextParts.length,
      m: this.markdownParts.length,
    };
    let inlinePlain = "";
    let inlineMd = "";
    for (const child of item.content ?? []) {
      if (child.type === "paragraph") {
        const r = this.serializeInlineChildren(child.content);
        inlinePlain += r.plain;
        inlineMd += r.md;
      } else if (child.type === "bulletList" || child.type === "orderedList") {
        this.serializeNode(child, depth + 1, false);
      } else {
        this.serializeNode(child, depth, false);
      }
    }
    // Discard any block pushes made by nested calls to keep list items compact;
    // nested lists already pushed their own indented lines above.
    void before;
    return { plain: inlinePlain, md: inlineMd };
  }

  captureBlock(nodes: PMNode[] | undefined): { plain: string; md: string } {
    const startP = this.plaintextParts.length;
    const startM = this.markdownParts.length;
    for (const child of nodes ?? []) {
      this.serializeNode(child, 0, false);
    }
    const plain = this.plaintextParts.splice(startP).join("\n");
    const md = this.markdownParts.splice(startM).join("\n");
    return { plain, md };
  }

  serializeTable(node: PMNode) {
    const rows = node.content ?? [];
    const plainRows: string[] = [];
    const mdRows: string[] = [];
    let isFirstRow = true;
    for (const row of rows) {
      const cells = row.content ?? [];
      const cellTexts = cells.map((cell) => {
        const { plain } = this.serializeInlineChildren(
          (cell.content ?? []).flatMap((c) => c.content ?? [c]),
        );
        return plain.replace(/\|/g, "\\|").trim();
      });
      plainRows.push(cellTexts.join(" | "));
      mdRows.push(`| ${cellTexts.join(" | ")} |`);
      if (isFirstRow) {
        mdRows.push(`| ${cellTexts.map(() => "---").join(" | ")} |`);
        isFirstRow = false;
      }
    }
    this.plaintextParts.push(plainRows.join("\n"));
    this.markdownParts.push(mdRows.join("\n"));
  }
}

export function serializeProseMirrorContent(
  doc: Record<string, unknown> | null | undefined,
): ProseMirrorSerializationResult {
  if (!doc || typeof doc !== "object") {
    return { plaintext: "", markdown: "", media: [], linkedNodeIds: [] };
  }
  const serializer = new Serializer();
  serializer.serializeNode(doc as PMNode, 0, false);
  return {
    plaintext: serializer.plaintextParts.join("\n\n").trim(),
    markdown: serializer.markdownParts.join("\n\n").trim(),
    media: serializer.media,
    linkedNodeIds: [...new Set(serializer.linkedNodeIds)],
  };
}
