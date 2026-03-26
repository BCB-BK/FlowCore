import { useEffect, useState, useCallback, useRef } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table as TiptapTable } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import TiptapUnderline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import type { JSONContent } from "@tiptap/react";

import { Callout } from "./extensions/callout";
import { EmbedBlock } from "./extensions/embed-block";
import { VideoBlock } from "./extensions/video-block";
import { FileBlock } from "./extensions/file-block";
import { DiagramBlock } from "./extensions/diagram-block";
import { BlockId } from "./extensions/block-id";
import { DragHandle } from "./extensions/drag-handle";
import {
  CalloutNodeView,
  EmbedBlockNodeView,
  VideoBlockNodeView,
  FileBlockNodeView,
  DiagramBlockNodeView,
} from "./NodeViews";
import { EditorToolbar } from "./EditorToolbar";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { MediaLibraryDialog } from "./MediaLibraryDialog";
import { BlockActionMenu } from "./BlockActionMenu";
import { EditorDropzone } from "./EditorDropzone";
import { ContextualSubpageButton } from "./ContextualSubpageButton";
import { EDITOR_CONFIG } from "@/lib/editor-config";

import { Badge } from "@/components/ui/badge";
import { Save, AlertTriangle } from "lucide-react";

interface BlockEditorProps {
  content: JSONContent | null;
  onSave: (content: JSONContent) => void | Promise<void>;
  onContentChange?: (content: JSONContent) => void;
  editable?: boolean;
  nodeId?: string;
  lastSavedAt?: Date | null;
  conflictWarning?: string | null;
  className?: string;
  onTrackMediaUsage?: (assetId: string) => void;
  onCreateSubpage?: (context: { headingText: string; afterPos: number }) => void;
  parentTemplateType?: string;
}

const AUTOSAVE_INTERVAL = EDITOR_CONFIG.autosaveIntervalMs;

function getDraftKey(nodeId?: string): string {
  return `wiki-draft-${nodeId || "new"}`;
}

