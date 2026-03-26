import { GitBranchPlus, FileText, List } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface ProcessPageGraphicLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function ProcessPageGraphicLayout({
  structuredFields,
  onSectionSave,
}: ProcessPageGraphicLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="diagram"
        label="Diagramm"
        description="Swimlane-Darstellung"
        icon={<GitBranchPlus className="h-4 w-4 text-purple-600" />}
        value={str(structuredFields.diagram)}
        onSave={onSectionSave}
        emptyText="Noch kein Diagramm vorhanden"
      />

      <EditableSectionCard
        sectionKey="description"
        label="Erläuterung"
        description="Textuelle Beschreibung zum Diagramm"
        icon={<FileText className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.description)}
        onSave={onSectionSave}
        emptyText="Noch keine Erläuterung"
      />

      <EditableSectionCard
        sectionKey="legend"
        label="Legende & Symbole"
        description="Erklärung der verwendeten Symbole und Farben"
        icon={<List className="h-4 w-4 text-amber-600" />}
        value={str(structuredFields.legend)}
        onSave={onSectionSave}
        emptyText="Keine Legende definiert"
      />
    </div>
  );
}
