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
  Map,
  FileDown,
  SlidersHorizontal,
  ArrowLeftRight,
} from "lucide-react";
import { DiagramLegend } from "@/components/qm/DiagramLegend";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "bpmn-js-color-picker/colors/color-picker.css";

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

const WIKI_MODDLE_EXTENSION = {
  name: "wiki",
  uri: "http://wiki.internal/schema/1.0",
  prefix: "wiki",
  xml: { tagAlias: "lowerCase" },
  types: [
    {
      name: "ElementProperties",
      superClass: ["Element"],
      properties: [
        { name: "responsible", isAttr: true, type: "String" },
        { name: "description", isAttr: true, type: "String" },
        { name: "fontSize", isAttr: true, type: "Integer" },
      ],
    },
  ],
};

type BpmnModelerInstance = {
  get: (name: string) => unknown;
  importXML: (xml: string) => Promise<void>;
  saveXML: (opts: { format: boolean }) => Promise<{ xml: string }>;
  saveSVG: () => Promise<{ svg: string }>;
  destroy: () => void;
};

type BpmnElement = {
  id: string;
  type: string;
  waypoints?: unknown[];
  source?: BpmnElement;
  target?: BpmnElement;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  businessObject?: {
    name?: string;
    extensionElements?: {
      values?: Array<{
        $type?: string;
        responsible?: string;
        description?: string;
        fontSize?: number;
      }>;
    };
  };
};

interface ElementProperties {
  id: string;
  name: string;
  responsible: string;
  description: string;
  fontSize: number;
  isConnection: boolean;
  connectionType: string;
}

interface BpmnEditorProps {
  xml?: string;
  editable?: boolean;
  height?: number;
  title?: string;
  onSave?: (xml: string) => void;
  onCancel?: () => void;
  showLegend?: boolean;
  onToggleLegend?: () => void;
}

function makePaletteModule() {
  function WikiMessagePalette(
    this: { getPaletteEntries: () => Record<string, unknown> },
    palette: { registerProvider: (p: unknown) => void },
    create: { start: (event: unknown, shape: unknown) => void },
    elementFactory: {
      createShape: (opts: {
        type: string;
        eventDefinitionType: string;
      }) => unknown;
    },
    translate: (s: string) => string,
  ) {
    palette.registerProvider(this);
    const _create = create;
    const _elementFactory = elementFactory;
    const _translate = translate;

    this.getPaletteEntries = function () {
      function mkAction(eventType: string, defType: string) {
        return function (event: unknown) {
          const shape = _elementFactory.createShape({
            type: eventType,
            eventDefinitionType: defType,
          });
          _create.start(event, shape);
        };
      }
      return {
        "create.message-start-event": {
          group: "event",
          className: "bpmn-icon-start-event-message",
          title: _translate("Nachrichten-Startereignis"),
          action: {
            dragstart: mkAction(
              "bpmn:StartEvent",
              "bpmn:MessageEventDefinition",
            ),
            click: mkAction("bpmn:StartEvent", "bpmn:MessageEventDefinition"),
          },
        },
        "create.message-intermediate-catch": {
          group: "event",
          className: "bpmn-icon-intermediate-event-catch-message",
          title: _translate("Nachrichten-Zwischenereignis (Catch)"),
          action: {
            dragstart: mkAction(
              "bpmn:IntermediateCatchEvent",
              "bpmn:MessageEventDefinition",
            ),
            click: mkAction(
              "bpmn:IntermediateCatchEvent",
              "bpmn:MessageEventDefinition",
            ),
          },
        },
        "create.message-end-event": {
          group: "event",
          className: "bpmn-icon-end-event-message",
          title: _translate("Nachrichten-Endereignis"),
          action: {
            dragstart: mkAction("bpmn:EndEvent", "bpmn:MessageEventDefinition"),
            click: mkAction("bpmn:EndEvent", "bpmn:MessageEventDefinition"),
          },
        },
      };
    };
  }

  WikiMessagePalette.$inject = [
    "palette",
    "create",
    "elementFactory",
    "translate",
  ];

  return {
    __init__: ["wikiMessagePalette"],
    wikiMessagePalette: ["type", WikiMessagePalette],
  };
}

