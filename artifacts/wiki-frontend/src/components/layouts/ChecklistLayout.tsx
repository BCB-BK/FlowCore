import { Target, Info, Flag } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";
import { CheckItemsEditor } from "@/components/compound/CheckItemsEditor";
import { getPageType } from "@/lib/types";

interface ChecklistLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  pageType?: string;
  nodeId?: string;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function ChecklistLayout({
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
}: ChecklistLayoutProps) {
  const def = getPageType("checklist");
  const purposeSection = def?.sections.find(s => s.key === "purpose");
  const instructionsSection = def?.sections.find(s => s.key === "instructions");
  const itemsSection = def?.sections.find(s => s.key === "checklist_items");
  const completionSection = def?.sections.find(s => s.key === "completion_criteria");

  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="purpose"
        label="Zweck & Anwendung"
        description="Wann und wofür wird diese Checkliste eingesetzt?"
        icon={<Target className="h-4 w-4 text-primary" />}
        value={str(structuredFields.purpose)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Noch kein Zweck definiert"
        help={purposeSection?.help}
        helpText={purposeSection?.helpText}
        requirement="required"
      />

      <EditableSectionCard
        sectionKey="instructions"
        label="Anleitung"
        description="Hinweise zur Durchführung"
        icon={<Info className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.instructions)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Durchführungshinweise"
        help={instructionsSection?.help}
        helpText={instructionsSection?.helpText}
      />

      <CheckItemsEditor
        value={str(structuredFields.checklist_items)}
        onSave={onSectionSave}
        sectionKey="checklist_items"
        help={itemsSection?.help}
        helpText={itemsSection?.helpText}
        guidingQuestions={itemsSection?.guidingQuestions}
      />

      <EditableSectionCard
        sectionKey="completion_criteria"
        label="Abschlusskriterien"
        description="Wann gilt die Checkliste als vollständig abgeschlossen?"
        icon={<Flag className="h-4 w-4 text-amber-600" />}
        value={str(structuredFields.completion_criteria)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Abschlusskriterien definiert"
        help={completionSection?.help}
        helpText={completionSection?.helpText}
        requirement="recommended"
      />
    </div>
  );
}
