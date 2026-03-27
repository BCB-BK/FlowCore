import { FileText, Link2 } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";
import { QaRepeater } from "@/components/compound/QaRepeater";
import { getPageType } from "@/lib/types";

interface FaqLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  pageType?: string;
  nodeId?: string;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function FaqLayout({
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
}: FaqLayoutProps) {
  const def = getPageType("faq");
  const contentSection = def?.sections.find(s => s.key === "content");
  const summarySection = def?.sections.find(s => s.key === "summary");

  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="summary"
        label="Zusammenfassung"
        description="Kurze Zusammenfassung des Themas"
        icon={<FileText className="h-4 w-4 text-primary" />}
        value={str(structuredFields.summary)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Noch keine Zusammenfassung"
        help={summarySection?.help}
        helpText={summarySection?.helpText}
        requirement="required"
      />

      <QaRepeater
        value={str(structuredFields.content)}
        onSave={onSectionSave}
        sectionKey="content"
        help={contentSection?.help}
        helpText={contentSection?.helpText}
        guidingQuestions={contentSection?.guidingQuestions}
      />

      <EditableSectionCard
        sectionKey="related_topics"
        label="Verwandte Themen"
        description="Links zu verwandten Artikeln und Prozessen"
        icon={<Link2 className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.related_topics)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine verwandten Themen verknüpft"
        requirement="recommended"
      />
    </div>
  );
}
