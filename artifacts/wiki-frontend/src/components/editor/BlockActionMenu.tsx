import { useCallback, useEffect, useState, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import {
  GripVertical,
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Pilcrow,
} from "lucide-react";

interface BlockActionMenuProps {
  editor: Editor;
}

export function BlockActionMenu({ editor }: BlockActionMenuProps) {
  const [menuState, setMenuState] = useState<{
    visible: boolean;
    pos: number;
    top: number;
    left: number;
  }>({ visible: false, pos: 0, top: 0, left: 0 });

  const [showActions, setShowActions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!editor.isEditable) {
      setMenuState((prev) => ({ ...prev, visible: false }));
      return;
    }

    const { state } = editor;
    const { selection } = state;
    const resolvedPos = state.doc.resolve(selection.from);
    const blockStart = resolvedPos.start(1);

    try {
      const coords = editor.view.coordsAtPos(blockStart);
      const editorRect = editor.view.dom.getBoundingClientRect();

      setMenuState({
        visible: true,
        pos: blockStart,
        top: coords.top - editorRect.top,
        left: -36,
      });
    } catch {
      setMenuState((prev) => ({ ...prev, visible: false }));
    }
  }, [editor]);

  useEffect(() => {
    editor.on("selectionUpdate", updatePosition);
    editor.on("focus", updatePosition);
    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("focus", updatePosition);
    };
  }, [editor, updatePosition]);

  useEffect(() => {
    if (!showActions) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showActions]);

  function getBlockRange(state: typeof editor.state) {
    const $pos = state.doc.resolve(state.selection.from);
    const depth = $pos.depth > 0 ? 1 : 0;
    if (depth === 0) return null;
    const start = $pos.before(depth);
    const end = $pos.after(depth);
    const index = $pos.index(0);
    const node = state.doc.child(index);
    return { start, end, index, node };
  }

  const moveBlockUp = useCallback(() => {
    const { state, dispatch } = editor.view;
    const range = getBlockRange(state);
    if (!range || range.index === 0) return;

    const $prev = state.doc.resolve(range.start - 1);
    const prevStart = $prev.before($prev.depth);

    const tr = state.tr;
    const blockSlice = tr.doc.slice(range.start, range.end);
    tr.delete(range.start, range.end);
    tr.insert(prevStart, blockSlice.content);
    dispatch(tr);
    setShowActions(false);
  }, [editor]);

  const moveBlockDown = useCallback(() => {
    const { state, dispatch } = editor.view;
    const range = getBlockRange(state);
    if (!range || range.index >= state.doc.childCount - 1) return;

    const nextNode = state.doc.child(range.index + 1);
    const insertPos = range.end + nextNode.nodeSize;

    const tr = state.tr;
    const blockSlice = tr.doc.slice(range.start, range.end);
    tr.delete(range.start, range.end);
    const adjustedPos = insertPos - (range.end - range.start);
    tr.insert(adjustedPos, blockSlice.content);
    dispatch(tr);
    setShowActions(false);
  }, [editor]);

  const duplicateBlock = useCallback(() => {
    const { state, dispatch } = editor.view;
    const range = getBlockRange(state);
    if (!range) return;

    const newNode = range.node.type.create(
      {
        ...range.node.attrs,
        blockId: crypto.randomUUID(),
      },
      range.node.content,
      range.node.marks,
    );

    const tr = state.tr;
    tr.insert(range.end, newNode);
    dispatch(tr);
    setShowActions(false);
  }, [editor]);

  const deleteBlock = useCallback(() => {
    const { state, dispatch } = editor.view;
    const range = getBlockRange(state);
    if (!range) return;

    const tr = state.tr;
    tr.delete(range.start, range.end);
    if (state.doc.childCount === 1) {
      tr.insert(0, state.schema.nodes.paragraph.create());
    }
    dispatch(tr);
    setShowActions(false);
  }, [editor]);

  const convertToParagraph = useCallback(() => {
    editor.chain().focus().setParagraph().run();
    setShowActions(false);
  }, [editor]);

  const insertBlockBelow = useCallback(() => {
    const { state, dispatch } = editor.view;
    const range = getBlockRange(state);
    if (!range) return;

    const tr = state.tr;
    const newParagraph = state.schema.nodes.paragraph.create();
    tr.insert(range.end, newParagraph);
    const sel = TextSelection.near(tr.doc.resolve(range.end + 1));
    tr.setSelection(sel);
    dispatch(tr);
    editor.view.focus();
    setShowActions(false);
  }, [editor]);

  if (!menuState.visible) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-10 flex items-center gap-0.5"
      style={{ top: menuState.top, left: menuState.left }}
    >
      <button
        onClick={insertBlockBelow}
        className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="Block einfügen"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        onClick={() => setShowActions((prev) => !prev)}
        className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-grab"
        title="Block-Aktionen"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {showActions && (
        <div className="absolute left-0 top-full mt-1 w-44 rounded-lg border bg-popover shadow-lg z-50">
          <div className="p-1">
            <ActionButton
              icon={ArrowUp}
              label="Nach oben"
              onClick={moveBlockUp}
            />
            <ActionButton
              icon={ArrowDown}
              label="Nach unten"
              onClick={moveBlockDown}
            />
            <ActionButton
              icon={Copy}
              label="Duplizieren"
              onClick={duplicateBlock}
            />
            <ActionButton
              icon={Pilcrow}
              label="Zu Absatz"
              onClick={convertToParagraph}
            />
            <div className="my-1 border-t" />
            <ActionButton
              icon={Trash2}
              label="Löschen"
              onClick={deleteBlock}
              destructive
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer ${
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "hover:bg-accent"
      }`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
