import type { LucideIcon } from "lucide-react";

export type { PageTypeSection, FieldHelp } from "@workspace/shared/page-types";

export type FieldComponent =
  | "editable"
  | "sipoc_table"
  | "kpi_table"
  | "risks_controls_table"
  | "interfaces_systems_table"
  | "process_steps_table"
  | "swimlane_diagram"
  | "bpmn_diagram"
  | "raci_matrix"
  | "competency_areas"
  | "check_items_editor"
  | "qa_repeater"
  | "term_repeater"
  | "references_editor";

export interface LayoutField {
  key: string;
  component: FieldComponent;
  label?: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  emptyText?: string;
  requirement?: "required" | "recommended" | "conditional";
  required?: boolean;
}

export type LayoutRow = LayoutField | LayoutField[];

export interface LegacyFieldConfig {
  key: string;
  showWhen: (fields: Record<string, unknown>) => boolean;
  label: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
}

export interface LayoutConfig {
  pageTypeKey?: string;
  rows: LayoutRow[];
  legacyFields?: LegacyFieldConfig[];
}
