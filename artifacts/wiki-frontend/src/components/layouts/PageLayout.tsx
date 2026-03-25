import { ProcessOverviewLayout } from "./ProcessOverviewLayout";
import { ProcedureLayout } from "./ProcedureLayout";
import { PolicyLayout } from "./PolicyLayout";
import { RoleProfileLayout } from "./RoleProfileLayout";
import { GenericSectionLayout } from "./GenericSectionLayout";

interface PageLayoutProps {
  templateType: string;
  structuredFields: Record<string, unknown>;
}

export function PageLayout({
  templateType,
  structuredFields,
}: PageLayoutProps) {
  switch (templateType) {
    case "core_process_overview":
      return <ProcessOverviewLayout structuredFields={structuredFields} />;
    case "procedure_instruction":
      return <ProcedureLayout structuredFields={structuredFields} />;
    case "policy":
      return <PolicyLayout structuredFields={structuredFields} />;
    case "role_profile":
      return <RoleProfileLayout structuredFields={structuredFields} />;
    default:
      return (
        <GenericSectionLayout
          templateType={templateType}
          structuredFields={structuredFields}
        />
      );
  }
}
