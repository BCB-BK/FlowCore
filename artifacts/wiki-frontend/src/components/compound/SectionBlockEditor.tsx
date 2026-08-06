import { useState, useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TiptapLink from "@tiptap/extension-link";
import TiptapUnderline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import type { JSONContent } from "@tiptap/react";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Button } from "@workspace/ui/button";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  CheckSquare,
  Pencil,
  Check,
  X,
  AlignLeft,
  AlignCenter,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FieldAiButton } from "@/components/ai/FieldAiButton";
import { WikiLink } from "@/components/editor/extensions/wiki-link";
import { WikiLinkNodeView } from "@/components/editor/NodeViews";
import { SlashCommandMenu } from "@/components/editor/SlashCommandMenu";
import { WikiNodePickerDialog } from "@/components/compound/WikiNodePickerDialog";

function parseSectionContent(raw: string): JSONContent {
  if (!raw) return { type: "doc", content: [{ type: "paragraph" }] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.type === "doc")
      return parsed;
  } catch {}
  const paragraphs = raw.split(/\n{2,}/).filter((p) => p.trim());
  if (paragraphs.length === 0)
    return { type: "doc", content: [{ type: "paragraph" }] };
  return {
    type: "doc",
    content: paragraphs.map((p) => ({
      type: "paragraph",
      content: p.trim()
        ? [{ type: "text", text: p.replace(/\n/g, " ").trim() }]
        : undefined,
    })),
  };
}

function isEmptyDoc(content: JSONContent | null): boolean {
  if (!content) return true;
  if (!content.content || content.content.length === 0) return true;
  return content.content.every(
    (node) => !node.content || node.content.length === 0,
  );
}

