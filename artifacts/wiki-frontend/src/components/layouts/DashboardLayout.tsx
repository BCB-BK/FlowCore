import { LayoutDashboard, FileText } from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface DashboardLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
  pageType?: string;
  nodeId?: string;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

export function DashboardLayout({
  structuredFields,
  onSectionSave,
  pageType,
  nodeId,
}: DashboardLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="description"
        label="Beschreibung"
        description="Zweck und Kontext des Dashboards"
        icon={<FileText className="h-4 w-4 text-primary" />}
        value={str(structuredFields.description)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Noch keine Beschreibung"
      />

      <EditableSectionCard
        sectionKey="widgets"
        label="Widgets"
        description="Dashboard-Konfiguration und Widgets"
        icon={<LayoutDashboard className="h-4 w-4 text-purple-600" />}
        value={str(structuredFields.widgets)}
        onSave={onSectionSave}
          pageType={pageType}
          nodeId={nodeId}
        emptyText="Noch keine Widgets konfiguriert"
      />
    </div>
  );
}
