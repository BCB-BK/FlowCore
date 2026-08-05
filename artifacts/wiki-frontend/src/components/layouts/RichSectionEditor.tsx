import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TiptapLink from "@tiptap/extension-link";
import TiptapUnderline from "@tiptap/extension-underline";
import { Extension } from "@tiptap/core";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  IndentIncrease,
  IndentDecrease,
  Undo2,
  Redo2,
  RemoveFormatting,
} from "lucide-react";
import { Toggle } from "@workspace/ui/toggle";
import { Separator } from "@workspace/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/tooltip";

/** Tab / Shift+Tab rückt Listenpunkte ein bzw. aus. */
const ListIndentKeymap = Extension.create({
  name: "sectionListIndent",
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.can().sinkListItem("listItem")) {
          return this.editor.chain().focus().sinkListItem("listItem").run();
        }
        return false;
      },
      "Shift-Tab": () => {
        if (this.editor.can().liftListItem("listItem")) {
          return this.editor.chain().focus().liftListItem("listItem").run();
        }
        return false;
      },
    };
  },
});

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={isActive}
          onPressedChange={onClick}
          disabled={disabled}
          aria-label={title}
          className="h-7 w-7 p-0"
        >
          {children}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

interface RichSectionEditorProps {
  /** HTML-Inhalt */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Beim Öffnen fokussieren */
  autoFocus?: boolean;
}

/**
 * Kompakter Formatierungs-Editor für Abschnittsfelder.
 *
 * Bewusst schlank gehalten: nur die Auszeichnungen, die beim Übernehmen von
 * Inhalten aus Word, Confluence & Co. tatsächlich gebraucht werden. Der
 * vollwertige Block-Editor bleibt dem Seiteninhalt vorbehalten.
 */
export function RichSectionEditor({
  value,
  onChange,
  placeholder,
  autoFocus,
}: RichSectionEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TiptapUnderline,
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "Inhalt eingeben…" }),
      ListIndentKeymap,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] px-3 py-2",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.isEmpty ? "" : ed.getHTML());
    },
  });

  useEffect(() => {
    if (editor && autoFocus) editor.commands.focus("end");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-md border bg-background">
      <div
        role="toolbar"
        aria-label="Textformatierung"
        className="flex flex-wrap items-center gap-0.5 border-b p-1"
      >
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Fett (Strg+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Kursiv (Strg+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Unterstrichen (Strg+U)"
        >
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Durchgestrichen"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Überschrift"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Unterüberschrift"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Aufzählung"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Nummerierung"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
          disabled={!editor.can().sinkListItem("listItem")}
          title="Einrücken (Tab)"
        >
          <IndentIncrease className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().liftListItem("listItem").run()}
          disabled={!editor.can().liftListItem("listItem")}
          title="Ausrücken (Shift+Tab)"
        >
          <IndentDecrease className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Zitat"
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
          title="Formatierung entfernen"
        >
          <RemoveFormatting className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Rückgängig (Strg+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Wiederholen (Strg+Y)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
