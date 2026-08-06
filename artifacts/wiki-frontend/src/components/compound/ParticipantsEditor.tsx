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
import { useRowKeys } from "./useRowKeys";

interface Participant {
  name: string;
  role: string;
  status: string;
}

export const STATUS_OPTIONS = [
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

const KNOWN_STATUS_LABELS: Record<string, string> = {
  "anwesend (vor ort)": "anwesend",
  "anwesend (nur dm)": "online",
  "online zugeschaltet": "online",
  entschuldigt: "entschuldigt",
  "unentschuldigt abwesend": "unentschuldigt",
};

function normalizeStatus(raw: string): string {
  if (!raw) return "anwesend";
  if (STATUS_OPTIONS.some((o) => o.value === raw)) return raw;
  const mapped = KNOWN_STATUS_LABELS[raw.toLowerCase().trim()];
  return mapped ?? "anwesend";
}

function parseParticipants(raw: string): Participant[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((p) => ({
        name: typeof p.name === "string" ? p.name : "",
        role: typeof p.role === "string" ? p.role : "",
        status: normalizeStatus(typeof p.status === "string" ? p.status : ""),
      }));
    }
  } catch {}
  if (raw.trim()) {
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        const trimmed = l.trim();
        const asStatus = KNOWN_STATUS_LABELS[trimmed.toLowerCase()];
        if (asStatus) return { name: "", role: "", status: asStatus };
        return { name: trimmed, role: "", status: "anwesend" };
      })
      .filter((p) => p.name !== "");
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
  const [rows, setRows] = useState<Participant[]>(() =>
    parseParticipants(value),
  );
  const rowKeys = useRowKeys(rows.length);

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
    rowKeys.add();
  };

  const removeRow = (i: number) => {
    setRows(rows.filter((_, idx) => idx !== i));
    rowKeys.remove(i);
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
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleCancel}
              >
                <X className="h-3 w-3 mr-1" />
                Abbrechen
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleSave}
              >
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
            {rows.map((row, i) => (
              <div
                key={rowKeys.keys[i]}
                className="rounded-md border bg-muted/30 p-2 space-y-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <Input
                    value={row.name}
                    onChange={(e) => updateRow(i, "name", e.target.value)}
                    placeholder="Name"
                    className="h-7 text-xs flex-1 min-w-0"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input
                  value={row.role}
                  onChange={(e) => updateRow(i, "role", e.target.value)}
                  placeholder="Rolle / Funktion"
                  className="h-7 text-xs w-full"
                />
                <Select
                  value={row.status}
                  onValueChange={(v) => updateRow(i, "status", v)}
                >
                  <SelectTrigger className="h-7 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-1 text-xs h-8"
              onClick={addRow}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Teilnehmer hinzufügen
            </Button>
          </div>
        ) : displayRows.length > 0 ? (
          <div className="space-y-1.5">
            {displayRows.map((row, i) => (
              <div
                key={i}
                className="flex flex-col gap-0.5 py-1.5 px-1 rounded hover:bg-muted/30 transition-colors border-b last:border-b-0"
              >
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {row.name || "—"}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border font-medium whitespace-nowrap shrink-0 ${STATUS_STYLES[row.status] ?? "bg-muted text-muted-foreground border-border"}`}
                  >
                    {STATUS_OPTIONS.find((o) => o.value === row.status)
                      ?.label ?? row.status}
                  </span>
                </div>
                {row.role && (
                  <span className="text-xs text-muted-foreground truncate">
                    {row.role}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Keine Teilnehmer erfasst
          </p>
        )}
      </CardContent>
    </Card>
  );
}
