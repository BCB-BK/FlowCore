import { ClipboardList, ShieldCheck } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";
import { SIPOCTable, KPITable, RisksControlsTable, InterfacesSystemsTable, ProcessStepsTable } from "@/components/qm";

interface ProcessOverviewLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function ProcessOverviewLayout({
  structuredFields,
  onSectionSave,
}: ProcessOverviewLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="overview"
        label="Zweck & Geltungsbereich"
        icon={<ClipboardList className="h-4 w-4 text-primary" />}
        value={str(structuredFields.overview)}
        onSave={onSectionSave}
      />

      <SIPOCTable
        data={structuredFields.sipoc}
        onSave={onSectionSave ? (data) => onSectionSave("sipoc", data) : undefined}
        readOnly={!onSectionSave}
      />

      <KPITable
        data={structuredFields.kpis}
        onSave={onSectionSave ? (data) => onSectionSave("kpis", data) : undefined}
        readOnly={!onSectionSave}
      />

      <EditableSectionCard
        sectionKey="compliance"
        label="Normbezug & Compliance"
        icon={<ShieldCheck className="h-4 w-4 text-red-600" />}
        value={str(structuredFields.compliance)}
        onSave={onSectionSave}
        emptyText="Kein Normbezug definiert"
      />

      <RisksControlsTable
        data={structuredFields.risks}
        onSave={onSectionSave ? (data) => onSectionSave("risks", data) : undefined}
        readOnly={!onSectionSave}
      />

      <InterfacesSystemsTable
        data={structuredFields.interfaces_systems}
        onSave={onSectionSave ? (data) => onSectionSave("interfaces_systems", data) : undefined}
        readOnly={!onSectionSave}
      />

      <ProcessStepsTable
        data={structuredFields.process_steps}
        onSave={onSectionSave ? (data) => onSectionSave("process_steps", data) : undefined}
        readOnly={!onSectionSave}
      />
    </div>
  );
}
