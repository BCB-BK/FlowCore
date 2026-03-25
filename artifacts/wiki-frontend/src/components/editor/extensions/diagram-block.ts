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

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "diagram-block" }),
    ];
  },

  addCommands() {
    return {
      setDiagramBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
