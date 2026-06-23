import { useEffect, useCallback, useState } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Extension } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import TiptapUnderline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link,
  Unlink,
  Image,
  Video,
  Highlighter,
  Undo2,
  Redo2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Separator } from "@workspace/ui/separator";
import { Toggle } from "@workspace/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/tooltip";
import { VideoBlock } from "./extensions/video-block";
import { VideoBlockNodeView } from "./NodeViews";

interface SimpleEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const IndentKeymap = Extension.create({
  name: "indentKeymap",
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

const ResizableImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML(attributes) {
          if (!attributes.width) return {};
          return { "data-width": attributes.width, style: `width: ${attributes.width}; max-width: 100%;` };
        },
        parseHTML(element) {
          return element.getAttribute("data-width") || null;
        },
      },
      "data-float": {
        default: "none",
        renderHTML(attributes) {
          const f = attributes["data-float"];
          if (!f || f === "none") return { "data-float": "none" };
          return { "data-float": f };
        },
        parseHTML(element) {
          return element.getAttribute("data-float") || "none";
        },
      },
    };
  },
});

function MiniToolbarButton({
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
          onPressedChange={() => onClick()}
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

function LinkBubbleMenuContent({ editor }: { editor: Editor }) {
  const [isEditing, setIsEditing] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const currentHref = editor.getAttributes("link").href as string | undefined ?? "";

  const handleStartEdit = useCallback(() => {
    setUrlDraft(currentHref);
    setIsEditing(true);
  }, [currentHref]);

  const handleConfirm = useCallback(() => {
    if (urlDraft.trim()) {
      editor.chain().focus().setLink({ href: urlDraft.trim() }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setIsEditing(false);
  }, [editor, urlDraft]);

  const handleRemove = useCallback(() => {
    editor.chain().focus().unsetLink().run();
    setIsEditing(false);
  }, [editor]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 bg-background border rounded-md shadow-md p-1">
        <input
          className="text-xs px-2 py-1 border rounded w-52 focus:outline-none focus:ring-1 focus:ring-primary bg-background"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
            if (e.key === "Escape") setIsEditing(false);
          }}
          placeholder="https://..."
          autoFocus
        />
        <button
          className="p-1 hover:bg-muted rounded"
          onClick={handleConfirm}
          title="Bestätigen"
        >
          <Check className="h-3.5 w-3.5 text-green-600" />
        </button>
        <button
          className="p-1 hover:bg-muted rounded"
          onClick={() => setIsEditing(false)}
          title="Abbrechen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-background border rounded-md shadow-md p-1 max-w-xs">
      <span className="text-xs text-muted-foreground px-1 truncate max-w-[160px]">
        {currentHref}
      </span>
      <button
        className="inline-flex items-center gap-0.5 px-1.5 py-1 text-xs hover:bg-muted rounded whitespace-nowrap"
        onClick={handleStartEdit}
        title="Link bearbeiten"
      >
        <Pencil className="h-3 w-3" />
        Bearbeiten
      </button>
      <button
        className="inline-flex items-center gap-0.5 px-1.5 py-1 text-xs hover:bg-muted rounded text-destructive whitespace-nowrap"
        onClick={handleRemove}
        title="Link entfernen"
      >
        <Unlink className="h-3 w-3" />
        Entfernen
      </button>
    </div>
  );
}

function ImageBubbleMenuContent({ editor }: { editor: Editor }) {
  const attrs = editor.getAttributes("image");
  const currentFloat = (attrs["data-float"] as string) || "none";
  const currentWidth = (attrs.width as string) || null;

  const setWidth = useCallback(
    (w: string | null) =>
      editor.chain().focus().updateAttributes("image", { width: w }).run(),
    [editor],
  );

  const setFloat = useCallback(
    (f: string) =>
      editor.chain().focus().updateAttributes("image", { "data-float": f }).run(),
    [editor],
  );

  const WIDTH_OPTIONS: Array<{ label: string; value: string | null }> = [
    { label: "25%", value: "25%" },
    { label: "50%", value: "50%" },
    { label: "75%", value: "75%" },
    { label: "100%", value: null },
  ];

  const FLOAT_OPTIONS = [
    { label: "Block", value: "none" },
    { label: "Links", value: "left" },
    { label: "Rechts", value: "right" },
  ];

  return (
    <div className="flex items-center gap-1 bg-background border rounded-md shadow-md p-1 flex-wrap">
      <span className="text-xs text-muted-foreground">Breite:</span>
      {WIDTH_OPTIONS.map(({ label, value }) => {
        const isActive = value === null ? !currentWidth : currentWidth === value;
        return (
          <button
            key={label}
            className={`text-xs px-1.5 py-0.5 rounded ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => setWidth(value)}
          >
            {label}
          </button>
        );
      })}
      <Separator orientation="vertical" className="mx-0.5 h-4" />
      <span className="text-xs text-muted-foreground">Umfluss:</span>
      {FLOAT_OPTIONS.map(({ label, value }) => (
        <button
          key={value}
          className={`text-xs px-1.5 py-0.5 rounded ${currentFloat === value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          onClick={() => setFloat(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function MiniToolbar({ editor }: { editor: Editor }) {
  const insertImage = useCallback(() => {
    const url = prompt("Bild-URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url, alt: "Bild" }).run();
    }
  }, [editor]);

  const insertVideo = useCallback(() => {
    const url = prompt("Video-URL (YouTube, Vimeo, MP4):");
    if (url) {
      editor
        .chain()
        .focus()
        .setVideoBlock({ src: url, caption: "" })
        .run();
    }
  }, [editor]);

  const insertOrEditLink = useCallback(() => {
    const previous = (editor.getAttributes("link").href as string | undefined) ?? "";
    const url = prompt("Link-URL:", previous);
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url.trim() }).run();
    }
  }, [editor]);

  return (
    <div
      role="toolbar"
      aria-label="Textformatierung"
      className="flex items-center gap-0.5 flex-wrap border-b p-1 bg-background sticky top-0 z-10"
    >
      <MiniToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Rückgängig"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </MiniToolbarButton>
      <MiniToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Wiederholen"
      >
        <Redo2 className="h-3.5 w-3.5" />
      </MiniToolbarButton>

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      <MiniToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Fett"
      >
        <Bold className="h-3.5 w-3.5" />
      </MiniToolbarButton>
      <MiniToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Kursiv"
      >
        <Italic className="h-3.5 w-3.5" />
      </MiniToolbarButton>
      <MiniToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Unterstrichen"
      >
        <Underline className="h-3.5 w-3.5" />
      </MiniToolbarButton>
      <MiniToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Durchgestrichen"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </MiniToolbarButton>
      <MiniToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive("highlight")}
        title="Hervorheben"
      >
        <Highlighter className="h-3.5 w-3.5" />
      </MiniToolbarButton>

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      <MiniToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Aufzählung"
      >
        <List className="h-3.5 w-3.5" />
      </MiniToolbarButton>
      <MiniToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Nummerierung (Tab = nächste Ebene)"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </MiniToolbarButton>

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      <MiniToolbarButton
        onClick={insertOrEditLink}
        isActive={editor.isActive("link")}
        title="Link einfügen / bearbeiten"
      >
        <Link className="h-3.5 w-3.5" />
      </MiniToolbarButton>
      {editor.isActive("link") && (
        <MiniToolbarButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="Link entfernen"
        >
          <Unlink className="h-3.5 w-3.5" />
        </MiniToolbarButton>
      )}
      <MiniToolbarButton onClick={insertImage} title="Bild einfügen">
        <Image className="h-3.5 w-3.5" />
      </MiniToolbarButton>
      <MiniToolbarButton onClick={insertVideo} title="Video einfügen">
        <Video className="h-3.5 w-3.5" />
      </MiniToolbarButton>
    </div>
  );
}

export function SimpleEditor({
  content,
  onChange,
  placeholder = "Definition eingeben...",
  minHeight = "200px",
}: SimpleEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Placeholder.configure({ placeholder }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      TiptapUnderline,
      Highlight.configure({ multicolor: false }),
      VideoBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(VideoBlockNodeView);
        },
      }),
      IndentKeymap,
    ],
    content: content || "",
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2`,
        style: `min-height: ${minHeight}`,
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
  }, [content]);

  if (!editor) return null;

  return (
    <div className="rounded-md border bg-background relative">
      <MiniToolbar editor={editor} />

      <BubbleMenu
        editor={editor}
        shouldShow={({ editor: e }) => e.isActive("link")}
      >
        <LinkBubbleMenuContent editor={editor} />
      </BubbleMenu>

      <BubbleMenu
        editor={editor}
        shouldShow={({ state }) =>
          state.selection instanceof NodeSelection &&
          state.selection.node.type.name === "image"
        }
      >
        <ImageBubbleMenuContent editor={editor} />
      </BubbleMenu>

      <EditorContent editor={editor} />
    </div>
  );
}
