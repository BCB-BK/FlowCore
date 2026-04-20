import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { Textarea } from "@workspace/ui/textarea";
import { Label } from "@workspace/ui/label";
import {
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  GitBranch,
  ExternalLink,
  ImageIcon,
  Upload,
  Globe,
  Search,
  Loader2,
  FileText,
  Video,
  Link2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useSearchContent } from "@workspace/api-client-react";
import { MediaLibraryDialog } from "@/components/editor/MediaLibraryDialog";
import { DiagramLegend } from "./DiagramLegend";

export interface SwimlaneLane {
  role: string;
  steps: string[];
}

export interface SwimlaneData {
  title: string;
  description: string;
  lanes: SwimlaneLane[];
  mediaRef?: string;
  mediaRefName?: string;
  mediaRefType?: string;
  detailLink?: string;
  detailNodeId?: string;
  detailNodeTitle?: string;
  showLegend?: boolean;
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
    mediaRefName: typeof obj.mediaRefName === "string" ? obj.mediaRefName : undefined,
    mediaRefType: typeof obj.mediaRefType === "string" ? obj.mediaRefType : undefined,
    detailLink: typeof obj.detailLink === "string" ? obj.detailLink : undefined,
    detailNodeId: typeof obj.detailNodeId === "string" ? obj.detailNodeId : undefined,
    detailNodeTitle: typeof obj.detailNodeTitle === "string" ? obj.detailNodeTitle : undefined,
    showLegend: typeof obj.showLegend === "boolean" ? obj.showLegend : false,
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

interface MediaAsset {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  classification: string;
}

interface MediaRefPickerProps {
  value?: string;
  valueName?: string;
  valueType?: string;
  onChange: (url: string, name: string, mimeType: string) => void;
  onClear: () => void;
}

function MediaRefPicker({ value, valueName, valueType, onChange, onClear }: MediaRefPickerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<"upload" | "browse" | "sharepoint">("upload");

  const openDialog = (tab: "upload" | "sharepoint") => {
    setDefaultTab(tab);
    setDialogOpen(true);
  };

  const isImage = valueType?.startsWith("image/") || (value && /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(value));

  const handleSelect = (asset: MediaAsset) => {
    onChange(asset.url, asset.originalFilename, asset.mimeType);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Medienreferenz</Label>
      {value ? (
        <div className="flex items-start gap-2 p-2 rounded border bg-muted/30">
          {isImage ? (
            <img
              src={value}
              alt={valueName || "Medienreferenz"}
              className="h-12 w-16 object-cover rounded border shrink-0"
            />
          ) : (
            <div className="h-12 w-16 flex items-center justify-center bg-muted rounded border shrink-0">
              {valueType?.includes("video") ? (
                <Video className="h-5 w-5 text-muted-foreground" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{valueName || value}</p>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              Anzeigen
            </a>
          </div>
          <button
            onClick={onClear}
            className="shrink-0 text-muted-foreground hover:text-destructive"
            title="Entfernen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <button
            onClick={() => openDialog("upload")}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-accent hover:text-foreground hover:border-solid transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Hochladen
          </button>
          <button
            onClick={() => openDialog("sharepoint")}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-accent hover:text-foreground hover:border-solid transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            Von SharePoint
          </button>
        </div>
      )}
      {value && (
        <button
          onClick={() => setDialogOpen(true)}
          className="text-[10px] text-primary hover:underline"
        >
          Andere Datei w\u00E4hlen
        </button>
      )}
      <MediaLibraryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={handleSelect}
        defaultTab={defaultTab}
      />
    </div>
  );
}

interface NodePickerResult {
  id: string;
  title: string;
  displayCode?: string | null;
  templateType?: string;
}

interface NodeRefPickerProps {
  nodeId?: string;
  nodeTitle?: string;
  onChange: (nodeId: string, title: string, link: string) => void;
  onClear: () => void;
}

function NodeRefPicker({ nodeId, nodeTitle, onChange, onClear }: NodeRefPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: searchData, isLoading } = useSearchContent(
    { q: debouncedQuery || "", limit: 8 },
    {
      query: {
        enabled: debouncedQuery.length >= 2,
        queryKey: ["nodeRefPicker", debouncedQuery],
      },
    },
  );

  const results: NodePickerResult[] = (searchData?.results ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    displayCode: r.displayCode,
    templateType: r.templateType,
  }));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (nodeId && nodeTitle) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">Link zur Detailseite</Label>
        <div className="flex items-center gap-2 h-9 px-2 rounded-md border bg-muted/30">
          <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs flex-1 truncate">{nodeTitle}</span>
          <button
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <Label className="text-xs">Link zur Detailseite</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Seite suchen..."
          className="h-8 text-xs pl-8"
        />
        {isLoading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && debouncedQuery.length >= 2 && (
        <div className="absolute z-50 w-full max-w-xs rounded-md border bg-popover shadow-md overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">
              Keine Ergebnisse f\u00FCr \u201E{debouncedQuery}\u201C
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center gap-2"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(r.id, r.title, `/nodes/${r.id}`);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium truncate block">{r.title}</span>
                    {r.displayCode && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {r.displayCode}
                      </span>
                    )}
                  </div>
                  <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {debouncedQuery.length < 2 && query.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Mindestens 2 Zeichen eingeben
        </p>
      )}
    </div>
  );
}

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

