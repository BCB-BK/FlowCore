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
import { GalleryBlock } from "./extensions/gallery-block";
import { BlockId } from "./extensions/block-id";
import { DragHandle } from "./extensions/drag-handle";
import { WikiLink } from "./extensions/wiki-link";
import { Indent } from "./extensions/indent";
import {
  CalloutNodeView,
  EmbedBlockNodeView,
  VideoBlockNodeView,
  FileBlockNodeView,
  DiagramBlockNodeView,
  GalleryBlockNodeView,
  WikiLinkNodeView,
} from "./NodeViews";
import { WikiNodePickerDialog } from "@/components/compound/WikiNodePickerDialog";
import { EditorToolbar } from "./EditorToolbar";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { MediaLibraryDialog } from "./MediaLibraryDialog";
import { BlockActionMenu } from "./BlockActionMenu";
import { TableContextMenu } from "./TableContextMenu";
import { EditorDropzone } from "./EditorDropzone";
import { ContextualSubpageButton } from "./ContextualSubpageButton";
import { ContentCompletenessBar } from "./ContentCompletenessBar";
import { EDITOR_CONFIG } from "@/lib/editor-config";

import { Badge } from "@workspace/ui/badge";
import { Save, AlertTriangle } from "lucide-react";
import { FieldAiButton } from "@/components/ai/FieldAiButton";

