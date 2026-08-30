import { useState, useRef, useEffect, useCallback } from "react";
import { BpmnEditor, DEFAULT_BPMN_XML } from "@/components/editor/BpmnEditor";
import { DiagramLegend } from "@/components/qm/DiagramLegend";
import { Button } from "@workspace/ui/button";
import { viewBoxAusMassen } from "@/lib/svg-viewbox";
import {
  GitBranch,
  Pencil,
  ImageUp,
  ArrowLeftRight,
  X,
  Upload,
  Link2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Scan,
  Maximize2,
  Minimize2,
  GripHorizontal,
} from "lucide-react";

interface BpmnDiagramData {
  xml: string;
  svgEmbed?: string;
  mode?: "bpmn" | "svg";
  /** Vom Betrachter eingestellte Rahmenhoehe der SVG-Anzeige, in Pixeln. */
  svgHeight?: number;
}

/** Gleiche Hoehe wie der BPMN-Editor daneben, damit der Wechsel nicht springt. */
const SVG_VIEWER_DEFAULT_HEIGHT = 560;
const SVG_VIEWER_MIN_HEIGHT = 240;

interface PanZoomInstanz {
  destroy: () => void;
  resize: () => void;
  fit: () => void;
  center: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

function isBpmnData(v: unknown): v is BpmnDiagramData {
  return (
    typeof v === "object" &&
    v !== null &&
    "xml" in v &&
    typeof (v as BpmnDiagramData).xml === "string"
  );
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
          (name === "href" &&
            attr.value.trim().toLowerCase().startsWith("javascript:")) ||
          (name === "xlink:href" &&
            attr.value.trim().toLowerCase().startsWith("javascript:"))
        ) {
          el.removeAttribute(attr.name);
        }
      });
    });
    doc.querySelectorAll("script").forEach((s) => s.parentNode?.removeChild(s));

    // Ohne viewBox kann svg-pan-zoom nicht einpassen — die Grafik blieb dann
    // ausschnittsweise stehen. Exporte aus Miro und Visio tragen haeufig nur
    // width/height in Pixeln. Beides muss hier gesetzt sein, BEVOR der Viewer
    // width/height auf 100 % zieht und die Originalmasse damit verliert.
    const wurzel = doc.documentElement;
    if (!wurzel.getAttribute("viewBox")) {
      const ersatz = viewBoxAusMassen(
        wurzel.getAttribute("width"),
        wurzel.getAttribute("height"),
      );
      if (ersatz) wurzel.setAttribute("viewBox", ersatz);
    }
    if (!wurzel.getAttribute("preserveAspectRatio")) {
      wurzel.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }

    return new XMLSerializer().serializeToString(wurzel);
  } catch {
    return "";
  }
}