  const detailLink = current?.detailNodeId
    ? `/nodes/${current.detailNodeId}`
    : current?.detailLink;
  const detailLabel = current?.detailNodeTitle || "Zur Detailseite";
  const isInternalLink = !!current?.detailNodeId;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-purple-600" />
            Swimlane-Diagramm
          </CardTitle>
          <div className="flex items-center gap-1">
            {onSave && !readOnly && !editing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={startEdit}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Bearbeiten
              </Button>
            )}
            {editing && (
              <>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleCancel}>
                  <X className="h-3 w-3 mr-1" />
                  Abbrechen
                </Button>
                <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSave}>
                  <Check className="h-3 w-3 mr-1" />
                  Speichern
                </Button>
              </>
            )}
          </div>
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
              <div className="space-y-3 pb-3 border-b">
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
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="text-xs min-h-[40px]"
                    placeholder="Kurzbeschreibung..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <MediaRefPicker
                    value={draft.mediaRef}
                    valueName={draft.mediaRefName}
                    valueType={draft.mediaRefType}
                    onChange={(url, name, mimeType) =>
                      setDraft((prev) => ({
                        ...prev,
                        mediaRef: url,
                        mediaRefName: name,
                        mediaRefType: mimeType,
                      }))
                    }
                    onClear={() =>
                      setDraft((prev) => ({
                        ...prev,
                        mediaRef: undefined,
                        mediaRefName: undefined,
                        mediaRefType: undefined,
                      }))
                    }
                  />

                  <div className="relative">
                    <NodeRefPicker
                      nodeId={draft.detailNodeId}
                      nodeTitle={draft.detailNodeTitle}
                      onChange={(nodeId, title, link) =>
                        setDraft((prev) => ({
                          ...prev,
                          detailNodeId: nodeId,
                          detailNodeTitle: title,
                          detailLink: link,
                        }))
                      }
                      onClear={() =>
                        setDraft((prev) => ({
                          ...prev,
                          detailNodeId: undefined,
                          detailNodeTitle: undefined,
                          detailLink: undefined,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, showLegend: !prev.showLegend }))
                    }
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {draft.showLegend ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                    Legende f\u00FCr Leser {draft.showLegend ? "sichtbar" : "ausblenden"}
                  </button>
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
              <div className="rounded border overflow-hidden">
                {current.mediaRefType?.startsWith("image/") ||
                /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(current.mediaRef) ? (
                  <a href={current.mediaRef} target="_blank" rel="noopener noreferrer">
                    <img
                      src={current.mediaRef}
                      alt={current.mediaRefName || "Diagramm"}
                      className="max-h-48 w-full object-contain bg-muted"
                    />
                  </a>
                ) : (
                  <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                    <ImageIcon className="h-4 w-4 shrink-0" />
                    <a
                      href={current.mediaRef}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground truncate"
                    >
                      {current.mediaRefName || "Diagramm anzeigen"}
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {current.lanes.map((lane, laneIdx) => (
                <div
                  key={laneIdx}
                  className={`rounded border p-3 ${LANE_COLORS[laneIdx % LANE_COLORS.length]}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    {editing ? (
                      <div className="flex items-center gap-1 flex-1 mr-2">
                        <Input
                          value={lane.role}
                          onChange={(e) => updateLaneRole(laneIdx, e.target.value)}
                          className="h-7 text-xs font-medium bg-white dark:bg-gray-900 max-w-[200px]"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLane(laneIdx)}
                        >
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
                            <button
                              onClick={() => removeStep(laneIdx, stepIdx)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="rounded bg-white dark:bg-gray-900 border px-2 py-1 text-xs shadow-sm">
                              {step || "\u2014"}
                            </div>
                            {stepIdx < lane.steps.length - 1 && (
                              <span className="text-muted-foreground text-xs">\u2192</span>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    {editing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px]"
                        onClick={() => addStep(laneIdx)}
                      >
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
                Lane hinzuf\u00FCgen
              </Button>
            )}

            {!editing && detailLink && (
              isInternalLink ? (
                <Link
                  href={detailLink}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Link2 className="h-3 w-3" />
                  {detailLabel}
                </Link>
              ) : (
                <a
                  href={detailLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {detailLabel}
                </a>
              )
            )}

            {!editing && current.showLegend && <DiagramLegend />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
