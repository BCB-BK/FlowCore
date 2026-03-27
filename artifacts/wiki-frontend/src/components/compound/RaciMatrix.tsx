import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { FieldHelpTooltip } from "@/components/metadata/FieldHelpTooltip";

interface RaciEntry {
  activity: string;
  assignments: Record<string, string>;
}

interface RaciMatrixProps {
  value: string;
  onSave?: (key: string, value: string) => void;
  sectionKey: string;
  help?: { fillHelp?: string; example?: string; badExample?: string; placeholder?: string; expectedFormat?: string };
  helpText?: string;
  guidingQuestions?: string[];
}

interface RaciData {
  roles: string[];
  entries: RaciEntry[];
}

function parseRaci(raw: string): RaciData {
  if (!raw) return { roles: [""], entries: [{ activity: "", assignments: {} }] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.roles && parsed.entries) return parsed;
  } catch {}
  return { roles: [""], entries: [{ activity: "", assignments: {} }] };
}

const RACI_VALUES = [
  { value: "", label: "—" },
  { value: "R", label: "R (Responsible)" },
  { value: "A", label: "A (Accountable)" },
  { value: "C", label: "C (Consulted)" },
  { value: "I", label: "I (Informed)" },
];

const RACI_COLORS: Record<string, string> = {
  R: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  A: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  C: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  I: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

export function RaciMatrix({ value, onSave, sectionKey, help, helpText, guidingQuestions }: RaciMatrixProps) {
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<RaciData>(() => parseRaci(value));

  const handleSave = () => {
    const cleaned: RaciData = {
      roles: data.roles.filter(r => r.trim()),
      entries: data.entries.filter(e => e.activity.trim()),
    };
    onSave?.(sectionKey, JSON.stringify(cleaned));
    setEditing(false);
  };

  const handleCancel = () => {
    setData(parseRaci(value));
    setEditing(false);
  };

  const addRole = () => setData({ ...data, roles: [...data.roles, ""] });
  const removeRole = (index: number) => {
    const roleName = data.roles[index];
    setData({
      roles: data.roles.filter((_, i) => i !== index),
      entries: data.entries.map(e => {
        const newAssignments = { ...e.assignments };
        delete newAssignments[roleName];
        return { ...e, assignments: newAssignments };
      }),
    });
  };

  const addActivity = () => setData({ ...data, entries: [...data.entries, { activity: "", assignments: {} }] });
  const removeActivity = (index: number) => setData({ ...data, entries: data.entries.filter((_, i) => i !== index) });

  const displayData = parseRaci(value);
  const hasContent = displayData.entries.some(e => e.activity.trim()) && displayData.roles.some(r => r.trim());

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              RACI-Matrix
              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 leading-none">Pflicht</Badge>
            </CardTitle>
            <FieldHelpTooltip
              fillHelp={help?.fillHelp}
              example={help?.example}
              badExample={help?.badExample}
              expectedFormat={help?.expectedFormat}
              helpText={helpText}
              guidingQuestions={guidingQuestions}
            />
          </div>
          {onSave && !editing && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setData(parseRaci(value)); setEditing(true); }}>
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
        <p className="text-xs text-muted-foreground">Responsible, Accountable, Consulted, Informed</p>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium mb-2">Rollen</p>
              <div className="flex flex-wrap gap-2">
                {data.roles.map((role, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Input
                      value={role}
                      onChange={(e) => {
                        const newRoles = [...data.roles];
                        newRoles[i] = e.target.value;
                        setData({ ...data, roles: newRoles });
                      }}
                      placeholder={`Rolle ${i + 1}`}
                      className="text-xs w-32 h-8"
                    />
                    <Button variant="ghost" size="sm" className="h-6 px-1 text-destructive" onClick={() => removeRole(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={addRole}>
                  <Plus className="h-3 w-3 mr-1" />
                  Rolle
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-1.5 border-b font-medium">Aktivität</th>
                    {data.roles.filter(r => r.trim()).map((role, i) => (
                      <th key={i} className="text-center p-1.5 border-b font-medium min-w-[80px]">{role}</th>
                    ))}
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry, ei) => (
                    <tr key={ei}>
                      <td className="p-1.5 border-b">
                        <Input
                          value={entry.activity}
                          onChange={(e) => {
                            const newEntries = [...data.entries];
                            newEntries[ei] = { ...entry, activity: e.target.value };
                            setData({ ...data, entries: newEntries });
                          }}
                          placeholder="Aktivität..."
                          className="text-xs h-8"
                        />
                      </td>
                      {data.roles.filter(r => r.trim()).map((role, ri) => (
                        <td key={ri} className="p-1.5 border-b text-center">
                          <Select
                            value={entry.assignments[role] ?? ""}
                            onValueChange={(v) => {
                              const newEntries = [...data.entries];
                              newEntries[ei] = { ...entry, assignments: { ...entry.assignments, [role]: v } };
                              setData({ ...data, entries: newEntries });
                            }}
                          >
                            <SelectTrigger className="h-8 w-16 text-xs mx-auto">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {RACI_VALUES.map(rv => (
                                <SelectItem key={rv.value || "empty"} value={rv.value || "none"}>{rv.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      ))}
                      <td className="p-1.5 border-b">
                        <Button variant="ghost" size="sm" className="h-6 px-1 text-destructive" onClick={() => removeActivity(ei)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Button variant="outline" size="sm" className="w-full mt-2 text-xs" onClick={addActivity}>
                <Plus className="h-3 w-3 mr-1" />
                Aktivität hinzufügen
              </Button>
            </div>
          </div>
        ) : hasContent ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b font-medium">Aktivität</th>
                  {displayData.roles.map((role, i) => (
                    <th key={i} className="text-center p-2 border-b font-medium">{role}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayData.entries.map((entry, i) => (
                  <tr key={i}>
                    <td className="p-2 border-b">{entry.activity}</td>
                    {displayData.roles.map((role, ri) => {
                      const val = entry.assignments[role] ?? "";
                      return (
                        <td key={ri} className="p-2 border-b text-center">
                          {val && val !== "none" && (
                            <Badge className={`text-xs ${RACI_COLORS[val] ?? ""}`}>{val}</Badge>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Noch keine RACI-Zuordnungen definiert
          </p>
        )}
      </CardContent>
    </Card>
  );
}
