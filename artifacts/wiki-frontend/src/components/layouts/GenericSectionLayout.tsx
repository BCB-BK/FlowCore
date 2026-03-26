import { getPageType } from "@/lib/types";
import { FileText } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface GenericSectionLayoutProps {
  templateType: string;
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

export function GenericSectionLayout({
  templateType,
  structuredFields,
  onSectionSave,
}: GenericSectionLayoutProps) {
  const pageDef = getPageType(templateType);
  if (!pageDef) return null;

  const contentSections = pageDef.sections.filter((s) => s.key !== "children");

  if (contentSections.length === 0) return null;

  return (
    <div className="space-y-4">
      {contentSections.map((section) => (
        <EditableSectionCard
          key={section.key}
          sectionKey={section.key}
          label={section.label}
          description={section.description}
          required={section.required}
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          value={str(structuredFields[section.key])}
          onSave={onSectionSave}
        />
      ))}
    </div>
  );
}
