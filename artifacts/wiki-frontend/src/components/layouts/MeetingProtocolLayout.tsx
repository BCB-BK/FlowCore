import {
  Users,
  List,
  MessageSquare,
  Gavel,
  ClipboardList,
  Calendar,
} from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface MeetingProtocolLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: unknown) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function MeetingProtocolLayout({
  structuredFields,
  onSectionSave,
}: MeetingProtocolLayoutProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="participants"
          label="Teilnehmer"
          description="Anwesende und entschuldigte Teilnehmer"
          icon={<Users className="h-4 w-4 text-primary" />}
          value={str(structuredFields.participants)}
          onSave={onSectionSave}
          emptyText="Keine Teilnehmer erfasst"
        />

        <EditableSectionCard
          sectionKey="agenda"
          label="Tagesordnung"
          description="Geplante Tagesordnungspunkte"
          icon={<List className="h-4 w-4 text-blue-600" />}
          value={str(structuredFields.agenda)}
          onSave={onSectionSave}
          emptyText="Keine Tagesordnung erfasst"
        />
      </div>

      <EditableSectionCard
        sectionKey="discussion"
        label="Besprechungspunkte"
        description="Ergebnisse und Diskussion zu den Tagesordnungspunkten"
        icon={<MessageSquare className="h-4 w-4 text-purple-600" />}
        value={str(structuredFields.discussion)}
        onSave={onSectionSave}
        emptyText="Noch keine Besprechungspunkte dokumentiert"
      />

      <EditableSectionCard
        sectionKey="decisions"
        label="Entscheidungen"
        description="Getroffene Entscheidungen mit Begründung"
        icon={<Gavel className="h-4 w-4 text-amber-600" />}
        value={str(structuredFields.decisions)}
        onSave={onSectionSave}
        emptyText="Keine Entscheidungen erfasst"
      />

      <EditableSectionCard
        sectionKey="action_items"
        label="Maßnahmen / ToDos"
        description="Vereinbarte Maßnahmen mit Verantwortlichem und Termin"
        icon={<ClipboardList className="h-4 w-4 text-orange-600" />}
        value={str(structuredFields.action_items)}
        onSave={onSectionSave}
        emptyText="Keine Maßnahmen definiert"
      />

      <EditableSectionCard
        sectionKey="next_meeting"
        label="Nächster Termin"
        description="Datum und Ort der nächsten Sitzung"
        icon={<Calendar className="h-4 w-4 text-green-600" />}
        value={str(structuredFields.next_meeting)}
        onSave={onSectionSave}
        emptyText="Kein nächster Termin festgelegt"
      />
    </div>
  );
}
