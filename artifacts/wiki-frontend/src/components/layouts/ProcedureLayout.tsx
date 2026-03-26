import { ListChecks, FileStack, BookOpen } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface ProcedureLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function ProcedureLayout({
  structuredFields,
  onSectionSave,
}: ProcedureLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="scope"
        label="Geltungsbereich"
        icon={<BookOpen className="h-4 w-4 text-primary" />}
        value={str(structuredFields.scope)}
        onSave={onSectionSave}
        emptyText="Noch kein Geltungsbereich definiert"
      />

      <EditableSectionCard
        sectionKey="procedure"
        label="Durchführung"
        icon={<ListChecks className="h-4 w-4 text-orange-600" />}
        value={str(structuredFields.procedure)}
        onSave={onSectionSave}
        emptyText="Noch keine Schritte dokumentiert"
      />

      <EditableSectionCard
        sectionKey="documents"
        label="Mitgeltende Unterlagen"
        icon={<FileStack className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.documents)}
        onSave={onSectionSave}
        emptyText="Keine mitgeltenden Unterlagen"
      />
    </div>
  );
}