function SvgViewer({
  svgContent,
  height,
  onHeightChange,
}: {
  svgContent: string;
  /** Gespeicherte Rahmenhoehe; fehlt sie, gilt der Standard. */
  height?: number;
  /** Nur gesetzt, wenn die Hoehe gespeichert werden darf (Bearbeitungsrecht). */
  onHeightChange?: (hoehe: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panZoomRef = useRef<PanZoomInstanz | null>(null);
  const [vollbild, setVollbild] = useState(false);
  const [rahmenHoehe, setRahmenHoehe] = useState(
    height ?? SVG_VIEWER_DEFAULT_HEIGHT,
  );
  const ziehenRef = useRef<{ startY: number; startHoehe: number } | null>(null);
  const hoeheRef = useRef(rahmenHoehe);
  hoeheRef.current = rahmenHoehe;

  // Von aussen geaenderte Hoehe uebernehmen (anderer Abschnitt geladen).
  useEffect(() => {
    setRahmenHoehe(height ?? SVG_VIEWER_DEFAULT_HEIGHT);
  }, [height]);

  const einpassen = useCallback(() => {
    const instanz = panZoomRef.current;
    if (!instanz) return;
    try {
      instanz.resize();
      instanz.fit();
      instanz.center();
    } catch {
      /* Instanz bereits verworfen */
    }
  }, []);

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
    import("svg-pan-zoom")
      .then(({ default: svgPanZoom }) => {
        if (cancelled || !svgEl.parentNode) return;
        try {
          panZoomRef.current = svgPanZoom(svgEl, {
            zoomEnabled: true,
            panEnabled: true,
            // Eigene Leiste statt der eingebauten Symbole: jene liegen im SVG
            // selbst, skalieren mit und passen nicht zum uebrigen Bedienbild.
            controlIconsEnabled: false,
            fit: true,
            center: true,
            minZoom: 0.1,
            maxZoom: 20,
          }) as PanZoomInstanz;
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      cancelled = true;
      if (panZoomRef.current) {
        try {
          panZoomRef.current.destroy();
        } catch {
          /* ignore */
        }
        panZoomRef.current = null;
      }
    };
  }, [svgContent]);

  // Jede Groessenaenderung des Rahmens — Ziehgriff, Vollbild, Fensterbreite —
  // muss neu eingepasst werden. Ohne das behaelt svg-pan-zoom den Viewport
  // von der ersten Messung und schneidet weiterhin ab.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const beobachter = new ResizeObserver(() => einpassen());
    beobachter.observe(container);
    return () => beobachter.disconnect();
  }, [einpassen]);

  // Vollbild mit Escape verlassen.
  useEffect(() => {
    if (!vollbild) return;
    const beiTaste = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVollbild(false);
    };
    window.addEventListener("keydown", beiTaste);
    return () => window.removeEventListener("keydown", beiTaste);
  }, [vollbild]);

  const beiZiehStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    ziehenRef.current = { startY: e.clientY, startHoehe: hoeheRef.current };
  };

  const beiZiehen = (e: React.PointerEvent<HTMLDivElement>) => {
    const zug = ziehenRef.current;
    if (!zug) return;
    setRahmenHoehe(
      Math.max(
        SVG_VIEWER_MIN_HEIGHT,
        Math.round(zug.startHoehe + (e.clientY - zug.startY)),
      ),
    );
  };

  const beiZiehEnde = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ziehenRef.current) return;
    ziehenRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    // Erst am Ende des Ziehens speichern — nicht bei jedem Pixel.
    onHeightChange?.(hoeheRef.current);
  };

  const knopf = "h-7 w-7 p-0";

  return (
    <div
      className={
        vollbild
          ? "fixed inset-0 z-50 flex flex-col gap-1 bg-background p-3"
          : "flex flex-col gap-1"
      }
    >
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={knopf}
          title="Verkleinern"
          onClick={() => panZoomRef.current?.zoomOut()}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={knopf}
          title="Vergrößern"
          onClick={() => panZoomRef.current?.zoomIn()}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={knopf}
          title="Ganz einpassen"
          onClick={einpassen}
        >
          <Scan className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={knopf}
          title={vollbild ? "Vollbild verlassen (Esc)" : "Vollbild"}
          onClick={() => setVollbild((v) => !v)}
        >
          {vollbild ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <div
        ref={containerRef}
        className={`w-full rounded-lg border overflow-hidden bg-muted/10 ${
          vollbild ? "flex-1" : ""
        }`}
        style={vollbild ? undefined : { height: rahmenHoehe }}
      />

      {!vollbild && (
        <div
          role="separator"
          aria-label="Höhe der Diagrammanzeige ändern"
          title="Zum Ändern der Höhe ziehen"
          onPointerDown={beiZiehStart}
          onPointerMove={beiZiehen}
          onPointerUp={beiZiehEnde}
          onPointerCancel={beiZiehEnde}
          className="flex h-3 cursor-ns-resize items-center justify-center rounded text-muted-foreground/50 hover:bg-accent hover:text-muted-foreground"
        >
          <GripHorizontal className="h-3 w-3" />
        </div>
      )}
    </div>
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
        <button
          onClick={onCancel}
          className="p-1 rounded hover:bg-accent text-muted-foreground"
        >
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
            <p className="text-xs text-muted-foreground mt-1">
              z. B. Miro-Export, Draw.io, Visio-Export
            </p>
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
          <label className="text-xs text-muted-foreground">
            SVG-URL (öffentlich erreichbar)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://example.com/diagram.svg"
              className="flex-1 rounded border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              size="sm"
              onClick={handleUrl}
              disabled={loading || !urlValue.trim()}
            >
              {loading ? "Laden…" : "Laden"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {current && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            Aktuelle SVG-Vorschau:
          </p>
          <SvgViewer svgContent={current} />
        </div>
      )}
    </div>
  );
}

