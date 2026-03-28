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
import { Plus, Trash2, Pencil, Check, X, Network } from "lucide-react";

export interface InterfaceEntry {
  type: "upstream" | "downstream" | "system" | "organizational" | "";
  counterpart: string;
  inputOutput: string;
  medium: string;
  remark: string;
}

interface InterfacesSystemsTableProps {
  data: unknown;
  onSave?: (data: InterfaceEntry[]) => void;
  readOnly?: boolean;
}

function emptyEntry(): InterfaceEntry {
  return { type: "", counterpart: "", inputOutput: "", medium: "", remark: "" };
}

function normalize(raw: unknown): InterfaceEntry[] | null {
  if (!raw) return null;
  if (typeof raw === "string" && raw.trim()) {
    return [{ ...emptyEntry(), counterpart: raw }];
  }
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return null;
  return raw.map((item: unknown) => {
    if (typeof item !== "object" || item === null) return { ...emptyEntry(), counterpart: String(item ?? "") };
    const obj = item as Record<string, unknown>;
    const t = String(obj.type ?? "");
    return {
      type: (["upstream", "downstream", "system", "organizational"].includes(t) ? t : "") as InterfaceEntry["type"],
      counterpart: String(obj.counterpart ?? ""),
      inputOutput: String(obj.inputOutput ?? ""),
      medium: String(obj.medium ?? ""),
      remark: String(obj.remark ?? ""),
    };
  });
}

const TYPE_LABELS: Record<string, string> = {
  upstream: "Upstream",
  downstream: "Downstream",
  system: "System",
  organizational: "Organisatorisch",
};

const TYPE_COLORS: Record<string, string> = {
  upstream: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  downstream: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  system: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  organizational: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

const COLUMNS: { key: keyof Omit<InterfaceEntry, "type">; label: string; width: string }[] = [
  { key: "counterpart", label: "Gegenstelle", width: "min-w-[140px]" },
  { key: "inputOutput", label: "Input/Output", width: "min-w-[140px]" },
  { key: "medium", label: "Medium/System", width: "min-w-[120px]" },
  { key: "remark", label: "Bemerkung", width: "min-w-[140px]" },
];

export function InterfacesSystemsTable({ data, onSave, readOnly }: InterfacesSystemsTableProps) {
  const parsed = normalize(data);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<InterfaceEntry[]>(parsed ?? []);

  const startEdit = useCallback(() => {
    setDraft(parsed ? JSON.parse(JSON.stringify(parsed)) : [emptyEntry()]);
    setEditing(true);
  }, [parsed]);

  const handleSave = () => {
    onSave?.(draft.filter((e) => e.counterpart.trim() || e.inputOutput.trim()));
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(parsed ?? []);
    setEditing(false);
  };

  const addRow = () => setDraft((prev) => [...prev, emptyEntry()]);

  const removeRow = (index: number) => setDraft((prev) => prev.filter((_, i) => i !== index));

  const updateField = (index: number, field: keyof InterfaceEntry, value: string) => {
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
            <Network className="h-4 w-4 text-indigo-600" />
            Schnittstellen & Systeme
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
            <p className="text-sm text-muted-foreground mb-2">Keine Schnittstellen definiert</p>
            {onSave && !readOnly && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Plus className="h-3 w-3 mr-1" />
                Schnittstelle hinzufügen
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[110px]">Typ</TableHead>
                    {COLUMNS.map((col) => (
                      <TableHead key={col.key} className={col.width}>{col.label}</TableHead>
                    ))}
                    {editing && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.map((entry, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {editing ? (
                          <Select
                            value={entry.type || "_empty"}
                            onValueChange={(v) => updateField(idx, "type", v === "_empty" ? "" : v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_empty">—</SelectItem>
                              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : entry.type ? (
                          <Badge className={`text-[10px] ${TYPE_COLORS[entry.type]}`}>
                            {TYPE_LABELS[entry.type] ?? entry.type}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
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
                Schnittstelle hinzufügen
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