function makeConnectionContextPadModule() {
  function WikiConnectionContextPad(
    this: {
      getContextPadEntries: (el: BpmnElement) => Record<string, unknown>;
    },
    contextPad: { registerProvider: (p: unknown) => void },
    modeling: {
      connect: (
        a: BpmnElement,
        b: BpmnElement,
        opts: { type: string },
      ) => BpmnElement | null;
      removeConnection: (el: BpmnElement) => void;
    },
    bpmnReplace: {
      replaceElement: (el: BpmnElement, target: { type: string }) => void;
    },
  ) {
    contextPad.registerProvider(this);

    this.getContextPadEntries = function (element: BpmnElement) {
      if (!element.waypoints) return {};

      const entries: Record<string, unknown> = {};

      entries["reverse-connection"] = {
        group: "edit",
        className: "bpmn-icon-screw-wrench",
        title: "Richtung umkehren",
        action: {
          click: function () {
            if (!element.source || !element.target) return;
            const srcEl = element.source;
            const tgtEl = element.target;
            const type = element.type;
            modeling.removeConnection(element);
            modeling.connect(tgtEl, srcEl, { type });
          },
        },
      };

      if (element.type === "bpmn:SequenceFlow") {
        entries["change-to-association"] = {
          group: "edit",
          className: "bpmn-icon-connection",
          title: "Zu Assoziation \u00e4ndern",
          action: {
            click: function () {
              bpmnReplace.replaceElement(element, { type: "bpmn:Association" });
            },
          },
        };
      }

      if (element.type === "bpmn:Association") {
        entries["change-to-sequence"] = {
          group: "edit",
          className: "bpmn-icon-connection-directed",
          title: "Zu Sequenzfluss \u00e4ndern",
          action: {
            click: function () {
              bpmnReplace.replaceElement(element, {
                type: "bpmn:SequenceFlow",
              });
            },
          },
        };
      }

      const srcType = element.source?.type ?? "";
      const tgtType = element.target?.type ?? "";
      const connectsParticipants =
        srcType === "bpmn:Participant" || tgtType === "bpmn:Participant";

      if (connectsParticipants && element.type !== "bpmn:MessageFlow") {
        entries["change-to-message-flow"] = {
          group: "edit",
          className: "bpmn-icon-connection-multi",
          title: "Zu Nachrichtenfluss \u00e4ndern",
          action: {
            click: function () {
              try {
                bpmnReplace.replaceElement(element, {
                  type: "bpmn:MessageFlow",
                });
              } catch {
                /* invalid in this context */
              }
            },
          },
        };
      }

      return entries;
    };
  }

  WikiConnectionContextPad.$inject = ["contextPad", "modeling", "bpmnReplace"];

  return {
    __init__: ["wikiConnectionContextPad"],
    wikiConnectionContextPad: ["type", WikiConnectionContextPad],
  };
}

