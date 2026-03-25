import { Node, mergeAttributes } from "@tiptap/react";

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { type?: string }) => ReturnType;
      toggleCallout: (attrs?: { type?: string }) => ReturnType;
    };
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: "callout",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "info",
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-callout-type") || "info",
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-callout-type": attrs.type,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "callout" }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs?: { type?: string }) =>
        ({
          commands,
        }: {
          commands: {
            setNode: (name: string, attrs?: Record<string, unknown>) => boolean;
          };
        }) =>
          commands.setNode(this.name, attrs),
      toggleCallout:
        (attrs?: { type?: string }) =>
        ({
          commands,
        }: {
          commands: {
            toggleNode: (
              name: string,
              fallback: string,
              attrs?: Record<string, unknown>,
            ) => boolean;
          };
        }) =>
          commands.toggleNode(this.name, "paragraph", attrs),
    };
  },
});
