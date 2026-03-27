import { TermRepeater } from "@/components/compound/TermRepeater";
import { getPageType } from "@/lib/types";

interface GlossaryLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
  pageType?: string;
  nodeId?: string;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

export function GlossaryLayout({
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
}: GlossaryLayoutProps) {
  const def = getPageType("glossary");
  const termsSection = def?.sections.find(s => s.key === "terms");

  return (
    <div className="space-y-4">
      <TermRepeater
        value={str(structuredFields.terms)}
        onSave={onSectionSave}
        sectionKey="terms"
        help={termsSection?.help}
        helpText={termsSection?.helpText}
        guidingQuestions={termsSection?.guidingQuestions}
      />
    </div>
  );
}