export function BpmnEditor({
  xml,
  editable = false,
  height = 480,
  title,
  onSave,
  onCancel,
  showLegend = false,
  onToggleLegend,
}: BpmnEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<BpmnModelerInstance | null>(null);
  const minimapUnsubRef = useRef<(() => void) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorLegendOpen, setEditorLegendOpen] = useState(false);
  const [minimapOpen, setMinimapOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [selectedElement, setSelectedElement] =
    useState<ElementProperties | null>(null);
  const [propForm, setPropForm] = useState<ElementProperties>({
    id: "",
    name: "",
    responsible: "",
    description: "",
    fontSize: 14,
    isConnection: false,
    connectionType: "",
  });

  const effectiveXml = xml || DEFAULT_BPMN_XML;

  const readElementProps = useCallback(
    (element: BpmnElement): ElementProperties => {
      const bo = element.businessObject;
      const wikiProps = bo?.extensionElements?.values?.find(
        (v) => v.$type === "wiki:ElementProperties",
      );
      return {
        id: element.id,
        name: bo?.name ?? "",
        responsible: wikiProps?.responsible ?? "",
        description: wikiProps?.description ?? "",
        fontSize: wikiProps?.fontSize ?? 14,
        isConnection: Boolean(element.waypoints),
        connectionType: element.type,
      };
    },
    [],
  );

  const applyFontSizeToElement = useCallback(
    (elementId: string, fontSize: number) => {
      if (!instanceRef.current) return;
      try {
        const elementRegistry = instanceRef.current.get("elementRegistry") as {
          getGraphics: (id: string) => SVGElement | undefined;
        };
        const graphic = elementRegistry.getGraphics(elementId);
        if (graphic) {
          graphic.querySelectorAll("text").forEach((t) => {
            (t as SVGTextElement).style.fontSize = `${fontSize}px`;
          });
        }
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const renderMinimap = useCallback(() => {
    if (!minimapRef.current || !instanceRef.current) return;
    try {
      const inst = instanceRef.current;
      const elementRegistry = inst.get("elementRegistry") as {
        getAll: () => BpmnElement[];
      };
      const canvas = inst.get("canvas") as {
        viewbox: () => { x: number; y: number; width: number; height: number };
      };

      const miniCanvas = minimapRef.current;
      const ctx = miniCanvas.getContext("2d");
      if (!ctx) return;

      const shapes = elementRegistry
        .getAll()
        .filter(
          (el) => !el.waypoints && el.x !== undefined && el.width !== undefined,
        );

      if (shapes.length === 0) return;

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const s of shapes) {
        const x = s.x ?? 0;
        const y = s.y ?? 0;
        const w = s.width ?? 0;
        const h = s.height ?? 0;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x + w > maxX) maxX = x + w;
        if (y + h > maxY) maxY = y + h;
      }

      const pad = 10;
      const diagW = maxX - minX + pad * 2;
      const diagH = maxY - minY + pad * 2;
      const scaleX = miniCanvas.width / diagW;
      const scaleY = miniCanvas.height / diagH;
      const scale = Math.min(scaleX, scaleY);
      const offsetX = (miniCanvas.width - diagW * scale) / 2;
      const offsetY = (miniCanvas.height - diagH * scale) / 2;

      ctx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

      for (const s of shapes) {
        const x = ((s.x ?? 0) - minX + pad) * scale + offsetX;
        const y = ((s.y ?? 0) - minY + pad) * scale + offsetY;
        const w = (s.width ?? 0) * scale;
        const h = (s.height ?? 0) * scale;

        if (s.type?.includes("Lane") || s.type?.includes("Participant")) {
          ctx.fillStyle = "#f1f5f9";
          ctx.strokeStyle = "#94a3b8";
        } else if (s.type?.includes("Gateway")) {
          ctx.fillStyle = "#fef9c3";
          ctx.strokeStyle = "#ca8a04";
        } else if (s.type?.includes("Event")) {
          ctx.fillStyle = "#dcfce7";
          ctx.strokeStyle = "#2b7a27";
        } else {
          ctx.fillStyle = "#dbeafe";
          ctx.strokeStyle = "#3b82f6";
        }
        ctx.lineWidth = 0.5;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      }

      const viewbox = canvas.viewbox();
      const vpX = (viewbox.x - minX + pad) * scale + offsetX;
      const vpY = (viewbox.y - minY + pad) * scale + offsetY;
      const vpW = viewbox.width * scale;
      const vpH = viewbox.height * scale;

      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5;
      ctx.fillStyle = "rgba(59,130,246,0.06)";
      ctx.fillRect(vpX, vpY, vpW, vpH);
      ctx.strokeRect(vpX, vpY, vpW, vpH);
    } catch {
      /* ignore */
    }
  }, []);

  const subscribeMinimapEvents = useCallback(() => {
    if (!instanceRef.current) return;
    const eventBus = instanceRef.current.get("eventBus") as {
      on: (event: string, priority: number, handler: () => void) => void;
      off: (event: string, handler: () => void) => void;
    };

    const handler = () => renderMinimap();
    const events = [
      "canvas.viewbox.changed",
      "shape.move.end",
      "shape.resize.end",
      "connection.move.end",
      "elements.changed",
      "import.render.complete",
    ];
    for (const ev of events) {
      eventBus.on(ev, 500, handler);
    }
    return () => {
      for (const ev of events) {
        try {
          eventBus.off(ev, handler);
        } catch {
          /* ignore */
        }
      }
    };
  }, [renderMinimap]);

  const initBpmn = useCallback(async () => {
    if (!containerRef.current) return;
    setLoading(true);
    setError(null);

    try {
      if (editable) {
        const [{ default: BpmnModeler }, { default: BpmnColorPickerModule }] =
          await Promise.all([
            import("bpmn-js/lib/Modeler"),
            import("bpmn-js-color-picker"),
          ]);

        const ConnectionContextPadModule = makeConnectionContextPadModule();
        const PaletteModule = makePaletteModule();

        const modeler = new BpmnModeler({
          container: containerRef.current,
          keyboard: { bindTo: containerRef.current },
          additionalModules: [
            BpmnColorPickerModule,
            ConnectionContextPadModule,
            PaletteModule,
          ],
          moddleExtensions: { wiki: WIKI_MODDLE_EXTENSION },
          grid: { active: true, visible: false, gridSpacing: 10 },
        });
        instanceRef.current = modeler as unknown as BpmnModelerInstance;
        await modeler.importXML(effectiveXml);

        const canvas = modeler.get("canvas") as {
          zoom: (...args: unknown[]) => unknown;
        };
        requestAnimationFrame(() => {
          canvas.zoom("fit-viewport");
        });

        const eventBus = modeler.get("eventBus") as {
          on: (event: string, handler: (e: unknown) => void) => void;
        };

        eventBus.on("selection.changed", (e: unknown) => {
          const event = e as { newSelection?: BpmnElement[] };
          const selected = event.newSelection?.[0];
          if (selected) {
            const props = readElementProps(selected);
            setSelectedElement(props);
            setPropForm(props);
          } else {
            setSelectedElement(null);
          }
        });

        eventBus.on("import.render.complete", () => {
          try {
            const reg = modeler.get("elementRegistry") as {
              getAll: () => BpmnElement[];
              getGraphics: (id: string) => SVGElement | undefined;
            };
            reg.getAll().forEach((el) => {
              const fs = el.businessObject?.extensionElements?.values?.find(
                (v) => v.$type === "wiki:ElementProperties",
              )?.fontSize;
              if (fs && fs !== 14) {
                const g = reg.getGraphics(el.id);
                if (g) {
                  g.querySelectorAll("text").forEach((t) => {
                    (t as SVGTextElement).style.fontSize = `${fs}px`;
                  });
                }
              }
            });
          } catch {
            /* ignore */
          }
        });

        const unsub = subscribeMinimapEvents();
        if (unsub) minimapUnsubRef.current = unsub;
      } else {
        const { default: NavigatedViewer } =
          await import("bpmn-js/lib/NavigatedViewer");
        const viewer = new NavigatedViewer({
          container: containerRef.current,
          moddleExtensions: { wiki: WIKI_MODDLE_EXTENSION },
        });
        instanceRef.current = viewer as unknown as BpmnModelerInstance;
        await viewer.importXML(effectiveXml);

        const canvas = viewer.get("canvas") as {
          zoom: (...args: unknown[]) => unknown;
        };
        requestAnimationFrame(() => {
          setTimeout(() => {
            try {
              canvas.zoom("fit-viewport");
            } catch {
              /* ignore */
            }
          }, 50);
        });

        const unsub = subscribeMinimapEvents();
        if (unsub) minimapUnsubRef.current = unsub;
      }
    } catch (err) {
      console.error("BPMN load error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Diagramm konnte nicht geladen werden",
      );
    } finally {
      setLoading(false);
    }
  }, [effectiveXml, editable, readElementProps, subscribeMinimapEvents]);

  useEffect(() => {
    void initBpmn();
    return () => {
      if (minimapUnsubRef.current) {
        minimapUnsubRef.current();
        minimapUnsubRef.current = null;
      }
      if (instanceRef.current) {
        try {
          instanceRef.current.destroy();
        } catch {
          /* ignore */
        }
        instanceRef.current = null;
      }
    };
  }, [initBpmn]);

  useEffect(() => {
    if (minimapOpen) {
      setTimeout(renderMinimap, 100);
    }
  }, [minimapOpen, renderMinimap]);

  const getCanvas = () => {
    if (!instanceRef.current) return null;
    try {
      return instanceRef.current.get("canvas") as {
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
    try {
      canvas.zoom(canvas.zoom() * 1.2);
    } catch {
      /* ignore */
    }
  };

  const handleZoomOut = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    try {
      canvas.zoom(canvas.zoom() * 0.8);
    } catch {
      /* ignore */
    }
  };

  const handleFitView = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    try {
      canvas.zoom("fit-viewport");
    } catch {
      /* ignore */
    }
  };

  const handleSave = async () => {
    if (!instanceRef.current || !onSave) return;
    setSaving(true);
    try {
      const { xml: savedXml } = await instanceRef.current.saveXML({
        format: true,
      });
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
      const { svg } = await instanceRef.current.saveSVG();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "prozessdiagramm.svg";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };

  const handleDownloadPdf = async () => {
    if (!instanceRef.current) return;
    try {
      const { svg } = await instanceRef.current.saveSVG();
      const [{ jsPDF }, { svg2pdf }] = await Promise.all([
        import("jspdf"),
        import("svg2pdf.js"),
      ]);

      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svg, "image/svg+xml");
      const svgElement = svgDoc.documentElement as unknown as SVGSVGElement;

      const rawW = parseFloat(svgElement.getAttribute("width") ?? "800");
      const rawH = parseFloat(svgElement.getAttribute("height") ?? "600");
      const ratio = rawW / rawH;
      const pdfW = 287;
      const pdfH = Math.min(pdfW / ratio, 200);

      const pdf = new jsPDF({
        orientation: pdfW >= pdfH ? "landscape" : "portrait",
        unit: "mm",
        format: [pdfW, pdfH],
      });

      document.body.appendChild(svgElement);
      svgElement.style.position = "absolute";
      svgElement.style.left = "-9999px";

      await svg2pdf(svgElement, pdf, {
        x: 5,
        y: 5,
        width: pdfW - 10,
        height: pdfH - 10,
      });
      document.body.removeChild(svgElement);
      const safeTitle =
        (title ?? document.title ?? "prozessdiagramm")
          .replace(/[^a-zA-Z0-9\-_äöüÄÖÜß ]/g, "")
          .replace(/\s+/g, "_")
          .slice(0, 80) || "prozessdiagramm";
      pdf.save(`${safeTitle}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
    }
  };

  const handleSaveProperties = async () => {
    if (!instanceRef.current || !selectedElement) return;
    try {
      const inst = instanceRef.current;
      const modeling = inst.get("modeling") as {
        updateProperties: (element: unknown, props: unknown) => void;
      };
      const elementRegistry = inst.get("elementRegistry") as {
        get: (id: string) => BpmnElement | undefined;
      };
      const moddle = inst.get("moddle") as {
        create: (type: string, props?: Record<string, unknown>) => unknown;
      };

      const element = elementRegistry.get(selectedElement.id);
      if (!element) return;

      if (!element.waypoints) {
        modeling.updateProperties(element, { name: propForm.name });
      }

      const bo = element.businessObject;
      if (!bo) return;

      const wikiEl = moddle.create("wiki:ElementProperties", {
        responsible: propForm.responsible,
        description: propForm.description,
        fontSize: propForm.fontSize,
      }) as {
        $type: string;
        responsible: string;
        description: string;
        fontSize: number;
      };

      let extensionElements = bo.extensionElements;
      if (!extensionElements) {
        extensionElements = moddle.create("bpmn:ExtensionElements", {
          values: [],
        }) as typeof extensionElements;
      }

      const filteredValues = (extensionElements?.values ?? []).filter(
        (v) => v.$type !== "wiki:ElementProperties",
      );

      if (extensionElements) {
        (extensionElements as { values: unknown[] }).values = [
          ...filteredValues,
          wikiEl,
        ];
        modeling.updateProperties(element, { extensionElements });
      }

      applyFontSizeToElement(selectedElement.id, propForm.fontSize);
      setSelectedElement({ ...propForm });
    } catch (err) {
      console.error("Properties save error:", err);
    }
  };

  const handleReverseConnection = () => {
    if (!instanceRef.current || !selectedElement?.isConnection) return;
    try {
      const inst = instanceRef.current;
      const modeling = inst.get("modeling") as {
        connect: (
          a: BpmnElement,
          b: BpmnElement,
          opts: { type: string },
        ) => void;
        removeConnection: (el: BpmnElement) => void;
      };
      const elementRegistry = inst.get("elementRegistry") as {
        get: (id: string) => BpmnElement | undefined;
      };
      const element = elementRegistry.get(selectedElement.id);
      if (!element || !element.source || !element.target) return;
      const src = element.source;
      const tgt = element.target;
      const type = element.type;
      modeling.removeConnection(element);
      modeling.connect(tgt, src, { type });
      setSelectedElement(null);
    } catch (err) {
      console.error("Reverse connection error:", err);
    }
  };

  const handleChangeConnectionType = (newType: string) => {
    if (!instanceRef.current || !selectedElement?.isConnection) return;
    try {
      const inst = instanceRef.current;
      const bpmnReplace = inst.get("bpmnReplace") as {
        replaceElement: (el: BpmnElement, target: { type: string }) => void;
      };
      const elementRegistry = inst.get("elementRegistry") as {
        get: (id: string) => BpmnElement | undefined;
      };
      const element = elementRegistry.get(selectedElement.id);
      if (!element) return;
      bpmnReplace.replaceElement(element, { type: newType });
      setSelectedElement((prev) =>
        prev ? { ...prev, connectionType: newType } : null,
      );
    } catch (err) {
      console.error("Change connection type error:", err);
    }
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
          <ToolBtn onClick={handleZoomIn} title="Vergr\u00f6\u00dfern">
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
          <ToolBtn onClick={handleDownloadPdf} title="Als PDF herunterladen">
            <FileDown className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => setMinimapOpen((v) => !v)}
            title={minimapOpen ? "Mini-Map ausblenden" : "Mini-Map anzeigen"}
          >
            <Map
              className={`h-3.5 w-3.5 ${minimapOpen ? "text-primary" : ""}`}
            />
          </ToolBtn>
          {editable && (
            <ToolBtn
              onClick={() => {
                setPropertiesOpen((v) => {
                  if (!v) setEditorLegendOpen(false);
                  return !v;
                });
              }}
              title={
                propertiesOpen
                  ? "Eigenschaften ausblenden"
                  : "Eigenschaften anzeigen"
              }
            >
              <SlidersHorizontal
                className={`h-3.5 w-3.5 ${propertiesOpen ? "text-primary" : ""}`}
              />
            </ToolBtn>
          )}
          {editable ? (
            <ToolBtn
              onClick={() => {
                setEditorLegendOpen((v) => {
                  if (!v) setPropertiesOpen(false);
                  return !v;
                });
              }}
              title={
                editorLegendOpen ? "Legende ausblenden" : "Legende anzeigen"
              }
            >
              <BookOpen
                className={`h-3.5 w-3.5 ${editorLegendOpen ? "text-primary" : ""}`}
              />
            </ToolBtn>
          ) : onToggleLegend ? (
            <ToolBtn
              onClick={onToggleLegend}
              title={showLegend ? "Legende ausblenden" : "Legende anzeigen"}
            >
              <BookOpen
                className={`h-3.5 w-3.5 ${showLegend ? "text-primary" : ""}`}
              />
            </ToolBtn>
          ) : null}
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

      <div
        className="flex flex-1 overflow-hidden"
        style={{ minHeight: effectiveHeight }}
      >
        <div className="relative flex-1">
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

          {minimapOpen && (
            <div className="absolute bottom-3 right-3 z-10 rounded border bg-background/95 shadow-md overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1 border-b bg-muted/40">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Mini-Map
                </span>
                <button
                  onClick={() => setMinimapOpen(false)}
                  className="p-0.5 rounded hover:bg-accent text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <canvas
                ref={minimapRef}
                width={160}
                height={100}
                className="block"
              />
            </div>
          )}
        </div>

        {editable && editorLegendOpen && !propertiesOpen && (
          <div className="w-64 shrink-0 border-l bg-background overflow-y-auto flex flex-col">
            <div className="px-3 py-2 border-b bg-muted/40 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Legende &amp; Symbole
              </span>
              <button
                onClick={() => setEditorLegendOpen(false)}
                className="p-0.5 rounded hover:bg-accent text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <DiagramLegend inline />
          </div>
        )}

        {editable && propertiesOpen && !editorLegendOpen && (
          <div className="w-72 shrink-0 border-l bg-background overflow-y-auto flex flex-col">
            <div className="px-3 py-2 border-b bg-muted/40 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Eigenschaften
              </span>
              <button
                onClick={() => setPropertiesOpen(false)}
                className="p-0.5 rounded hover:bg-accent text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {!selectedElement ? (
              <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                <SlidersHorizontal className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  Element ausw\u00e4hlen, um Eigenschaften anzuzeigen
                </p>
              </div>
            ) : (
              <div className="p-3 flex flex-col gap-3">
                <div>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    ID
                  </span>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    {selectedElement.id}
                  </p>
                </div>

                {selectedElement.isConnection ? (
                  <div className="space-y-3">
                    <div>
                      <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Verbindungstyp
                      </span>
                      {selectedElement.connectionType === "bpmn:MessageFlow" ? (
                        <div className="space-y-1.5">
                          <div className="text-left text-xs px-2 py-1 rounded border bg-primary/10 border-primary/40 text-primary">
                            Nachrichtenfluss
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Nachrichtenfluss verbindet Pools — kein Typwechsel
                            möglich.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {[
                            {
                              type: "bpmn:SequenceFlow",
                              label: "Sequenzfluss",
                            },
                            { type: "bpmn:Association", label: "Assoziation" },
                          ].map(({ type, label }) => (
                            <button
                              key={type}
                              onClick={() => handleChangeConnectionType(type)}
                              className={`text-left text-xs px-2 py-1 rounded border transition-colors ${
                                selectedElement.connectionType === type
                                  ? "bg-primary/10 border-primary/40 text-primary"
                                  : "hover:bg-accent text-foreground"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleReverseConnection}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-xs border hover:bg-accent"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      Richtung umkehren
                    </button>
                    <p className="text-[10px] text-muted-foreground">
                      Tipp: Doppelklick auf Pfeil zum Beschriften
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                        Name
                      </label>
                      <input
                        type="text"
                        value={propForm.name}
                        onChange={(e) =>
                          setPropForm((p) => ({ ...p, name: e.target.value }))
                        }
                        className="w-full rounded border px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Elementname"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                        Verantwortliche/r
                      </label>
                      <input
                        type="text"
                        value={propForm.responsible}
                        onChange={(e) =>
                          setPropForm((p) => ({
                            ...p,
                            responsible: e.target.value,
                          }))
                        }
                        className="w-full rounded border px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Name oder Rolle"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                        Beschreibung
                      </label>
                      <textarea
                        value={propForm.description}
                        onChange={(e) =>
                          setPropForm((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        rows={4}
                        className="w-full rounded border px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        placeholder="Beschreibung des Elements..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                        Schriftgr\u00f6\u00dfe (px)
                      </label>
                      <input
                        type="number"
                        min={8}
                        max={36}
                        value={propForm.fontSize}
                        onChange={(e) =>
                          setPropForm((p) => ({
                            ...p,
                            fontSize: Math.max(
                              8,
                              Math.min(36, Number(e.target.value) || 14),
                            ),
                          }))
                        }
                        className="w-full rounded border px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <button
                      onClick={handleSaveProperties}
                      className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Check className="h-3 w-3" />
                      \u00dcbernehmen
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {editable && (
        <div className="px-3 py-1.5 border-t bg-muted/30 shrink-0">
          <p className="text-[10px] text-muted-foreground">
            BPMN 2.0 \u2022 Drag &amp; Drop \u2022 Rechtsklick f\u00fcr
            Kontextmen\u00fc \u2022 Strg+Z/Y zum R\u00fckg\u00e4ngig/Wiederholen
            \u2022 Farben via Kontextpad \u2022 Nachrichtenereignisse in der
            Palette
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
