import { useRef, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import {
  FileStack,
  Trash2,
  Pencil,
  Check,
  X,
  GripVertical,
  ExternalLink,
  Globe,
  FolderOpen,
  Upload,
  Loader2,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { FieldHelpTooltip } from "@/components/metadata/FieldHelpTooltip";
import { SharePointFilePicker } from "./SharePointFilePicker";
import { WikiNodePickerDialog } from "./WikiNodePickerDialog";
import { useToast } from "@/hooks/use-toast";

type ReferenceType = "url" | "sharepoint" | "upload" | "node";

const VALID_TYPES = new Set<ReferenceType>(["url", "sharepoint", "upload", "node"]);

interface Reference {
  type: ReferenceType;
  title: string;
  url: string;
  nodeId?: string;
  templateType?: string;
}

interface ReferencesEditorProps {
  value: string;
  onSave?: (key: string, value: string) => void;
  sectionKey: string;
  nodeId?: string;
  help?: {
    fillHelp?: string;
    example?: string;
    badExample?: string;
    placeholder?: string;
    expectedFormat?: string;
  };
  helpText?: string;
  guidingQuestions?: string[];
}

function normalizeRef(item: unknown): Reference {
  if (typeof item !== "object" || item === null) {
    return { type: "url", title: "", url: String(item ?? "") };
  }
  const r = item as Record<string, unknown>;
  const rawType = r.type as string;
  const type: ReferenceType = VALID_TYPES.has(rawType as ReferenceType)
    ? (rawType as ReferenceType)
    : "url";
  return {
    type,
    title: typeof r.title === "string" ? r.title : "",
    url: typeof r.url === "string" ? r.url : "",
    nodeId: typeof r.nodeId === "string" ? r.nodeId : undefined,
    templateType: typeof r.templateType === "string" ? r.templateType : undefined,
  };
}

function parseReferences(raw: string): Reference[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(normalizeRef);
  } catch {}
  if (raw.trim().startsWith("http")) {
    return [{ type: "url", title: "", url: raw.trim() }];
  }
  return [];
}

const TYPE_LABELS: Record<ReferenceType, string> = {
  url: "URL / Weblink",
  sharepoint: "SharePoint",
  upload: "Hochgeladen",
  node: "Wiki-Seite",
};

const TYPE_ICONS: Record<ReferenceType, typeof Globe> = {
  url: Globe,
  sharepoint: FolderOpen,
  upload: Upload,
  node: BookOpen,
};

const TYPE_COLORS: Record<ReferenceType, string> = {
  url: "text-blue-600 bg-blue-50",
  sharepoint: "text-emerald-600 bg-emerald-50",
  upload: "text-violet-600 bg-violet-50",
  node: "text-amber-600 bg-amber-50",
};

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function ReferencesEditor({
  value,
  onSave,
  sectionKey,
  nodeId,
  help,
  helpText,
  guidingQuestions,
}: ReferencesEditorProps) {
  const [editing, setEditing] = useState(false);
  const [refs, setRefs] = useState<Reference[]>(() => parseReferences(value));
  const [showSharePointPicker, setShowSharePointPicker] = useState(false);
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const apiBase = import.meta.env.BASE_URL + "api";

  const handleSave = () => {
    const filtered = refs.filter((r) => r.title.trim() || r.url.trim());
    onSave?.(sectionKey, JSON.stringify(filtered));
    setEditing(false);
  };

  const handleCancel = () => {
    setRefs(parseReferences(value));
    setEditing(false);
  };

  const addRef = (type: ReferenceType = "url") => {
    setRefs([...refs, { type, title: "", url: "" }]);
  };

  const removeRef = (index: number) => {
    setRefs(refs.filter((_, i) => i !== index));
  };

  const updateRef = (index: number, field: keyof Reference, val: string) => {
    setRefs(refs.map((r, i) => (i === index ? { ...r, [field]: val } : r)));
  };

  const handleSharePointSelect = (files: Array<{ name: string; webUrl: string }>) => {
    const newRefs: Reference[] = files.map((f) => ({
      type: "sharepoint",
      title: f.name,
      url: f.webUrl,
    }));
    setRefs((prev) => [...prev, ...newRefs]);
  };

  const handleNodeSelect = (pickedNodeId: string, title: string, url: string, templateType?: string) => {
    const newRef: Reference = {
      type: "node",
      title,
      url,
      nodeId: pickedNodeId,
      templateType,
    };
    setRefs((prev) => [...prev, newRef]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (nodeId) formData.append("nodeId", nodeId);

      const res = await fetch(`${apiBase}/media/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload fehlgeschlagen" }));
        throw new Error(err.error || "Upload fehlgeschlagen");
      }

      const asset = await res.json();
      setRefs((prev) => [
        ...prev,
        { type: "upload", title: file.name, url: asset.url },
      ]);
      toast({ title: "Datei hochgeladen", description: file.name });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Upload fehlgeschlagen",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    } finally {
      setUploading(false);
    }
  };

  const displayRefs = parseReferences(value);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileStack className="h-4 w-4 text-blue-600" />
                Referenzen &amp; mitgeltende Dokumente
              </CardTitle>
              {displayRefs.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  {displayRefs.length}
                </Badge>
              )}
              <FieldHelpTooltip
                fillHelp={help?.fillHelp}
                example={help?.example}
                badExample={help?.badExample}
                helpText={helpText}
                guidingQuestions={guidingQuestions}
              />
            </div>
            {onSave && !editing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setRefs(parseReferences(value));
                  setEditing(true);
                }}
              >
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
          {editing ? (
            <div className="space-y-3">
              {refs.map((ref, i) => {
                const TypeIcon = TYPE_ICONS[ref.type] ?? Globe;
                const colorClass = TYPE_COLORS[ref.type] ?? "text-blue-600 bg-blue-50";
                const isReadOnlyUrl = ref.type === "sharepoint" || ref.type === "upload" || ref.type === "node";
                return (
                  <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <GripVertical className="h-3 w-3" />
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {TYPE_LABELS[ref.type]}
                        </span>
                        {ref.type === "node" && ref.templateType && (
                          <span className="text-[10px] text-muted-foreground">{ref.templateType}</span>
                        )}
                        <span>Referenz {i + 1}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-destructive"
                        onClick={() => removeRef(i)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input
                      value={ref.title}
                      onChange={(e) => updateRef(i, "title", e.target.value)}
                      placeholder="Bezeichnung / Beschreibung"
                      className="text-sm"
                    />
                    {isReadOnlyUrl ? (
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/40 border text-xs text-muted-foreground">
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate font-mono">{ref.url || "—"}</span>
                      </div>
                    ) : (
                      <Input
                        value={ref.url}
                        onChange={(e) => updateRef(i, "url", e.target.value)}
                        placeholder="https://..."
                        className="text-sm font-mono text-xs"
                        type="url"
                      />
                    )}
                  </div>
                );
              })}

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-[140px]"
                  onClick={() => addRef("url")}
                >
                  <Globe className="h-3.5 w-3.5 mr-1.5" />
                  URL hinzufügen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-[140px] text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  onClick={() => setShowSharePointPicker(true)}
                >
                  <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                  SharePoint auswählen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-[140px] text-violet-700 border-violet-200 hover:bg-violet-50"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Datei hochladen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-[140px] text-amber-700 border-amber-200 hover:bg-amber-50"
                  onClick={() => setShowNodePicker(true)}
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  Wiki-Seite
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          ) : displayRefs.length > 0 ? (
            <div className="space-y-2">
              {displayRefs.map((ref, i) => {
                const TypeIcon = TYPE_ICONS[ref.type] ?? Globe;
                const colorClass = TYPE_COLORS[ref.type] ?? "text-blue-600 bg-blue-50";

                if (ref.type === "node" && ref.url) {
                  return (
                    <Link
                      key={i}
                      href={ref.url}
                      className="flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-muted/40 transition-colors group cursor-pointer"
                    >
                      <div className={`flex h-7 w-7 items-center justify-center rounded-md shrink-0 ${colorClass}`}>
                        <TypeIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {ref.title || ref.url || "—"}
                        </p>
                        {ref.templateType && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{ref.templateType}</p>
                        )}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0 text-amber-700 border-amber-200">
                        Wiki-Seite
                      </Badge>
                    </Link>
                  );
                }

                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-muted/40 transition-colors group"
                  >
                    <div className={`flex h-7 w-7 items-center justify-center rounded-md shrink-0 ${colorClass}`}>
                      <TypeIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {ref.title || ref.url || "—"}
                      </p>
                      {ref.url && ref.title && (
                        <p className="text-xs text-muted-foreground truncate font-mono">
                          {ref.url}
                        </p>
                      )}
                    </div>
                    {ref.url && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">
                      {TYPE_LABELS[ref.type] ?? "Link"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Keine Referenzen oder mitgeltende Dokumente vorhanden
            </p>
          )}
        </CardContent>
      </Card>

      {showSharePointPicker && (
        <SharePointFilePicker
          onSelect={handleSharePointSelect}
          onClose={() => setShowSharePointPicker(false)}
        />
      )}

      {showNodePicker && (
        <WikiNodePickerDialog
          onSelect={handleNodeSelect}
          onClose={() => setShowNodePicker(false)}
        />
      )}
    </>
  );
}
