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
import { Plus, Trash2, Pencil, Check, X, AlertTriangle } from "lucide-react";

export interface RiskControlEntry {
  risk: string;
  impact: string;
  control: string;
  evidence: string;
  owner: string;
  severity: "low" | "medium" | "high" | "critical" | "";
}

interface RisksControlsTableProps {
  data: unknown;
  onSave?: (data: RiskControlEntry[]) => void;
  readOnly?: boolean;
}

function emptyEntry(): RiskControlEntry {
  return { risk: "", impact: "", control: "", evidence: "", owner: "", severity: "" };
}

function normalize(raw: unknown): RiskControlEntry[] | null {
  if (!raw) return null;
  if (typeof raw === "string" && raw.trim()) {
    return [{ ...emptyEntry(), risk: raw }];
  }
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return null;
  return raw.map((item: unknown) => {
    if (typeof item !== "object" || item === null) return { ...emptyEntry(), risk: String(item ?? "") };
    const obj = item as Record<string, unknown>;
    const sev = String(obj.severity ?? "");
    return {
      risk: String(obj.risk ?? ""),
      impact: String(obj.impact ?? ""),
      control: String(obj.control ?? ""),
      evidence: String(obj.evidence ?? ""),
      owner: String(obj.owner ?? ""),
      severity: (["low", "medium", "high", "critical"].includes(sev) ? sev : "") as RiskControlEntry["severity"],
    };
  });
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  critical: "Kritisch",
};

const COLUMNS: { key: keyof Omit<RiskControlEntry, "severity">; label: string; width: string }[] = [
  { key: "risk", label: "Risiko", width: "min-w-[150px]" },
  { key: "impact", label: "Auswirkung", width: "min-w-[130px]" },
  { key: "control", label: "Kontrolle/Maßnahme", width: "min-w-[150px]" },
  { key: "evidence", label: "Nachweis/Artefakt", width: "min-w-[130px]" },
  { key: "owner", label: "Owner", width: "min-w-[100px]" },
];

export function RisksControlsTable({ data, onSave, readOnly }: RisksControlsTableProps) {
  const parsed = normalize(data);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RiskControlEntry[]>(parsed ?? []);

  const startEdit = useCallback(() => {
    setDraft(parsed ? JSON.parse(JSON.stringify(parsed)) : [emptyEntry()]);
    setEditing(true);
  }, [parsed]);

  const handleSave = () => {
    onSave?.(draft.filter((e) => e.risk.trim()));
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(parsed ?? []);
    setEditing(false);
  };

  const addRow = () => setDraft((prev) => [...prev, emptyEntry()]);

  const removeRow = (index: number) => setDraft((prev) => prev.filter((_, i) => i !== index));

  const updateField = (index: number, field: keyof RiskControlEntry, value: string) => {
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
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Risiken & Kontrollen
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
            <p className="text-sm text-muted-foreground mb-2">Keine Risiken dokumentiert</p>
            {onSave && !readOnly && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Plus className="h-3 w-3 mr-1" />
                Risiko hinzufügen
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
                      <TableHead key={col.key} className={col.width}>{col.label}</TableHead>
                    ))}
                    <TableHead className="min-w-[90px]">Severity</TableHead>
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
                      <TableCell>
                        {editing ? (
                          <Select
                            value={entry.severity || "_empty"}
                            onValueChange={(v) => updateField(idx, "severity", v === "_empty" ? "" : v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_empty">—</SelectItem>
                              {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : entry.severity ? (
                          <Badge className={`text-[10px] ${SEVERITY_COLORS[entry.severity]}`}>
                            {SEVERITY_LABELS[entry.severity] ?? entry.severity}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
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
                Risiko hinzufügen
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
