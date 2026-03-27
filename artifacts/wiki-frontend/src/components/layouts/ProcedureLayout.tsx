import {
  ListChecks,
  FileStack,
  BookOpen,
  Target,
  Zap,
  PackageOpen,
  ArrowLeftRight,
  PackageCheck,
  History,
} from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";
import { RACIMatrix, RisksControlsTable, KPITable, InterfacesSystemsTable, SwimlaneDiagram } from "@/components/qm";
import { getPageType } from "@/lib/types";

interface ProcedureLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function ProcedureLayout({
  structuredFields,
  onSectionSave,
}: ProcedureLayoutProps) {
  const def = getPageType("procedure_instruction");
  const purposeSection = def?.sections.find(s => s.key === "purpose");
  const scopeSection = def?.sections.find(s => s.key === "scope");
  const triggerSection = def?.sections.find(s => s.key === "trigger");
  const inputsSection = def?.sections.find(s => s.key === "inputs");
  const procedureSection = def?.sections.find(s => s.key === "procedure");
  const respSection = def?.sections.find(s => s.key === "responsibilities");
  const interfacesSection = def?.sections.find(s => s.key === "interfaces");
  const outputsSection = def?.sections.find(s => s.key === "outputs");
  const risksSection = def?.sections.find(s => s.key === "risks");
  const kpisSection = def?.sections.find(s => s.key === "kpis");
  const documentsSection = def?.sections.find(s => s.key === "documents");
  const changelogSection = def?.sections.find(s => s.key === "changelog");

  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="purpose"
        label="Zweck"
        description="Zweck und Ziel der Verfahrensanweisung"
        icon={<Target className="h-4 w-4 text-primary" />}
        value={str(structuredFields.purpose)}
        onSave={onSectionSave}
        emptyText="Noch kein Zweck definiert"
        help={purposeSection?.help}
        helpText={purposeSection?.helpText}
        guidingQuestions={purposeSection?.guidingQuestions}
        requirement="required"
      />

      <EditableSectionCard
        sectionKey="scope"
        label="Geltungsbereich"
        description="Für wen und wo gilt diese Anweisung?"
        icon={<BookOpen className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.scope)}
        onSave={onSectionSave}
        emptyText="Noch kein Geltungsbereich definiert"
        help={scopeSection?.help}
        helpText={scopeSection?.helpText}
        guidingQuestions={scopeSection?.guidingQuestions}
        requirement="required"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="trigger"
          label="Auslöser & Vorbedingungen"
          description="Was löst das Verfahren aus?"
          icon={<Zap className="h-4 w-4 text-yellow-600" />}
          value={str(structuredFields.trigger)}
          onSave={onSectionSave}
          emptyText="Noch keine Auslöser definiert"
          help={triggerSection?.help}
          helpText={triggerSection?.helpText}
          guidingQuestions={triggerSection?.guidingQuestions}
        />

        <EditableSectionCard
          sectionKey="inputs"
          label="Eingaben & Voraussetzungen"
          description="Benötigte Dokumente, Daten und Ressourcen"
          icon={<PackageOpen className="h-4 w-4 text-indigo-600" />}
          value={str(structuredFields.inputs)}
          onSave={onSectionSave}
          emptyText="Noch keine Eingaben definiert"
          help={inputsSection?.help}
          helpText={inputsSection?.helpText}
          guidingQuestions={inputsSection?.guidingQuestions}
        />
      </div>

      <EditableSectionCard
        sectionKey="procedure"
        label="Ablaufbeschreibung"
        description="Schrittweise Durchführung mit Verantwortlichkeiten"
        icon={<ListChecks className="h-4 w-4 text-orange-600" />}
        value={str(structuredFields.procedure)}
        onSave={onSectionSave}
        emptyText="Noch keine Schritte dokumentiert"
        help={procedureSection?.help}
        helpText={procedureSection?.helpText}
        guidingQuestions={procedureSection?.guidingQuestions}
        requirement="required"
      />

      <SwimlaneDiagram
        data={structuredFields.swimlane}
        onSave={onSectionSave ? (data) => onSectionSave("swimlane", data) : undefined}
        readOnly={!onSectionSave}
      />

      <RACIMatrix
        data={structuredFields.responsibilities}
        onSave={onSectionSave ? (data) => onSectionSave("responsibilities", data) : undefined}
        readOnly={!onSectionSave}
      />

      <InterfacesSystemsTable
        data={structuredFields.interfaces}
        onSave={onSectionSave ? (data) => onSectionSave("interfaces", data) : undefined}
        readOnly={!onSectionSave}
      />

      <EditableSectionCard
        sectionKey="outputs"
        label="Ergebnisse & Ausgaben"
        description="Was wird durch das Verfahren erzeugt?"
        icon={<PackageCheck className="h-4 w-4 text-green-600" />}
        value={str(structuredFields.outputs)}
        onSave={onSectionSave}
        emptyText="Keine Ergebnisse definiert"
        help={outputsSection?.help}
        helpText={outputsSection?.helpText}
        guidingQuestions={outputsSection?.guidingQuestions}
      />

      <RisksControlsTable
        data={structuredFields.risks}
        onSave={onSectionSave ? (data) => onSectionSave("risks", data) : undefined}
        readOnly={!onSectionSave}
      />

      <KPITable
        data={structuredFields.kpis}
        onSave={onSectionSave ? (data) => onSectionSave("kpis", data) : undefined}
        readOnly={!onSectionSave}
      />

      <EditableSectionCard
        sectionKey="documents"
        label="Mitgeltende Unterlagen"
        description="Referenzierte Dokumente, Normen und Formulare"
        icon={<FileStack className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.documents)}
        onSave={onSectionSave}
        emptyText="Keine mitgeltenden Unterlagen"
        help={documentsSection?.help}
        helpText={documentsSection?.helpText}
        guidingQuestions={documentsSection?.guidingQuestions}
      />

      <EditableSectionCard
        sectionKey="changelog"
        label="Änderungshistorie"
        description="Dokumentierte Änderungen mit Datum und Verantwortlichem"
        icon={<History className="h-4 w-4 text-gray-500" />}
        value={str(structuredFields.changelog)}
        onSave={onSectionSave}
        emptyText="Keine Änderungen dokumentiert"
        help={changelogSection?.help}
        helpText={changelogSection?.helpText}
        requirement="recommended"
      />
    </div>
  );
}
