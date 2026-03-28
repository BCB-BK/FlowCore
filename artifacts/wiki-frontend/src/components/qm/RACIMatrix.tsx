import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { Badge } from "@workspace/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/select";
import { Plus, Trash2, Pencil, Check, X, Users } from "lucide-react";

export interface RACIEntry {
  step: string;
  assignments: Record<string, "R" | "A" | "C" | "I" | "">;
}

export interface RACIData {
  roles: string[];
  entries: RACIEntry[];
}

interface RACIMatrixProps {
  data: unknown;
  onSave?: (data: RACIData) => void;
  readOnly?: boolean;
}

const RACI_COLORS: Record<string, string> = {
  R: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  A: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  C: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  I: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const RACI_LABELS: Record<string, string> = {
  R: "Responsible",
  A: "Accountable",
  C: "Consulted",
  I: "Informed",
};

function emptyData(): RACIData {
  return { roles: ["Rolle 1"], entries: [{ step: "Schritt 1", assignments: {} }] };
}

function normalize(raw: unknown): RACIData | null {
  if (!raw) return null;
  if (typeof raw === "string" && raw.trim()) {
    return { roles: ["Rolle"], entries: [{ step: raw, assignments: {} }] };
  }
  if (typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.roles) || !Array.isArray(obj.entries)) return null;
  return {
    roles: obj.roles.map((r: unknown) => String(r ?? "")),
    entries: obj.entries.map((e: unknown) => {
      if (!e || typeof e !== "object") return { step: String(e ?? ""), assignments: {} };
      const entry = e as Record<string, unknown>;
      const assignments: Record<string, "R" | "A" | "C" | "I" | ""> = {};
      if (entry.assignments && typeof entry.assignments === "object") {
        for (const [k, v] of Object.entries(entry.assignments as Record<string, unknown>)) {
          const val = String(v ?? "").toUpperCase();
          if (val === "R" || val === "A" || val === "C" || val === "I") assignments[k] = val;
          else assignments[k] = "";
        }
      }
      return { step: String(entry.step ?? ""), assignments };
    }),
  };
}

export function RACIMatrix({ data, onSave, readOnly }: RACIMatrixProps) {
  const parsed = normalize(data);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RACIData>(parsed ?? emptyData());
  const [newRole, setNewRole] = useState("");

  const startEdit = useCallback(() => {
    setDraft(parsed ? JSON.parse(JSON.stringify(parsed)) : emptyData());
    setEditing(true);
  }, [parsed]);

  const handleSave = () => {
    onSave?.(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(parsed ?? emptyData());
    setEditing(false);
  };

  const addRole = () => {
    const trimmed = newRole.trim();
    if (trimmed && !draft.roles.includes(trimmed)) {
      setDraft((prev) => ({ ...prev, roles: [...prev.roles, trimmed] }));
      setNewRole("");
    }
  };

  const removeRole = (role: string) => {
    setDraft((prev) => ({
      ...prev,
      roles: prev.roles.filter((r) => r !== role),
      entries: prev.entries.map((e) => {
        const a = { ...e.assignments };
        delete a[role];
        return { ...e, assignments: a };
      }),
    }));
  };

  const addStep = () => {
    setDraft((prev) => ({
      ...prev,
      entries: [...prev.entries, { step: `Schritt ${prev.entries.length + 1}`, assignments: {} }],
    }));
  };

  const removeStep = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index),
    }));
  };

  const updateStepName = (index: number, name: string) => {
    setDraft((prev) => ({
      ...prev,
      entries: prev.entries.map((e, i) => (i === index ? { ...e, step: name } : e)),
    }));
  };

  const updateAssignment = (entryIndex: number, role: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      entries: prev.entries.map((e, i) =>
        i === entryIndex
          ? { ...e, assignments: { ...e.assignments, [role]: value as "R" | "A" | "C" | "I" | "" } }
          : e
      ),
    }));
  };

  const current = editing ? draft : parsed;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            RACI-Matrix
          </CardTitle>
          {onSave && !readOnly && !editing && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={startEdit}>
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
        <div className="flex flex-wrap gap-1.5 mt-1">
          {Object.entries(RACI_LABELS).map(([key, label]) => (
            <Badge key={key} variant="outline" className={`text-[10px] ${RACI_COLORS[key]}`}>
              {key} = {label}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!current || current.entries.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">Keine RACI-Matrix definiert</p>
            {onSave && !readOnly && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Plus className="h-3 w-3 mr-1" />
                Matrix anlegen
              </Button>
            )}
          </div>
        ) : (
          <>
            {editing && (
              <div className="flex items-center gap-2 mb-3">
                <Input
                  placeholder="Neue Rolle hinzufügen..."
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRole(); } }}
                  className="h-8 text-xs max-w-[200px]"
                />
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={addRole}>
                  <Plus className="h-3 w-3 mr-1" />
                  Rolle
                </Button>
              </div>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Prozessschritt</TableHead>
                    {current.roles.map((role) => (
                      <TableHead key={role} className="text-center min-w-[100px]">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs">{role}</span>
                          {editing && (
                            <button onClick={() => removeRole(role)} className="text-muted-foreground hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </TableHead>
                    ))}
                    {editing && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.entries.map((entry, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {editing ? (
                          <Input
                            value={entry.step}
                            onChange={(e) => updateStepName(idx, e.target.value)}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <span className="text-sm font-medium">{entry.step}</span>
                        )}
                      </TableCell>
                      {current.roles.map((role) => (
                        <TableCell key={role} className="text-center">
                          {editing ? (
                            <Select
                              value={entry.assignments[role] || "_empty"}
                              onValueChange={(v) => updateAssignment(idx, role, v === "_empty" ? "" : v)}
                            >
                              <SelectTrigger className="h-7 w-16 mx-auto text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_empty">—</SelectItem>
                                <SelectItem value="R">R</SelectItem>
                                <SelectItem value="A">A</SelectItem>
                                <SelectItem value="C">C</SelectItem>
                                <SelectItem value="I">I</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : entry.assignments[role] ? (
                            <Badge className={`text-xs font-bold ${RACI_COLORS[entry.assignments[role]]}`}>
                              {entry.assignments[role]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      ))}
                      {editing && (
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeStep(idx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {editing && (
              <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={addStep}>
                <Plus className="h-3 w-3 mr-1" />
                Schritt hinzufügen
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
