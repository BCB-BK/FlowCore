import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, Check, X, Map, ExternalLink, GripVertical } from "lucide-react";

export interface ProcessStepEntry {
  order: number;
  title: string;
  processId: string;
  pageType: string;
  summary: string;
  role: string;
  organ: string;
  body: string;
  link: string;
}

interface ProcessStepsTableProps {
  data: unknown;
  onSave?: (data: ProcessStepEntry[]) => void;
  readOnly?: boolean;
}

function emptyEntry(order: number): ProcessStepEntry {
  return { order, title: "", processId: "", pageType: "", summary: "", role: "", organ: "", body: "", link: "" };
}

function normalize(raw: unknown): ProcessStepEntry[] | null {
  if (!raw) return null;
  if (typeof raw === "string" && raw.trim()) {
    return [{ ...emptyEntry(1), title: raw }];
  }
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return null;
  return raw.map((item: unknown, i: number) => {
    if (typeof item !== "object" || item === null) return { ...emptyEntry(i + 1), title: String(item ?? "") };
    const obj = item as Record<string, unknown>;
    return {
      order: typeof obj.order === "number" ? obj.order : i + 1,
      title: String(obj.title ?? ""),
      processId: String(obj.processId ?? ""),
      pageType: String(obj.pageType ?? ""),
      summary: String(obj.summary ?? ""),
      role: String(obj.role ?? ""),
      organ: String(obj.organ ?? ""),
      body: String(obj.body ?? ""),
      link: String(obj.link ?? ""),
    };
  });
}

const PAGE_TYPE_OPTIONS: Record<string, string> = {
  core_process_overview: "Kernprozess",
  process_page_text: "Prozessseite (Text)",
  process_page_graphic: "Prozessseite (Grafik)",
  procedure_instruction: "Verfahrensanweisung",
  work_instruction: "Arbeitsanweisung",
  policy: "Richtlinie",
  checklist: "Checkliste",
  role_profile: "Rollenprofil",
};

export function ProcessStepsTable({ data, onSave, readOnly }: ProcessStepsTableProps) {
  const parsed = normalize(data);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProcessStepEntry[]>(parsed ?? []);

  const startEdit = useCallback(() => {
    setDraft(parsed ? JSON.parse(JSON.stringify(parsed)) : [emptyEntry(1)]);
    setEditing(true);
  }, [parsed]);

  const handleSave = () => {
    const cleaned = draft
      .filter((e) => e.title.trim())
      .map((e, i) => ({ ...e, order: i + 1 }));
    onSave?.(cleaned);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(parsed ?? []);
    setEditing(false);
  };

  const addRow = () => setDraft((prev) => [...prev, emptyEntry(prev.length + 1)]);

  const removeRow = (index: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== index).map((e, i) => ({ ...e, order: i + 1 })));
  };

  const updateField = (index: number, field: keyof ProcessStepEntry, value: string | number) => {
    setDraft((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    );
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= draft.length) return;
    setDraft((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next.map((e, i) => ({ ...e, order: i + 1 }));
    });
  };

  const current = editing ? draft : parsed;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Map className="h-4 w-4 text-teal-600" />
            Prozesslandkarte / Prozessschritte
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
            <p className="text-sm text-muted-foreground mb-2">Keine Prozessschritte definiert</p>
            {onSave && !readOnly && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Plus className="h-3 w-3 mr-1" />
                Schritt hinzufügen
              </Button>
            )}
          </div>
        ) : editing ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="min-w-[120px]">Titel</TableHead>
                    <TableHead className="min-w-[90px]">Prozess-ID</TableHead>
                    <TableHead className="min-w-[120px]">Seitentyp</TableHead>
                    <TableHead className="min-w-[140px]">Kurzinhalt</TableHead>
                    <TableHead className="min-w-[100px]">Rolle/Stelle</TableHead>
                    <TableHead className="min-w-[100px]">Organ/Gremium</TableHead>
                    <TableHead className="min-w-[100px]">Link</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.map((entry, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            onClick={() => moveRow(idx, -1)}
                            disabled={idx === 0}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <GripVertical className="h-3 w-3 rotate-180" />
                          </button>
                          <span className="text-xs font-mono">{entry.order}</span>
                          <button
                            onClick={() => moveRow(idx, 1)}
                            disabled={idx === draft.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <GripVertical className="h-3 w-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input value={entry.title} onChange={(e) => updateField(idx, "title", e.target.value)} className="h-7 text-xs" placeholder="Titel" />
                      </TableCell>
                      <TableCell>
                        <Input value={entry.processId} onChange={(e) => updateField(idx, "processId", e.target.value)} className="h-7 text-xs" placeholder="ID" />
                      </TableCell>
                      <TableCell>
                        <Select value={entry.pageType || "_empty"} onValueChange={(v) => updateField(idx, "pageType", v === "_empty" ? "" : v)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_empty">—</SelectItem>
                            {Object.entries(PAGE_TYPE_OPTIONS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input value={entry.summary} onChange={(e) => updateField(idx, "summary", e.target.value)} className="h-7 text-xs" placeholder="Kurzinhalt" />
                      </TableCell>
                      <TableCell>
                        <Input value={entry.role} onChange={(e) => updateField(idx, "role", e.target.value)} className="h-7 text-xs" placeholder="Rolle" />
                      </TableCell>
                      <TableCell>
                        <Input value={entry.organ} onChange={(e) => updateField(idx, "organ", e.target.value)} className="h-7 text-xs" placeholder="Gremium" />
                      </TableCell>
                      <TableCell>
                        <Input value={entry.link} onChange={(e) => updateField(idx, "link", e.target.value)} className="h-7 text-xs" placeholder="/node/..." />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeRow(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={addRow}>
              <Plus className="h-3 w-3 mr-1" />
              Schritt hinzufügen
            </Button>
          </>
        ) : (
          <div className="space-y-2">
            {current.map((entry, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded border p-3 hover:bg-muted/30 transition-colors">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {entry.order}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{entry.title}</span>
                    {entry.processId && (
                      <Badge variant="outline" className="text-[10px]">{entry.processId}</Badge>
                    )}
                    {entry.pageType && (
                      <Badge variant="secondary" className="text-[10px]">
                        {PAGE_TYPE_OPTIONS[entry.pageType] ?? entry.pageType}
                      </Badge>
                    )}
                  </div>
                  {entry.summary && (
                    <p className="text-xs text-muted-foreground mt-0.5">{entry.summary}</p>
                  )}
                  {entry.role && (
                    <p className="text-xs text-muted-foreground mt-0.5">Rolle: {entry.role}</p>
                  )}
                  {entry.organ && (
                    <p className="text-xs text-muted-foreground mt-0.5">Organ/Gremium: {entry.organ}</p>
                  )}
                </div>
                {entry.link && (
                  <a href={entry.link} className="text-primary hover:underline shrink-0">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
