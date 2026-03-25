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
} from "lucide-react";
import {
  getVideoEmbedUrl,
  isAllowedVideoSource,
} from "./extensions/video-block";
import { isAllowedEmbedUrl } from "./extensions/embed-block";

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

export function FileBlockNodeView({ node }: NodeViewProps) {
  const { src, filename, filesize, mimeType } = node.attrs;

  return (
    <NodeViewWrapper>
      <div className="flex items-center gap-3 rounded-lg border p-3 my-2 bg-muted/30 hover:bg-muted/50 transition-colors">
        <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{filename || "Datei"}</p>
          <p className="text-xs text-muted-foreground">
            {mimeType && <span>{mimeType}</span>}
            {filesize > 0 && <span> · {formatFileSize(filesize)}</span>}
          </p>
        </div>
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
    </NodeViewWrapper>
  );
}

export function VideoBlockNodeView({ node, editor }: NodeViewProps) {
  const { src, caption } = node.attrs;

  if (!src) {
    return (
      <NodeViewWrapper>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 my-2 text-muted-foreground">
          <Play className="h-8 w-8 mb-2" />
          <p className="text-sm">Video-URL eingeben</p>
          {editor.isEditable && (
            <button
              className="mt-2 text-xs px-3 py-1 rounded bg-primary text-primary-foreground"
              onClick={() => {
                const url = prompt("Video-URL eingeben:");
                if (url) {
                  editor
                    .chain()
                    .focus()
                    .updateAttributes("videoBlock", { src: url })
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

  const isLocal = src.startsWith("/api/media/");
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
            title={caption || "Video"}
          />
        )}
        {caption && (
          <p className="text-sm text-muted-foreground mt-1 text-center">
            {caption}
          </p>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export function EmbedBlockNodeView({ node, editor }: NodeViewProps) {
  const { src, caption, height } = node.attrs;

  if (!src) {
    return (
      <NodeViewWrapper>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 my-2 text-muted-foreground">
          <ExternalLink className="h-8 w-8 mb-2" />
          <p className="text-sm">Externe Inhalte einbetten</p>
          {editor.isEditable && (
            <button
              className="mt-2 text-xs px-3 py-1 rounded bg-primary text-primary-foreground"
              onClick={() => {
                const url = prompt("URL eingeben:");
                if (url) {
                  editor
                    .chain()
                    .focus()
                    .updateAttributes("embedBlock", { src: url })
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
        <iframe
          src={src}
          className="w-full rounded-lg border"
          style={{ height: `${height || 400}px` }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={caption || "Eingebetteter Inhalt"}
        />
        {caption && (
          <p className="text-sm text-muted-foreground mt-1 text-center">
            {caption}
          </p>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export function DiagramBlockNodeView({ node, editor }: NodeViewProps) {
  const { diagramType, src, caption, description } = node.attrs;

  const typeLabels: Record<string, string> = {
    flowchart: "Flussdiagramm",
    bpmn: "BPMN-Prozess",
    swimlane: "Swimlane-Diagramm",
    sequence: "Sequenzdiagramm",
    orgchart: "Organigramm",
  };

  if (src) {
    const isImage = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(src);
    return (
      <NodeViewWrapper>
        <div className="rounded-lg border p-3 my-2">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {typeLabels[diagramType] || diagramType}
            </span>
          </div>
          {isImage ? (
            <img
              src={src}
              alt={caption || "Diagramm"}
              className="w-full rounded"
            />
          ) : (
            <iframe
              src={src}
              className="w-full rounded"
              style={{ height: "400px" }}
              title={caption || "Diagramm"}
            />
          )}
          {caption && (
            <p className="text-sm text-center mt-2 text-muted-foreground">
              {caption}
            </p>
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
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 my-2 text-muted-foreground">
        <GitBranch className="h-10 w-10 mb-2" />
        <p className="text-sm font-medium">
          {typeLabels[diagramType] || "Diagramm"}
        </p>
        <p className="text-xs">Platzhalter für Diagramm-Ansicht</p>
        {editor.isEditable && (
          <div className="flex gap-2 mt-3">
            {Object.entries(typeLabels).map(([key, label]) => (
              <button
                key={key}
                className={`px-2 py-1 text-xs rounded ${
                  diagramType === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .updateAttributes("diagramBlock", { diagramType: key })
                    .run()
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
