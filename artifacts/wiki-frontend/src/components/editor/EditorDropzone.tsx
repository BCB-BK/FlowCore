import { useState, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { Upload, Image, Video, FileText, Loader2, X, AlertCircle } from "lucide-react";
import { EDITOR_CONFIG } from "@/lib/editor-config";

interface UploadProgress {
  id: string;
  filename: string;
  mediaType: "image" | "video" | "file";
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

interface EditorDropzoneProps {
  editor: Editor;
  nodeId?: string;
  onTrackMediaUsage?: (assetId: string) => void;
  children: React.ReactNode;
}

function detectMediaType(
  file: File,
): "image" | "video" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

function MediaTypeIcon({ type }: { type: "image" | "video" | "file" }) {
  if (type === "image") return <Image className="h-5 w-5" />;
  if (type === "video") return <Video className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

export function EditorDropzone({
  editor,
  nodeId,
  onTrackMediaUsage,
  children,
}: EditorDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const dragCountRef = useRef(0);
  const apiBase = import.meta.env.BASE_URL + "api";

  const handleUploadFile = useCallback(
    async (file: File) => {
      const uploadId = crypto.randomUUID();
      const mediaType = detectMediaType(file);

      if (file.size > EDITOR_CONFIG.maxFileSizeBytes) {
        setUploads((prev) => [
          ...prev,
          {
            id: uploadId,
            filename: file.name,
            mediaType,
            progress: 0,
            status: "error",
            error: `Datei zu groß (max. ${Math.round(EDITOR_CONFIG.maxFileSizeBytes / 1024 / 1024)} MB)`,
          },
        ]);
        return;
      }

      setUploads((prev) => [
        ...prev,
        { id: uploadId, filename: file.name, mediaType, progress: 0, status: "uploading" },
      ]);

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (nodeId) formData.append("nodeId", nodeId);

        const xhr = new XMLHttpRequest();

        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploads((prev) =>
                prev.map((u) =>
                  u.id === uploadId ? { ...u, progress: pct } : u,
                ),
              );
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload fehlgeschlagen (${xhr.status})`));
            }
          });

          xhr.addEventListener("error", () =>
            reject(new Error("Netzwerkfehler")),
          );

          xhr.open("POST", `${apiBase}/media/upload`);
          xhr.withCredentials = true;
          xhr.send(formData);
        });

        const asset = JSON.parse(xhr.responseText);

        if (mediaType === "image") {
          editor
            .chain()
            .focus()
            .setImage({ src: asset.url, alt: asset.originalFilename })
            .run();
        } else if (mediaType === "video") {
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

        if (onTrackMediaUsage && asset.id) {
          onTrackMediaUsage(asset.id);
        }

        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, progress: 100, status: "done" } : u,
          ),
        );

        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.id !== uploadId));
        }, 2000);
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? {
                  ...u,
                  status: "error",
                  error:
                    err instanceof Error
                      ? err.message
                      : "Upload fehlgeschlagen",
                }
              : u,
          ),
        );
      }
    },
    [editor, nodeId, apiBase, onTrackMediaUsage],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCountRef.current = 0;

      if (!editor.isEditable) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      files.forEach((file) => handleUploadFile(file));
    },
    [editor, handleUploadFile],
  );

  const dismissUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {isDragging && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary rounded-lg pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-10 w-10" />
            <p className="text-sm font-medium">
              Dateien hier ablegen zum Hochladen
            </p>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Image className="h-3 w-3" />
                Bilder
              </span>
              <span className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                Videos
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Dateien
              </span>
            </div>
          </div>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="absolute bottom-2 right-2 z-50 w-72 space-y-1">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className={`flex items-center gap-2 rounded-lg border p-2 text-xs shadow-md ${
                upload.status === "error"
                  ? "bg-red-50 dark:bg-red-950/30 border-red-200"
                  : upload.status === "done"
                    ? "bg-green-50 dark:bg-green-950/30 border-green-200"
                    : "bg-background border-border"
              }`}
            >
              {upload.status === "uploading" && (
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              )}
              {upload.status === "error" && (
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              )}
              {upload.status === "done" && (
                <MediaTypeIcon type={upload.mediaType} />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{upload.filename}</p>
                {upload.status === "uploading" && (
                  <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
                {upload.status === "error" && (
                  <p className="text-red-600 dark:text-red-400">
                    {upload.error}
                  </p>
                )}
              </div>
              {upload.status === "error" && (
                <button
                  onClick={() => dismissUpload(upload.id)}
                  className="p-0.5 hover:bg-red-100 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
