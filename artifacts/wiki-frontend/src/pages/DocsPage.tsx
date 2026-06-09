import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@workspace/ui/button";
import { Badge } from "@workspace/ui/badge";
import {
  BookOpen,
  Download,
  FileText,
  ChevronRight,
  AlertCircle,
  Loader2,
  BookMarked,
} from "lucide-react";
import { cn } from "@workspace/ui/utils";

interface DocEntry {
  filename: string;
  title: string;
  description: string;
  isHandbook?: boolean;
  exists: boolean;
  sizeBytes: number;
  lastModified: string | null;
}

function useDocsList() {
  return useQuery<{ docs: DocEntry[] }>({
    queryKey: ["docs-list"],
    queryFn: () => customFetch<{ docs: DocEntry[] }>("/api/docs"),
  });
}

function useDocContent(filename: string | null) {
  return useQuery<{ filename: string; content: string }>({
    queryKey: ["doc-content", filename],
    queryFn: () =>
      customFetch<{ filename: string; content: string }>(
        `/api/docs/${filename}`,
      ),
    enabled: !!filename,
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function DocsPage() {
  const { data, isLoading, error } = useDocsList();
  const [selected, setSelected] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handbook = data?.docs.find((d) => d.isHandbook);
  const technicalDocs = data?.docs.filter((d) => !d.isHandbook) ?? [];

  const activeFilename = selected ?? handbook?.filename ?? null;
  const { data: docContent, isLoading: contentLoading } =
    useDocContent(activeFilename);
  const activeEntry = data?.docs.find((d) => d.filename === activeFilename);

  async function handleExport() {
    setIsExporting(true);
    try {
      const blob = await customFetch<Blob>("/api/docs-export/all", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `flowcore-export-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Doku / Handbuch</h1>
            <p className="text-xs text-muted-foreground">
              Technische Dokumentation &amp; Bedienungsanleitungen – live aus
              den Quelldateien
            </p>
          </div>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="gap-2"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Gesamt-Export (JSON)
        </Button>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Dokumentenliste konnte nicht geladen werden</span>
        </div>
      )}

      {data && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <aside className="w-64 shrink-0 border-r flex flex-col">
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-3 space-y-1">
                {handbook && (
                  <button
                    onClick={() => setSelected(handbook.filename)}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-2.5 flex items-start gap-2.5 transition-colors hover:bg-accent",
                      activeFilename === handbook.filename &&
                        "bg-primary/10 ring-1 ring-primary/20",
                    )}
                  >
                    <BookMarked
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        activeFilename === handbook.filename
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {handbook.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1 py-0 shrink-0"
                        >
                          Handbuch
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {handbook.description}
                      </p>
                    </div>
                  </button>
                )}

                <div className="pt-2 pb-1 px-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Technische Dokumentation
                  </span>
                </div>

                {technicalDocs.map((doc) => (
                  <button
                    key={doc.filename}
                    onClick={() => setSelected(doc.filename)}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-2 flex items-start gap-2.5 transition-colors hover:bg-accent",
                      activeFilename === doc.filename &&
                        "bg-primary/10 ring-1 ring-primary/20",
                      !doc.exists && "opacity-50",
                    )}
                  >
                    <FileText
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        activeFilename === doc.filename
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium truncate">
                          {doc.title}
                        </span>
                        {!doc.exists && (
                          <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {doc.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {activeEntry && (
              <div className="border-b px-4 py-2 flex items-center gap-2 shrink-0 bg-muted/30 min-w-0">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{activeEntry.title}</span>
                <span className="text-muted-foreground text-xs opacity-60 truncate hidden sm:block">
                  {activeEntry.filename}
                </span>
                {activeEntry.lastModified && (
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {formatDate(activeEntry.lastModified)} ·{" "}
                    {formatBytes(activeEntry.sizeBytes)}
                  </span>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {contentLoading && (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!contentLoading && docContent && (
                <div className="px-6 py-6 max-w-4xl">
                  <div className="prose prose-sm prose-slate dark:prose-invert max-w-none [&_table]:text-xs [&_pre]:overflow-x-auto [&_code]:text-xs [&_h1]:text-xl [&_h2]:text-lg [&_h2]:border-b [&_h2]:pb-1 [&_h2]:mt-6">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {docContent.content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {!contentLoading && !docContent && activeFilename && (
                <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                  <AlertCircle className="h-6 w-6" />
                  <span className="text-sm">Dokument nicht gefunden</span>
                </div>
              )}

              {!activeFilename && (
                <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                  <BookOpen className="h-8 w-8 opacity-30" />
                  <span className="text-sm">Wählen Sie ein Dokument aus</span>
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
