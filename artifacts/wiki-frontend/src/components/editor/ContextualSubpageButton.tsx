import { useState, useCallback, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { Plus, FileText } from "lucide-react";

interface ContextualSubpageButtonProps {
  editor: Editor;
  nodeId?: string;
  onCreateSubpage?: (context: { headingText: string; afterPos: number }) => void;
}

interface HeadingSlot {
  pos: number;
  text: string;
  level: number;
  top: number;
}

export function ContextualSubpageButton({
  editor,
  nodeId,
  onCreateSubpage,
}: ContextualSubpageButtonProps) {
  const [slots, setSlots] = useState<HeadingSlot[]>([]);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSlots = useCallback(() => {
    if (!editor.isEditable || !nodeId) {
      setSlots([]);
      return;
    }

    const headingSlots: HeadingSlot[] = [];
    const editorRect = editor.view.dom.getBoundingClientRect();

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        const level = node.attrs.level as number;
        if (level <= 2) {
          try {
            const endPos = pos + node.nodeSize;
            const coords = editor.view.coordsAtPos(endPos);
            headingSlots.push({
              pos: endPos,
              text: node.textContent,
              level,
              top: coords.bottom - editorRect.top + 4,
            });
          } catch {
            // skip
          }
        }
      }
    });

    setSlots(headingSlots);
  }, [editor, nodeId]);

  useEffect(() => {
    updateSlots();
    editor.on("update", updateSlots);
    editor.on("selectionUpdate", updateSlots);
    return () => {
      editor.off("update", updateSlots);
      editor.off("selectionUpdate", updateSlots);
    };
  }, [editor, updateSlots]);

  if (!editor.isEditable || !nodeId || slots.length === 0) return null;

  return (
    <div ref={containerRef} className="absolute right-0 top-0 w-6 z-10">
      {slots.map((slot) => (
        <div
          key={slot.pos}
          className="absolute right-0"
          style={{ top: slot.top }}
          onMouseEnter={() => setHoveredSlot(slot.pos)}
          onMouseLeave={() => setHoveredSlot(null)}
        >
          {hoveredSlot === slot.pos ? (
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors whitespace-nowrap"
              onClick={() =>
                onCreateSubpage?.({
                  headingText: slot.text,
                  afterPos: slot.pos,
                })
              }
            >
              <Plus className="h-3 w-3" />
              <FileText className="h-3 w-3" />
              Unterseite
            </button>
          ) : (
            <button
              className="p-0.5 rounded-full text-muted-foreground/30 hover:text-primary hover:bg-primary/10 transition-colors"
              title={`Unterseite unter "${slot.text}" anlegen`}
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
