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

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "file-block" }),
    ];
  },

  addCommands() {
    return {
      setFileBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
