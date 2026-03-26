import {
  ListChecks,
  FileStack,
  BookOpen,
  Target,
  Zap,
  PackageOpen,
  Users,
  ArrowLeftRight,
  PackageCheck,
  AlertTriangle,
  BarChart3,
  History,
} from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface ProcedureLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function ProcedureLayout({
  structuredFields,
  onSectionSave,
}: ProcedureLayoutProps) {
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
      />

      <EditableSectionCard
        sectionKey="scope"
        label="Geltungsbereich"
        description="Für wen und wo gilt diese Anweisung?"
        icon={<BookOpen className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.scope)}
        onSave={onSectionSave}
        emptyText="Noch kein Geltungsbereich definiert"
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
        />

        <EditableSectionCard
          sectionKey="inputs"
          label="Eingaben & Voraussetzungen"
          description="Benötigte Dokumente, Daten und Ressourcen"
          icon={<PackageOpen className="h-4 w-4 text-indigo-600" />}
          value={str(structuredFields.inputs)}
          onSave={onSectionSave}
          emptyText="Noch keine Eingaben definiert"
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
      />

      <EditableSectionCard
        sectionKey="responsibilities"
        label="Verantwortlichkeiten (RACI)"
        description="Responsible, Accountable, Consulted, Informed"
        icon={<Users className="h-4 w-4 text-purple-600" />}
        value={str(structuredFields.responsibilities)}
        onSave={onSectionSave}
        emptyText="Noch keine Verantwortlichkeiten zugeordnet"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="interfaces"
          label="Schnittstellen & Systeme"
          description="Beteiligte IT-Systeme und organisatorische Schnittstellen"
          icon={<ArrowLeftRight className="h-4 w-4 text-cyan-600" />}
          value={str(structuredFields.interfaces)}
          onSave={onSectionSave}
          emptyText="Keine Schnittstellen definiert"
        />

        <EditableSectionCard
          sectionKey="outputs"
          label="Ergebnisse & Ausgaben"
          description="Was wird durch das Verfahren erzeugt?"
          icon={<PackageCheck className="h-4 w-4 text-green-600" />}
          value={str(structuredFields.outputs)}
          onSave={onSectionSave}
          emptyText="Keine Ergebnisse definiert"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="risks"
          label="Risiken & Maßnahmen"
          description="Identifizierte Risiken und Gegenmaßnahmen"
          icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
          value={str(structuredFields.risks)}
          onSave={onSectionSave}
          emptyText="Keine Risiken dokumentiert"
        />

        <EditableSectionCard
          sectionKey="kpis"
          label="Kennzahlen & Messung"
          description="Prozesskennzahlen zur Erfolgsmessung"
          icon={<BarChart3 className="h-4 w-4 text-emerald-600" />}
          value={str(structuredFields.kpis)}
          onSave={onSectionSave}
          emptyText="Keine Kennzahlen definiert"
        />
      </div>

      <EditableSectionCard
        sectionKey="documents"
        label="Mitgeltende Unterlagen"
        description="Referenzierte Dokumente, Normen und Formulare"
        icon={<FileStack className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.documents)}
        onSave={onSectionSave}
        emptyText="Keine mitgeltenden Unterlagen"
      />

      <EditableSectionCard
        sectionKey="changelog"
        label="Änderungshistorie"
        description="Dokumentierte Änderungen mit Datum und Verantwortlichem"
        icon={<History className="h-4 w-4 text-gray-500" />}
        value={str(structuredFields.changelog)}
        onSave={onSectionSave}
        emptyText="Keine Änderungen dokumentiert"
      />
    </div>
  );
}
