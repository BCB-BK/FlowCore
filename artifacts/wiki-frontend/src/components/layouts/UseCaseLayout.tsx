import {
  Users,
  CheckCircle2,
  ArrowRight,
  GitBranch,
  Flag,
} from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface UseCaseLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
  pageType?: string;
  nodeId?: string;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function UseCaseLayout({
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
}: UseCaseLayoutProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="actors"
          label="Akteure"
          description="Beteiligte Personen und Systeme"
          icon={<Users className="h-4 w-4 text-primary" />}
          value={str(structuredFields.actors)}
          onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
          required
          emptyText="Noch keine Akteure definiert"
        />

        <EditableSectionCard
          sectionKey="preconditions"
          label="Vorbedingungen"
          description="Was muss erfüllt sein, bevor der Use Case startet?"
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
          value={str(structuredFields.preconditions)}
          onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
          required
          emptyText="Noch keine Vorbedingungen definiert"
        />
      </div>

      <EditableSectionCard
        sectionKey="main_flow"
        label="Normalablauf"
        description="Schrittweiser Ablauf im Erfolgsfall"
        icon={<ArrowRight className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.main_flow)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        required
        emptyText="Noch kein Normalablauf dokumentiert"
      />

      <EditableSectionCard
        sectionKey="alternative_flows"
        label="Alternativabläufe"
        description="Abweichungen vom Normalablauf"
        icon={<GitBranch className="h-4 w-4 text-amber-600" />}
        value={str(structuredFields.alternative_flows)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Alternativabläufe dokumentiert"
      />

      <EditableSectionCard
        sectionKey="postconditions"
        label="Nachbedingungen"
        description="Was gilt nach erfolgreicher Durchführung?"
        icon={<Flag className="h-4 w-4 text-purple-600" />}
        value={str(structuredFields.postconditions)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Nachbedingungen definiert"
      />
    </div>
  );
}
