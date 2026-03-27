import {
  UserCog,
  GraduationCap,
  Key,
  ArrowLeftRight,
} from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";
import { CompetencyAreas } from "@/components/compound/CompetencyAreas";
import { getPageType } from "@/lib/types";

interface RoleProfileLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  pageType?: string;
  nodeId?: string;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function RoleProfileLayout({
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
}: RoleProfileLayoutProps) {
  const def = getPageType("role_profile");
  const roleDefSection = def?.sections.find(s => s.key === "role_definition");
  const respSection = def?.sections.find(s => s.key === "responsibilities");
  const qualSection = def?.sections.find(s => s.key === "qualifications");
  const authSection = def?.sections.find(s => s.key === "authority");
  const ifSection = def?.sections.find(s => s.key === "interfaces");

  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="role_definition"
        label="Rollendefinition"
        description="Name, Einordnung & Stellenziel"
        icon={<UserCog className="h-4 w-4 text-purple-600" />}
        value={str(structuredFields.role_definition)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Noch keine Rollendefinition"
        help={roleDefSection?.help}
        helpText={roleDefSection?.helpText}
        guidingQuestions={roleDefSection?.guidingQuestions}
        requirement="required"
      />

      <CompetencyAreas
        value={str(structuredFields.responsibilities)}
        onSave={onSectionSave}
        sectionKey="responsibilities"
        help={respSection?.help}
        helpText={respSection?.helpText}
        guidingQuestions={respSection?.guidingQuestions}
        emptyText="Noch keine Verantwortlichkeiten definiert"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="qualifications"
          label="Qualifikationen & Anforderungen"
          description="Fachliche und persönliche Anforderungen"
          icon={<GraduationCap className="h-4 w-4 text-blue-600" />}
          value={str(structuredFields.qualifications)}
          onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
          emptyText="—"
          help={qualSection?.help}
          helpText={qualSection?.helpText}
          guidingQuestions={qualSection?.guidingQuestions}
        />

        <EditableSectionCard
          sectionKey="authority"
          label="Befugnisse"
          description="Entscheidungs- und Handlungsbefugnisse"
          icon={<Key className="h-4 w-4 text-amber-600" />}
          value={str(structuredFields.authority)}
          onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
          emptyText="—"
          help={authSection?.help}
          helpText={authSection?.helpText}
          guidingQuestions={authSection?.guidingQuestions}
        />
      </div>

      <EditableSectionCard
        sectionKey="interfaces"
        label="Zusammenarbeit & Schnittstellen"
        description="Interne und externe Kooperationspartner"
        icon={<ArrowLeftRight className="h-4 w-4 text-cyan-600" />}
        value={str(structuredFields.interfaces)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Schnittstellen dokumentiert"
        help={ifSection?.help}
        helpText={ifSection?.helpText}
        guidingQuestions={ifSection?.guidingQuestions}
        requirement="recommended"
      />
    </div>
  );
}
