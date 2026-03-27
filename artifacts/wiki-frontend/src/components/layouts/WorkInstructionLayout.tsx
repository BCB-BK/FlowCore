import {
  Target,
  BookOpen,
  ShieldAlert,
  Wrench,
  ListOrdered,
  CheckCircle,
  FileStack,
} from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface WorkInstructionLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  pageType?: string;
  nodeId?: string;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function WorkInstructionLayout({
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
}: WorkInstructionLayoutProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="purpose"
          label="Zweck"
          description="Warum existiert diese Arbeitsanweisung?"
          icon={<Target className="h-4 w-4 text-primary" />}
          value={str(structuredFields.purpose)}
          onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
          emptyText="Noch kein Zweck definiert"
        />

        <EditableSectionCard
          sectionKey="scope"
          label="Geltungsbereich"
          description="Für wen und wo gilt diese Anweisung?"
          icon={<BookOpen className="h-4 w-4 text-blue-600" />}
          value={str(structuredFields.scope)}
          onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
          emptyText="Noch kein Geltungsbereich definiert"
        />
      </div>

      <EditableSectionCard
        sectionKey="safety"
        label="Sicherheitshinweise"
        description="Arbeitsschutz und Sicherheitsvorgaben"
        icon={<ShieldAlert className="h-4 w-4 text-red-600" />}
        value={str(structuredFields.safety)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Sicherheitshinweise"
      />

      <EditableSectionCard
        sectionKey="materials"
        label="Werkzeuge & Materialien"
        description="Benötigte Werkzeuge, Materialien und Hilfsmittel"
        icon={<Wrench className="h-4 w-4 text-amber-600" />}
        value={str(structuredFields.materials)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Werkzeuge/Materialien angegeben"
      />

      <EditableSectionCard
        sectionKey="steps"
        label="Arbeitsschritte"
        description="Detaillierte Schritt-für-Schritt-Anleitung"
        icon={<ListOrdered className="h-4 w-4 text-orange-600" />}
        value={str(structuredFields.steps)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Noch keine Arbeitsschritte dokumentiert"
      />

      <EditableSectionCard
        sectionKey="quality_criteria"
        label="Qualitätskriterien"
        description="Prüfmerkmale und Akzeptanzkriterien"
        icon={<CheckCircle className="h-4 w-4 text-green-600" />}
        value={str(structuredFields.quality_criteria)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Qualitätskriterien definiert"
      />

      <EditableSectionCard
        sectionKey="documents"
        label="Mitgeltende Unterlagen"
        description="Referenzierte Dokumente und Formulare"
        icon={<FileStack className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.documents)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine mitgeltenden Unterlagen"
      />
    </div>
  );
}
