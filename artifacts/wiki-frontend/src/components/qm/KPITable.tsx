import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Pencil, Check, X, BarChart3 } from "lucide-react";

export interface KPIEntry {
  kpi: string;
  definition: string;
  formula: string;
  target: string;
  dataSource: string;
  frequency: string;
  owner: string;
}

interface KPITableProps {
  data: unknown;
  onSave?: (data: KPIEntry[]) => void;
  readOnly?: boolean;
}

function emptyEntry(): KPIEntry {
  return { kpi: "", definition: "", formula: "", target: "", dataSource: "", frequency: "", owner: "" };
}

function normalize(raw: unknown): KPIEntry[] | null {
  if (!raw) return null;
  if (typeof raw === "string" && raw.trim()) {
    return [{ kpi: raw, definition: "", formula: "", target: "", dataSource: "", frequency: "", owner: "" }];
  }
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return null;
  return raw.map((item: unknown) => {
    if (typeof item !== "object" || item === null) return { ...emptyEntry(), kpi: String(item ?? "") };
    const obj = item as Record<string, unknown>;
    return {
      kpi: String(obj.kpi ?? obj.name ?? ""),
      definition: String(obj.definition ?? obj.scope ?? ""),
      formula: String(obj.formula ?? ""),
      target: String(obj.target ?? obj.ziel ?? ""),
      dataSource: String(obj.dataSource ?? obj.report ?? ""),
      frequency: String(obj.frequency ?? obj.messfrequenz ?? ""),
      owner: String(obj.owner ?? ""),
    };
  });
}

const COLUMNS = [
  { key: "kpi" as const, label: "KPI", width: "min-w-[140px]" },
  { key: "definition" as const, label: "Definition/Scope", width: "min-w-[160px]" },
  { key: "formula" as const, label: "Formel", width: "min-w-[120px]" },
  { key: "target" as const, label: "Ziel", width: "min-w-[100px]" },
  { key: "dataSource" as const, label: "Datenquelle", width: "min-w-[120px]" },
  { key: "frequency" as const, label: "Frequenz", width: "min-w-[100px]" },
  { key: "owner" as const, label: "Owner", width: "min-w-[100px]" },
];

export function KPITable({ data, onSave, readOnly }: KPITableProps) {
  const parsed = normalize(data);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<KPIEntry[]>(parsed ?? []);

  const startEdit = useCallback(() => {
    setDraft(parsed ? JSON.parse(JSON.stringify(parsed)) : [emptyEntry()]);
    setEditing(true);
  }, [parsed]);

  const handleSave = () => {
    onSave?.(draft.filter((e) => e.kpi.trim()));
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(parsed ?? []);
    setEditing(false);
  };

  const addRow = () => {
    setDraft((prev) => [...prev, emptyEntry()]);
  };

  const removeRow = (index: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const updateField = (index: number, field: keyof KPIEntry, value: string) => {
    setDraft((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    );
  };

  const current = editing ? draft : parsed;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-green-600" />
            KPIs & Kennzahlen
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
      </CardHeader>
      <CardContent>
        {!current || current.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">Keine KPIs definiert</p>
            {onSave && !readOnly && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Plus className="h-3 w-3 mr-1" />
                KPI hinzufügen
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNS.map((col) => (
                      <TableHead key={col.key} className={col.width}>
                        {col.label}
                      </TableHead>
                    ))}
                    {editing && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.map((entry, idx) => (
                    <TableRow key={idx}>
                      {COLUMNS.map((col) => (
                        <TableCell key={col.key}>
                          {editing ? (
                            <Input
                              value={entry[col.key]}
                              onChange={(e) => updateField(idx, col.key, e.target.value)}
                              className="h-7 text-xs"
                              placeholder={col.label}
                            />
                          ) : (
                            <span className="text-xs">{entry[col.key] || "—"}</span>
                          )}
                        </TableCell>
                      ))}
                      {editing && (
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeRow(idx)}>
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
              <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={addRow}>
                <Plus className="h-3 w-3 mr-1" />
                KPI hinzufügen
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
