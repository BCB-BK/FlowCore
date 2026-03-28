import { getPageType } from "@/lib/types";
import { EditableSectionCard } from "../EditableSectionCard";
import {
  SIPOCTable,
  KPITable,
  RisksControlsTable,
  InterfacesSystemsTable,
  ProcessStepsTable,
  SwimlaneDiagram,
  RACIMatrix,
} from "@/components/qm";
import { CompetencyAreas } from "@/components/compound/CompetencyAreas";
import { CheckItemsEditor } from "@/components/compound/CheckItemsEditor";
import { QaRepeater } from "@/components/compound/QaRepeater";
import { TermRepeater } from "@/components/compound/TermRepeater";
import type { LayoutConfig, LayoutField, LayoutRow } from "./types";

interface GenericLayoutProps {
  config: LayoutConfig;
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  pageType?: string;
  nodeId?: string;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

function FieldRenderer({
  field,
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
  sectionDef,
}: {
  field: LayoutField;
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  pageType?: string;
  nodeId?: string;
  sectionDef?: { help?: unknown; helpText?: string; guidingQuestions?: string[]; requirement?: string; publishRequired?: boolean };
}) {
  const data = structuredFields[field.key];
  const saveFn = onSectionSave
    ? (val: unknown) => onSectionSave(field.key, val)
    : undefined;
  const readOnly = !onSectionSave;

  switch (field.component) {
    case "sipoc_table":
      return <SIPOCTable data={data} onSave={saveFn} readOnly={readOnly} />;
    case "kpi_table":
      return <KPITable data={data} onSave={saveFn} readOnly={readOnly} />;
    case "risks_controls_table":
      return <RisksControlsTable data={data} onSave={saveFn} readOnly={readOnly} />;
    case "interfaces_systems_table":
      return <InterfacesSystemsTable data={data} onSave={saveFn} readOnly={readOnly} />;
    case "process_steps_table":
      return <ProcessStepsTable data={data} onSave={saveFn} readOnly={readOnly} />;
    case "swimlane_diagram":
      return <SwimlaneDiagram data={data} onSave={saveFn} readOnly={readOnly} />;
    case "raci_matrix":
      return <RACIMatrix data={data} onSave={saveFn} readOnly={readOnly} />;
    case "competency_areas":
      return (
        <CompetencyAreas
          value={str(data)}
          onSave={onSectionSave}
          sectionKey={field.key}
          help={sectionDef?.help as never}
          helpText={sectionDef?.helpText}
          guidingQuestions={sectionDef?.guidingQuestions}
        />
      );
    case "check_items_editor":
      return (
        <CheckItemsEditor
          value={str(data)}
          onSave={onSectionSave}
          sectionKey={field.key}
          help={sectionDef?.help as never}
          helpText={sectionDef?.helpText}
          guidingQuestions={sectionDef?.guidingQuestions}
        />
      );
    case "qa_repeater":
      return (
        <QaRepeater
          value={str(data)}
          onSave={onSectionSave}
          sectionKey={field.key}
          help={sectionDef?.help as never}
          helpText={sectionDef?.helpText}
          guidingQuestions={sectionDef?.guidingQuestions}
        />
      );
    case "term_repeater":
      return (
        <TermRepeater
          value={str(data)}
          onSave={onSectionSave}
          sectionKey={field.key}
          help={sectionDef?.help as never}
          helpText={sectionDef?.helpText}
          guidingQuestions={sectionDef?.guidingQuestions}
        />
      );
    case "editable": {
      const Icon = field.icon;
      return (
        <EditableSectionCard
          sectionKey={field.key}
          label={field.label ?? field.key}
          description={field.description}
          required={field.required}
          icon={Icon ? <Icon className={`h-4 w-4 ${field.iconColor ?? "text-muted-foreground"}`} /> : undefined}
          value={str(data)}
          onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
          emptyText={field.emptyText}
          help={sectionDef?.help as never}
          helpText={sectionDef?.helpText}
          guidingQuestions={sectionDef?.guidingQuestions}
          requirement={field.requirement as never ?? sectionDef?.requirement as never}
          publishRequired={sectionDef?.publishRequired}
        />
      );
    }
    default:
      return null;
  }
}

function RowRenderer({
  row,
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
  sectionDefs,
}: {
  row: LayoutRow;
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  pageType?: string;
  nodeId?: string;
  sectionDefs: Map<string, unknown>;
}) {
  if (Array.isArray(row)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {row.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            structuredFields={structuredFields}
            onSectionSave={onSectionSave}
            pageType={pageType}
            nodeId={nodeId}
            sectionDef={sectionDefs.get(field.key) as never}
          />
        ))}
      </div>
    );
  }

  return (
    <FieldRenderer
      field={row}
      structuredFields={structuredFields}
      onSectionSave={onSectionSave}
      pageType={pageType}
      nodeId={nodeId}
      sectionDef={sectionDefs.get(row.key) as never}
    />
  );
}

export function GenericLayout({
  config,
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
}: GenericLayoutProps) {
  const pageDef = config.pageTypeKey ? getPageType(config.pageTypeKey) : null;

  const sectionDefs = new Map<string, unknown>();
  if (pageDef?.sections) {
    for (const s of pageDef.sections) {
      sectionDefs.set(s.key, s);
    }
  }

  return (
    <div className="space-y-4">
      {config.rows.map((row, idx) => {
        const key = Array.isArray(row) ? row.map((f) => f.key).join("-") : row.key;
        return (
          <RowRenderer
            key={key || idx}
            row={row}
            structuredFields={structuredFields}
            onSectionSave={onSectionSave}
            pageType={pageType}
            nodeId={nodeId}
            sectionDefs={sectionDefs}
          />
        );
      })}

      {config.legacyFields?.map((legacy) => {
        if (!legacy.showWhen(structuredFields)) return null;
        const Icon = legacy.icon;
        return (
          <EditableSectionCard
            key={legacy.key}
            sectionKey={legacy.key}
            label={legacy.label}
            description={legacy.description}
            icon={<Icon className={`h-4 w-4 ${legacy.iconColor}`} />}
            value={str(structuredFields[legacy.key])}
            onSave={onSectionSave}
            emptyText="—"
          />
        );
      })}
    </div>
  );
}
