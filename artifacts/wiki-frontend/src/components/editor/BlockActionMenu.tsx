import { useCallback, useEffect, useState, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { TableSizePicker } from "./TableSizePicker";
import {
  GripVertical,
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Table,
  Quote,
  Minus,
  Image,
  Video,
  FileText,
  Globe,
  AlertCircle,
  GitBranch,
  GalleryHorizontalEnd,
  type LucideIcon,
} from "lucide-react";

interface BlockActionMenuProps {
  editor: Editor;
}

interface InsertItem {
  title: string;
  icon: LucideIcon;
  category: string;
  isTable?: boolean;
  action: (
    editor: Editor,
    pos: number,
    opts?: { rows?: number; cols?: number; withHeaderRow?: boolean },
  ) => void;
}

function insertEmptyParagraphAt(editor: Editor, pos: number) {
  const tr = editor.state.tr;
  const node = editor.state.schema.nodes.paragraph.create();
  tr.insert(pos, node);
  const sel = TextSelection.near(tr.doc.resolve(pos + 1));
  tr.setSelection(sel);
  editor.view.dispatch(tr);
  editor.view.focus();
}

const INSERT_ITEMS: InsertItem[] = [
  {
    title: "Absatz",
    icon: Pilcrow,
    category: "Text",
    action: (editor, pos) => {
      const tr = editor.state.tr;
      const node = editor.state.schema.nodes.paragraph.create();
      tr.insert(pos, node);
      const sel = TextSelection.near(tr.doc.resolve(pos + 1));
      tr.setSelection(sel);
      editor.view.dispatch(tr);
      editor.view.focus();
    },
  },
  {
    title: "Überschrift 1",
    icon: Heading1,
    category: "Text",
    action: (editor, pos) => {
      const tr = editor.state.tr;
      const node = editor.state.schema.nodes.heading.create({ level: 1 });
      tr.insert(pos, node);
      const sel = TextSelection.near(tr.doc.resolve(pos + 1));
      tr.setSelection(sel);
      editor.view.dispatch(tr);
      editor.view.focus();
    },
  },
  {
    title: "Überschrift 2",
    icon: Heading2,
    category: "Text",
    action: (editor, pos) => {
      const tr = editor.state.tr;
      const node = editor.state.schema.nodes.heading.create({ level: 2 });
      tr.insert(pos, node);
      const sel = TextSelection.near(tr.doc.resolve(pos + 1));
      tr.setSelection(sel);
      editor.view.dispatch(tr);
      editor.view.focus();
    },
  },
  {
    title: "Überschrift 3",
    icon: Heading3,
    category: "Text",
    action: (editor, pos) => {
      const tr = editor.state.tr;
      const node = editor.state.schema.nodes.heading.create({ level: 3 });
      tr.insert(pos, node);
      const sel = TextSelection.near(tr.doc.resolve(pos + 1));
      tr.setSelection(sel);
      editor.view.dispatch(tr);
      editor.view.focus();
    },
  },
  {
    title: "Aufzählung",
    icon: List,
    category: "Listen",
    action: (editor, pos) => {
      const tr = editor.state.tr;
      const schema = editor.state.schema;
      const listItem = schema.nodes.listItem.create(
        null,
        schema.nodes.paragraph.create(),
      );
      const list = schema.nodes.bulletList.create(null, listItem);
      tr.insert(pos, list);
      editor.view.dispatch(tr);
      editor.view.focus();
    },
  },
  {
    title: "Nummerierung",
    icon: ListOrdered,
    category: "Listen",
    action: (editor, pos) => {
      const tr = editor.state.tr;
      const schema = editor.state.schema;
      const listItem = schema.nodes.listItem.create(
        null,
        schema.nodes.paragraph.create(),
      );
      const list = schema.nodes.orderedList.create(null, listItem);
      tr.insert(pos, list);
      editor.view.dispatch(tr);
      editor.view.focus();
    },
  },
  {
    title: "Checkliste",
    icon: CheckSquare,
    category: "Listen",
    action: (editor, pos) => {
      const tr = editor.state.tr;
      const schema = editor.state.schema;
      const taskItem = schema.nodes.taskItem.create(
        { checked: false },
        schema.nodes.paragraph.create(),
      );
      const taskList = schema.nodes.taskList.create(null, taskItem);
      tr.insert(pos, taskList);
      editor.view.dispatch(tr);
      editor.view.focus();
    },
  },
  {
    title: "Tabelle",
    icon: Table,
    category: "Struktur",
    isTable: true,
    action: (editor, pos, opts) => {
      insertEmptyParagraphAt(editor, pos);
      editor
        .chain()
        .focus()
        .insertTable({
          rows: opts?.rows ?? 3,
          cols: opts?.cols ?? 3,
          withHeaderRow: opts?.withHeaderRow ?? true,
        })
        .run();
    },
  },
  {
    title: "Hinweis",
    icon: AlertCircle,
    category: "Struktur",
    action: (editor, pos) => {
      insertEmptyParagraphAt(editor, pos);
      editor.chain().focus().setCallout({ type: "info" }).run();
    },
  },
  {
    title: "Zitat",
    icon: Quote,
    category: "Struktur",
    action: (editor, pos) => {
      insertEmptyParagraphAt(editor, pos);
      editor.chain().focus().setBlockquote().run();
    },
  },
  {
    title: "Trennlinie",
    icon: Minus,
    category: "Struktur",
    action: (editor, pos) => {
      insertEmptyParagraphAt(editor, pos);
      editor.chain().focus().setHorizontalRule().run();
    },
  },
  {
    title: "Bild",
    icon: Image,
    category: "Medien",
    action: (editor, pos) => {
      insertEmptyParagraphAt(editor, pos);
      window.dispatchEvent(
        new CustomEvent("editor:open-media-library", {
          detail: { type: "image" },
        }),
      );
    },
  },
  {
    title: "Galerie",
    icon: GalleryHorizontalEnd,
    category: "Medien",
    action: (editor, pos) => {
      insertEmptyParagraphAt(editor, pos);
      editor.chain().focus().setGalleryBlock({ images: [], columns: 3 }).run();
    },
  },
  {
    title: "Video",
    icon: Video,
    category: "Medien",
    action: (editor, pos) => {
      insertEmptyParagraphAt(editor, pos);
      window.dispatchEvent(
        new CustomEvent("editor:open-media-library", {
          detail: { type: "video" },
        }),
      );
    },
  },
  {
    title: "Datei",
    icon: FileText,
    category: "Medien",
    action: (editor, pos) => {
      insertEmptyParagraphAt(editor, pos);
      window.dispatchEvent(
        new CustomEvent("editor:open-media-library", {
          detail: { type: "file" },
        }),
      );
    },
  },
  {
    title: "Einbettung",
    icon: Globe,
    category: "Medien",
    action: (editor, pos) => {
      insertEmptyParagraphAt(editor, pos);
      const url = prompt("URL eingeben:");
      if (url) {
        editor.chain().focus().setEmbedBlock({ src: url }).run();
      }
    },
  },
  {
    title: "Diagramm",
    icon: GitBranch,
    category: "Medien",
    action: (editor, pos) => {
      insertEmptyParagraphAt(editor, pos);
      editor
        .chain()
        .focus()
        .setDiagramBlock({ diagramType: "flowchart" })
        .run();
    },
  },
];

export function BlockActionMenu({ editor }: BlockActionMenuProps) {
  const [menuState, setMenuState] = useState<{
    visible: boolean;
    pos: number;
    top: number;
    left: number;
  }>({ visible: false, pos: 0, top: 0, left: 0 });

  const [showActions, setShowActions] = useState(false);
  const [showInsertPicker, setShowInsertPicker] = useState(false);
  const [insertFilter, setInsertFilter] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const insertRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);

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
    if (!showActions && !showInsertPicker) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowActions(false);
      }
      if (insertRef.current && !insertRef.current.contains(target)) {
        setShowInsertPicker(false);
        setInsertFilter("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showActions, showInsertPicker]);

  useEffect(() => {
    if (showInsertPicker && filterInputRef.current) {
      filterInputRef.current.focus();
    }
  }, [showInsertPicker]);

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
    const blockPos = menuState.pos;
    let start: number;
    let end: number;
    try {
      const $pos = state.doc.resolve(blockPos);
      const depth = $pos.depth > 0 ? 1 : 0;
      if (depth > 0) {
        start = $pos.before(depth);
        end = $pos.after(depth);
      } else {
        const node = state.doc.nodeAt(blockPos);
        if (!node) {
          const range = getBlockRange(state);
          if (!range) return;
          start = range.start;
          end = range.end;
        } else {
          start = blockPos;
          end = blockPos + node.nodeSize;
        }
      }
    } catch {
      const range = getBlockRange(state);
      if (!range) return;
      start = range.start;
      end = range.end;
    }

    const tr = state.tr;
    tr.delete(start, end);
    if (tr.doc.childCount === 0) {
      tr.insert(0, state.schema.nodes.paragraph.create());
    }
    dispatch(tr);
    setShowActions(false);
    setMenuState((prev) => ({ ...prev, visible: false }));
  }, [editor, menuState.pos]);

  const convertToParagraph = useCallback(() => {
    editor.chain().focus().setParagraph().run();
    setShowActions(false);
  }, [editor]);

  const handleInsertItem = useCallback(
    (item: InsertItem) => {
      const range = getBlockRange(editor.state);
      const insertPos = range ? range.end : editor.state.doc.content.size;
      item.action(editor, insertPos);
      setShowInsertPicker(false);
      setInsertFilter("");
    },
    [editor],
  );

  const filteredInsertItems = INSERT_ITEMS.filter(
    (item) =>
      !insertFilter ||
      item.title.toLowerCase().includes(insertFilter.toLowerCase()) ||
      item.category.toLowerCase().includes(insertFilter.toLowerCase()),
  );

  const grouped = filteredInsertItems.reduce<Record<string, InsertItem[]>>(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {},
  );

  if (!menuState.visible) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-10 flex items-center gap-0.5"
      style={{ top: menuState.top, left: menuState.left }}
    >
      <div className="relative" ref={insertRef}>
        <button
          onClick={() => {
            setShowInsertPicker((prev) => !prev);
            setShowActions(false);
            setInsertFilter("");
          }}
          className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Block einfügen"
        >
          <Plus className="h-4 w-4" />
        </button>

        {showInsertPicker && (
          <div className="absolute left-0 top-full mt-1 w-64 rounded-lg border bg-popover shadow-lg z-50">
            <div className="p-1.5 border-b">
              <input
                ref={filterInputRef}
                type="text"
                className="w-full px-2 py-1 text-xs rounded border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Block suchen..."
                value={insertFilter}
                onChange={(e) => setInsertFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowInsertPicker(false);
                    setInsertFilter("");
                  }
                  if (e.key === "Enter" && filteredInsertItems.length > 0) {
                    handleInsertItem(filteredInsertItems[0]);
                  }
                }}
              />
            </div>
            <div className="p-1 max-h-72 overflow-y-auto">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </div>
                  {items.map((item) => {
                    const Icon = item.icon;
                    if (item.isTable) {
                      return (
                        <div key={item.title} className="px-2 py-1.5">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="font-medium text-xs">
                              {item.title}
                            </span>
                          </div>
                          <TableSizePicker
                            onPick={(rows, cols, withHeader) => {
                              const range = getBlockRange(editor.state);
                              const insertPos = range
                                ? range.end
                                : editor.state.doc.content.size;
                              item.action(editor, insertPos, {
                                rows,
                                cols,
                                withHeaderRow: withHeader,
                              });
                              setShowInsertPicker(false);
                              setInsertFilter("");
                            }}
                          />
                        </div>
                      );
                    }
                    return (
                      <button
                        key={item.title}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                        onClick={() => handleInsertItem(item)}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium text-xs">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {filteredInsertItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Keine Blöcke gefunden
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => {
          setShowActions((prev) => !prev);
          setShowInsertPicker(false);
        }}
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
