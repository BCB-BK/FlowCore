import {
  Server,
  Layers,
  ArrowLeftRight,
  Database,
  Lock,
  Settings,
} from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface SystemDocumentationLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function SystemDocumentationLayout({
  structuredFields,
  onSectionSave,
}: SystemDocumentationLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="system_info"
        label="Systeminformationen"
        description="Grundlegende Systembeschreibung"
        icon={<Server className="h-4 w-4 text-primary" />}
        value={str(structuredFields.system_info)}
        onSave={onSectionSave}
        emptyText="Noch keine Systeminformationen erfasst"
      />

      <EditableSectionCard
        sectionKey="architecture"
        label="Architektur & Komponenten"
        description="Technische Architektur und Systemkomponenten"
        icon={<Layers className="h-4 w-4 text-purple-600" />}
        value={str(structuredFields.architecture)}
        onSave={onSectionSave}
        emptyText="Keine Architektur dokumentiert"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="interfaces"
          label="Schnittstellen"
          description="Ein- und ausgehende Schnittstellen"
          icon={<ArrowLeftRight className="h-4 w-4 text-blue-600" />}
          value={str(structuredFields.interfaces)}
          onSave={onSectionSave}
          emptyText="Keine Schnittstellen dokumentiert"
        />

        <EditableSectionCard
          sectionKey="data_objects"
          label="Datenobjekte"
          description="Verwaltete Daten und Datenmodell"
          icon={<Database className="h-4 w-4 text-amber-600" />}
          value={str(structuredFields.data_objects)}
          onSave={onSectionSave}
          emptyText="Keine Datenobjekte dokumentiert"
        />
      </div>

      <EditableSectionCard
        sectionKey="access_rights"
        label="Zugriffsrechte & Berechtigungen"
        description="Rollen- und Berechtigungskonzept"
        icon={<Lock className="h-4 w-4 text-red-600" />}
        value={str(structuredFields.access_rights)}
        onSave={onSectionSave}
        emptyText="Keine Berechtigungen dokumentiert"
      />

      <EditableSectionCard
        sectionKey="operations"
        label="Betrieb & Wartung"
        description="Betriebskonzept, SLA und Wartungsfenster"
        icon={<Settings className="h-4 w-4 text-green-600" />}
        value={str(structuredFields.operations)}
        onSave={onSectionSave}
        emptyText="Kein Betriebskonzept dokumentiert"
      />
    </div>
  );
}
