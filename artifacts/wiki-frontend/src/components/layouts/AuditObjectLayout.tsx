import {
  SearchCheck,
  FileCheck,
  GitBranch,
  Wrench,
  Shield,
  CheckCircle,
} from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";
import { RisksControlsTable } from "@/components/qm";

interface AuditObjectLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function AuditObjectLayout({
  structuredFields,
  onSectionSave,
}: AuditObjectLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="finding"
        label="Feststellung"
        description="Was wurde festgestellt?"
        icon={<SearchCheck className="h-4 w-4 text-red-600" />}
        value={str(structuredFields.finding)}
        onSave={onSectionSave}
        emptyText="Noch keine Feststellung dokumentiert"
      />

      <EditableSectionCard
        sectionKey="evidence"
        label="Nachweise"
        description="Belege und Evidenz für die Feststellung"
        icon={<FileCheck className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.evidence)}
        onSave={onSectionSave}
        emptyText="Noch keine Nachweise dokumentiert"
      />

      <EditableSectionCard
        sectionKey="root_cause"
        label="Ursachenanalyse"
        description="Warum ist das Problem aufgetreten?"
        icon={<GitBranch className="h-4 w-4 text-purple-600" />}
        value={str(structuredFields.root_cause)}
        onSave={onSectionSave}
        emptyText="Keine Ursachenanalyse durchgeführt"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="corrective_action"
          label="Korrekturmaßnahme"
          description="Sofortmaßnahme zur Behebung"
          icon={<Wrench className="h-4 w-4 text-orange-600" />}
          value={str(structuredFields.corrective_action)}
          onSave={onSectionSave}
          emptyText="Keine Korrekturmaßnahme definiert"
        />

        <EditableSectionCard
          sectionKey="preventive_action"
          label="Vorbeugemaßnahme"
          description="Maßnahme zur Verhinderung des Wiederauftretens"
          icon={<Shield className="h-4 w-4 text-green-600" />}
          value={str(structuredFields.preventive_action)}
          onSave={onSectionSave}
          emptyText="Keine Vorbeugemaßnahme definiert"
        />
      </div>

      <RisksControlsTable
        data={structuredFields.risks_controls}
        onSave={onSectionSave ? (data) => onSectionSave("risks_controls", data) : undefined}
        readOnly={!onSectionSave}
      />

      <EditableSectionCard
        sectionKey="effectiveness_check"
        label="Wirksamkeitsprüfung"
        description="Wie wird die Wirksamkeit der Maßnahme überprüft?"
        icon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
        value={str(structuredFields.effectiveness_check)}
        onSave={onSectionSave}
        emptyText="Keine Wirksamkeitsprüfung definiert"
      />
    </div>
  );
}