export function BlockEditor({
  content,
  onSave,
  onContentChange,
  editable = true,
  nodeId,
  lastSavedAt,
  conflictWarning,
  className,
  onTrackMediaUsage,
  onCreateSubpage,
  parentTemplateType,
}: BlockEditorProps) {
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

  const [mediaDialog, setMediaDialog] = useState<{
    open: boolean;
    type: "image" | "video" | "file" | null;
    replace: boolean;
  }>({ open: false, type: null, replace: false });

  const [hasDraft, setHasDraft] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastContentRef = useRef<string>("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        dropcursor: { color: "hsl(var(--primary))", width: 2 },
      }),
      Placeholder.configure({
        placeholder: 'Tippen Sie "/" für Befehle...',
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TiptapTable.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TiptapImage.configure({ inline: false, allowBase64: false }),
      TiptapLink.configure({
        openOnClick: !editable,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      TiptapUnderline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      TextStyle,
      Typography,
      Callout.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CalloutNodeView);
        },
      }),
      EmbedBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(EmbedBlockNodeView);
        },
      }),
      VideoBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(VideoBlockNodeView);
        },
      }),
      FileBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(FileBlockNodeView);
        },
      }),
      DiagramBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(DiagramBlockNodeView);
        },
      }),
      BlockId,
      DragHandle,
    ],
    content: content || { type: "doc", content: [{ type: "paragraph" }] },
    editable,
    onUpdate: ({ editor: ed }) => {
      setIsDirty(true);
      if (onContentChange) {
        onContentChange(ed.getJSON());
      }
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

      if (slashMenu.isOpen) {
        setSlashMenu((prev) => ({ ...prev, isOpen: false }));
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3",
      },
    },
  });

  useEffect(() => {
    if (editor && content) {
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson = JSON.stringify(content);
      if (currentJson !== newJson) {
        editor.commands.setContent(content);
        lastContentRef.current = newJson;
        setIsDirty(false);
      }
    }
  }, [editor, content]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  useEffect(() => {
    if (!editable || !nodeId) return;
    const draftKey = getDraftKey(nodeId);
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        const draftJson = JSON.stringify(parsed.content);
        const currentJson = JSON.stringify(content);
        if (draftJson !== currentJson) {
          setHasDraft(true);
        }
      } catch {
        localStorage.removeItem(draftKey);
      }
    }
  }, [nodeId, editable, content]);

  const saveDraft = useCallback(() => {
    if (!editor || !nodeId || !isDirty) return;
    const draftKey = getDraftKey(nodeId);
    const draftData = {
      content: editor.getJSON(),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [editor, nodeId, isDirty]);

  useEffect(() => {
    if (!editable) return;
    autosaveTimer.current = setInterval(saveDraft, AUTOSAVE_INTERVAL);
    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current);
    };
  }, [editable, saveDraft]);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    const json = editor.getJSON();
    try {
      await onSave(json);
      setIsDirty(false);
      if (nodeId) {
        localStorage.removeItem(getDraftKey(nodeId));
      }
      setHasDraft(false);
    } catch {
      saveDraft();
    }
  }, [editor, onSave, nodeId]);

  const restoreDraft = useCallback(() => {
    if (!editor || !nodeId) return;
    const draftKey = getDraftKey(nodeId);
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        editor.commands.setContent(parsed.content);
        setHasDraft(false);
        setIsDirty(true);
      } catch {
        localStorage.removeItem(draftKey);
      }
    }
  }, [editor, nodeId]);

  const discardDraft = useCallback(() => {
    if (nodeId) {
      localStorage.removeItem(getDraftKey(nodeId));
    }
    setHasDraft(false);
  }, [nodeId]);

  useEffect(() => {
    const handleMediaEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setMediaDialog({
        open: true,
        type: detail?.type || null,
        replace: !!detail?.replace,
      });
    };
    window.addEventListener("editor:open-media-library", handleMediaEvent);
    return () =>
      window.removeEventListener("editor:open-media-library", handleMediaEvent);
  }, []);

  const handleMediaSelect = useCallback(
    (asset: {
      url: string;
      originalFilename: string;
      sizeBytes: number;
      mimeType: string;
      id: string;
    }) => {
      if (!editor) return;

      if (mediaDialog.replace) {
        const { state } = editor;
        const { selection } = state;
        const node = state.doc.nodeAt(selection.from);
        const resolvedPos = state.doc.resolve(selection.from);
        const parentNode = resolvedPos.depth > 0 ? resolvedPos.parent : null;
        const targetNode = node || parentNode;

        if (targetNode) {
          const nodeName = targetNode.type.name;
          if (nodeName === "videoBlock") {
            editor
              .chain()
              .focus()
              .updateAttributes("videoBlock", {
                src: asset.url,
                sourceType: "upload",
              })
              .run();
          } else if (nodeName === "fileBlock") {
            editor
              .chain()
              .focus()
              .updateAttributes("fileBlock", {
                src: asset.url,
                filename: asset.originalFilename,
                filesize: asset.sizeBytes,
                mimeType: asset.mimeType,
                sourceType: "upload",
              })
              .run();
          } else if (nodeName === "diagramBlock") {
            editor
              .chain()
              .focus()
              .updateAttributes("diagramBlock", { src: asset.url })
              .run();
          } else if (asset.mimeType.startsWith("image/")) {
            editor
              .chain()
              .focus()
              .setImage({ src: asset.url, alt: asset.originalFilename })
              .run();
          }
        }
      } else {
        if (asset.mimeType.startsWith("image/")) {
          editor
            .chain()
            .focus()
            .setImage({ src: asset.url, alt: asset.originalFilename })
            .run();
        } else if (asset.mimeType.startsWith("video/")) {
          editor
            .chain()
            .focus()
            .setVideoBlock({
              src: asset.url,
              caption: asset.originalFilename,
              sourceType: "upload",
            })
            .run();
        } else {
          editor
            .chain()
            .focus()
            .setFileBlock({
              src: asset.url,
              filename: asset.originalFilename,
              filesize: asset.sizeBytes,
              mimeType: asset.mimeType,
              sourceType: "upload",
            })
            .run();
        }
      }

      if (onTrackMediaUsage && asset.id) {
        onTrackMediaUsage(asset.id);
      }
    },
    [editor, onTrackMediaUsage, mediaDialog.replace],
  );

  if (!editor) return null;

  return (
    <div className={`rounded-lg border bg-background ${className || ""}`}>
      {hasDraft && editable && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-200 dark:border-yellow-800 text-sm">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-yellow-800 dark:text-yellow-200">
            Ungespeicherter Entwurf gefunden.
          </span>
          <button
            onClick={restoreDraft}
            className="text-primary font-medium hover:underline"
          >
            Wiederherstellen
          </button>
          <button
            onClick={discardDraft}
            className="text-muted-foreground hover:underline"
          >
            Verwerfen
          </button>
        </div>
      )}

      {conflictWarning && (
        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-red-800 dark:text-red-200">
            {conflictWarning}
          </span>
        </div>
      )}

      {editable && <EditorToolbar editor={editor} />}

      <EditorDropzone
        editor={editor}
        nodeId={nodeId}
        onTrackMediaUsage={onTrackMediaUsage}
      >
        <div className="relative pl-6">
          {editable && <BlockActionMenu editor={editor} />}
          {editable && onCreateSubpage && (
            <ContextualSubpageButton
              editor={editor}
              nodeId={nodeId}
              onCreateSubpage={onCreateSubpage}
            />
          )}
          <EditorContent editor={editor} />
        </div>
      </EditorDropzone>

      {editable && (
        <div className="flex items-center justify-between border-t p-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {isDirty && <Badge variant="outline">Nicht gespeichert</Badge>}
            {lastSavedAt && (
              <span>
                Zuletzt gespeichert: {lastSavedAt.toLocaleTimeString("de-DE")}
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
          >
            <Save className="h-3 w-3" />
            Speichern
          </button>
        </div>
      )}

      <SlashCommandMenu
        editor={editor}
        isOpen={slashMenu.isOpen}
        position={slashMenu.position}
        range={slashMenu.range}
        onClose={() => setSlashMenu((prev) => ({ ...prev, isOpen: false }))}
        query={slashMenu.query}
      />

      <MediaLibraryDialog
        open={mediaDialog.open}
        onOpenChange={(open) => setMediaDialog({ open, type: null, replace: false })}
        onSelect={handleMediaSelect}
        filterType={mediaDialog.type}
        nodeId={nodeId}
      />
    </div>
  );
}
