import { ProcessOverviewLayout } from "./ProcessOverviewLayout";
import { ProcedureLayout } from "./ProcedureLayout";
import { PolicyLayout } from "./PolicyLayout";
import { RoleProfileLayout } from "./RoleProfileLayout";
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