function textToTiptapContent(text: string): JSONContent {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  if (paragraphs.length === 0) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
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
  fieldKey?: string;
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
  fieldKey,
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
    galleryMode: boolean;
  }>({ open: false, type: null, replace: false, galleryMode: false });

  const mediaDialogRef = useRef(mediaDialog);
  mediaDialogRef.current = mediaDialog;

  const [wikiPickerOpen, setWikiPickerOpen] = useState(false);
  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        placeholder: '',
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
      GalleryBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(GalleryBlockNodeView);
        },
      }),
      WikiLink.extend({
        addNodeView() {
          return ReactNodeViewRenderer(WikiLinkNodeView);
        },
      }),
      BlockId,
      DragHandle,
      Indent,
    ],
    content: content || { type: "doc", content: [{ type: "paragraph" }] },
    editable,
    onUpdate: ({ editor: ed }) => {
      setIsDirty(true);
      if (onContentChange) {
        onContentChange(ed.getJSON());
      }

      // Slash-Erkennung direkt über den Text vor dem Cursor — die frühere
      // Volldokument-Serialisierung (JSON.stringify bei jedem Tastendruck)
      // verursachte Tipp-Latenz auf langen Seiten.
      const { state } = ed;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(Math.max(0, from - 20), from, "");
      // Nur Slash am Zeilen-/Wortanfang öffnet das Menü — nicht "und/oder".
      const slashMatch = textBefore.match(/(?:^|\s)(\/([^/\s]*))$/);

      if (slashMatch) {
        const coords = ed.view.coordsAtPos(from);
        setSlashMenu({
          isOpen: true,
          position: { top: coords.bottom + 4, left: coords.left },
          range: { from: from - slashMatch[1].length, to: from },
          query: slashMatch[2],
        });
        return;
      }

      // Funktionales Update statt Closure-Lesen: `slashMenu.isOpen` wäre in
      // diesem einmal gebundenen Callback immer der veraltete Initialwert.
      setSlashMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose dark:prose-invert max-w-none sm:max-w-none focus:outline-none min-h-[200px] px-4 py-3",
      },
    },
  });

  useEffect(() => {
    if (editor && content) {
      // Während der Editor fokussiert ist (Benutzer tippt), keine externen
      // Inhalts-Resets anwenden — setContent würde die Cursorposition
      // zurücksetzen (z.B. wenn der Autosave-Roundtrip den Inhalt zurückgibt).
      if (editor.isFocused) return;
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

  const useLocalDraft = !onContentChange;

  useEffect(() => {
    if (!useLocalDraft || !editable || !nodeId) return;
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
  }, [nodeId, editable, content, useLocalDraft]);

  const saveDraft = useCallback(() => {
    if (!useLocalDraft || !editor || !nodeId || !isDirty) return;
    const draftKey = getDraftKey(nodeId);
    const draftData = {
      content: editor.getJSON(),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [editor, nodeId, isDirty, useLocalDraft]);

  useEffect(() => {
    if (!editable || !useLocalDraft) return;
    autosaveTimer.current = setInterval(saveDraft, AUTOSAVE_INTERVAL);
    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current);
    };
  }, [editable, saveDraft, useLocalDraft]);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    const json = editor.getJSON();
    try {
      await onSave(json);
      setIsDirty(false);
      if (useLocalDraft && nodeId) {
        localStorage.removeItem(getDraftKey(nodeId));
      }
      setHasDraft(false);
    } catch {
      if (useLocalDraft) saveDraft();
    }
  }, [editor, onSave, nodeId, useLocalDraft, saveDraft]);

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
        galleryMode: !!detail?.galleryMode,
      });
    };
    window.addEventListener("editor:open-media-library", handleMediaEvent);
    return () =>
      window.removeEventListener("editor:open-media-library", handleMediaEvent);
  }, []);

  useEffect(() => {
    const handleWikiPickerEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as { editor?: unknown } | undefined;
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

  useEffect(() => {
    if (!editor) return;

    const apiBase = import.meta.env.BASE_URL + "api";

    const doResolve = async () => {
      const { doc } = editor.state;
      const placeholders: Array<{ pos: number; nodeId: string }> = [];

      doc.descendants((node, pos) => {
        if (
          node.type.name === "wikiLink" &&
          node.attrs.nodeId &&
          typeof node.attrs.title === "string" &&
          node.attrs.title.endsWith("…") &&
          node.attrs.title.length <= 9
        ) {
          placeholders.push({ pos, nodeId: String(node.attrs.nodeId) });
        }
      });

      if (placeholders.length === 0) return;

      const seenIds = new Set<string>();
      for (const { pos, nodeId } of placeholders) {
        if (seenIds.has(nodeId)) continue;
        seenIds.add(nodeId);
        try {
          const res = await fetch(`${apiBase}/content/nodes/${nodeId}`);
          if (!res.ok) continue;
          const data = (await res.json()) as {
            title?: string;
            displayCode?: string | null;
            templateType?: string | null;
          };
          if (!data?.title) continue;

          const cur = editor.state.doc.nodeAt(pos);
          if (
            !cur ||
            cur.type.name !== "wikiLink" ||
            cur.attrs.nodeId !== nodeId
          )
            continue;

          editor.view.dispatch(
            editor.state.tr.setNodeMarkup(pos, undefined, {
              nodeId,
              title: data.title,
              displayCode: data.displayCode ?? null,
              templateType: data.templateType ?? null,
            }),
          );
        } catch {
          // silently skip — keep placeholder until next resolution pass
        }
      }
    };

    const handleTransaction = () => {
      if (resolveTimerRef.current) return;
      let hasPlaceholder = false;
      editor.state.doc.descendants((node) => {
        if (
          node.type.name === "wikiLink" &&
          typeof node.attrs.title === "string" &&
          node.attrs.title.endsWith("…") &&
          node.attrs.title.length <= 9
        ) {
          hasPlaceholder = true;
        }
      });
      if (hasPlaceholder) {
        resolveTimerRef.current = setTimeout(() => {
          resolveTimerRef.current = null;
          doResolve();
        }, 1000);
      }
    };

    editor.on("transaction", handleTransaction);
    // Run once on mount in case content is already loaded with placeholder nodes
    handleTransaction();

    return () => {
      editor.off("transaction", handleTransaction);
      if (resolveTimerRef.current) {
        clearTimeout(resolveTimerRef.current);
        resolveTimerRef.current = null;
      }
    };
  }, [editor]);

  const handleMediaSelect = useCallback(
    (asset: {
      url: string;
      originalFilename: string;
      sizeBytes: number;
      mimeType: string;
      id: string;
    }) => {
      if (!editor) return;

      const currentDialog = mediaDialogRef.current;

      if (currentDialog.galleryMode) {
        window.dispatchEvent(
          new CustomEvent("editor:gallery-media-selected", { detail: asset }),
        );
        if (onTrackMediaUsage && asset.id) {
          onTrackMediaUsage(asset.id);
        }
        return;
      }

      if (currentDialog.replace) {
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
    [editor, onTrackMediaUsage],
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
        <div className={`relative ${editable ? "pl-6" : ""}`}>
          {editable && <BlockActionMenu editor={editor} />}
          {editable && <TableContextMenu editor={editor} />}
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
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isDirty && <Badge variant="outline">Nicht gespeichert</Badge>}
            {lastSavedAt && (
              <span>
                Zuletzt gespeichert: {lastSavedAt.toLocaleTimeString("de-DE")}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <ContentCompletenessBar
              editor={editor}
              parentTemplateType={parentTemplateType}
            />
          </div>
          <div className="flex items-center gap-1">
            {fieldKey && parentTemplateType && (
              <FieldAiButton
                fieldKey={fieldKey}
                pageType={parentTemplateType}
                nodeId={nodeId}
                getValue={() => editor.getText()}
                onApply={async (text) => {
                  const newContent = textToTiptapContent(text);
                  editor.commands.setContent(newContent);
                  await onSave(newContent);
                }}
              />
            )}
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
            >
              <Save className="h-3 w-3" />
              Speichern
            </button>
          </div>
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
        onOpenChange={(open) => {
          if (!open) {
            window.dispatchEvent(new CustomEvent("editor:media-dialog-closed"));
          }
          setMediaDialog({ open, type: null, replace: false, galleryMode: false });
        }}
        onSelect={handleMediaSelect}
        filterType={mediaDialog.type}
        nodeId={nodeId}
      />

      {wikiPickerOpen && (
        <WikiNodePickerDialog
          onSelect={(pickedNodeId, title, _url, templateType, displayCode) => {
            if (editor) {
              editor.commands.setWikiLink({
                nodeId: pickedNodeId,
                title,
                displayCode: displayCode ?? null,
                templateType: templateType ?? null,
              });
            }
            setWikiPickerOpen(false);
          }}
          onClose={() => setWikiPickerOpen(false)}
        />
      )}
    </div>
  );
}
