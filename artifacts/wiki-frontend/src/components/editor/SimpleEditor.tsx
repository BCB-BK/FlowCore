import { useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
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
import { ReactNodeViewRenderer } from "@tiptap/react";

interface SimpleEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

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

  const insertLink = useCallback(() => {
    const url = prompt("Link-URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  return (
    <div className="flex items-center gap-0.5 flex-wrap border-b p-1 bg-muted/30">
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
        title="Nummerierung"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </MiniToolbarButton>

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      <MiniToolbarButton onClick={insertLink} isActive={editor.isActive("link")} title="Link einfügen">
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
      TiptapImage.configure({ inline: false, allowBase64: false }),
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
    <div className="rounded-md border bg-background">
      <MiniToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