function extractPlainText(doc: JSONContent): string {
  function walk(node: JSONContent): string {
    if (node.type === "text") return node.text ?? "";
    if (!node.content) return "";
    const childText = node.content.map(walk).join("");
    if (node.type === "paragraph" || node.type === "heading")
      return childText + "\n";
    if (node.type === "listItem") return "- " + childText;
    return childText;
  }
  return walk(doc).trim();
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  title: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  icon: Icon,
  title,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`h-6 w-6 flex items-center justify-center rounded text-xs transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

interface SectionBlockEditorProps {
  value: string;
  onSave?: (key: string, value: unknown) => void;
  sectionKey: string;
  label: string;
  icon?: LucideIcon;
  iconColor?: string;
  emptyText?: string;
  placeholder?: string;
  readOnly?: boolean;
  pageType?: string;
  nodeId?: string;
}

export function SectionBlockEditor({
  value,
  onSave,
  sectionKey,
  label,
  icon: Icon,
  iconColor = "text-muted-foreground",
  emptyText = "Noch kein Inhalt",
  placeholder,
  readOnly = false,
  pageType,
  nodeId,
}: SectionBlockEditorProps) {
  const [editing, setEditing] = useState(false);
  const isEditable = !readOnly && !!onSave;

  const [slashMenu, setSlashMenu] = useState<{
    isOpen: boolean;
    position: { top: number; left: number };
    range: { from: number; to: number };
    query: string;
  }>({
    isOpen: false,
    position: { top: 0, left: 0 },
    range: { from: 0, to: 0 },
    query: "",
  });
  const [wikiPickerOpen, setWikiPickerOpen] = useState(false);
  const slashMenuRef = useRef(slashMenu);
  slashMenuRef.current = slashMenu;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? `${label} eingeben...`,
      }),
      TiptapUnderline,
      TiptapLink.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      WikiLink.extend({
        addNodeView() {
          return ReactNodeViewRenderer(WikiLinkNodeView);
        },
      }),
    ],
    content: parseSectionContent(value),
    editable: false,
    onUpdate: ({ editor: ed }) => {
      const json = JSON.stringify(ed.getJSON());
      if (json.includes('"/')) {
        const { state } = ed;
        const { from } = state.selection;
        const textBefore = state.doc.textBetween(
          Math.max(0, from - 20),
          from,
          "",
        );
        const slashMatch = textBefore.match(/\/([^/]*)$/);

        if (slashMatch) {
          const coords = ed.view.coordsAtPos(from);
          setSlashMenu({
            isOpen: true,
            position: { top: coords.bottom + 4, left: coords.left },
            range: { from: from - slashMatch[0].length, to: from },
            query: slashMatch[1],
          });
          return;
        }
      }
      if (slashMenuRef.current.isOpen) {
        setSlashMenu((prev) => ({ ...prev, isOpen: false }));
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[100px] px-1",
      },
    },
  });

  useEffect(() => {
    const handleWikiPickerEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { editor?: unknown }
        | undefined;
      if (detail?.editor !== editor) return;
      setWikiPickerOpen(true);
    };
    window.addEventListener("editor:open-wiki-picker", handleWikiPickerEvent);
    return () =>
      window.removeEventListener(
        "editor:open-wiki-picker",
        handleWikiPickerEvent,
      );
  }, [editor]);

  const handleEdit = useCallback(() => {
    if (!editor) return;
    editor.commands.setContent(parseSectionContent(value));
    editor.setEditable(true);
    setEditing(true);
    setTimeout(() => editor.commands.focus("end"), 30);
  }, [editor, value]);

  const handleSave = useCallback(() => {
    if (!editor) return;
    const json = editor.getJSON();
    onSave?.(sectionKey, JSON.stringify(json));
    editor.setEditable(false);
    setEditing(false);
  }, [editor, onSave, sectionKey]);

  const handleCancel = useCallback(() => {
    if (!editor) return;
    editor.commands.setContent(parseSectionContent(value));
    editor.setEditable(false);
    setEditing(false);
  }, [editor, value]);

  useEffect(() => {
    if (!editor || editing) return;
    editor.commands.setContent(parseSectionContent(value), {
      emitUpdate: false,
    });
  }, [value, editor, editing]);

  const getFieldValue = useCallback(() => {
    if (editor) return extractPlainText(editor.getJSON());
    return extractPlainText(parseSectionContent(value));
  }, [editor, value]);

  const handleAiApply = useCallback(
    (newText: string) => {
      if (!editor) return;
      const newContent = parseSectionContent(newText);
      if (editing) {
        editor.commands.setContent(newContent);
      } else {
        editor.commands.setContent(newContent, { emitUpdate: false });
        onSave?.(sectionKey, JSON.stringify(newContent));
      }
    },
    [editor, editing, onSave, sectionKey],
  );

  const displayContent = parseSectionContent(value);
  const displayEmpty = isEmptyDoc(displayContent);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {Icon && <Icon className={`h-4 w-4 ${iconColor}`} />}
            {label}
          </CardTitle>
          <div className="flex items-center gap-1">
            {isEditable && pageType && (
              <FieldAiButton
                fieldKey={sectionKey}
                pageType={pageType}
                nodeId={nodeId}
                getValue={getFieldValue}
                onApply={handleAiApply}
              />
            )}
            {isEditable && !editing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleEdit}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Bearbeiten
              </Button>
            )}
            {editing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleCancel}
                >
                  <X className="h-3 w-3 mr-1" />
                  Abbrechen
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleSave}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Speichern
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {editing && editor && (
          <div className="flex flex-wrap gap-0.5 mb-2 pb-2 border-b">
            <ToolbarButton
              icon={Bold}
              title="Fett"
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
            />
            <ToolbarButton
              icon={Italic}
              title="Kursiv"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
            />
            <ToolbarButton
              icon={Underline}
              title="Unterstrichen"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
            />
            <div className="w-px h-5 bg-border mx-0.5 self-center" />
            <ToolbarButton
              icon={List}
              title="Aufzählung"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
            />
            <ToolbarButton
              icon={ListOrdered}
              title="Nummerierung"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
            />
            <ToolbarButton
              icon={CheckSquare}
              title="Aufgabenliste"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              active={editor.isActive("taskList")}
            />
            <div className="w-px h-5 bg-border mx-0.5 self-center" />
            <ToolbarButton
              icon={AlignLeft}
              title="Linksbündig"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              active={editor.isActive({ textAlign: "left" })}
            />
            <ToolbarButton
              icon={AlignCenter}
              title="Zentriert"
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              active={editor.isActive({ textAlign: "center" })}
            />
            <div className="w-px h-5 bg-border mx-0.5 self-center" />
            <ToolbarButton
              icon={BookOpen}
              title="Wiki-Seite verlinken"
              onClick={() => setWikiPickerOpen(true)}
              active={false}
            />
          </div>
        )}
        {!editing && displayEmpty ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyText}
          </p>
        ) : (
          <EditorContent editor={editor} />
        )}
      </CardContent>
      {editing && editor && (
        <SlashCommandMenu
          editor={editor}
          isOpen={slashMenu.isOpen}
          position={slashMenu.position}
          range={slashMenu.range}
          onClose={() => setSlashMenu((prev) => ({ ...prev, isOpen: false }))}
          query={slashMenu.query}
        />
      )}
      {wikiPickerOpen && (
        <WikiNodePickerDialog
          onSelect={(pickedNodeId, title, _url, templateType, displayCode) => {
            if (editor) {
              editor
                .chain()
                .focus()
                .setWikiLink({
                  nodeId: pickedNodeId,
                  title,
                  displayCode: displayCode ?? null,
                  templateType: templateType ?? null,
                })
                .run();
            }
            setWikiPickerOpen(false);
          }}
          onClose={() => setWikiPickerOpen(false)}
        />
      )}
    </Card>
  );
}
