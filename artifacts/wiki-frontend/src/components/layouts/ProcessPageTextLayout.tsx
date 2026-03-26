import { Zap, ListChecks, PackageCheck, ArrowLeftRight } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface ProcessPageTextLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function ProcessPageTextLayout({
  structuredFields,
  onSectionSave,
}: ProcessPageTextLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="trigger"
        label="Auslöser & Eingaben"
        description="Was löst den Prozess aus und welche Eingaben werden benötigt?"
        icon={<Zap className="h-4 w-4 text-yellow-600" />}
        value={str(structuredFields.trigger)}
        onSave={onSectionSave}
        emptyText="Noch keine Auslöser definiert"
      />

      <EditableSectionCard
        sectionKey="procedure"
        label="Ablauf"
        description="Verfahrensschritte & RACI"
        icon={<ListChecks className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.procedure)}
        onSave={onSectionSave}
        emptyText="Noch keine Verfahrensschritte dokumentiert"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="outputs"
          label="Ergebnisse & Ausgaben"
          description="Was liefert der Prozess als Ergebnis?"
          icon={<PackageCheck className="h-4 w-4 text-green-600" />}
          value={str(structuredFields.outputs)}
          onSave={onSectionSave}
          emptyText="Keine Ergebnisse definiert"
        />

        <EditableSectionCard
          sectionKey="interfaces"
          label="Schnittstellen"
          description="Systeme & Dokumente"
          icon={<ArrowLeftRight className="h-4 w-4 text-purple-600" />}
          value={str(structuredFields.interfaces)}
          onSave={onSectionSave}
          emptyText="Keine Schnittstellen definiert"
        />
      </div>
    </div>
  );
}
