import { getPageType } from "@/lib/types";
import type { DisplayProfile } from "@/lib/types";
import { FileText, LayoutDashboard, Shield, Server, BookOpen, Workflow } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface GenericSectionLayoutProps {
  templateType: string;
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  displayProfile?: DisplayProfile;
  pageType?: string;
  nodeId?: string;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

const PROFILE_ICON_MAP: Record<DisplayProfile, React.ReactNode> = {
  overview_container: <Workflow className="h-4 w-4 text-muted-foreground" />,
  process_document: <FileText className="h-4 w-4 text-muted-foreground" />,
  reference_article: <BookOpen className="h-4 w-4 text-muted-foreground" />,
  governance_document: <Shield className="h-4 w-4 text-muted-foreground" />,
  system_document: <Server className="h-4 w-4 text-muted-foreground" />,
  module_page: <LayoutDashboard className="h-4 w-4 text-muted-foreground" />,
};

export function GenericSectionLayout({
  templateType,
  structuredFields,
  onSectionSave,
  displayProfile,
  pageType,
  nodeId,
}: GenericSectionLayoutProps) {
  const pageDef = getPageType(templateType);
  if (!pageDef) return null;

  const contentSections = pageDef.sections.filter((s) => s.key !== "children");

  if (contentSections.length === 0) return null;

  const sectionIcon = displayProfile
    ? PROFILE_ICON_MAP[displayProfile]
    : <FileText className="h-4 w-4 text-muted-foreground" />;

  return (
    <div className="space-y-4">
      {contentSections.map((section) => (
        <EditableSectionCard
          key={section.key}
          sectionKey={section.key}
          label={section.label}
          description={section.description}
          required={section.required}
          icon={sectionIcon}
          value={str(structuredFields[section.key])}
          onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        />
      ))}
    </div>
  );
}
