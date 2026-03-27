import { FileText, List } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";
import { SwimlaneDiagram } from "@/components/qm";

interface ProcessPageGraphicLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  pageType?: string;
  nodeId?: string;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function ProcessPageGraphicLayout({
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
}: ProcessPageGraphicLayoutProps) {
  return (
    <div className="space-y-4">
      <SwimlaneDiagram
        data={structuredFields.diagram}
        onSave={onSectionSave ? (data) => onSectionSave("diagram", data) : undefined}
        readOnly={!onSectionSave}
      />

      <EditableSectionCard
        sectionKey="description"
        label="Erläuterung"
        description="Textuelle Beschreibung zum Diagramm"
        icon={<FileText className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.description)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Noch keine Erläuterung"
      />

      <EditableSectionCard
        sectionKey="legend"
        label="Legende & Symbole"
        description="Erklärung der verwendeten Symbole und Farben"
        icon={<List className="h-4 w-4 text-amber-600" />}
        value={str(structuredFields.legend)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Legende definiert"
      />
    </div>
  );
}
