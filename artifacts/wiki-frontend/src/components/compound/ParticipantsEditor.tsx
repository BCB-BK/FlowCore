import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/select";
import { Users, Plus, Trash2, Pencil, Check, X } from "lucide-react";

interface Participant {
  name: string;
  role: string;
  status: string;
}

const STATUS_OPTIONS = [
  { value: "anwesend", label: "Anwesend (vor Ort)" },
  { value: "online", label: "Online zugeschaltet" },
  { value: "entschuldigt", label: "Entschuldigt" },
  { value: "unentschuldigt", label: "Unentschuldigt abwesend" },
];

const STATUS_STYLES: Record<string, string> = {
  anwesend: "bg-green-50 text-green-700 border-green-200",
  online: "bg-blue-50 text-blue-700 border-blue-200",
  entschuldigt: "bg-amber-50 text-amber-700 border-amber-200",
  unentschuldigt: "bg-red-50 text-red-700 border-red-200",
};

function parseParticipants(raw: string): Participant[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  if (raw.trim()) {
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => ({ name: l.trim(), role: "", status: "anwesend" }));
  }
  return [];
}

interface ParticipantsEditorProps {
  value: string;
  onSave?: (key: string, value: unknown) => void;
  sectionKey: string;
  readOnly?: boolean;
}

export function ParticipantsEditor({
  value,
  onSave,
  sectionKey,
  readOnly = false,
}: ParticipantsEditorProps) {
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<Participant[]>(() => parseParticipants(value));

  const displayRows = parseParticipants(value);
  const isEditable = !readOnly && !!onSave;

  const handleSave = () => {
    onSave?.(sectionKey, JSON.stringify(rows));
    setEditing(false);
  };

  const handleCancel = () => {
    setRows(parseParticipants(value));
    setEditing(false);
  };

  const addRow = () => {
    setRows([...rows, { name: "", role: "", status: "anwesend" }]);
  };

  const removeRow = (i: number) => {
    setRows(rows.filter((_, idx) => idx !== i));
  };

  const updateRow = (i: number, field: keyof Participant, val: string) => {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Teilnehmer
            {displayRows.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                ({displayRows.length})
              </span>
            )}
          </CardTitle>
          {isEditable && !editing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setRows(parseParticipants(value));
                setEditing(true);
              }}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Bearbeiten
            </Button>
          )}
          {editing && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleCancel}>
                <X className="h-3 w-3 mr-1" />
                Abbrechen
              </Button>
              <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSave}>
                <Check className="h-3 w-3 mr-1" />
                Speichern
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1">
              <span>Name</span>
              <span>Rolle / Funktion</span>
              <span>Status</span>
              <span />
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 items-center">
                <Input
                  value={row.name}
                  onChange={(e) => updateRow(i, "name", e.target.value)}
                  placeholder="Name"
                  className="h-8 text-sm"
                />
                <Input
                  value={row.role}
                  onChange={(e) => updateRow(i, "role", e.target.value)}
                  placeholder="Rolle / Funktion"
                  className="h-8 text-sm"
                />
                <Select value={row.status} onValueChange={(v) => updateRow(i, "status", v)}>
                  <SelectTrigger className="h-8 text-xs w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-2 text-xs" onClick={addRow}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Teilnehmer hinzufügen
            </Button>
          </div>
        ) : displayRows.length > 0 ? (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1 pb-1 border-b">
              <span>Name</span>
              <span>Rolle / Funktion</span>
              <span>Status</span>
            </div>
            {displayRows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center py-1 px-1 rounded hover:bg-muted/30 transition-colors">
                <span className="text-sm font-medium">{row.name || "—"}</span>
                <span className="text-sm text-muted-foreground">{row.role || "—"}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-medium whitespace-nowrap ${STATUS_STYLES[row.status] ?? "bg-muted text-muted-foreground border-border"}`}
                >
                  {STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Keine Teilnehmer erfasst</p>
        )}
      </CardContent>
    </Card>
  );
}
