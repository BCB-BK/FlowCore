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

function createDropIndicator(): HTMLElement {
  const indicator = document.createElement("div");
  indicator.className = "block-drop-indicator";
  indicator.style.cssText =
    "position:absolute;left:0;right:0;height:2px;background:hsl(var(--primary));border-radius:1px;z-index:50;pointer-events:none;display:none;";
  return indicator;
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
    let dropIndicator: HTMLElement | null = null;
    let currentBlockPos: number | null = null;
    let isDragging = false;

    return [
      new Plugin({
        key: DRAG_HANDLE_KEY,
        view(editorView) {
          dragHandle = createDragHandleElement();
          dropIndicator = createDropIndicator();
          const parent = editorView.dom.parentElement;
          if (parent) {
            parent.appendChild(dragHandle);
            parent.appendChild(dropIndicator);
          }

          dragHandle.addEventListener("dragstart", (e) => {
            if (currentBlockPos === null) return;
            isDragging = true;

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
            e.dataTransfer!.effectAllowed = "move";

            if (dragHandle) {
              dragHandle.style.opacity = "0.8";
              dragHandle.style.cursor = "grabbing";
            }
          });

          dragHandle.addEventListener("dragend", () => {
            isDragging = false;
            if (dragHandle) {
              dragHandle.style.cursor = "grab";
              dragHandle.style.opacity = "0";
            }
            if (dropIndicator) {
              dropIndicator.style.display = "none";
            }
          });

          return {
            destroy() {
              dragHandle?.remove();
              dropIndicator?.remove();
              dragHandle = null;
              dropIndicator = null;
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

              if (isDragging) return false;

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
              if (dragHandle && !isDragging) {
                dragHandle.style.opacity = "0";
              }
              return false;
            },
            dragover(view, event) {
              if (!isDragging || !dropIndicator) return false;

              event.preventDefault();
              event.dataTransfer!.dropEffect = "move";

              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!pos) return false;

              const block = getTopLevelBlockAtPos(view, pos.pos);
              if (!block) return false;

              const parentRect = view.dom.parentElement?.getBoundingClientRect();
              const blockRect = block.domNode.getBoundingClientRect();
              if (!parentRect) return false;

              const midY = blockRect.top + blockRect.height / 2;
              const isAbove = event.clientY < midY;
              const indicatorTop = isAbove
                ? blockRect.top - parentRect.top - 1
                : blockRect.bottom - parentRect.top - 1;

              dropIndicator.style.display = "block";
              dropIndicator.style.top = `${indicatorTop}px`;

              return false;
            },
            dragleave(_view, _event) {
              if (dropIndicator) {
                dropIndicator.style.display = "none";
              }
              return false;
            },
            drop(view, event) {
              if (dropIndicator) {
                dropIndicator.style.display = "none";
              }
              isDragging = false;

              if (!view.dragging) return false;

              const dragging = view.dragging;
              const slice = dragging.slice;
              if (!slice || currentBlockPos === null) return false;

              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!pos) return false;

              const block = getTopLevelBlockAtPos(view, pos.pos);
              if (!block) return false;

              const blockRect = block.domNode.getBoundingClientRect();
              const midY = blockRect.top + blockRect.height / 2;
              const isAbove = event.clientY < midY;

              const { state } = view;
              const $resolved = state.doc.resolve(block.pos);
              const targetIndex = $resolved.index(0);

              let targetPos: number;
              if (isAbove) {
                targetPos = block.pos;
              } else {
                const targetNode = state.doc.child(targetIndex);
                targetPos = block.pos + targetNode.nodeSize;
              }

              event.preventDefault();

              const srcResolved = state.doc.resolve(currentBlockPos);
              const srcIndex = srcResolved.index(0);
              const srcNode = state.doc.child(srcIndex);
              let srcFrom = 0;
              for (let i = 0; i < srcIndex; i++) {
                srcFrom += state.doc.child(i).nodeSize;
              }
              const srcTo = srcFrom + srcNode.nodeSize;

              if (targetPos >= srcFrom && targetPos <= srcTo) {
                return true;
              }

              const tr = state.tr;

              if (srcFrom < targetPos) {
                tr.insert(targetPos, slice.content);
                tr.delete(srcFrom, srcTo);
              } else {
                tr.delete(srcFrom, srcTo);
                tr.insert(targetPos, slice.content);
              }

              view.dispatch(tr);
              return true;
            },
          },
        },
      }),
    ];
  },
});
