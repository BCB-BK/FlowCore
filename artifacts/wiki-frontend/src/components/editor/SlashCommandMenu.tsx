import { useState, useEffect, useCallback, useRef } from "react";
import type { Editor, Range } from "@tiptap/react";
import {
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

interface SlashMenuItem {
  title: string;
  description: string;
  icon: LucideIcon;
  command: (editor: Editor, range: Range) => void;
  category: string;
}

const SLASH_ITEMS: SlashMenuItem[] = [
  {
    title: "Überschrift 1",
    description: "Große Überschrift",
    icon: Heading1,
    category: "Text",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: "Überschrift 2",
    description: "Mittlere Überschrift",
    icon: Heading2,
    category: "Text",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: "Überschrift 3",
    description: "Kleine Überschrift",
    icon: Heading3,
    category: "Text",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: "Aufzählung",
    description: "Einfache Aufzählung",
    icon: List,
    category: "Listen",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Nummerierung",
    description: "Nummerierte Liste",
    icon: ListOrdered,
    category: "Listen",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Checkliste",
    description: "Aufgabenliste mit Checkboxen",
    icon: CheckSquare,
    category: "Listen",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Tabelle",
    description: "Tabelle einfügen",
    icon: Table,
    category: "Struktur",
    command: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: "Hinweis",
    description: "Hervorgehobener Hinweisblock",
    icon: AlertCircle,
    category: "Struktur",
    command: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setCallout({ type: "info" })
        .run(),
  },
  {
    title: "Zitat",
    description: "Blockzitat",
    icon: Quote,
    category: "Struktur",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setBlockquote().run(),
  },
  {
    title: "Trennlinie",
    description: "Horizontale Trennlinie",
    icon: Minus,
    category: "Struktur",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "Bild",
    description: "Bild einfügen",
    icon: Image,
    category: "Medien",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const event = new CustomEvent("editor:open-media-library", {
        detail: { type: "image" },
      });
      window.dispatchEvent(event);
    },
  },
  {
    title: "Video",
    description: "Video einbetten",
    icon: Video,
    category: "Medien",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const event = new CustomEvent("editor:open-media-library", {
        detail: { type: "video" },
      });
      window.dispatchEvent(event);
    },
  },
  {
    title: "Datei",
    description: "Dateianhang einfügen",
    icon: FileText,
    category: "Medien",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const event = new CustomEvent("editor:open-media-library", {
        detail: { type: "file" },
      });
      window.dispatchEvent(event);
    },
  },
  {
    title: "Galerie",
    description: "Bildergalerie einfügen",
    icon: GalleryHorizontalEnd,
    category: "Medien",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      editor
        .chain()
        .focus()
        .setGalleryBlock({ images: [], columns: 3 })
        .run();
    },
  },
  {
    title: "Einbettung",
    description: "Externe Inhalte einbetten (YouTube, Miro, etc.)",
    icon: Globe,
    category: "Medien",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const url = prompt("URL eingeben:");
      if (url) {
        editor.chain().focus().setEmbedBlock({ src: url }).run();
      }
    },
  },
  {
    title: "Diagramm",
    description: "Diagramm-Platzhalter (Flowchart, BPMN, Swimlane)",
    icon: GitBranch,
    category: "Medien",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      editor
        .chain()
        .focus()
        .setDiagramBlock({ diagramType: "flowchart" })
        .run();
    },
  },
];

interface SlashCommandMenuProps {
  editor: Editor;
  isOpen: boolean;
  position: { top: number; left: number };
  range: Range;
  onClose: () => void;
  query: string;
}

export function SlashCommandMenu({
  editor,
  isOpen,
  position,
  range,
  onClose,
  query,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (index: number) => {
      const item = filtered[index];
      if (item) {
        item.command(editor, range);
        onClose();
      }
    },
    [editor, filtered, onClose, range],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(selectedIndex);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered.length, selectedIndex, handleSelect, onClose]);

  if (!isOpen || filtered.length === 0) return null;

  const grouped = filtered.reduce<Record<string, typeof filtered>>(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {},
  );

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 max-h-80 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            {category}
          </div>
          {items.map((item) => {
            const globalIndex = filtered.indexOf(item);
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer ${
                  globalIndex === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                }`}
                onClick={() => handleSelect(globalIndex)}
                onMouseEnter={() => setSelectedIndex(globalIndex)}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
