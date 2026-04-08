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
import { isFieldEmpty } from "@/lib/field-empty";
import { FileX2 } from "lucide-react";
import type { LayoutConfig, LayoutField, LayoutRow, PageTypeSection } from "./types";

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
  sectionDef?: PageTypeSection;
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
          help={sectionDef?.help}
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
          help={sectionDef?.help}
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
          help={sectionDef?.help}
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
          help={sectionDef?.help}
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
          help={sectionDef?.help}
          helpText={sectionDef?.helpText}
          guidingQuestions={sectionDef?.guidingQuestions}
          requirement={field.requirement ?? sectionDef?.requirement}
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
  sectionDefs: Map<string, PageTypeSection>;
}) {
  const isViewMode = !onSectionSave;

  if (Array.isArray(row)) {
    const visibleFields = isViewMode
      ? row.filter((field) => !isFieldEmpty(structuredFields[field.key]))
      : row;
    if (visibleFields.length === 0) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleFields.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            structuredFields={structuredFields}
            onSectionSave={onSectionSave}
            pageType={pageType}
            nodeId={nodeId}
            sectionDef={sectionDefs.get(field.key)}
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
      sectionDef={sectionDefs.get(row.key)}
    />
  );
}

function isRowEmpty(row: LayoutRow, structuredFields: Record<string, unknown>): boolean {
  if (Array.isArray(row)) {
    return row.every((field) => isFieldEmpty(structuredFields[field.key]));
  }
  return isFieldEmpty(structuredFields[row.key]);
}

export function GenericLayout({
  config,
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
}: GenericLayoutProps) {
  const pageDef = config.pageTypeKey ? getPageType(config.pageTypeKey) : null;
  const isViewMode = !onSectionSave;

  const sectionDefs = new Map<string, PageTypeSection>();
  if (pageDef?.sections) {
    for (const s of pageDef.sections) {
      sectionDefs.set(s.key, s);
    }
  }

  const visibleRows = isViewMode
    ? config.rows.filter((row) => !isRowEmpty(row, structuredFields))
    : config.rows;

  const visibleLegacy = (config.legacyFields ?? []).filter((legacy) => {
    if (!legacy.showWhen(structuredFields)) return false;
    if (isViewMode && isFieldEmpty(structuredFields[legacy.key])) return false;
    return true;
  });

  if (isViewMode && visibleRows.length === 0 && visibleLegacy.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileX2 className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Noch keine Inhalte vorhanden</p>
        <p className="text-xs mt-1">Erstellen Sie eine Arbeitskopie, um Inhalte hinzuzufügen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleRows.map((row, idx) => {
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

      {visibleLegacy.map((legacy) => {
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
            emptyText="\u2014"
          />
        );
      })}
    </div>
  );
}
