import { useState, useRef, useEffect } from "react";
import { BpmnEditor, DEFAULT_BPMN_XML } from "@/components/editor/BpmnEditor";
import { DiagramLegend } from "@/components/qm/DiagramLegend";
import { Button } from "@workspace/ui/button";
import { GitBranch, Pencil, ImageUp, ArrowLeftRight, X, Upload, Link2 } from "lucide-react";

interface BpmnDiagramData {
  xml: string;
  svgEmbed?: string;
  mode?: "bpmn" | "svg";
}

function isBpmnData(v: unknown): v is BpmnDiagramData {
  return typeof v === "object" && v !== null && "xml" in v && typeof (v as BpmnDiagramData).xml === "string";
}

interface BpmnDiagramSectionProps {
  data: unknown;
  onSave?: (value: unknown) => void;
  readOnly?: boolean;
}

function sanitizeSvg(raw: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "image/svg+xml");
    const parserError = doc.querySelector("parsererror");
    if (parserError) return "";
    const allNodes = doc.querySelectorAll("*");
    allNodes.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (
          name.startsWith("on") ||
          (name === "href" && attr.value.trim().toLowerCase().startsWith("javascript:")) ||
          (name === "xlink:href" && attr.value.trim().toLowerCase().startsWith("javascript:"))
        ) {
          el.removeAttribute(attr.name);
        }
      });
    });
    doc.querySelectorAll("script").forEach((s) => s.parentNode?.removeChild(s));
    return new XMLSerializer().serializeToString(doc.documentElement);
  } catch {
    return "";
  }
}

function SvgViewer({ svgContent }: { svgContent: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panZoomRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const safe = sanitizeSvg(svgContent);
    if (!safe) return;
    container.innerHTML = safe;
    const svgEl = container.querySelector("svg");
    if (!svgEl) return;

    svgEl.style.width = "100%";
    svgEl.style.height = "100%";
    svgEl.setAttribute("width", "100%");
    svgEl.setAttribute("height", "100%");

    let cancelled = false;
    import("svg-pan-zoom").then(({ default: svgPanZoom }) => {
      if (cancelled || !svgEl.parentNode) return;
      try {
        const instance = svgPanZoom(svgEl as SVGElement, {
          zoomEnabled: true,
          panEnabled: true,
          controlIconsEnabled: true,
          fit: true,
          center: true,
          minZoom: 0.1,
          maxZoom: 20,
        });
        panZoomRef.current = instance;
      } catch { /* ignore */ }
    }).catch(() => { /* ignore */ });

    return () => {
      cancelled = true;
      if (panZoomRef.current) {
        try { panZoomRef.current.destroy(); } catch { /* ignore */ }
        panZoomRef.current = null;
      }
    };
  }, [svgContent]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg border overflow-hidden bg-muted/10"
      style={{ minHeight: 400 }}
    />
  );
}

