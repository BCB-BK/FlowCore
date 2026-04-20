import { useState, useCallback, useRef, useEffect } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileText,
  Download,
  GitBranch,
  ExternalLink,
  Play,
  ShieldAlert,
  Upload,
  Cloud,
  Globe,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  Trash2,
  Users,
  ListOrdered,
  ImageIcon,
  Copyright,
  Link2,
  GalleryHorizontalEnd,
} from "lucide-react";
import {
  getVideoEmbedUrl,
  isAllowedVideoSource,
} from "./extensions/video-block";
import type { MediaSourceType } from "./extensions/video-block";
import { isAllowedEmbedUrl } from "./extensions/embed-block";
import {
  DIAGRAM_TYPES,
  type DiagramType,
  type ProcessStep,
  type DiagramRole,
} from "./extensions/diagram-block";
import { BpmnEditor, DEFAULT_BPMN_XML } from "./BpmnEditor";
import type { GalleryImage } from "./extensions/gallery-block";

function SourceTypeBadge({ sourceType }: { sourceType?: MediaSourceType }) {
  if (!sourceType || sourceType === "upload") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
        <Upload className="h-2.5 w-2.5" />
        Upload
      </span>
    );
  }
  if (sourceType === "sharepoint") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
        <Cloud className="h-2.5 w-2.5" />
        SharePoint
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
      <Globe className="h-2.5 w-2.5" />
      Extern
    </span>
  );
}

function MediaMetaFooter({
  caption,
  source,
  license,
  sourceType,
  altText,
  isEditable,
  onUpdate,
}: {
  caption?: string;
  source?: string;
  license?: string;
  sourceType?: MediaSourceType;
  altText?: string;
  isEditable: boolean;
  onUpdate: (attrs: Record<string, string>) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasAnyMeta = caption || source || license || altText;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <SourceTypeBadge sourceType={sourceType} />
        {caption && (
          <p className="text-sm text-muted-foreground italic flex-1">
            {caption}
          </p>
        )}
        {isEditable && (
          <button
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            Metadaten
          </button>
        )}
      </div>

      {!isEditable && hasAnyMeta && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {source && (
            <span className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              {source}
            </span>
          )}
          {license && (
            <span className="flex items-center gap-1">
              <Copyright className="h-3 w-3" />
              {license}
            </span>
          )}
        </div>
      )}

      {isEditable && expanded && (
        <div className="rounded-md border bg-muted/20 p-2 space-y-1.5 text-xs">
          <MetaInput
            label="Bildunterschrift"
            value={caption || ""}
            onChange={(v) => onUpdate({ caption: v })}
          />
          <MetaInput
            label="Alt-Text"
            value={altText || ""}
            onChange={(v) => onUpdate({ altText: v })}
          />
          <MetaInput
            label="Quelle"
            value={source || ""}
            onChange={(v) => onUpdate({ source: v })}
          />
          <MetaInput
            label="Lizenz"
            value={license || ""}
            onChange={(v) => onUpdate({ license: v })}
          />
        </div>
      )}
    </div>
  );
}

function MetaInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-24 text-muted-foreground shrink-0">{label}</label>
      <input
        className="flex-1 px-1.5 py-0.5 rounded border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`${label}...`}
      />
    </div>
  );
}

function ReplaceMediaButton({
  onReplace,
  mediaType,
}: {
  onReplace: () => void;
  mediaType: string;
}) {
  return (
    <button
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
      onClick={onReplace}
      title={`${mediaType} ersetzen`}
    >
      <RefreshCw className="h-3 w-3" />
      Ersetzen
    </button>
  );
}

