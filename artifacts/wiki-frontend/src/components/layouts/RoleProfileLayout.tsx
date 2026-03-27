import {
  GraduationCap,
  ArrowLeftRight,
  Target,
  ClipboardList,
  Clock,
  Brain,
  Users,
  Heart,
  BarChart3,
  Monitor,
  ShieldCheck,
  Building2,
  Wallet,
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
  const coreTasksSection = def?.sections.find(s => s.key === "core_tasks");
  const respSection = def?.sections.find(s => s.key === "responsibilities");
  const budgetSection = def?.sections.find(s => s.key === "budget_authority");
  const routinesSection = def?.sections.find(s => s.key === "routines");
  const compProfSection = def?.sections.find(s => s.key === "competencies_professional");
  const compMethodSection = def?.sections.find(s => s.key === "competencies_methodical");
  const compSocialSection = def?.sections.find(s => s.key === "competencies_social");
  const compPersonalSection = def?.sections.find(s => s.key === "competencies_personal");
  const successSection = def?.sections.find(s => s.key === "success_metrics");
  const toolsSection = def?.sections.find(s => s.key === "tools");
  const dataProtSection = def?.sections.find(s => s.key === "data_protection");
  const workingModelSection = def?.sections.find(s => s.key === "working_model");
  const ifSection = def?.sections.find(s => s.key === "interfaces");

  const hasLegacyQualifications = Boolean(structuredFields.qualifications) && !structuredFields.competencies_professional;
  const hasLegacyAuthority = Boolean(structuredFields.authority) && !structuredFields.budget_authority;

  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="role_definition"
        label="Zielsetzung & Einordnung"
        description="Stellenziel, organisatorische Einordnung und Kernauftrag"
        icon={<Target className="h-4 w-4 text-purple-600" />}
        value={str(structuredFields.role_definition)}
        onSave={onSectionSave}
        pageType={pageType}
        nodeId={nodeId}
        emptyText="Noch keine Zielsetzung definiert"
        help={roleDefSection?.help}
        helpText={roleDefSection?.helpText}
        guidingQuestions={roleDefSection?.guidingQuestions}
        requirement="required"
      />

      <EditableSectionCard
        sectionKey="core_tasks"
        label="Kernaufgaben"
        description="Die 5–8 wichtigsten Aufgaben der Stelle mit Gewichtung"
        icon={<ClipboardList className="h-4 w-4 text-orange-600" />}
        value={str(structuredFields.core_tasks)}
        onSave={onSectionSave}
        emptyText="Noch keine Kernaufgaben definiert"
        help={coreTasksSection?.help}
        helpText={coreTasksSection?.helpText}
        guidingQuestions={coreTasksSection?.guidingQuestions}
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
          sectionKey="budget_authority"
          label="Budget- & Personalverantwortung"
          description="Budgetrahmen, Personalführung und Weisungsbefugnisse"
          icon={<Wallet className="h-4 w-4 text-emerald-600" />}
          value={str(structuredFields.budget_authority)}
          onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
          emptyText="—"
          help={budgetSection?.help}
          helpText={budgetSection?.helpText}
          guidingQuestions={budgetSection?.guidingQuestions}
          requirement="recommended"
        />

        <EditableSectionCard
          sectionKey="routines"
          label="Routinen & wiederkehrende Termine"
          description="Regelmäßige Aufgaben, Meetings und Berichtspflichten"
          icon={<Clock className="h-4 w-4 text-blue-600" />}
          value={str(structuredFields.routines)}
          onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
          emptyText="—"
          help={routinesSection?.help}
          helpText={routinesSection?.helpText}
          guidingQuestions={routinesSection?.guidingQuestions}
          requirement="recommended"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="competencies_professional"
          label="Fachliche Kompetenzen"
          description="Fachliche Qualifikationen, Ausbildung und Zertifizierungen"
          icon={<GraduationCap className="h-4 w-4 text-blue-600" />}
          value={str(structuredFields.competencies_professional)}
          onSave={onSectionSave}
          emptyText="—"
          help={compProfSection?.help}
          helpText={compProfSection?.helpText}
          guidingQuestions={compProfSection?.guidingQuestions}
          requirement="recommended"
        />

        <EditableSectionCard
          sectionKey="competencies_methodical"
          label="Methodische Kompetenzen"
          description="Methodenkenntnisse und analytische Fähigkeiten"
          icon={<Brain className="h-4 w-4 text-indigo-600" />}
          value={str(structuredFields.competencies_methodical)}
          onSave={onSectionSave}
          emptyText="—"
          help={compMethodSection?.help}
          helpText={compMethodSection?.helpText}
          guidingQuestions={compMethodSection?.guidingQuestions}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="competencies_social"
          label="Soziale Kompetenzen"
          description="Kommunikation, Teamfähigkeit und Führungskompetenzen"
          icon={<Users className="h-4 w-4 text-teal-600" />}
          value={str(structuredFields.competencies_social)}
          onSave={onSectionSave}
          emptyText="—"
          help={compSocialSection?.help}
          helpText={compSocialSection?.helpText}
          guidingQuestions={compSocialSection?.guidingQuestions}
        />

        <EditableSectionCard
          sectionKey="competencies_personal"
          label="Persönliche Kompetenzen"
          description="Persönliche Eigenschaften und Selbstmanagement"
          icon={<Heart className="h-4 w-4 text-rose-600" />}
          value={str(structuredFields.competencies_personal)}
          onSave={onSectionSave}
          emptyText="—"
          help={compPersonalSection?.help}
          helpText={compPersonalSection?.helpText}
          guidingQuestions={compPersonalSection?.guidingQuestions}
        />
      </div>

      <EditableSectionCard
        sectionKey="success_metrics"
        label="Messerfolg & Leistungskriterien"
        description="Woran wird der Erfolg der Stelle gemessen?"
        icon={<BarChart3 className="h-4 w-4 text-green-600" />}
        value={str(structuredFields.success_metrics)}
        onSave={onSectionSave}
        emptyText="Keine Leistungskriterien definiert"
        help={successSection?.help}
        helpText={successSection?.helpText}
        guidingQuestions={successSection?.guidingQuestions}
        requirement="recommended"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="tools"
          label="Arbeitsmittel & Systeme"
          description="IT-Systeme, Tools und Arbeitsmittel"
          icon={<Monitor className="h-4 w-4 text-gray-600" />}
          value={str(structuredFields.tools)}
          onSave={onSectionSave}
          emptyText="—"
          help={toolsSection?.help}
          helpText={toolsSection?.helpText}
          guidingQuestions={toolsSection?.guidingQuestions}
        />

        <EditableSectionCard
          sectionKey="data_protection"
          label="Datenschutz & Vertraulichkeit"
          description="Umgang mit sensiblen Daten und Vertraulichkeitspflichten"
          icon={<ShieldCheck className="h-4 w-4 text-red-600" />}
          value={str(structuredFields.data_protection)}
          onSave={onSectionSave}
          emptyText="—"
          help={dataProtSection?.help}
          helpText={dataProtSection?.helpText}
          guidingQuestions={dataProtSection?.guidingQuestions}
        />
      </div>

      <EditableSectionCard
        sectionKey="working_model"
        label="Arbeitszeitmodell & Arbeitsort"
        description="Arbeitszeitregelung, Homeoffice, Reiseanteil"
        icon={<Building2 className="h-4 w-4 text-amber-600" />}
        value={str(structuredFields.working_model)}
        onSave={onSectionSave}
        emptyText="—"
        help={workingModelSection?.help}
        helpText={workingModelSection?.helpText}
        guidingQuestions={workingModelSection?.guidingQuestions}
      />

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

      {hasLegacyQualifications && (
        <EditableSectionCard
          sectionKey="qualifications"
          label="Qualifikationen & Anforderungen (Legacy)"
          description="Fachliche und persönliche Anforderungen – bitte in die neuen Kompetenzfelder überführen"
          icon={<GraduationCap className="h-4 w-4 text-gray-400" />}
          value={str(structuredFields.qualifications)}
          onSave={onSectionSave}
          emptyText="—"
        />
      )}

      {hasLegacyAuthority && (
        <EditableSectionCard
          sectionKey="authority"
          label="Befugnisse (Legacy)"
          description="Entscheidungs- und Handlungsbefugnisse – bitte in Budget- & Personalverantwortung überführen"
          icon={<Wallet className="h-4 w-4 text-gray-400" />}
          value={str(structuredFields.authority)}
          onSave={onSectionSave}
          emptyText="—"
        />
      )}
    </div>
  );
}
