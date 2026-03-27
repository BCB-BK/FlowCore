import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil, Check, X, Plus, Trash2, GitBranch, ExternalLink, ImageIcon } from "lucide-react";

export interface SwimlaneLane {
  role: string;
  steps: string[];
}

export interface SwimlaneData {
  title: string;
  description: string;
  lanes: SwimlaneLane[];
  mediaRef?: string;
  detailLink?: string;
}

interface SwimlaneDiagramProps {
  data: unknown;
  onSave?: (data: SwimlaneData) => void;
  readOnly?: boolean;
}

function emptyData(): SwimlaneData {
  return {
    title: "",
    description: "",
    lanes: [{ role: "Rolle 1", steps: ["Schritt 1"] }],
  };
}

function normalize(raw: unknown): SwimlaneData | null {
  if (!raw || typeof raw !== "object") {
    if (typeof raw === "string" && raw.trim()) {
      return { title: "", description: raw, lanes: [] };
    }
    return null;
  }
  const obj = raw as Record<string, unknown>;
  return {
    title: String(obj.title ?? ""),
    description: String(obj.description ?? ""),
    lanes: Array.isArray(obj.lanes)
      ? obj.lanes.map((l: unknown) => {
          if (!l || typeof l !== "object") return { role: String(l ?? ""), steps: [] };
          const lane = l as Record<string, unknown>;
          return {
            role: String(lane.role ?? ""),
            steps: Array.isArray(lane.steps) ? lane.steps.map((s: unknown) => String(s ?? "")) : [],
          };
        })
      : [],
    mediaRef: typeof obj.mediaRef === "string" ? obj.mediaRef : undefined,
    detailLink: typeof obj.detailLink === "string" ? obj.detailLink : undefined,
  };
}

const LANE_COLORS = [
  "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
  "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
  "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
  "bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800",
  "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
  "bg-cyan-50 border-cyan-200 dark:bg-cyan-950 dark:border-cyan-800",
];

export function SwimlaneDiagram({ data, onSave, readOnly }: SwimlaneDiagramProps) {
  const parsed = normalize(data);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SwimlaneData>(parsed ?? emptyData());

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

  const addLane = () => {
    setDraft((prev) => ({
      ...prev,
      lanes: [...prev.lanes, { role: `Rolle ${prev.lanes.length + 1}`, steps: [] }],
    }));
  };

  const removeLane = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      lanes: prev.lanes.filter((_, i) => i !== index),
    }));
  };

  const updateLaneRole = (index: number, role: string) => {
    setDraft((prev) => ({
      ...prev,
      lanes: prev.lanes.map((l, i) => (i === index ? { ...l, role } : l)),
    }));
  };

  const addStep = (laneIndex: number) => {
    setDraft((prev) => ({
      ...prev,
      lanes: prev.lanes.map((l, i) =>
        i === laneIndex ? { ...l, steps: [...l.steps, ""] } : l
      ),
    }));
  };

  const removeStep = (laneIndex: number, stepIndex: number) => {
    setDraft((prev) => ({
      ...prev,
      lanes: prev.lanes.map((l, i) =>
        i === laneIndex ? { ...l, steps: l.steps.filter((_, si) => si !== stepIndex) } : l
      ),
    }));
  };

  const updateStep = (laneIndex: number, stepIndex: number, value: string) => {
    setDraft((prev) => ({
      ...prev,
      lanes: prev.lanes.map((l, i) =>
        i === laneIndex
          ? { ...l, steps: l.steps.map((s, si) => (si === stepIndex ? value : s)) }
          : l
      ),
    }));
  };

  const current = editing ? draft : parsed;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-purple-600" />
            Swimlane-Diagramm
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
        {!current || current.lanes.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">Kein Swimlane-Diagramm definiert</p>
            {onSave && !readOnly && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Plus className="h-3 w-3 mr-1" />
                Diagramm anlegen
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {editing && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Titel</Label>
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                    className="h-8 text-xs"
                    placeholder="Diagrammtitel..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Beschreibung</Label>
                  <Textarea
                    value={draft.description}
                    onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                    className="text-xs min-h-[40px]"
                    placeholder="Kurzbeschreibung..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Medienreferenz (URL)</Label>
                    <Input
                      value={draft.mediaRef ?? ""}
                      onChange={(e) => setDraft((prev) => ({ ...prev, mediaRef: e.target.value }))}
                      className="h-8 text-xs"
                      placeholder="Bild-/Datei-URL..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Link zur Detailseite</Label>
                    <Input
                      value={draft.detailLink ?? ""}
                      onChange={(e) => setDraft((prev) => ({ ...prev, detailLink: e.target.value }))}
                      className="h-8 text-xs"
                      placeholder="/node/..."
                    />
                  </div>
                </div>
              </div>
            )}

            {!editing && current.title && (
              <h4 className="text-sm font-medium">{current.title}</h4>
            )}
            {!editing && current.description && (
              <p className="text-xs text-muted-foreground">{current.description}</p>
            )}

            {current.mediaRef && !editing && (
              <div className="rounded border p-3 flex items-center gap-2 text-xs text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                <a href={current.mediaRef} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  Diagramm anzeigen
                </a>
              </div>
            )}

            <div className="space-y-2">
              {current.lanes.map((lane, laneIdx) => (
                <div key={laneIdx} className={`rounded border p-3 ${LANE_COLORS[laneIdx % LANE_COLORS.length]}`}>
                  <div className="flex items-center justify-between mb-2">
                    {editing ? (
                      <div className="flex items-center gap-1 flex-1 mr-2">
                        <Input
                          value={lane.role}
                          onChange={(e) => updateLaneRole(laneIdx, e.target.value)}
                          className="h-7 text-xs font-medium bg-white dark:bg-gray-900 max-w-[200px]"
                        />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeLane(laneIdx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold">{lane.role}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lane.steps.map((step, stepIdx) => (
                      <div key={stepIdx} className="flex items-center gap-1">
                        {editing ? (
                          <div className="flex items-center gap-0.5">
                            <Input
                              value={step}
                              onChange={(e) => updateStep(laneIdx, stepIdx, e.target.value)}
                              className="h-7 text-xs bg-white dark:bg-gray-900 w-32"
                            />
                            <button onClick={() => removeStep(laneIdx, stepIdx)} className="text-muted-foreground hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="rounded bg-white dark:bg-gray-900 border px-2 py-1 text-xs shadow-sm">
                              {step || "—"}
                            </div>
                            {stepIdx < lane.steps.length - 1 && (
                              <span className="text-muted-foreground text-xs">→</span>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    {editing && (
                      <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => addStep(laneIdx)}>
                        <Plus className="h-2.5 w-2.5 mr-0.5" />
                        Schritt
                      </Button>
                    )}
                    {!editing && lane.steps.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">Keine Schritte</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {editing && (
              <Button variant="outline" size="sm" className="text-xs" onClick={addLane}>
                <Plus className="h-3 w-3 mr-1" />
                Lane hinzufügen
              </Button>
            )}

            {!editing && current.detailLink && (
              <a href={current.detailLink} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3" />
                Zur Detailseite
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