function SvgImportEditor({
  current,
  onSave,
  onCancel,
}: {
  current?: string;
  onSave: (svgContent: string) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlValue, setUrlValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".svg") && file.type !== "image/svg+xml") {
      setError("Bitte eine SVG-Datei auswählen.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (!content.includes("<svg")) {
        setError("Ungültige SVG-Datei.");
        return;
      }
      onSave(content);
    };
    reader.readAsText(file);
  };

  const handleUrl = async () => {
    if (!urlValue.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(urlValue.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text.includes("<svg")) throw new Error("Keine gültige SVG-Datei");
      onSave(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">SVG-Datei einbetten</h3>
        <button onClick={onCancel} className="p-1 rounded hover:bg-accent text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode("upload")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${mode === "upload" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
        >
          <Upload className="h-3.5 w-3.5" />
          Datei hochladen
        </button>
        <button
          onClick={() => setMode("url")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${mode === "url" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
        >
          <Link2 className="h-3.5 w-3.5" />
          URL eingeben
        </button>
      </div>

      {mode === "upload" && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10 py-10 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageUp className="h-8 w-8 text-muted-foreground/50" />
          <div className="text-center">
            <p className="text-sm font-medium">SVG-Datei auswählen</p>
            <p className="text-xs text-muted-foreground mt-1">z. B. Miro-Export, Draw.io, Visio-Export</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      )}

      {mode === "url" && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">SVG-URL (öffentlich erreichbar)</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://example.com/diagram.svg"
              className="flex-1 rounded border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button size="sm" onClick={handleUrl} disabled={loading || !urlValue.trim()}>
              {loading ? "Laden…" : "Laden"}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {current && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Aktuelle SVG-Vorschau:</p>
          <SvgViewer svgContent={current} />
        </div>
      )}
    </div>
  );
}

export function BpmnDiagramSection({ data, onSave, readOnly = false }: BpmnDiagramSectionProps) {
  const [editing, setEditing] = useState(false);
  const [svgEditing, setSvgEditing] = useState(false);

  const parsedData = isBpmnData(data) ? data : null;
  const xml = parsedData?.xml ?? null;
  const svgEmbed = parsedData?.svgEmbed ?? null;
  const mode = parsedData?.mode ?? "bpmn";
  const hasContent = Boolean(xml);
  const hasSvgEmbed = Boolean(svgEmbed);

  function handleSave(newXml: string) {
    onSave?.({ xml: newXml, svgEmbed: parsedData?.svgEmbed, mode: "bpmn" });
    setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
  }

  function handleSvgSave(svgContent: string) {
    onSave?.({ xml: xml ?? DEFAULT_BPMN_XML, svgEmbed: svgContent, mode: "svg" });
    setSvgEditing(false);
  }

  function handleSwitchMode(newMode: "bpmn" | "svg") {
    if (!parsedData) return;
    onSave?.({ ...parsedData, mode: newMode });
  }

  if (!hasContent && !hasSvgEmbed && readOnly) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 py-12 text-center">
        <GitBranch className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Kein BPMN-Diagramm vorhanden</p>
      </div>
    );
  }

  if (!hasContent && !hasSvgEmbed && !readOnly) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-primary/40 bg-muted/20 py-14 text-center">
        <GitBranch className="h-10 w-10 text-primary/50" />
        <div>
          <p className="text-sm font-medium text-foreground">Noch kein BPMN 2.0-Diagramm vorhanden</p>
          <p className="mt-1 text-xs text-muted-foreground">Erstelle ein Prozessdiagramm oder bette eine externe SVG ein</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button
            size="sm"
            onClick={() => {
              onSave?.({ xml: DEFAULT_BPMN_XML, mode: "bpmn" });
              setEditing(true);
            }}
          >
            <GitBranch className="mr-2 h-4 w-4" />
            BPMN-Diagramm erstellen
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onSave?.({ xml: DEFAULT_BPMN_XML, mode: "svg" });
              setSvgEditing(true);
            }}
          >
            <ImageUp className="mr-2 h-4 w-4" />
            SVG einbetten
          </Button>
        </div>
      </div>
    );
  }

  if (svgEditing) {
    return (
      <SvgImportEditor
        current={svgEmbed ?? undefined}
        onSave={handleSvgSave}
        onCancel={() => setSvgEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Modus:</span>
            <button
              onClick={() => handleSwitchMode("bpmn")}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors ${mode === "bpmn" ? "bg-primary/10 border-primary/40 text-primary" : "hover:bg-accent text-muted-foreground"}`}
            >
              <GitBranch className="h-3 w-3" />
              BPMN
            </button>
            <ArrowLeftRight className="h-3 w-3 text-muted-foreground/50 mx-0.5" />
            <button
              onClick={() => handleSwitchMode("svg")}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors ${mode === "svg" ? "bg-primary/10 border-primary/40 text-primary" : "hover:bg-accent text-muted-foreground"}`}
            >
              <ImageUp className="h-3 w-3" />
              SVG
            </button>
          </div>
          <div className="flex gap-2">
            {mode === "svg" && (
              <Button variant="outline" size="sm" onClick={() => setSvgEditing(true)}>
                <ImageUp className="mr-2 h-3.5 w-3.5" />
                SVG ersetzen
              </Button>
            )}
            {mode === "bpmn" && !editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Diagramm bearbeiten
              </Button>
            )}
          </div>
        </div>
      )}

      {mode === "svg" && svgEmbed ? (
        <div className="space-y-3">
          <SvgViewer svgContent={svgEmbed} />
          {!readOnly && !hasSvgEmbed && (
            <Button variant="outline" size="sm" onClick={() => setSvgEditing(true)}>
              <ImageUp className="mr-2 h-3.5 w-3.5" />
              SVG hochladen
            </Button>
          )}
        </div>
      ) : mode === "svg" && !svgEmbed && !readOnly ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/40 bg-muted/10 py-12 cursor-pointer hover:border-primary/70 transition-colors"
          onClick={() => setSvgEditing(true)}
        >
          <ImageUp className="h-8 w-8 text-primary/50" />
          <p className="text-sm text-muted-foreground">SVG-Datei hochladen oder URL eingeben</p>
        </div>
      ) : (
        <>
          <BpmnEditor
            xml={xml ?? undefined}
            editable={editing}
            height={560}
            onSave={handleSave}
            onCancel={handleCancel}
          />
          <DiagramLegend defaultOpen={readOnly} />
        </>
      )}
    </div>
  );
}
