import { Node, mergeAttributes } from "@tiptap/react";

export interface DiagramBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    diagramBlock: {
      setDiagramBlock: (attrs: {
        diagramType?: string;
        src?: string;
        caption?: string;
      }) => ReturnType;
    };
  }
}

export const DiagramBlock = Node.create<DiagramBlockOptions>({
  name: "diagramBlock",
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
      diagramType: { default: "flowchart" },
      src: { default: null },
      caption: { default: "" },
      description: { default: "" },
      width: { default: "100%" },
      height: { default: "400" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="diagram-block"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "diagram-block" }),
    ];
  },

  addCommands() {
    return {
      setDiagramBlock:
        (attrs: { diagramType?: string; src?: string; caption?: string }) =>
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
