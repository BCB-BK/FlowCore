import { Shield, Target, BookOpen, Gavel, BookMarked, FileStack } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface PolicyLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function PolicyLayout({
  structuredFields,
  onSectionSave,
}: PolicyLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="purpose"
        label="Zweck"
        description="Warum existiert diese Richtlinie?"
        icon={<Target className="h-4 w-4 text-primary" />}
        value={str(structuredFields.purpose)}
        onSave={onSectionSave}
        emptyText="Noch kein Zweck erfasst"
      />

      <EditableSectionCard
        sectionKey="scope"
        label="Geltungsbereich"
        description="Für wen und wo gilt die Richtlinie?"
        icon={<BookOpen className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.scope)}
        onSave={onSectionSave}
        emptyText="Noch kein Geltungsbereich definiert"
      />

      <EditableSectionCard
        sectionKey="definitions"
        label="Begriffe & Definitionen"
        description="Klärung zentraler Begriffe"
        icon={<BookMarked className="h-4 w-4 text-indigo-600" />}
        value={str(structuredFields.definitions)}
        onSave={onSectionSave}
        emptyText="Keine Begriffe definiert"
      />

      <EditableSectionCard
        sectionKey="policy_text"
        label="Richtlinientext"
        description="Die eigentlichen Regelungen"
        icon={<Shield className="h-4 w-4 text-red-600" />}
        value={str(structuredFields.policy_text)}
        onSave={onSectionSave}
        emptyText="Noch kein Richtlinientext erfasst"
      />

      <EditableSectionCard
        sectionKey="enforcement"
        label="Durchsetzung & Konsequenzen"
        description="Maßnahmen bei Nichteinhaltung"
        icon={<Gavel className="h-4 w-4 text-amber-600" />}
        value={str(structuredFields.enforcement)}
        onSave={onSectionSave}
        emptyText="Noch keine Durchsetzungsmaßnahmen definiert"
      />

      <EditableSectionCard
        sectionKey="references"
        label="Referenzen & mitgeltende Dokumente"
        description="Verknüpfte Normen, Gesetze und Dokumente"
        icon={<FileStack className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.references)}
        onSave={onSectionSave}
        emptyText="Keine Referenzen angegeben"
      />
    </div>
  );
}
