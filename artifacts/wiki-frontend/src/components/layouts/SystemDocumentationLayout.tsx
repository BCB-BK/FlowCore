import {
  Server,
  Layers,
  Database,
  Lock,
  Settings,
} from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";
import { InterfacesSystemsTable } from "@/components/qm";

interface SystemDocumentationLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
  pageType?: string;
  nodeId?: string;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function SystemDocumentationLayout({
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
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
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Noch keine Systeminformationen erfasst"
      />

      <EditableSectionCard
        sectionKey="architecture"
        label="Architektur & Komponenten"
        description="Technische Architektur und Systemkomponenten"
        icon={<Layers className="h-4 w-4 text-purple-600" />}
        value={str(structuredFields.architecture)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Architektur dokumentiert"
      />

      <InterfacesSystemsTable
        data={structuredFields.interfaces}
        onSave={onSectionSave ? (data) => onSectionSave("interfaces", data) : undefined}
        readOnly={!onSectionSave}
      />

      <EditableSectionCard
        sectionKey="data_objects"
        label="Datenobjekte"
        description="Verwaltete Daten und Datenmodell"
        icon={<Database className="h-4 w-4 text-amber-600" />}
        value={str(structuredFields.data_objects)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Datenobjekte dokumentiert"
      />

      <EditableSectionCard
        sectionKey="access_rights"
        label="Zugriffsrechte & Berechtigungen"
        description="Rollen- und Berechtigungskonzept"
        icon={<Lock className="h-4 w-4 text-red-600" />}
        value={str(structuredFields.access_rights)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Keine Berechtigungen dokumentiert"
      />

      <EditableSectionCard
        sectionKey="operations"
        label="Betrieb & Wartung"
        description="Betriebskonzept, SLA und Wartungsfenster"
        icon={<Settings className="h-4 w-4 text-green-600" />}
        value={str(structuredFields.operations)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Kein Betriebskonzept dokumentiert"
      />
    </div>
  );
}
