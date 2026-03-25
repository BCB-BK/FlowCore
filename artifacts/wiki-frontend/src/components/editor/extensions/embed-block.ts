import { Node, mergeAttributes } from "@tiptap/react";
import { EDITOR_CONFIG, isDomainAllowed } from "@/lib/editor-config";

export function isAllowedEmbedUrl(url: string): boolean {
  return isDomainAllowed(url, EDITOR_CONFIG.allowedEmbedDomains);
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
      blockId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-block-id"),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.blockId ? { "data-block-id": attrs.blockId } : {},
      },
      src: { default: null },
      caption: { default: "" },
      width: { default: "100%" },
      height: { default: "400" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="embed-block"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "embed-block" }),
    ];
  },

  addCommands() {
    return {
      setEmbedBlock:
        (attrs: { src: string; caption?: string }) =>
        ({
          commands,
        }: {
          commands: {
            insertContent: (content: Record<string, unknown>) => boolean;
          };
        }) =>
          commands.insertContent({
            type: this.name,
            attrs: { ...attrs, blockId: crypto.randomUUID() },
          }),
    };
  },
});
