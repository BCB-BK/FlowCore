import { getDisplayProfile } from "@workspace/shared/page-types";
import type { DisplayProfile } from "@workspace/shared/page-types";
import { ProcessOverviewLayout } from "./ProcessOverviewLayout";
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
import { GenericSectionLayout } from "./GenericSectionLayout";

interface LayoutComponentProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
}

interface ProfileLayoutStrategy {
  defaultLayout?: React.ComponentType<LayoutComponentProps>;
  overrides?: Record<string, React.ComponentType<LayoutComponentProps>>;
}

const PROFILE_LAYOUT_STRATEGIES: Record<DisplayProfile, ProfileLayoutStrategy> = {
  overview_container: {
    defaultLayout: ProcessOverviewLayout,
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
  onSectionSave?: (key: string, value: string) => void;
}

export function PageLayout({
  templateType,
  structuredFields,
  onSectionSave,
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
        />
      );
    }

    return (
      <GenericSectionLayout
        templateType={templateType}
        structuredFields={structuredFields}
        onSectionSave={onSectionSave}
        displayProfile={profile}
      />
    );
  }

  return (
    <GenericSectionLayout
      templateType={templateType}
      structuredFields={structuredFields}
      onSectionSave={onSectionSave}
    />
  );
}
