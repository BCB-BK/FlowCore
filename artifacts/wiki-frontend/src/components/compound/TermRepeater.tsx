import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { Textarea } from "@workspace/ui/textarea";
import { BookOpen, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { FieldHelpTooltip } from "@/components/metadata/FieldHelpTooltip";

interface GlossaryTerm {
  term: string;
  definition: string;
  synonyms?: string;
}

interface TermRepeaterProps {
  value: string;
  onSave?: (key: string, value: string) => void;
  sectionKey: string;
  help?: { fillHelp?: string; example?: string; badExample?: string; placeholder?: string; expectedFormat?: string };
  helpText?: string;
  guidingQuestions?: string[];
}

function parseTerms(raw: string): GlossaryTerm[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [{ term: "", definition: raw, synonyms: "" }];
}

export function TermRepeater({ value, onSave, sectionKey, help, helpText, guidingQuestions }: TermRepeaterProps) {
  const [editing, setEditing] = useState(false);
  const [terms, setTerms] = useState<GlossaryTerm[]>(() => parseTerms(value));

  const handleSave = () => {
    const filtered = terms.filter(t => t.term.trim() || t.definition.trim());
    onSave?.(sectionKey, JSON.stringify(filtered));
    setEditing(false);
  };

  const handleCancel = () => {
    setTerms(parseTerms(value));
    setEditing(false);
  };

  const addTerm = () => {
    setTerms([...terms, { term: "", definition: "", synonyms: "" }]);
  };

  const removeTerm = (index: number) => {
    setTerms(terms.filter((_, i) => i !== index));
  };

  const updateTerm = (index: number, field: keyof GlossaryTerm, val: string) => {
    setTerms(terms.map((t, i) => i === index ? { ...t, [field]: val } : t));
  };

  const displayTerms = parseTerms(value);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Begriffe & Definitionen
              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 leading-none">Pflicht</Badge>
            </CardTitle>
            <FieldHelpTooltip
              fillHelp={help?.fillHelp}
              example={help?.example}
              badExample={help?.badExample}
              expectedFormat={help?.expectedFormat}
              helpText={helpText}
              guidingQuestions={guidingQuestions}
            />
          </div>
          {onSave && !editing && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setTerms(parseTerms(value)); setEditing(true); }}>
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
            {terms.map((entry, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Eintrag {i + 1}</span>
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-destructive" onClick={() => removeTerm(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  value={entry.term}
                  onChange={(e) => updateTerm(i, "term", e.target.value)}
                  placeholder="Begriff"
                  className="text-sm font-medium"
                />
                <Textarea
                  value={entry.definition}
                  onChange={(e) => updateTerm(i, "definition", e.target.value)}
                  placeholder="Definition"
                  className="min-h-[60px] text-sm"
                />
                <Input
                  value={entry.synonyms ?? ""}
                  onChange={(e) => updateTerm(i, "synonyms", e.target.value)}
                  placeholder="Synonyme (optional, kommagetrennt)"
                  className="text-sm"
                />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={addTerm}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Begriff hinzufügen
            </Button>
          </div>
        ) : displayTerms.length > 0 ? (
          <div className="space-y-2">
            {displayTerms.map((entry, i) => (
              <div key={i} className="border-b last:border-0 pb-2 last:pb-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{entry.term || "—"}</span>
                  {entry.synonyms && (
                    <span className="text-xs text-muted-foreground italic">({entry.synonyms})</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{entry.definition || "—"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Noch keine Glossarbegriffe definiert
          </p>
        )}
      </CardContent>
    </Card>
  );
}
