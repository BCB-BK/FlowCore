import { getDisplayProfile } from "@workspace/shared/page-types";
import type { DisplayProfile } from "@workspace/shared/page-types";
import { ProcessOverviewLayout } from "./ProcessOverviewLayout";
import { AreaOverviewLayout } from "./AreaOverviewLayout";
import { ProcessPageTextLayout } from "./ProcessPageTextLayout";
import { ProcessPageGraphicLayout } from "./ProcessPageGraphicLayout";
import { ProcedureLayout } from "./ProcedureLayout";
import { PolicyLayout } from "./PolicyLayout";
import { RoleProfileLayout } from "./RoleProfileLayout";
import { SystemDocumentationLayout } from "./SystemDocumentationLayout";
import { WorkInstructionLayout } from "./WorkInstructionLayout";
import { ChecklistLayout } from "./ChecklistLayout";
import { FaqLayout } from "./FaqLayout";
import { InterfaceDescriptionLayout } from "./InterfaceDescriptionLayout";
import { MeetingProtocolLayout } from "./MeetingProtocolLayout";
import { AuditObjectLayout } from "./AuditObjectLayout";
import { TrainingResourceLayout } from "./TrainingResourceLayout";
import { UseCaseLayout } from "./UseCaseLayout";
import { DashboardLayout } from "./DashboardLayout";
import { GlossaryLayout } from "./GlossaryLayout";
import { GenericSectionLayout } from "./GenericSectionLayout";

export interface LayoutComponentProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  pageType?: string;
  nodeId?: string;
}

interface ProfileLayoutStrategy {
  defaultLayout?: React.ComponentType<LayoutComponentProps>;
  overrides?: Record<string, React.ComponentType<LayoutComponentProps>>;
}

const PROFILE_LAYOUT_STRATEGIES: Record<DisplayProfile, ProfileLayoutStrategy> = {
  overview_container: {
    defaultLayout: ProcessOverviewLayout,
    overrides: {
      area_overview: AreaOverviewLayout,
      dashboard: DashboardLayout,
    },
  },
  process_document: {
    defaultLayout: ProcessPageTextLayout,
    overrides: {
      process_page_graphic: ProcessPageGraphicLayout,
      procedure_instruction: ProcedureLayout,
      work_instruction: WorkInstructionLayout,
    },
  },
  reference_article: {
    overrides: {
      faq: FaqLayout,
      role_profile: RoleProfileLayout,
      meeting_protocol: MeetingProtocolLayout,
      use_case: UseCaseLayout,
      glossary: GlossaryLayout,
    },
  },
  governance_document: {
    defaultLayout: PolicyLayout,
    overrides: {
      audit_object: AuditObjectLayout,
    },
  },
  system_document: {
    defaultLayout: SystemDocumentationLayout,
    overrides: {
      interface_description: InterfaceDescriptionLayout,
    },
  },
  module_page: {
    defaultLayout: ChecklistLayout,
    overrides: {
      training_resource: TrainingResourceLayout,
    },
  },
};

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
  const profile = getDisplayProfile(templateType);

  if (profile) {
    const strategy = PROFILE_LAYOUT_STRATEGIES[profile];
    const LayoutComponent =
      strategy.overrides?.[templateType] ?? strategy.defaultLayout;

    if (LayoutComponent) {
      return (
        <LayoutComponent
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        />
      );
    }

    return (
      <GenericSectionLayout
        templateType={templateType}
        structuredFields={structuredFields}
        onSectionSave={onSectionSave}
        displayProfile={profile}
        pageType={pageType}
        nodeId={nodeId}
      />
    );
  }

  return (
    <GenericSectionLayout
      templateType={templateType}
      structuredFields={structuredFields}
      onSectionSave={onSectionSave}
      pageType={pageType}
      nodeId={nodeId}
    />
  );
}
