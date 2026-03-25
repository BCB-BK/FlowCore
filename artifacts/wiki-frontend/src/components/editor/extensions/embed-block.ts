import { Node, mergeAttributes } from "@tiptap/react";

const ALLOWED_EMBED_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "microsoft.com",
  "sharepoint.com",
  "office.com",
  "teams.microsoft.com",
  "miro.com",
  "figma.com",
  "lucid.app",
  "draw.io",
  "diagrams.net",
  "loom.com",
  "sway.office.com",
];

export function isAllowedEmbedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_EMBED_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

export interface EmbedBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    embedBlock: {
      setEmbedBlock: (attrs: { src: string; caption?: string }) => ReturnType;
    };
  }
}

export const EmbedBlock = Node.create<EmbedBlockOptions>({
  name: "embedBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      caption: { default: "" },
      width: { default: "100%" },
      height: { default: "400" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="embed-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "embed-block" }),
    ];
  },

  addCommands() {
    return {
      setEmbedBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
