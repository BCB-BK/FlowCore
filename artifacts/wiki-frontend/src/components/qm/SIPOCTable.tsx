import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pencil, Check, X, Plus, Trash2, ArrowRightLeft } from "lucide-react";

export interface SIPOCData {
  trigger: string;
  suppliers: SIPOCItem[];
  inputs: SIPOCItem[];
  process: string;
  outputs: SIPOCItem[];
  customers: SIPOCItem[];
}

export interface SIPOCItem {
  name: string;
  description?: string;
}

interface SIPOCTableProps {
  data: unknown;
  onSave?: (data: SIPOCData) => void;
  readOnly?: boolean;
}

function emptySIPOC(): SIPOCData {
  return {
    trigger: "",
    suppliers: [],
    inputs: [],
    process: "",
    outputs: [],
    customers: [],
  };
}

function normalize(raw: unknown): SIPOCData | null {
  if (!raw || typeof raw !== "object") {
    if (typeof raw === "string" && raw.trim()) {
      const result = emptySIPOC();
      result.process = raw;
      return result;
    }
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const result = emptySIPOC();
  result.trigger = typeof obj.trigger === "string" ? obj.trigger : "";
  result.process = typeof obj.process === "string" ? obj.process : "";
  const toItems = (val: unknown): SIPOCItem[] => {
    if (Array.isArray(val)) return val.map((v) => (typeof v === "object" && v !== null ? { name: String((v as Record<string, unknown>).name ?? ""), description: String((v as Record<string, unknown>).description ?? "") } : { name: String(v) }));
    if (typeof val === "string" && val.trim()) return [{ name: val }];
    return [];
  };
  result.suppliers = toItems(obj.suppliers);
  result.inputs = toItems(obj.inputs);
  result.outputs = toItems(obj.outputs);
  result.customers = toItems(obj.customers);
  return result;
}

const COLUMN_CONFIG = [
  { key: "suppliers" as const, label: "Lieferanten", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", helpText: "Wer liefert die Eingaben?" },
  { key: "inputs" as const, label: "Eingaben", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", helpText: "Was wird benötigt?" },
  { key: "outputs" as const, label: "Ergebnisse", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", helpText: "Was wird produziert?" },
  { key: "customers" as const, label: "Kunden", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", helpText: "Wer erhält die Ergebnisse?" },
] as const;

export function SIPOCTable({ data, onSave, readOnly }: SIPOCTableProps) {
  const parsed = normalize(data);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SIPOCData>(parsed ?? emptySIPOC());

  const startEdit = useCallback(() => {
    setDraft(parsed ? JSON.parse(JSON.stringify(parsed)) : emptySIPOC());
    setEditing(true);
  }, [parsed]);

  const handleSave = () => {
    onSave?.(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(parsed ?? emptySIPOC());
    setEditing(false);
  };

  const addItem = (column: keyof Pick<SIPOCData, "suppliers" | "inputs" | "outputs" | "customers">) => {
    setDraft((prev) => ({
      ...prev,
      [column]: [...prev[column], { name: "", description: "" }],
    }));
  };

  const removeItem = (column: keyof Pick<SIPOCData, "suppliers" | "inputs" | "outputs" | "customers">, index: number) => {
    setDraft((prev) => ({
      ...prev,
      [column]: prev[column].filter((_, i) => i !== index),
    }));
  };

  const updateItem = (column: keyof Pick<SIPOCData, "suppliers" | "inputs" | "outputs" | "customers">, index: number, field: keyof SIPOCItem, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [column]: prev[column].map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const current = editing ? draft : parsed;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
            SIPOC-Analyse
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
        {!current ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">Keine SIPOC-Daten definiert</p>
            {onSave && !readOnly && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Plus className="h-3 w-3 mr-1" />
                SIPOC anlegen
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Trigger / Auslöser</Label>
              {editing ? (
                <Input
                  value={draft.trigger}
                  onChange={(e) => setDraft((prev) => ({ ...prev, trigger: e.target.value }))}
                  placeholder="Was löst den Prozess aus?"
                  className="h-8 text-xs"
                />
              ) : (
                <p className="text-sm">{current.trigger || <span className="text-muted-foreground italic">Nicht definiert</span>}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Prozess (Kurzbeschreibung)</Label>
              {editing ? (
                <Textarea
                  value={draft.process}
                  onChange={(e) => setDraft((prev) => ({ ...prev, process: e.target.value }))}
                  placeholder="Kurzbeschreibung des Prozesses..."
                  className="text-xs min-h-[60px]"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{current.process || <span className="text-muted-foreground italic">Nicht definiert</span>}</p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {COLUMN_CONFIG.map((col) => (
                <div key={col.key} className="space-y-2">
                  <Badge variant="outline" className={`text-[10px] w-full justify-center ${col.color}`}>
                    {col.label}
                  </Badge>
                  {editing && (
                    <p className="text-[10px] text-muted-foreground text-center">{col.helpText}</p>
                  )}
                  <div className="space-y-1.5 min-h-[60px]">
                    {current[col.key].map((item, idx) => (
                      <div key={idx} className="rounded border p-1.5 text-xs">
                        {editing ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Input
                                value={item.name}
                                onChange={(e) => updateItem(col.key, idx, "name", e.target.value)}
                                className="h-6 text-xs flex-1"
                                placeholder="Name..."
                              />
                              <button onClick={() => removeItem(col.key, idx)} className="text-muted-foreground hover:text-destructive shrink-0">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span>{item.name || "—"}</span>
                        )}
                      </div>
                    ))}
                    {current[col.key].length === 0 && !editing && (
                      <p className="text-[10px] text-muted-foreground text-center py-2">—</p>
                    )}
                  </div>
                  {editing && (
                    <Button variant="ghost" size="sm" className="h-6 w-full text-[10px]" onClick={() => addItem(col.key)}>
                      <Plus className="h-2.5 w-2.5 mr-0.5" />
                      Hinzufügen
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
