import { BookOpen } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface GlossaryLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

export function GlossaryLayout({
  structuredFields,
  onSectionSave,
}: GlossaryLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="terms"
        label="Begriffe & Definitionen"
        description="Glossarbegriffe alphabetisch mit Definitionen"
        icon={<BookOpen className="h-4 w-4 text-primary" />}
        value={str(structuredFields.terms)}
        onSave={onSectionSave}
        required
        emptyText="Noch keine Glossarbegriffe definiert"
      />
    </div>
  );
}
