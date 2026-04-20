import { useEffect, useRef, useState, useCallback } from "react";
import {
  Maximize2,
  Minimize2,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  X,
  Loader2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { DiagramLegend } from "@/components/qm/DiagramLegend";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";

export const DEFAULT_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_1" name="Prozessname" processRef="Process_1" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="Lane_1" name="Rolle 1">
        <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Gateway_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_2</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>EndEvent_1</bpmn:flowNodeRef>
      </bpmn:lane>
      <bpmn:lane id="Lane_2" name="Rolle 2">
        <bpmn:flowNodeRef>Task_3</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Aufgabe 1">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:exclusiveGateway id="Gateway_1" name="Entscheidung?">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:task id="Task_2" name="Aufgabe 2">
      <bpmn:incoming>Flow_3</bpmn:incoming>
      <bpmn:outgoing>Flow_5</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_3" name="Aufgabe 3">
      <bpmn:incoming>Flow_4</bpmn:incoming>
      <bpmn:outgoing>Flow_6</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="Ende">
      <bpmn:incoming>Flow_5</bpmn:incoming>
      <bpmn:incoming>Flow_6</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Gateway_1" />
    <bpmn:sequenceFlow id="Flow_3" name="Ja" sourceRef="Gateway_1" targetRef="Task_2" />
    <bpmn:sequenceFlow id="Flow_4" name="Nein" sourceRef="Gateway_1" targetRef="Task_3" />
    <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="EndEvent_1" />
    <bpmn:sequenceFlow id="Flow_6" sourceRef="Task_3" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true">
        <dc:Bounds x="130" y="80" width="760" height="310" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_1_di" bpmnElement="Lane_1" isHorizontal="true">
        <dc:Bounds x="160" y="80" width="730" height="160" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_2_di" bpmnElement="Lane_2" isHorizontal="true">
        <dc:Bounds x="160" y="240" width="730" height="150" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="212" y="142" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="215" y="185" width="24" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="310" y="120" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_1_di" bpmnElement="Gateway_1" isMarkerVisible="true">
        <dc:Bounds x="475" y="135" width="50" height="50" />
        <bpmndi:BPMNLabel><dc:Bounds x="455" y="105" width="82" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2">
        <dc:Bounds x="590" y="120" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3">
        <dc:Bounds x="460" y="270" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="752" y="142" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="755" y="185" width="22" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="248" y="160" /><di:waypoint x="310" y="160" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="410" y="160" /><di:waypoint x="475" y="160" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="525" y="160" /><di:waypoint x="590" y="160" />
        <bpmndi:BPMNLabel><dc:Bounds x="548" y="142" width="14" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="500" y="185" /><di:waypoint x="500" y="270" />
        <bpmndi:BPMNLabel><dc:Bounds x="506" y="220" width="26" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5">
        <di:waypoint x="690" y="160" /><di:waypoint x="752" y="160" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6">
        <di:waypoint x="560" y="310" /><di:waypoint x="770" y="310" /><di:waypoint x="770" y="178" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

interface BpmnEditorProps {
  xml?: string;
  editable?: boolean;
  height?: number;
  onSave?: (xml: string) => void;
  onCancel?: () => void;
  showLegend?: boolean;
  onToggleLegend?: () => void;
}

export function BpmnEditor({
  xml,
  editable = false,
  height = 480,
  onSave,
  onCancel,
  showLegend = false,
  onToggleLegend,
}: BpmnEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);

  const effectiveXml = xml || DEFAULT_BPMN_XML;

  const initBpmn = useCallback(async () => {
    if (!containerRef.current) return;
    setLoading(true);
    setError(null);

    try {
      if (editable) {
        const { default: BpmnModeler } = await import("bpmn-js/lib/Modeler");
        const modeler = new BpmnModeler({
          container: containerRef.current,
          keyboard: { bindTo: containerRef.current },
        });
        instanceRef.current = modeler;
        await modeler.importXML(effectiveXml);
        const canvas = modeler.get("canvas") as { zoom: (fit: string) => void };
        canvas.zoom("fit-viewport");
      } else {
        const { default: NavigatedViewer } = await import(
          "bpmn-js/lib/NavigatedViewer"
        );
        const viewer = new NavigatedViewer({
          container: containerRef.current,
        });
        instanceRef.current = viewer;
        await viewer.importXML(effectiveXml);
        const canvas = viewer.get("canvas") as { zoom: (fit: string) => void };
        canvas.zoom("fit-viewport");
      }
    } catch (err) {
      console.error("BPMN load error:", err);
      setError(
        err instanceof Error ? err.message : "Diagramm konnte nicht geladen werden"
      );
    } finally {
      setLoading(false);
    }
  }, [effectiveXml, editable]);

  useEffect(() => {
    initBpmn();
    return () => {
      if (instanceRef.current) {
        try {
          (instanceRef.current as { destroy: () => void }).destroy();
        } catch {
        }
        instanceRef.current = null;
      }
    };
  }, [initBpmn]);

  const getCanvas = () => {
    if (!instanceRef.current) return null;
    try {
      return (instanceRef.current as { get: (name: string) => unknown }).get("canvas") as {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        zoom: (...args: any[]) => any;
      };
    } catch {
      return null;
    }
  };

  const handleZoomIn = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    try { canvas.zoom(canvas.zoom() * 1.2); } catch {}
  };

  const handleZoomOut = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    try { canvas.zoom(canvas.zoom() * 0.8); } catch {}
  };

  const handleFitView = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    try { canvas.zoom("fit-viewport"); } catch {}
  };

  const handleSave = async () => {
    if (!instanceRef.current || !onSave) return;
    setSaving(true);
    try {
      const { xml: savedXml } = await (instanceRef.current as {
        saveXML: (opts: { format: boolean }) => Promise<{ xml: string }>;
      }).saveXML({ format: true });
      onSave(savedXml);
    } catch (err) {
      console.error("BPMN save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadSvg = async () => {
    if (!instanceRef.current) return;
    try {
      const { svg } = await (instanceRef.current as {
        saveSVG: () => Promise<{ svg: string }>;
      }).saveSVG();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "prozessdiagramm.svg";
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const effectiveHeight = fullscreen ? "100%" : `${height}px`;

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 bg-background flex flex-col"
          : "relative rounded-lg border overflow-hidden flex flex-col"
      }
    >
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b bg-muted/40 shrink-0">
        <div className="flex items-center gap-1">
          {editable && onSave && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Speichern
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs border hover:bg-accent"
                >
                  <X className="h-3 w-3" />
                  Abbrechen
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <ToolBtn onClick={handleZoomIn} title="Vergr\u00F6\u00DFern">
            <ZoomIn className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={handleZoomOut} title="Verkleinern">
            <ZoomOut className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={handleFitView} title="Einpassen">
            <RotateCcw className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={handleDownloadSvg} title="Als SVG herunterladen">
            <Download className="h-3.5 w-3.5" />
          </ToolBtn>
          {onToggleLegend && (
            <ToolBtn
              onClick={onToggleLegend}
              title={showLegend ? "Legende ausblenden" : "Legende anzeigen"}
            >
              <BookOpen
                className={`h-3.5 w-3.5 ${showLegend ? "text-primary" : ""}`}
              />
            </ToolBtn>
          )}
          <ToolBtn
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "Vollbild beenden" : "Vollbild"}
          >
            {fullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </ToolBtn>
        </div>
      </div>

      <div className="relative flex-1" style={{ minHeight: effectiveHeight }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-destructive text-center">{error}</p>
            <button
              className="text-xs px-3 py-1.5 rounded border hover:bg-accent"
              onClick={initBpmn}
            >
              Erneut versuchen
            </button>
          </div>
        )}
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ minHeight: effectiveHeight }}
        />
      </div>

      {editable && (
        <div className="px-3 py-1.5 border-t bg-muted/30 shrink-0">
          <p className="text-[10px] text-muted-foreground">
            BPMN 2.0 \u2022 Drag &amp; Drop \u2022 Rechtsklick f\u00FCr Kontextmen\u00FC \u2022 Strg+Z/Y zum R\u00FCckg\u00E4ngig/Wiederholen
          </p>
        </div>
      )}

      {showLegend && !editable && (
        <div className="px-3 pb-3 border-t bg-background">
          <DiagramLegend defaultOpen={true} />
        </div>
      )}
    </div>
  );
}

function ToolBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );
}
