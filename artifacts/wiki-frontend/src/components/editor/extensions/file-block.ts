import { Node, mergeAttributes } from "@tiptap/react";

export interface FileBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    fileBlock: {
      setFileBlock: (attrs: {
        src: string;
        filename: string;
        filesize?: number;
        mimeType?: string;
      }) => ReturnType;
    };
  }
}

export const FileBlock = Node.create<FileBlockOptions>({
  name: "fileBlock",
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
      filename: { default: "" },
      filesize: { default: 0 },
      mimeType: { default: "" },
      assetId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="file-block"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "file-block" }),
    ];
  },

  addCommands() {
    return {
      setFileBlock:
        (attrs: {
          src: string;
          filename: string;
          filesize?: number;
          mimeType?: string;
        }) =>
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
