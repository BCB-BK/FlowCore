import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  ClipboardList,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";
import { SipocEditor } from "@/components/compound/SipocEditor";
import { SIPOCTable, KPITable, RisksControlsTable, InterfacesSystemsTable, ProcessStepsTable } from "@/components/qm";
import { getPageType } from "@/lib/types";

interface ProcessOverviewLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  pageType?: string;
  nodeId?: string;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function ProcessOverviewLayout({
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
}: ProcessOverviewLayoutProps) {
  const sipocData =
    structuredFields.sipoc != null && typeof structuredFields.sipoc === "object"
      ? (structuredFields.sipoc as Record<string, unknown>)
      : null;

  const def = getPageType("core_process_overview");
  const sipocSection = def?.sections.find(s => s.key === "sipoc");
  const overviewSection = def?.sections.find(s => s.key === "overview");
  const kpisSection = def?.sections.find(s => s.key === "kpis");
  const complianceSection = def?.sections.find(s => s.key === "compliance");
  const risksSection = def?.sections.find(s => s.key === "risks");

  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="overview"
        label="Zweck & Geltungsbereich"
        icon={<ClipboardList className="h-4 w-4 text-primary" />}
        value={str(structuredFields.overview)}
        onSave={onSectionSave}
        pageType={pageType}
        nodeId={nodeId}
        help={overviewSection?.help}
        helpText={overviewSection?.helpText}
        guidingQuestions={overviewSection?.guidingQuestions}
        requirement={overviewSection?.requirement}
        publishRequired={overviewSection?.publishRequired}
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
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Kein Normbezug definiert"
        help={complianceSection?.help}
        helpText={complianceSection?.helpText}
        guidingQuestions={complianceSection?.guidingQuestions}
        requirement={complianceSection?.requirement}
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
