import { Node, mergeAttributes } from "@tiptap/react";

export const DIAGRAM_TYPES = {
  flowchart: "Flussdiagramm",
  bpmn: "BPMN-Prozess",
  swimlane: "Swimlane-Diagramm",
  sequence: "Sequenzdiagramm",
  orgchart: "Organigramm",
} as const;

export type DiagramType = keyof typeof DIAGRAM_TYPES;

export interface ProcessStep {
  id: string;
  label: string;
  description?: string;
  roleId?: string;
  order: number;
}

export interface DiagramRole {
  id: string;
  name: string;
  lane?: string;
}

export interface DiagramBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    diagramBlock: {
      setDiagramBlock: (attrs: {
        diagramType?: DiagramType;
        src?: string;
        caption?: string;
        description?: string;
        processSteps?: ProcessStep[];
        roles?: DiagramRole[];
        linkedNodeIds?: string[];
      }) => ReturnType;
    };
  }
}

export const DiagramBlock = Node.create<DiagramBlockOptions>({
  name: "diagramBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      diagramType: { default: "bpmn" as DiagramType },
      src: { default: null },
      caption: { default: "" },
      description: { default: "" },
      width: { default: "100%" },
      height: { default: "480" },
      bpmnXml: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) => {
          const encoded = el.getAttribute("data-bpmn-xml");
          if (!encoded) return null;
          try {
            return decodeURIComponent(encoded);
          } catch {
            return encoded;
          }
        },
        renderHTML: (attrs: { bpmnXml?: string | null }) => {
          if (!attrs.bpmnXml) return {};
          return { "data-bpmn-xml": encodeURIComponent(attrs.bpmnXml) };
        },
      },
      processSteps: {
        default: [] as ProcessStep[],
        parseHTML: (el: HTMLElement) => {
          const val = el.getAttribute("data-process-steps");
          try {
            return val ? JSON.parse(val) : [];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs: { processSteps?: ProcessStep[] }) => {
          return attrs.processSteps && attrs.processSteps.length > 0
            ? { "data-process-steps": JSON.stringify(attrs.processSteps) }
            : {};
        },
      },
      roles: {
        default: [] as DiagramRole[],
        parseHTML: (el: HTMLElement) => {
          const val = el.getAttribute("data-roles");
          try {
            return val ? JSON.parse(val) : [];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs: { roles?: DiagramRole[] }) => {
          return attrs.roles && attrs.roles.length > 0
            ? { "data-roles": JSON.stringify(attrs.roles) }
            : {};
        },
      },
      linkedNodeIds: {
        default: [] as string[],
        parseHTML: (el: HTMLElement) => {
          const val = el.getAttribute("data-linked-nodes");
          try {
            return val ? JSON.parse(val) : [];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs: { linkedNodeIds?: string[] }) => {
          return attrs.linkedNodeIds && attrs.linkedNodeIds.length > 0
            ? { "data-linked-nodes": JSON.stringify(attrs.linkedNodeIds) }
            : {};
        },
      },
      showLegend: {
        default: false as boolean,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-show-legend") === "true",
        renderHTML: (attrs: { showLegend?: boolean }) =>
          attrs.showLegend ? { "data-show-legend": "true" } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="diagram-block"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "diagram-block" }),
    ];
  },

  addCommands() {
    return {
      setDiagramBlock:
        (attrs) =>
        ({
          commands,
        }: {
          commands: {
            insertContent: (content: Record<string, unknown>) => boolean;
          };
        }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});
