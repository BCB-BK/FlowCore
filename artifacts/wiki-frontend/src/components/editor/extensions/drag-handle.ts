import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { type EditorView } from "@tiptap/pm/view";

const DRAG_HANDLE_KEY = new PluginKey("dragHandle");

function createDragHandleElement(): HTMLElement {
  const handle = document.createElement("div");
  handle.className = "block-drag-handle";
  handle.draggable = true;
  handle.innerHTML = `<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
    <circle cx="2" cy="7" r="1.5"/><circle cx="8" cy="7" r="1.5"/>
    <circle cx="2" cy="12" r="1.5"/><circle cx="8" cy="12" r="1.5"/>
  </svg>`;
  handle.style.cssText =
    "position:absolute;left:-24px;cursor:grab;opacity:0;transition:opacity 0.15s;padding:2px 4px;border-radius:4px;color:var(--muted-foreground,#999);z-index:10;display:flex;align-items:center;justify-content:center;";
  return handle;
}

function getTopLevelBlockAtPos(
  view: EditorView,
  pos: number,
): { node: Node; pos: number; domNode: HTMLElement } | null {
  const $pos = view.state.doc.resolve(pos);
  if ($pos.depth === 0) return null;

  const topIndex = $pos.index(0);
  const topNode = view.state.doc.child(topIndex);
  const topPos =
    $pos.start(0) +
    (() => {
      let offset = 0;
      for (let i = 0; i < topIndex; i++) {
        offset += view.state.doc.child(i).nodeSize;
      }
      return offset;
    })();

  const domNode = view.nodeDOM(topPos);
  if (!domNode || !(domNode instanceof HTMLElement)) return null;

  return { node: topNode as unknown as Node, pos: topPos, domNode };
}

export const DragHandle = Extension.create({
  name: "dragHandle",

  addProseMirrorPlugins() {
    let dragHandle: HTMLElement | null = null;
    let currentBlockPos: number | null = null;

    return [
      new Plugin({
        key: DRAG_HANDLE_KEY,
        view(editorView) {
          dragHandle = createDragHandleElement();
          editorView.dom.parentElement?.appendChild(dragHandle);

          dragHandle.addEventListener("dragstart", (e) => {
            if (currentBlockPos === null) return;
            const { state } = editorView;
            const resolved = state.doc.resolve(currentBlockPos);
            const topIndex = resolved.index(0);
            const topNode = state.doc.child(topIndex);

            const topPos = (() => {
              let offset = 0;
              for (let i = 0; i < topIndex; i++) {
                offset += state.doc.child(i).nodeSize;
              }
              return offset;
            })();

            const from = topPos;
            const to = from + topNode.nodeSize;
            const slice = state.doc.slice(from, to);

            editorView.dragging = { slice, move: true };
            e.dataTransfer?.setData("text/plain", "");
          });

          return {
            destroy() {
              dragHandle?.remove();
              dragHandle = null;
            },
          };
        },
        props: {
          handleDOMEvents: {
            mousemove(view, event) {
              if (!dragHandle) return false;
              if (!view.editable) {
                dragHandle.style.opacity = "0";
                return false;
              }

              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!pos) {
                dragHandle.style.opacity = "0";
                return false;
              }

              const block = getTopLevelBlockAtPos(view, pos.pos);
              if (!block) {
                dragHandle.style.opacity = "0";
                return false;
              }

              currentBlockPos = block.pos;
              const parentRect =
                view.dom.parentElement?.getBoundingClientRect();
              const blockRect = block.domNode.getBoundingClientRect();

              if (parentRect) {
                dragHandle.style.top = `${blockRect.top - parentRect.top + 2}px`;
                dragHandle.style.opacity = "0.4";
              }

              return false;
            },
            mouseleave(_view) {
              if (dragHandle) {
                dragHandle.style.opacity = "0";
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
