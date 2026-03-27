import {
  Target,
  BookOpen,
  GraduationCap,
  Dumbbell,
  ClipboardCheck,
  FileStack,
} from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface TrainingResourceLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  pageType?: string;
  nodeId?: string;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function TrainingResourceLayout({
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
}: TrainingResourceLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="objectives"
        label="Lernziele"
        description="Was sollen die Teilnehmer nach der Schulung können?"
        icon={<Target className="h-4 w-4 text-primary" />}
        value={str(structuredFields.objectives)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Noch keine Lernziele definiert"
      />

      <EditableSectionCard
        sectionKey="prerequisites"
        label="Voraussetzungen"
        description="Erforderliche Vorkenntnisse und Vorbereitungen"
        icon={<BookOpen className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.prerequisites)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Voraussetzungen angegeben"
      />

      <EditableSectionCard
        sectionKey="content"
        label="Schulungsinhalt"
        description="Gliederung und Inhalte der Schulung"
        icon={<GraduationCap className="h-4 w-4 text-purple-600" />}
        value={str(structuredFields.content)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Noch keine Schulungsinhalte dokumentiert"
      />

      <EditableSectionCard
        sectionKey="exercises"
        label="Übungen & Praxisbeispiele"
        description="Praktische Übungen und Beispiele zur Vertiefung"
        icon={<Dumbbell className="h-4 w-4 text-orange-600" />}
        value={str(structuredFields.exercises)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Übungen vorhanden"
      />

      <EditableSectionCard
        sectionKey="assessment"
        label="Lernkontrolle"
        description="Methoden zur Überprüfung des Lernerfolgs"
        icon={<ClipboardCheck className="h-4 w-4 text-green-600" />}
        value={str(structuredFields.assessment)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Lernkontrolle definiert"
      />

      <EditableSectionCard
        sectionKey="materials"
        label="Materialien & Ressourcen"
        description="Benötigte und ergänzende Materialien"
        icon={<FileStack className="h-4 w-4 text-amber-600" />}
        value={str(structuredFields.materials)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Materialien angegeben"
      />
    </div>
  );
}
