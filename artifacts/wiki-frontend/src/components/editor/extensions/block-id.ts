import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const BLOCK_ID_KEY = new PluginKey("blockId");

export const BlockId = Extension.create({
  name: "blockId",

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "bulletList",
          "orderedList",
          "listItem",
          "taskList",
          "taskItem",
          "table",
          "blockquote",
          "horizontalRule",
          "codeBlock",
          "image",
          "callout",
          "videoBlock",
          "embedBlock",
          "fileBlock",
          "diagramBlock",
          "galleryBlock",
        ],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.getAttribute("data-block-id") || null,
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.blockId) return {};
              return { "data-block-id": attributes.blockId };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: BLOCK_ID_KEY,
        appendTransaction: (_transactions, _oldState, newState) => {
          const { tr } = newState;
          let modified = false;

          newState.doc.descendants((node, pos) => {
            if (node.isBlock && node.type.spec.attrs?.blockId !== undefined) {
              if (!node.attrs.blockId) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  blockId: crypto.randomUUID(),
                });
                modified = true;
              }
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});
