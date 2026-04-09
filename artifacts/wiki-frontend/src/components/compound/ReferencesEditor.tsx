import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/select";
import {
  FileStack,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  GripVertical,
  ExternalLink,
  Globe,
  FolderOpen,
} from "lucide-react";
import { FieldHelpTooltip } from "@/components/metadata/FieldHelpTooltip";

type ReferenceType = "url" | "sharepoint";

interface Reference {
  type: ReferenceType;
  title: string;
  url: string;
}

interface ReferencesEditorProps {
  value: string;
  onSave?: (key: string, value: string) => void;
  sectionKey: string;
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

function parseReferences(raw: string): Reference[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  if (raw.trim().startsWith("http")) {
    return [{ type: "url", title: "", url: raw.trim() }];
  }
  return [];
}

const TYPE_LABELS: Record<ReferenceType, string> = {
  url: "URL / Weblink",
  sharepoint: "SharePoint-Dokument",
};

const TYPE_ICONS: Record<ReferenceType, typeof Globe> = {
  url: Globe,
  sharepoint: FolderOpen,
};

export function ReferencesEditor({
  value,
  onSave,
  sectionKey,
  help,
  helpText,
  guidingQuestions,
}: ReferencesEditorProps) {
  const [editing, setEditing] = useState(false);
  const [refs, setRefs] = useState<Reference[]>(() => parseReferences(value));

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

  const updateRef = (
    index: number,
    field: keyof Reference,
    val: string,
  ) => {
    setRefs(
      refs.map((r, i) => (i === index ? { ...r, [field]: val } : r)),
    );
  };

  const displayRefs = parseReferences(value);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileStack className="h-4 w-4 text-blue-600" />
              Referenzen & mitgeltende Dokumente
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
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleCancel}
              >
                <X className="h-3 w-3 mr-1" />
                Abbrechen
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleSave}
              >
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
              const TypeIcon = TYPE_ICONS[ref.type];
              return (
                <div
                  key={i}
                  className="border rounded-lg p-3 space-y-2 bg-muted/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <GripVertical className="h-3 w-3" />
                      <TypeIcon className="h-3 w-3" />
                      <span>Referenz {i + 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Select
                        value={ref.type}
                        onValueChange={(v) =>
                          updateRef(i, "type", v)
                        }
                      >
                        <SelectTrigger className="h-6 text-[11px] w-auto min-w-[140px] px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="url">
                            URL / Weblink
                          </SelectItem>
                          <SelectItem value="sharepoint">
                            SharePoint-Dokument
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-destructive"
                        onClick={() => removeRef(i)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    value={ref.title}
                    onChange={(e) => updateRef(i, "title", e.target.value)}
                    placeholder="Bezeichnung / Beschreibung"
                    className="text-sm"
                  />
                  <Input
                    value={ref.url}
                    onChange={(e) => updateRef(i, "url", e.target.value)}
                    placeholder={
                      ref.type === "sharepoint"
                        ? "https://ihr-tenant.sharepoint.com/sites/..."
                        : "https://..."
                    }
                    className="text-sm font-mono text-xs"
                    type="url"
                  />
                </div>
              );
            })}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => addRef("url")}
              >
                <Globe className="h-3.5 w-3.5 mr-1.5" />
                URL hinzuf{"ü"}gen
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => addRef("sharepoint")}
              >
                <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                SharePoint-Dokument
              </Button>
            </div>
          </div>
        ) : displayRefs.length > 0 ? (
          <div className="space-y-2">
            {displayRefs.map((ref, i) => {
              const TypeIcon = TYPE_ICONS[ref.type] ?? Globe;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 shrink-0">
                    <TypeIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {ref.title || ref.url || "\u2014"}
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
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4 px-1 shrink-0"
                  >
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
  );
}
