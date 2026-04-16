import { useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/card";
import { Button } from "@workspace/ui/button";
import { Badge } from "@workspace/ui/badge";
import {
  BookOpen,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

interface ImportResult {
  message: string;
  upserted: number;
  skipped: number;
  errors: string[];
}

interface ReimportResult {
  message: string;
  upserted: number;
}

export function GlossaryImportTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [reimporting, setReimporting] = useState(false);
  const [reimportResult, setReimportResult] = useState<ReimportResult | null>(null);
  const [reimportError, setReimportError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setImportResult(null);
    setImportError(null);
  }

  async function handleImport() {
    if (!selectedFile) return;
    setImporting(true);
    setImportResult(null);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const result = await customFetch<ImportResult>("/api/glossary/import", {
        method: "POST",
        body: formData,
      });

      setImportResult(result);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setImporting(false);
    }
  }

  async function handleReimport() {
    setReimporting(true);
    setReimportResult(null);
    setReimportError(null);

    try {
      const result = await customFetch<ReimportResult>("/api/glossary/reimport-seed", {
        method: "POST",
      });
      setReimportResult(result);
    } catch (err) {
      setReimportError(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setReimporting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await customFetch<Blob>("/api/glossary/export", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "glossar-export.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setExporting(false);
    }
  }

  function downloadTemplate() {
    const header = ["term", "definition", "synonyms", "abbreviation"];
    const example = [
      "Beispielbegriff",
      "Definition des Begriffs als reiner Text oder HTML",
      "Synonym1; Synonym2",
      "BB",
    ];
    const csv = header.join("\t") + "\n" + example.join("\t");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/tab-separated-values;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "glossar-vorlage.tsv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Glossar exportieren
          </CardTitle>
          <CardDescription>
            Laden Sie alle aktuellen Glossarbegriffe als Excel-Datei herunter.
            Die Datei kann direkt bearbeitet und wieder importiert werden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            {exporting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? "Exportiere..." : "Glossar exportieren"}
          </Button>

          {exportError && (
            <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{exportError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            XLSX-Import
          </CardTitle>
          <CardDescription>
            Importieren Sie Glossarbegriffe aus einer Excel-Datei. Bestehende
            Begriffe (gleicher Begriff) werden aktualisiert, neue Begriffe werden
            hinzugefügt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-dashed p-4 bg-muted/30">
            <p className="text-sm font-medium mb-1">Erwartetes Format (Spalten):</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {["term", "definition", "synonyms", "abbreviation"].map((col) => (
                <Badge key={col} variant="outline" className="font-mono text-xs">
                  {col}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Pflichtfelder: <strong>term</strong>, <strong>definition</strong>.
              Synonyme werden durch Komma oder Semikolon getrennt.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Deutsche Spaltennamen werden ebenfalls erkannt:{" "}
              <em>Begriff</em>, <em>Beschreibung</em>, <em>Synonyme</em>,{" "}
              <em>Abkürzung</em>.
            </p>
          </div>

          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Vorlage herunterladen
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="glossary-file-input"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Datei auswählen
              </Button>
              {selectedFile && (
                <span className="text-sm text-muted-foreground truncate max-w-xs">
                  {selectedFile.name}
                </span>
              )}
            </div>

            <Button
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className="flex items-center gap-2"
            >
              {importing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {importing ? "Importiere..." : "Importieren"}
            </Button>
          </div>

          {importResult && (
            <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{importResult.message}</span>
              </div>
              <div className="flex gap-4 text-sm text-green-700 dark:text-green-400">
                <span>
                  Eingefügt/Aktualisiert: <strong>{importResult.upserted}</strong>
                </span>
                {importResult.skipped > 0 && (
                  <span>
                    Übersprungen: <strong>{importResult.skipped}</strong>
                  </span>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    Hinweise:
                  </p>
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-amber-700 dark:text-amber-400">
                      {e}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {importError && (
            <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{importError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Standard-Seed reimportieren
          </CardTitle>
          <CardDescription>
            Stellt die ursprünglichen BCB-Glossarbegriffe wieder her bzw.
            aktualisiert bestehende Begriffe auf die aktuellen Seed-Daten. Manuell
            hinzugefügte oder importierte Begriffe bleiben erhalten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Dieser Vorgang überschreibt die Definitionen der Standard-Begriffe
              mit den ursprünglichen Seed-Daten. Manuell geänderte Definitionen
              dieser Begriffe werden zurückgesetzt.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleReimport}
            disabled={reimporting}
            className="flex items-center gap-2"
          >
            {reimporting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            {reimporting ? "Importiere..." : "Seed-Daten importieren"}
          </Button>

          {reimportResult && (
            <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-3 flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div className="text-sm text-green-700 dark:text-green-400">
                <p className="font-medium">{reimportResult.message}</p>
                <p>{reimportResult.upserted} Begriffe aktualisiert</p>
              </div>
            </div>
          )}

          {reimportError && (
            <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{reimportError}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
