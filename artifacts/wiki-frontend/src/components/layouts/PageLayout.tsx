import { getDisplayProfile } from "@workspace/shared/page-types";
import { GenericLayout, LAYOUT_CONFIG_MAP } from "./layout-engine";
import { GenericSectionLayout } from "./GenericSectionLayout";

export interface LayoutComponentProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  pageType?: string;
  nodeId?: string;
}

interface PageLayoutProps {
  templateType: string;
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  pageType?: string;
  nodeId?: string;
}

export function PageLayout({
  templateType,
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
}: PageLayoutProps) {
  const config = LAYOUT_CONFIG_MAP[templateType];

  if (config) {
    return (
      <GenericLayout
        config={config}
        structuredFields={structuredFields}
        onSectionSave={onSectionSave}
        pageType={pageType}
        nodeId={nodeId}
      />
    );
  }

  const profile = getDisplayProfile(templateType);

  return (
    <GenericSectionLayout
      templateType={templateType}
      structuredFields={structuredFields}
      onSectionSave={onSectionSave}
      displayProfile={profile ?? undefined}
      pageType={pageType}
      nodeId={nodeId}
    />
  );
}
