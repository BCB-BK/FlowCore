import { Target, Info, CheckSquare, Flag } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface ChecklistLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function ChecklistLayout({
  structuredFields,
  onSectionSave,
}: ChecklistLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="purpose"
        label="Zweck & Anwendung"
        description="Wann und wofür wird diese Checkliste eingesetzt?"
        icon={<Target className="h-4 w-4 text-primary" />}
        value={str(structuredFields.purpose)}
        onSave={onSectionSave}
        emptyText="Noch kein Zweck definiert"
      />

      <EditableSectionCard
        sectionKey="instructions"
        label="Anleitung"
        description="Hinweise zur Durchführung"
        icon={<Info className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.instructions)}
        onSave={onSectionSave}
        emptyText="Keine Durchführungshinweise"
      />

      <EditableSectionCard
        sectionKey="checklist_items"
        label="Prüfpunkte"
        description="Die eigentlichen Prüf-/Checklisten-Punkte"
        icon={<CheckSquare className="h-4 w-4 text-green-600" />}
        value={str(structuredFields.checklist_items)}
        onSave={onSectionSave}
        emptyText="Noch keine Prüfpunkte definiert"
      />

      <EditableSectionCard
        sectionKey="completion_criteria"
        label="Abschlusskriterien"
        description="Wann gilt die Checkliste als vollständig abgeschlossen?"
        icon={<Flag className="h-4 w-4 text-amber-600" />}
        value={str(structuredFields.completion_criteria)}
        onSave={onSectionSave}
        emptyText="Keine Abschlusskriterien definiert"
      />
    </div>
  );
}
