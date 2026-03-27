import { Building2, ArrowLeftRight, Users } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface AreaOverviewLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function AreaOverviewLayout({
  structuredFields,
  onSectionSave,
}: AreaOverviewLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="description"
        label="Beschreibung"
        description="Aufgaben und Zuständigkeiten des Bereichs"
        icon={<Building2 className="h-4 w-4 text-primary" />}
        value={str(structuredFields.description)}
        onSave={onSectionSave}
        emptyText="Noch keine Beschreibung"
      />

      <EditableSectionCard
        sectionKey="structure"
        label="Aufbauorganisation"
        description="Organisatorischer Aufbau und Rollenverteilung"
        icon={<Users className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.structure)}
        onSave={onSectionSave}
        emptyText="Noch keine Aufbauorganisation dokumentiert"
      />

      <EditableSectionCard
        sectionKey="interfaces"
        label="Schnittstellen"
        description="Zusammenarbeit mit anderen Bereichen"
        icon={<ArrowLeftRight className="h-4 w-4 text-cyan-600" />}
        value={str(structuredFields.interfaces)}
        onSave={onSectionSave}
        emptyText="Keine Schnittstellen dokumentiert"
      />
    </div>
  );
}
