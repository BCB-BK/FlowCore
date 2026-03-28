import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { CheckSquare, Plus, Trash2, Pencil, Check, X, GripVertical } from "lucide-react";
import { FieldHelpTooltip } from "@/components/metadata/FieldHelpTooltip";

interface CheckItem {
  text: string;
  category?: string;
  note?: string;
}

interface CheckItemsEditorProps {
  value: string;
  onSave?: (key: string, value: string) => void;
  sectionKey: string;
  help?: { fillHelp?: string; example?: string; badExample?: string; placeholder?: string; expectedFormat?: string };
  helpText?: string;
  guidingQuestions?: string[];
}

function parseItems(raw: string): CheckItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  const lines = raw.split("\n").filter(l => l.trim());
  return lines.map(l => ({ text: l.replace(/^[-•☐]\s*/, "").trim() }));
}

export function CheckItemsEditor({ value, onSave, sectionKey, help, helpText, guidingQuestions }: CheckItemsEditorProps) {
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<CheckItem[]>(() => parseItems(value));

  const handleSave = () => {
    const filtered = items.filter(item => item.text.trim());
    onSave?.(sectionKey, JSON.stringify(filtered));
    setEditing(false);
  };

  const handleCancel = () => {
    setItems(parseItems(value));
    setEditing(false);
  };

  const addItem = () => {
    setItems([...items, { text: "", category: "", note: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof CheckItem, val: string) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: val } : item));
  };

  const displayItems = parseItems(value);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-green-600" />
              Prüfpunkte
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
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setItems(parseItems(value)); setEditing(true); }}>
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
        <p className="text-xs text-muted-foreground">Strukturierte Prüfpunkte mit optionaler Kategorisierung</p>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-2 border rounded p-2 bg-muted/20">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Input
                    value={item.text}
                    onChange={(e) => updateItem(i, "text", e.target.value)}
                    placeholder="Prüfpunkt beschreiben..."
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={item.category ?? ""}
                      onChange={(e) => updateItem(i, "category", e.target.value)}
                      placeholder="Kategorie (optional)"
                      className="text-xs flex-1"
                    />
                    <Input
                      value={item.note ?? ""}
                      onChange={(e) => updateItem(i, "note", e.target.value)}
                      placeholder="Hinweis (optional)"
                      className="text-xs flex-1"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-destructive shrink-0" onClick={() => removeItem(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={addItem}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Prüfpunkt hinzufügen
            </Button>
          </div>
        ) : displayItems.length > 0 ? (
          <div className="space-y-1.5">
            {displayItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground shrink-0 mt-0.5">☐</span>
                <div className="flex-1">
                  <span>{item.text}</span>
                  {item.category && (
                    <Badge variant="outline" className="ml-2 text-[10px]">{item.category}</Badge>
                  )}
                  {item.note && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Noch keine Prüfpunkte definiert
          </p>
        )}
      </CardContent>
    </Card>
  );
}
