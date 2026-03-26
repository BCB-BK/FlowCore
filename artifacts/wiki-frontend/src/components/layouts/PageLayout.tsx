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
  switch (templateType) {
    case "core_process_overview":
      return (
        <ProcessOverviewLayout
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
    case "process_page_text":
      return (
        <ProcessPageTextLayout
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
    case "process_page_graphic":
      return (
        <ProcessPageGraphicLayout
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
    case "procedure_instruction":
      return (
        <ProcedureLayout
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
    case "policy":
      return (
        <PolicyLayout
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
    case "role_profile":
      return (
        <RoleProfileLayout
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
    case "system_documentation":
      return (
        <SystemDocumentationLayout
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
    case "work_instruction":
      return (
        <WorkInstructionLayout
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
    case "checklist":
      return (
        <ChecklistLayout
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
    case "meeting_protocol":
      return (
        <MeetingProtocolLayout
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
    case "audit_object":
      return (
        <AuditObjectLayout
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
    case "training_resource":
      return (
        <TrainingResourceLayout
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
    case "faq":
      return (
        <FaqLayout
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
    case "interface_description":
      return (
        <InterfaceDescriptionLayout
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
    default:
      return (
        <GenericSectionLayout
          templateType={templateType}
          structuredFields={structuredFields}
          onSectionSave={onSectionSave}
        />
      );
  }
}
