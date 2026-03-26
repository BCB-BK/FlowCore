import {
  ArrowLeftRight,
  Database,
  Cpu,
  AlertCircle,
  Clock,
  Users,
} from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface InterfaceDescriptionLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function InterfaceDescriptionLayout({
  structuredFields,
  onSectionSave,
}: InterfaceDescriptionLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="overview"
        label="Übersicht"
        description="Zweck und Kontext der Schnittstelle"
        icon={<ArrowLeftRight className="h-4 w-4 text-primary" />}
        value={str(structuredFields.overview)}
        onSave={onSectionSave}
        emptyText="Noch keine Übersicht erfasst"
      />

      <EditableSectionCard
        sectionKey="data_flow"
        label="Datenfluss"
        description="Welche Daten werden in welche Richtung übertragen?"
        icon={<Database className="h-4 w-4 text-blue-600" />}
        value={str(structuredFields.data_flow)}
        onSave={onSectionSave}
        emptyText="Noch kein Datenfluss beschrieben"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="protocol"
          label="Protokoll & Technik"
          description="Technisches Protokoll, Format und Verbindungsdetails"
          icon={<Cpu className="h-4 w-4 text-purple-600" />}
          value={str(structuredFields.protocol)}
          onSave={onSectionSave}
          emptyText="Keine technischen Details"
        />

        <EditableSectionCard
          sectionKey="error_handling"
          label="Fehlerbehandlung"
          description="Verhalten bei Fehlern und Wiederanlauf"
          icon={<AlertCircle className="h-4 w-4 text-red-600" />}
          value={str(structuredFields.error_handling)}
          onSave={onSectionSave}
          emptyText="Keine Fehlerbehandlung definiert"
        />
      </div>

      <EditableSectionCard
        sectionKey="sla"
        label="SLA & Verfügbarkeit"
        description="Service Level Agreements und Verfügbarkeitsanforderungen"
        icon={<Clock className="h-4 w-4 text-green-600" />}
        value={str(structuredFields.sla)}
        onSave={onSectionSave}
        emptyText="Keine SLAs definiert"
      />

      <EditableSectionCard
        sectionKey="responsibilities"
        label="Verantwortlichkeiten"
        description="Wer ist für welche Seite der Schnittstelle verantwortlich?"
        icon={<Users className="h-4 w-4 text-amber-600" />}
        value={str(structuredFields.responsibilities)}
        onSave={onSectionSave}
        emptyText="Keine Verantwortlichkeiten zugeordnet"
      />
    </div>
  );
}
