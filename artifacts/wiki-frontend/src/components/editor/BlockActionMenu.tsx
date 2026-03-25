import { useCallback, useEffect, useState, useRef } from "react";
import type { Editor } from "@tiptap/react";
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

  const moveBlockUp = useCallback(() => {
    const { state, dispatch } = editor.view;
    const resolvedPos = state.doc.resolve(state.selection.from);
    const blockIndex = resolvedPos.index(0);
    if (blockIndex === 0) return;

    const blockBefore = state.doc.child(blockIndex - 1);
    const currentBlock = state.doc.child(blockIndex);
    let blockBeforeStart = 0;
    for (let i = 0; i < blockIndex - 1; i++) {
      blockBeforeStart += state.doc.child(i).nodeSize;
    }
    blockBeforeStart += 1;

    const tr = state.tr;
    const currentStart = blockBeforeStart + blockBefore.nodeSize;
    tr.delete(currentStart, currentStart + currentBlock.nodeSize);
    tr.insert(blockBeforeStart, currentBlock);
    dispatch(tr);
    setShowActions(false);
  }, [editor]);

  const moveBlockDown = useCallback(() => {
    const { state, dispatch } = editor.view;
    const resolvedPos = state.doc.resolve(state.selection.from);
    const blockIndex = resolvedPos.index(0);
    if (blockIndex >= state.doc.childCount - 1) return;

    const currentBlock = state.doc.child(blockIndex);
    const blockAfter = state.doc.child(blockIndex + 1);
    let currentStart = 1;
    for (let i = 0; i < blockIndex; i++) {
      currentStart += state.doc.child(i).nodeSize;
    }

    const tr = state.tr;
    const afterEnd = currentStart + currentBlock.nodeSize + blockAfter.nodeSize;
    tr.delete(currentStart, afterEnd);
    tr.insert(currentStart, blockAfter);
    tr.insert(currentStart + blockAfter.nodeSize, currentBlock);
    dispatch(tr);
    setShowActions(false);
  }, [editor]);

  const duplicateBlock = useCallback(() => {
    const { state, dispatch } = editor.view;
    const resolvedPos = state.doc.resolve(state.selection.from);
    const blockIndex = resolvedPos.index(0);
    const currentBlock = state.doc.child(blockIndex);

    let blockEnd = 1;
    for (let i = 0; i <= blockIndex; i++) {
      blockEnd += state.doc.child(i).nodeSize;
    }

    const newNode = currentBlock.type.create(
      {
        ...currentBlock.attrs,
        blockId: crypto.randomUUID(),
      },
      currentBlock.content,
      currentBlock.marks,
    );

    const tr = state.tr;
    tr.insert(blockEnd, newNode);
    dispatch(tr);
    setShowActions(false);
  }, [editor]);

  const deleteBlock = useCallback(() => {
    const { state, dispatch } = editor.view;
    const resolvedPos = state.doc.resolve(state.selection.from);
    const blockIndex = resolvedPos.index(0);
    const currentBlock = state.doc.child(blockIndex);

    let blockStart = 1;
    for (let i = 0; i < blockIndex; i++) {
      blockStart += state.doc.child(i).nodeSize;
    }

    const tr = state.tr;
    tr.delete(blockStart, blockStart + currentBlock.nodeSize);
    if (state.doc.childCount === 1) {
      tr.insert(1, state.schema.nodes.paragraph.create());
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
    const resolvedPos = state.doc.resolve(state.selection.from);
    const blockIndex = resolvedPos.index(0);

    let blockEnd = 1;
    for (let i = 0; i <= blockIndex; i++) {
      blockEnd += state.doc.child(i).nodeSize;
    }

    const tr = state.tr;
    const newParagraph = state.schema.nodes.paragraph.create();
    tr.insert(blockEnd, newParagraph);
    const newPos = tr.doc.resolve(blockEnd + 1);
    const sel = (
      state.selection.constructor as unknown as {
        near: (pos: typeof newPos) => typeof state.selection;
      }
    ).near(newPos);
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