export function CalloutNodeView({ node, editor }: NodeViewProps) {
  const calloutType = (node.attrs.type as string) || "info";
  const isEditable = editor.isEditable;

  const styles: Record<
    string,
    { bg: string; border: string; icon: typeof Info }
  > = {
    info: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      icon: Info,
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-950/30",
      border: "border-yellow-200 dark:border-yellow-800",
      icon: AlertTriangle,
    },
    error: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      icon: AlertCircle,
    },
    success: {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
      icon: CheckCircle2,
    },
  };

  const style = styles[calloutType] || styles.info;
  const Icon = style.icon;

  return (
    <NodeViewWrapper>
      <div className={`rounded-lg border p-4 my-2 ${style.bg} ${style.border}`}>
        <div className="flex gap-3">
          <Icon className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            {isEditable && (
              <div className="flex gap-1 mb-2">
                {Object.keys(styles).map((t) => (
                  <button
                    key={t}
                    className={`px-2 py-0.5 text-xs rounded ${
                      calloutType === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                    onClick={() =>
                      editor
                        .chain()
                        .focus()
                        .updateAttributes("callout", { type: t })
                        .run()
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            <div
              className="prose prose-sm dark:prose-invert"
              data-node-view-content=""
            />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function FileBlockNodeView({ node, editor }: NodeViewProps) {
  const { src, filename, filesize, mimeType, caption, altText, source, license, sourceType } =
    node.attrs;

  const handleUpdateAttrs = useCallback(
    (attrs: Record<string, string>) => {
      editor
        .chain()
        .focus()
        .updateAttributes("fileBlock", attrs)
        .run();
    },
    [editor],
  );

  const handleReplace = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("editor:open-media-library", {
        detail: { type: "file", replace: true },
      }),
    );
  }, []);

  return (
    <NodeViewWrapper>
      <div className="rounded-lg border p-3 my-2 bg-muted/30 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {filename || "Datei"}
            </p>
            <p className="text-xs text-muted-foreground">
              {mimeType && <span>{mimeType}</span>}
              {filesize > 0 && <span> · {formatFileSize(filesize)}</span>}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {editor.isEditable && (
              <ReplaceMediaButton onReplace={handleReplace} mediaType="Datei" />
            )}
            {src && (
              <a
                href={src}
                download={filename}
                className="p-2 rounded-md hover:bg-muted"
                title="Herunterladen"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        <MediaMetaFooter
          caption={caption}
          altText={altText}
          source={source}
          license={license}
          sourceType={sourceType}
          isEditable={editor.isEditable}
          onUpdate={handleUpdateAttrs}
        />
      </div>
    </NodeViewWrapper>
  );
}

export function VideoBlockNodeView({ node, editor }: NodeViewProps) {
  const { src, caption, altText, source, license, sourceType } = node.attrs;

  const handleUpdateAttrs = useCallback(
    (attrs: Record<string, string>) => {
      editor
        .chain()
        .focus()
        .updateAttributes("videoBlock", attrs)
        .run();
    },
    [editor],
  );

  const handleReplace = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("editor:open-media-library", {
        detail: { type: "video", replace: true },
      }),
    );
  }, []);

  if (!src) {
    return (
      <NodeViewWrapper>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 my-2 text-muted-foreground">
          <Play className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">Video hinzufügen</p>
          <p className="text-xs mt-1">Video hochladen oder URL eingeben</p>
          {editor.isEditable && (
            <div className="flex gap-2 mt-3">
              <button
                className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("editor:open-media-library", {
                      detail: { type: "video" },
                    }),
                  );
                }}
              >
                Medienbibliothek
              </button>
              <button
                className="text-xs px-3 py-1.5 rounded border hover:bg-accent"
                onClick={() => {
                  const url = prompt("Video-URL eingeben:");
                  if (url) {
                    editor
                      .chain()
                      .focus()
                      .updateAttributes("videoBlock", {
                        src: url,
                        sourceType: "external",
                      })
                      .run();
                  }
                }}
              >
                URL eingeben
              </button>
            </div>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  const isLocal = src.startsWith("/api/media/") || src.startsWith(import.meta.env.BASE_URL + "api/media/");
  const embedUrl = isLocal ? src : getVideoEmbedUrl(src);
  const isAllowed = isLocal || isAllowedVideoSource(src);

  if (!isAllowed) {
    return (
      <NodeViewWrapper>
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-4 my-2">
          <ShieldAlert className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Nicht erlaubte Videoquelle
            </p>
            <p className="text-xs text-red-600 dark:text-red-300 truncate">
              {src}
            </p>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div className="my-2">
        <div className="relative group">
          {isLocal ? (
            <video controls className="w-full rounded-lg" src={src}>
              <track kind="captions" />
            </video>
          ) : (
            <iframe
              src={embedUrl || ""}
              className="w-full rounded-lg"
              style={{ height: "315px" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={altText || caption || "Video"}
            />
          )}
          {editor.isEditable && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ReplaceMediaButton
                onReplace={handleReplace}
                mediaType="Video"
              />
            </div>
          )}
        </div>
        <MediaMetaFooter
          caption={caption}
          altText={altText}
          source={source}
          license={license}
          sourceType={sourceType}
          isEditable={editor.isEditable}
          onUpdate={handleUpdateAttrs}
        />
      </div>
    </NodeViewWrapper>
  );
}

export function EmbedBlockNodeView({ node, editor }: NodeViewProps) {
  const { src, caption, height, source, sourceType } = node.attrs;

  const handleUpdateAttrs = useCallback(
    (attrs: Record<string, string>) => {
      editor
        .chain()
        .focus()
        .updateAttributes("embedBlock", attrs)
        .run();
    },
    [editor],
  );

  if (!src) {
    return (
      <NodeViewWrapper>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 my-2 text-muted-foreground">
          <ExternalLink className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">Externe Inhalte einbetten</p>
          <p className="text-xs mt-1">
            YouTube, Miro, Figma, Office 365 und mehr
          </p>
          {editor.isEditable && (
            <button
              className="mt-3 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                const url = prompt("URL eingeben:");
                if (url) {
                  editor
                    .chain()
                    .focus()
                    .updateAttributes("embedBlock", {
                      src: url,
                      sourceType: "external",
                    })
                    .run();
                }
              }}
            >
              URL eingeben
            </button>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  const allowed = isAllowedEmbedUrl(src);

  if (!allowed) {
    return (
      <NodeViewWrapper>
        <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 p-4 my-2">
          <ShieldAlert className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Nicht erlaubte Einbettungsquelle
            </p>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-yellow-600 dark:text-yellow-300 hover:underline truncate block"
            >
              {src}
            </a>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div className="my-2">
        <div className="relative group">
          <iframe
            src={src}
            className="w-full rounded-lg border"
            style={{ height: `${height || 400}px` }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={caption || "Eingebetteter Inhalt"}
          />
          {editor.isEditable && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  const url = prompt("Neue URL eingeben:", src);
                  if (url && url !== src) {
                    handleUpdateAttrs({ src: url });
                  }
                }}
              >
                <RefreshCw className="h-3 w-3" />
                URL ändern
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <SourceTypeBadge sourceType={sourceType} />
          {caption && (
            <p className="text-sm text-muted-foreground italic flex-1">
              {caption}
            </p>
          )}
          {source && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              {source}
            </span>
          )}
        </div>
        {editor.isEditable && (
          <div className="mt-1">
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => {
                const newCaption = prompt("Bildunterschrift:", caption || "");
                if (newCaption !== null) {
                  handleUpdateAttrs({ caption: newCaption });
                }
              }}
            >
              {caption ? "Beschriftung bearbeiten" : "+ Beschriftung hinzufügen"}
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export function DiagramBlockNodeView({ node, editor }: NodeViewProps) {
  const { diagramType, src, caption, description, bpmnXml } = node.attrs;
  const [editingBpmn, setEditingBpmn] = useState(false);

  const handleUpdateAttrs = useCallback(
    (attrs: Record<string, unknown>) => {
      editor
        .chain()
        .focus()
        .updateAttributes("diagramBlock", attrs)
        .run();
    },
    [editor],
  );

  const handleBpmnSave = useCallback(
    (xml: string) => {
      handleUpdateAttrs({ bpmnXml: xml, diagramType: "bpmn" });
      setEditingBpmn(false);
    },
    [handleUpdateAttrs],
  );

  const handleBpmnCreate = useCallback(() => {
    handleUpdateAttrs({ bpmnXml: DEFAULT_BPMN_XML, diagramType: "bpmn" });
    setEditingBpmn(true);
  }, [handleUpdateAttrs]);

  if (bpmnXml) {
    return (
      <NodeViewWrapper>
        <div className="rounded-lg border my-2 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <GitBranch className="h-3.5 w-3.5 text-purple-600" />
              <span className="text-xs font-medium text-muted-foreground">
                BPMN 2.0 Prozessdiagramm
              </span>
            </div>
            {editor.isEditable && !editingBpmn && (
              <button
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-accent"
                onClick={() => setEditingBpmn(true)}
              >
                <RefreshCw className="h-3 w-3" />
                Bearbeiten
              </button>
            )}
          </div>

          {editingBpmn ? (
            <BpmnEditor
              xml={bpmnXml}
              editable={true}
              height={520}
              onSave={handleBpmnSave}
              onCancel={() => setEditingBpmn(false)}
            />
          ) : (
            <BpmnEditor xml={bpmnXml} editable={false} height={400} />
          )}

          {caption && (
            <p className="text-sm text-center px-3 pb-2 text-muted-foreground border-t pt-2">
              {caption}
            </p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground px-3 pb-2">{description}</p>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  if (src) {
    const isImage = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(src);
    return (
      <NodeViewWrapper>
        <div className="rounded-lg border p-3 my-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {DIAGRAM_TYPES[diagramType as DiagramType] || diagramType}
              </span>
            </div>
            {editor.isEditable && (
              <div className="flex items-center gap-1">
                <button
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
                  onClick={handleBpmnCreate}
                >
                  <GitBranch className="h-3 w-3" />
                  Auf BPMN upgraden
                </button>
                <button
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("editor:open-media-library", {
                        detail: { type: "image", replace: true },
                      }),
                    );
                  }}
                >
                  <RefreshCw className="h-3 w-3" />
                  Ersetzen
                </button>
              </div>
            )}
          </div>
          {isImage ? (
            <img src={src} alt={caption || "Diagramm"} className="w-full rounded" />
          ) : (
            <iframe
              src={src}
              className="w-full rounded"
              style={{ height: "400px" }}
              title={caption || "Diagramm"}
            />
          )}
          {caption && (
            <p className="text-sm text-center mt-2 text-muted-foreground">{caption}</p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div className="rounded-lg border-2 border-dashed p-6 my-2">
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <GitBranch className="h-10 w-10 mb-3 text-purple-500" />
          <p className="text-sm font-semibold text-foreground">BPMN-Prozessdiagramm</p>
          <p className="text-xs mt-1 text-center max-w-xs">
            Professionelle Prozessmodellierung nach BPMN 2.0 — mit Swimlanes, Gateways, parallelen Pfaden und mehr
          </p>
        </div>

        {editor.isEditable && (
          <div className="flex flex-col items-center gap-2 mt-5">
            <button
              className="text-xs px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2 font-medium shadow-sm"
              onClick={handleBpmnCreate}
            >
              <GitBranch className="h-4 w-4" />
              BPMN-Diagramm erstellen
            </button>
            <p className="text-[10px] text-muted-foreground">
              Startet mit einer Vorlage (Pool + 2 Lanes + Entscheidungsgateway)
            </p>
            <div className="flex gap-2 mt-1">
              <button
                className="text-[10px] px-2.5 py-1 rounded border hover:bg-accent flex items-center gap-1 text-muted-foreground"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("editor:open-media-library", {
                      detail: { type: "image" },
                    }),
                  );
                }}
              >
                <ImageIcon className="h-3 w-3" />
                Bild hochladen
              </button>
              <button
                className="text-[10px] px-2.5 py-1 rounded border hover:bg-accent flex items-center gap-1 text-muted-foreground"
                onClick={() => {
                  const url = prompt("Diagramm-URL (draw.io, Lucid etc.):");
                  if (url) handleUpdateAttrs({ src: url });
                }}
              >
                <ExternalLink className="h-3 w-3" />
                URL verlinken
              </button>
            </div>
          </div>
        )}

        {!editor.isEditable && (
          <div className="text-center mt-3">
            <p className="text-xs text-muted-foreground italic">Kein Diagramm definiert</p>
          </div>
        )}

      </div>
    </NodeViewWrapper>
  );
}

function DiagramMetaPanel({
  diagramType,
  caption,
  description,
  steps,
  roles,
  onUpdateAttrs,
  onAddStep,
  onUpdateStep,
  onRemoveStep,
  onAddRole,
  onUpdateRole,
  onRemoveRole,
}: {
  diagramType: DiagramType;
  caption: string;
  description: string;
  steps: ProcessStep[];
  roles: DiagramRole[];
  onUpdateAttrs: (attrs: Record<string, unknown>) => void;
  onAddStep: () => void;
  onUpdateStep: (id: string, field: keyof ProcessStep, value: string | number) => void;
  onRemoveStep: (id: string) => void;
  onAddRole: () => void;
  onUpdateRole: (id: string, field: keyof DiagramRole, value: string) => void;
  onRemoveRole: (id: string) => void;
}) {
  const showLanes = diagramType === "swimlane" || diagramType === "bpmn";

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      <div className="space-y-1.5">
        <MetaInput
          label="Beschriftung"
          value={caption || ""}
          onChange={(v) => onUpdateAttrs({ caption: v })}
        />
        <MetaInput
          label="Beschreibung"
          value={description || ""}
          onChange={(v) => onUpdateAttrs({ description: v })}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium flex items-center gap-1">
            <ListOrdered className="h-3 w-3" />
            Prozessschritte
          </span>
          <button
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5"
            onClick={onAddStep}
          >
            <Plus className="h-3 w-3" />
            Schritt
          </button>
        </div>
        {steps.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Noch keine Prozessschritte definiert
          </p>
        ) : (
          <div className="space-y-1">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className="flex items-center gap-1.5 text-xs"
              >
                <span className="w-5 text-muted-foreground text-right shrink-0">
                  {idx + 1}.
                </span>
                <input
                  className="flex-1 px-1.5 py-0.5 rounded border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  value={step.label}
                  onChange={(e) =>
                    onUpdateStep(step.id, "label", e.target.value)
                  }
                  placeholder="Schrittname..."
                />
                {showLanes && (
                  <select
                    className="px-1 py-0.5 rounded border bg-background text-xs"
                    value={step.roleId || ""}
                    onChange={(e) =>
                      onUpdateStep(step.id, "roleId", e.target.value)
                    }
                  >
                    <option value="">Keine Rolle</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name || "Unbenannt"}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  className="p-0.5 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveStep(step.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium flex items-center gap-1">
            <Users className="h-3 w-3" />
            Rollen{showLanes && " / Swimlanes"}
          </span>
          <button
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5"
            onClick={onAddRole}
          >
            <Plus className="h-3 w-3" />
            Rolle
          </button>
        </div>
        {roles.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Noch keine Rollen definiert
          </p>
        ) : (
          <div className="space-y-1">
            {roles.map((role: DiagramRole) => (
              <div key={role.id} className="flex items-center gap-1.5 text-xs">
                <input
                  className="flex-1 px-1.5 py-0.5 rounded border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  value={role.name}
                  onChange={(e) =>
                    onUpdateRole(role.id, "name", e.target.value)
                  }
                  placeholder="Rollenname..."
                />
                {showLanes && (
                  <input
                    className="w-24 px-1.5 py-0.5 rounded border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    value={role.lane || ""}
                    onChange={(e) =>
                      onUpdateRole(role.id, "lane", e.target.value)
                    }
                    placeholder="Lane..."
                  />
                )}
                <button
                  className="p-0.5 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveRole(role.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function GalleryBlockNodeView({ node, editor }: NodeViewProps) {
  const { images, columns, caption, layout } = node.attrs;
  const galleryImages = (images || []) as GalleryImage[];
  const colCount = columns || 3;
  const galleryLayout = layout || "grid";

  const handleUpdateAttrs = useCallback(
    (attrs: Record<string, unknown>) => {
      editor
        .chain()
        .focus()
        .updateAttributes("galleryBlock", attrs)
        .run();
    },
    [editor],
  );

  const galleryListenerRef = useRef<((e: Event) => void) | null>(null);

  const cleanupGalleryListener = useCallback(() => {
    if (galleryListenerRef.current) {
      window.removeEventListener("editor:gallery-media-selected", galleryListenerRef.current);
      galleryListenerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupGalleryListener();
    };
  }, [cleanupGalleryListener]);

  const handleAddImages = useCallback(() => {
    cleanupGalleryListener();

    const onMediaSelected = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        const newImage: GalleryImage = {
          id: detail.id || crypto.randomUUID(),
          src: detail.url,
          alt: detail.originalFilename || "",
          caption: "",
        };
        handleUpdateAttrs({ images: [...galleryImages, newImage] });
      }
      cleanupGalleryListener();
    };

    galleryListenerRef.current = onMediaSelected;
    window.addEventListener("editor:gallery-media-selected", onMediaSelected);

    const onDialogClose = () => {
      setTimeout(() => {
        cleanupGalleryListener();
      }, 100);
      window.removeEventListener("editor:media-dialog-closed", onDialogClose);
    };
    window.addEventListener("editor:media-dialog-closed", onDialogClose);

    window.dispatchEvent(
      new CustomEvent("editor:open-media-library", {
        detail: { type: "image", galleryMode: true },
      }),
    );
  }, [galleryImages, handleUpdateAttrs, cleanupGalleryListener]);

  const handleRemoveImage = useCallback(
    (id: string) => {
      handleUpdateAttrs({
        images: galleryImages.filter((img) => img.id !== id),
      });
    },
    [galleryImages, handleUpdateAttrs],
  );

  const handleUpdateImageCaption = useCallback(
    (id: string, newCaption: string) => {
      handleUpdateAttrs({
        images: galleryImages.map((img) =>
          img.id === id ? { ...img, caption: newCaption } : img,
        ),
      });
    },
    [galleryImages, handleUpdateAttrs],
  );

  if (galleryImages.length === 0) {
    return (
      <NodeViewWrapper>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 my-2 text-muted-foreground">
          <GalleryHorizontalEnd className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">Bildergalerie</p>
          <p className="text-xs mt-1">
            Bilder hinzufügen, um eine Galerie zu erstellen
          </p>
          {editor.isEditable && (
            <div className="flex gap-2 mt-3">
              <button
                className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"
                onClick={handleAddImages}
              >
                <Plus className="h-3 w-3" />
                Bilder hinzufügen
              </button>
            </div>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div className="rounded-lg border p-3 my-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GalleryHorizontalEnd className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Galerie ({galleryImages.length} Bilder)
            </span>
          </div>
          {editor.isEditable && (
            <div className="flex items-center gap-1">
              <select
                className="text-[10px] px-1.5 py-0.5 rounded border bg-background"
                value={galleryLayout}
                onChange={(e) =>
                  handleUpdateAttrs({ layout: e.target.value })
                }
              >
                <option value="grid">Raster</option>
              </select>
              <select
                className="text-[10px] px-1.5 py-0.5 rounded border bg-background"
                value={colCount}
                onChange={(e) =>
                  handleUpdateAttrs({ columns: Number(e.target.value) })
                }
              >
                <option value={2}>2 Spalten</option>
                <option value={3}>3 Spalten</option>
                <option value={4}>4 Spalten</option>
              </select>
              <button
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                onClick={handleAddImages}
              >
                <Plus className="h-3 w-3" />
                Bild
              </button>
            </div>
          )}
        </div>

        <div
          className="gap-2"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${colCount}, 1fr)`,
          }}
        >
          {galleryImages.map((img) => (
            <div key={img.id} className="relative group">
              <img
                src={img.src}
                alt={img.alt || ""}
                className="w-full h-32 object-cover rounded"
              />
              {editor.isEditable && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                  <button
                    className="p-1 rounded bg-background/80 text-xs hover:bg-background"
                    onClick={() => handleRemoveImage(img.id)}
                    title="Entfernen"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
              {img.caption && (
                <p className="text-[10px] text-muted-foreground text-center mt-0.5 truncate">
                  {img.caption}
                </p>
              )}
              {editor.isEditable && (
                <input
                  className="w-full text-[10px] text-center bg-transparent border-none focus:outline-none text-muted-foreground mt-0.5"
                  value={img.caption || ""}
                  onChange={(e) =>
                    handleUpdateImageCaption(img.id, e.target.value)
                  }
                  placeholder="Bildunterschrift..."
                />
              )}
            </div>
          ))}
        </div>

        {caption && (
          <p className="text-sm text-center mt-2 text-muted-foreground italic">
            {caption}
          </p>
        )}
        {editor.isEditable && (
          <div className="mt-2">
            <input
              className="w-full text-xs text-center bg-transparent border-none focus:outline-none text-muted-foreground"
              value={caption || ""}
              onChange={(e) => handleUpdateAttrs({ caption: e.target.value })}
              placeholder="Galerie-Beschriftung..."
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

function DiagramMetaReadOnly({
  steps,
  roles,
}: {
  steps: ProcessStep[];
  roles: DiagramRole[];
}) {
  return (
    <div className="mt-3 space-y-2 border-t pt-3 text-xs text-muted-foreground">
      {steps.length > 0 && (
        <div>
          <p className="font-medium flex items-center gap-1 mb-1">
            <ListOrdered className="h-3 w-3" />
            Prozessschritte
          </p>
          <ol className="list-decimal list-inside space-y-0.5">
            {steps.map((s) => (
              <li key={s.id}>
                {s.label}
                {s.description && (
                  <span className="text-muted-foreground/70">
                    {" "}
                    — {s.description}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
      {roles.length > 0 && (
        <div>
          <p className="font-medium flex items-center gap-1 mb-1">
            <Users className="h-3 w-3" />
            Rollen
          </p>
          <ul className="list-disc list-inside space-y-0.5">
            {roles.map((r) => (
              <li key={r.id}>
                {r.name}
                {r.lane && (
                  <span className="text-muted-foreground/70">
                    {" "}
                    (Lane: {r.lane})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
