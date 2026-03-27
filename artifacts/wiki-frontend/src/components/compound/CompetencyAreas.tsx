import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { FieldHelpTooltip } from "@/components/metadata/FieldHelpTooltip";

interface CompetencyArea {
  area: string;
  tasks: string;
}

interface CompetencyAreasProps {
  value: string;
  onSave?: (key: string, value: string) => void;
  sectionKey: string;
  help?: { fillHelp?: string; example?: string; badExample?: string; placeholder?: string; expectedFormat?: string };
  helpText?: string;
  guidingQuestions?: string[];
}

function parseAreas(raw: string): CompetencyArea[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [{ area: "", tasks: raw }];
}

export function CompetencyAreas({ value, onSave, sectionKey, help, helpText, guidingQuestions }: CompetencyAreasProps) {
  const [editing, setEditing] = useState(false);
  const [areas, setAreas] = useState<CompetencyArea[]>(() => parseAreas(value));

  const handleSave = () => {
    const filtered = areas.filter(a => a.area.trim() || a.tasks.trim());
    onSave?.(sectionKey, JSON.stringify(filtered));
    setEditing(false);
  };

  const handleCancel = () => {
    setAreas(parseAreas(value));
    setEditing(false);
  };

  const addArea = () => {
    setAreas([...areas, { area: "", tasks: "" }]);
  };

  const removeArea = (index: number) => {
    setAreas(areas.filter((_, i) => i !== index));
  };

  const updateArea = (index: number, field: keyof CompetencyArea, val: string) => {
    setAreas(areas.map((a, i) => i === index ? { ...a, [field]: val } : a));
  };

  const displayAreas = parseAreas(value);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Aufgaben & Verantwortlichkeiten
              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 leading-none">Pflicht</Badge>
            </CardTitle>
            <FieldHelpTooltip
              fillHelp={help?.fillHelp}
              example={help?.example}
              badExample={help?.badExample}
              helpText={helpText}
              guidingQuestions={guidingQuestions}
            />
          </div>
          {onSave && !editing && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setAreas(parseAreas(value)); setEditing(true); }}>
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
        <p className="text-xs text-muted-foreground">Gegliedert nach Kompetenzbereichen</p>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            {areas.map((area, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Kompetenzbereich {i + 1}</span>
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-destructive" onClick={() => removeArea(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  value={area.area}
                  onChange={(e) => updateArea(i, "area", e.target.value)}
                  placeholder="Bereichsname (z.B. Qualitätssicherung)"
                  className="text-sm font-medium"
                />
                <Textarea
                  value={area.tasks}
                  onChange={(e) => updateArea(i, "tasks", e.target.value)}
                  placeholder="Aufgaben und Verantwortlichkeiten in diesem Bereich..."
                  className="min-h-[80px] text-sm"
                />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={addArea}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Kompetenzbereich hinzufügen
            </Button>
          </div>
        ) : displayAreas.length > 0 ? (
          <div className="space-y-3">
            {displayAreas.map((area, i) => (
              <div key={i} className="border-l-2 border-primary/30 pl-3">
                <p className="text-sm font-semibold">{area.area || "—"}</p>
                <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{area.tasks}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Noch keine Verantwortlichkeiten definiert
          </p>
        )}
      </CardContent>
    </Card>
  );
}
