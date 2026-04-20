import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  Trash2,
  Rows,
  Columns,
  Heading,
  Merge,
  Split,
  Table as TableIcon,
} from "lucide-react";

interface TableContextMenuProps {
  editor: Editor;
}

export function TableContextMenu({ editor }: TableContextMenuProps) {
  const [state, setState] = useState<{
    visible: boolean;
    top: number;
    left: number;
  }>({ visible: false, top: 0, left: 0 });

  const update = useCallback(() => {
    if (!editor.isEditable || !editor.isActive("table")) {
      setState((prev) => ({ ...prev, visible: false }));
      return;
    }
    try {
      const { from } = editor.state.selection;
      const $pos = editor.state.doc.resolve(from);
      let tablePos: number | null = null;
      for (let d = $pos.depth; d >= 0; d--) {
        const node = $pos.node(d);
        if (node.type.name === "table") {
          tablePos = $pos.before(d);
          break;
        }
      }
      if (tablePos === null) {
        setState((prev) => ({ ...prev, visible: false }));
        return;
      }
      const coords = editor.view.coordsAtPos(tablePos + 1);
      const editorRect = editor.view.dom.getBoundingClientRect();
      setState({
        visible: true,
        top: coords.top - editorRect.top - 36,
        left: 0,
      });
    } catch {
      setState((prev) => ({ ...prev, visible: false }));
    }
  }, [editor]);

  useEffect(() => {
    const hide = () => setState((prev) => ({ ...prev, visible: false }));
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("focus", update);
    editor.on("blur", hide);
    editor.on("destroy", hide);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      editor.off("focus", update);
      editor.off("blur", hide);
      editor.off("destroy", hide);
    };
  }, [editor, update]);

  if (!state.visible) return null;

  const run = (fn: () => boolean) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <div
      className="absolute z-20 flex items-center gap-0.5 rounded-md border bg-popover px-1 py-0.5 shadow-sm"
      style={{ top: state.top, left: state.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <span className="flex items-center gap-1 px-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
        <TableIcon className="h-3 w-3" />
        Tabelle
      </span>
      <Sep />
      <IconBtn
        title="Zeile oben einfügen"
        icon={ArrowUpToLine}
        onClick={run(() => editor.chain().addRowBefore().run())}
      />
      <IconBtn
        title="Zeile unten einfügen"
        icon={ArrowDownToLine}
        onClick={run(() => editor.chain().addRowAfter().run())}
      />
      <IconBtn
        title="Zeile löschen"
        icon={Rows}
        onClick={run(() => editor.chain().deleteRow().run())}
      />
      <Sep />
      <IconBtn
        title="Spalte links einfügen"
        icon={ArrowLeftToLine}
        onClick={run(() => editor.chain().addColumnBefore().run())}
      />
      <IconBtn
        title="Spalte rechts einfügen"
        icon={ArrowRightToLine}
        onClick={run(() => editor.chain().addColumnAfter().run())}
      />
      <IconBtn
        title="Spalte löschen"
        icon={Columns}
        onClick={run(() => editor.chain().deleteColumn().run())}
      />
      <Sep />
      <IconBtn
        title="Kopfzeile umschalten"
        icon={Heading}
        onClick={run(() => editor.chain().toggleHeaderRow().run())}
      />
      <IconBtn
        title="Zellen verbinden"
        icon={Merge}
        onClick={run(() => editor.chain().mergeCells().run())}
      />
      <IconBtn
        title="Zelle teilen"
        icon={Split}
        onClick={run(() => editor.chain().splitCell().run())}
      />
      <Sep />
      <IconBtn
        title="Tabelle löschen"
        icon={Trash2}
        destructive
        onClick={run(() => editor.chain().deleteTable().run())}
      />
    </div>
  );
}

function Sep() {
  return <div className="mx-0.5 h-4 w-px bg-border" />;
}

function IconBtn({
  icon: Icon,
  title,
  onClick,
  destructive,
}: {
  icon: typeof TableIcon;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`p-1 rounded hover:bg-accent transition-colors ${
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
