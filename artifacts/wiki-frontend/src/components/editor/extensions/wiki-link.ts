import { Node, mergeAttributes } from "@tiptap/react";
import { InputRule, PasteRule } from "@tiptap/core";

// Matches full internal URLs with or without protocol:
//   https://flowcore.bildungscampus-backnang.de/node/<uuid>
//   flowcore.bildungscampus-backnang.de/node/<uuid>
//   /node/<uuid>
const UUID_SEG =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const HOST_SEG = "(?:https?:\\/\\/)?(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}";
export const WIKI_NODE_URL_PATTERN = new RegExp(
  `(?:${HOST_SEG})?\\/node\\/(${UUID_SEG})`,
  "gi",
);

export function extractWikiNodeId(url: string): string | null {
  const match = url.match(
    /\/node\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  );
  return match ? match[1] : null;
}

export interface WikiLinkAttrs {
  nodeId: string;
  title: string;
  displayCode?: string | null;
  templateType?: string | null;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    wikiLink: {
      setWikiLink: (attrs: WikiLinkAttrs) => ReturnType;
    };
  }
}

export const WikiLink = Node.create({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      nodeId: { default: null },
      title: { default: "" },
      displayCode: { default: null },
      templateType: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="wiki-link"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    const nodeId = HTMLAttributes["nodeId"] as string | null;
    const title = HTMLAttributes["title"] as string | null;
    const displayCode = HTMLAttributes["displayCode"] as string | null;
    const label = displayCode
      ? `[${displayCode}] ${title || String(nodeId ?? "")}`
      : title || String(nodeId ?? "Wiki-Seite");
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-type": "wiki-link",
        href: `/node/${nodeId}`,
      }),
      label,
    ];
  },

  addCommands() {
    return {
      setWikiLink:
        (attrs: WikiLinkAttrs) =>
        ({
          commands,
        }: {
          commands: {
            insertContent: (content: Record<string, unknown>) => boolean;
          };
        }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: new RegExp(
          `(?:${HOST_SEG})?\\/node\\/(${UUID_SEG})\\s$`,
        ),
        handler: ({ chain, range, match }) => {
          const nodeId = match[1];
          if (!nodeId) return null;
          chain()
            .insertContentAt({ from: range.from, to: range.to }, {
              type: this.name,
              attrs: {
                nodeId,
                title: nodeId.substring(0, 8) + "…",
                displayCode: null,
                templateType: null,
              },
            })
            .run();
          return null;
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      new PasteRule({
        find: new RegExp(WIKI_NODE_URL_PATTERN.source, "gi"),
        handler: ({ chain, range, match }) => {
          const nodeId = match[1];
          if (!nodeId) return null;
          chain()
            .insertContentAt({ from: range.from, to: range.to }, {
              type: this.name,
              attrs: {
                nodeId,
                title: nodeId.substring(0, 8) + "…",
                displayCode: null,
                templateType: null,
              },
            })
            .run();
          return null;
        },
      }),
    ];
  },
});
