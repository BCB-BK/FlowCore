import {
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  Video,
} from "lucide-react";

/**
 * Gemeinsame UI-Helfer für die SharePoint-Browsing-Komponenten
 * (Audit-Fund M13: zuvor duplizierte/divergente lokale Kopien).
 */

export function getSharePointFileIcon(mimeType: string, isFolder: boolean) {
  if (isFolder) return Folder;
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("sheet") || mimeType.includes("excel"))
    return FileSpreadsheet;
  if (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("text")
  )
    return FileText;
  return File;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "-";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