export function BpmnDiagramSection({
  data,
  onSave,
  readOnly = false,
}: BpmnDiagramSectionProps) {
  const [editing, setEditing] = useState(false);
  const [svgEditing, setSvgEditing] = useState(false);

  const parsedData = isBpmnData(data) ? data : null;
  const xml = parsedData?.xml ?? null;
  const svgEmbed = parsedData?.svgEmbed ?? null;
  const mode = parsedData?.mode ?? "bpmn";
  const hasContent = Boolean(xml);
  const hasSvgEmbed = Boolean(svgEmbed);

  function handleSave(newXml: string) {
    onSave?.({ ...parsedData, xml: newXml, mode: "bpmn" });
    setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
  }

  function handleSvgSave(svgContent: string) {
    onSave?.({
      ...parsedData,
      xml: xml ?? DEFAULT_BPMN_XML,
      svgEmbed: svgContent,
      mode: "svg",
    });
    setSvgEditing(false);
  }

  function handleSvgHeightChange(hoehe: number) {
    if (!parsedData) return;
    onSave?.({ ...parsedData, svgHeight: hoehe });
  }

  function handleSwitchMode(newMode: "bpmn" | "svg") {
    if (!parsedData) return;
    onSave?.({ ...parsedData, mode: newMode });
  }

  if (!hasContent && !hasSvgEmbed && readOnly) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 py-12 text-center">
        <GitBranch className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Kein BPMN-Diagramm vorhanden
        </p>
      </div>
    );
  }

  if (!hasContent && !hasSvgEmbed && !readOnly && !editing && !svgEditing) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-primary/40 bg-muted/20 py-14 text-center">
        <GitBranch className="h-10 w-10 text-primary/50" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Noch kein BPMN 2.0-Diagramm vorhanden
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Erstelle ein Prozessdiagramm oder bette eine externe SVG ein
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button size="sm" onClick={() => setEditing(true)}>
            <GitBranch className="mr-2 h-4 w-4" />
            BPMN-Diagramm erstellen
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSvgEditing(true)}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSvgEditing(true)}
              >
                <ImageUp className="mr-2 h-3.5 w-3.5" />
                SVG ersetzen
              </Button>
            )}
            {mode === "bpmn" && !editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Diagramm bearbeiten
              </Button>
            )}
            {!editing && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (
                    window.confirm(
                      "Diagramm wirklich entfernen? Diese Aktion kann rückgängig gemacht werden, solange die Arbeitskopie noch nicht gespeichert ist.",
                    )
                  ) {
                    onSave?.(null);
                  }
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Entfernen
              </Button>
            )}
          </div>
        </div>
      )}

      {mode === "svg" && svgEmbed ? (
        <div className="space-y-3">
          <SvgViewer
            svgContent={svgEmbed}
            height={parsedData?.svgHeight}
            onHeightChange={
              readOnly || !onSave ? undefined : handleSvgHeightChange
            }
          />
          {!readOnly && !hasSvgEmbed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSvgEditing(true)}
            >
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
          <p className="text-sm text-muted-foreground">
            SVG-Datei hochladen oder URL eingeben
          </p>
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
