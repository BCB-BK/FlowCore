import {
  UserCog,
  ClipboardList,
  GraduationCap,
  Key,
  ArrowLeftRight,
} from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface RoleProfileLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function RoleProfileLayout({
  structuredFields,
  onSectionSave,
}: RoleProfileLayoutProps) {
  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="role_definition"
        label="Rollendefinition"
        description="Name, Einordnung & Stellenziel"
        icon={<UserCog className="h-4 w-4 text-purple-600" />}
        value={str(structuredFields.role_definition)}
        onSave={onSectionSave}
        emptyText="Noch keine Rollendefinition"
      />

      <EditableSectionCard
        sectionKey="responsibilities"
        label="Aufgaben & Verantwortlichkeiten"
        description="Kernaufgaben und Verantwortungsbereiche"
        icon={<ClipboardList className="h-4 w-4 text-primary" />}
        value={str(structuredFields.responsibilities)}
        onSave={onSectionSave}
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
          emptyText="—"
        />

        <EditableSectionCard
          sectionKey="authority"
          label="Befugnisse"
          description="Entscheidungs- und Handlungsbefugnisse"
          icon={<Key className="h-4 w-4 text-amber-600" />}
          value={str(structuredFields.authority)}
          onSave={onSectionSave}
          emptyText="—"
        />
      </div>

      <EditableSectionCard
        sectionKey="interfaces"
        label="Zusammenarbeit & Schnittstellen"
        description="Interne und externe Kooperationspartner"
        icon={<ArrowLeftRight className="h-4 w-4 text-cyan-600" />}
        value={str(structuredFields.interfaces)}
        onSave={onSectionSave}
        emptyText="Keine Schnittstellen dokumentiert"
      />
    </div>
  );
}
