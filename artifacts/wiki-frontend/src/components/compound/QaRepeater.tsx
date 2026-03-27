import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, Plus, Trash2, Pencil, Check, X, GripVertical } from "lucide-react";
import { FieldHelpTooltip } from "@/components/metadata/FieldHelpTooltip";

interface QaPair {
  question: string;
  answer: string;
}

interface QaRepeaterProps {
  value: string;
  onSave?: (key: string, value: string) => void;
  sectionKey: string;
  help?: { fillHelp?: string; example?: string; badExample?: string; placeholder?: string; expectedFormat?: string };
  helpText?: string;
  guidingQuestions?: string[];
}

function parseQaPairs(raw: string): QaPair[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [{ question: "", answer: raw }];
}

export function QaRepeater({ value, onSave, sectionKey, help, helpText, guidingQuestions }: QaRepeaterProps) {
  const [editing, setEditing] = useState(false);
  const [pairs, setPairs] = useState<QaPair[]>(() => parseQaPairs(value));

  const handleSave = () => {
    const filtered = pairs.filter(p => p.question.trim() || p.answer.trim());
    onSave?.(sectionKey, JSON.stringify(filtered));
    setEditing(false);
  };

  const handleCancel = () => {
    setPairs(parseQaPairs(value));
    setEditing(false);
  };

  const addPair = () => {
    setPairs([...pairs, { question: "", answer: "" }]);
  };

  const removePair = (index: number) => {
    setPairs(pairs.filter((_, i) => i !== index));
  };

  const updatePair = (index: number, field: keyof QaPair, val: string) => {
    setPairs(pairs.map((p, i) => i === index ? { ...p, [field]: val } : p));
  };

  const displayPairs = parseQaPairs(value);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-yellow-600" />
              Fragen & Antworten
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
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setPairs(parseQaPairs(value)); setEditing(true); }}>
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
            {pairs.map((pair, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <GripVertical className="h-3 w-3" />
                    <span>Frage {i + 1}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-destructive" onClick={() => removePair(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  value={pair.question}
                  onChange={(e) => updatePair(i, "question", e.target.value)}
                  placeholder="Frage eingeben..."
                  className="text-sm font-medium"
                />
                <Textarea
                  value={pair.answer}
                  onChange={(e) => updatePair(i, "answer", e.target.value)}
                  placeholder="Antwort eingeben..."
                  className="min-h-[60px] text-sm"
                />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={addPair}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Frage hinzufügen
            </Button>
          </div>
        ) : displayPairs.length > 0 ? (
          <div className="space-y-3">
            {displayPairs.map((pair, i) => (
              <div key={i} className="border-b last:border-0 pb-3 last:pb-0">
                <p className="text-sm font-medium mb-1">F: {pair.question || "—"}</p>
                <p className="text-sm text-muted-foreground">{pair.answer || "—"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Noch keine Fragen & Antworten vorhanden
          </p>
        )}
      </CardContent>
    </Card>
  );
}
