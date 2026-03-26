import { Node, mergeAttributes } from "@tiptap/react";
import type { MediaSourceType } from "./video-block";

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
        caption?: string;
        altText?: string;
        source?: string;
        license?: string;
        sourceType?: MediaSourceType;
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
      caption: { default: "" },
      altText: { default: "" },
      source: { default: "" },
      license: { default: "" },
      sourceType: { default: "upload" as MediaSourceType },
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
        (attrs) =>
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
});
