import { FileText, HelpCircle, Link2 } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface FaqLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function FaqLayout({
  structuredFields,
  onSectionSave,
}: FaqLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="summary"
        label="Zusammenfassung"
        description="Kurze Zusammenfassung des Themas"
        icon={<FileText className="h-4 w-4 text-primary" />}
        value={str(structuredFields.summary)}
        onSave={onSectionSave}
        emptyText="Noch keine Zusammenfassung"
      />

      <EditableSectionCard
        sectionKey="content"
        label="Inhalt / Fragen & Antworten"
        description="Hauptinhalt mit Fragen und Antworten oder Erklärungen"
        icon={<HelpCircle className="h-4 w-4 text-yellow-600" />}
        value={str(structuredFields.content)}
        onSave={onSectionSave}
        emptyText="Noch keine Inhalte vorhanden"
      />

      <EditableSectionCard
        sectionKey="related_topics"
        label="Verwandte Themen"
        description="Links zu verwandten Artikeln und Prozessen"
        icon={<Link2 className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.related_topics)}
        onSave={onSectionSave}
        emptyText="Keine verwandten Themen verknüpft"
      />
    </div>
  );
}
