import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { Button } from "@workspace/ui/button";
import { Textarea } from "@workspace/ui/textarea";
import { ArrowRightLeft, Pencil, Check, X } from "lucide-react";
import { FieldHelpTooltip } from "@/components/metadata/FieldHelpTooltip";

interface SipocData {
  suppliers?: string;
  inputs?: string;
  process?: string;
  outputs?: string;
  customers?: string;
}

interface SipocEditorProps {
  value: SipocData | null;
  onSave?: (key: string, value: string) => void;
  sectionKey: string;
  help?: { fillHelp?: string; example?: string; badExample?: string; placeholder?: string; expectedFormat?: string };
  helpText?: string;
  guidingQuestions?: string[];
}

const SIPOC_COLUMNS = [
  { key: "suppliers", label: "Suppliers", color: "text-blue-600", description: "Wer liefert die Eingaben?" },
  { key: "inputs", label: "Inputs", color: "text-green-600", description: "Welche Eingaben werden benötigt?" },
  { key: "process", label: "Process", color: "text-primary", description: "Was sind die Hauptschritte?" },
  { key: "outputs", label: "Outputs", color: "text-amber-600", description: "Was wird produziert?" },
  { key: "customers", label: "Customers", color: "text-purple-600", description: "Wer erhält die Ergebnisse?" },
] as const;

export function SipocEditor({ value, onSave, sectionKey, help, helpText, guidingQuestions }: SipocEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SipocData>(value ?? {});

  const handleSave = () => {
    onSave?.(sectionKey, JSON.stringify(draft));
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value ?? {});
    setEditing(false);
  };

  const hasContent = value && Object.values(value).some(v => v && String(v).trim());

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-blue-600" />
              SIPOC
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
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}>
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
        <p className="text-xs text-muted-foreground">Suppliers, Inputs, Process, Outputs, Customers</p>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {SIPOC_COLUMNS.map((col) => (
              <div key={col.key} className="space-y-1.5">
                <label className={`text-xs font-medium ${col.color}`}>{col.label}</label>
                <p className="text-[10px] text-muted-foreground">{col.description}</p>
                <Textarea
                  value={(draft as Record<string, string>)[col.key] ?? ""}
                  onChange={(e) => setDraft({ ...draft, [col.key]: e.target.value })}
                  className="min-h-[100px] text-xs"
                  placeholder={`${col.label} eingeben...`}
                />
              </div>
            ))}
          </div>
        ) : hasContent ? (
          <div className="grid grid-cols-5 gap-2">
            {SIPOC_COLUMNS.map((col) => (
              <div key={col.key} className="space-y-1">
                <Badge variant="outline" className="text-xs w-full justify-center">
                  {col.label}
                </Badge>
                <div className="min-h-[60px] rounded border border-dashed p-2 text-xs text-muted-foreground">
                  {(value as Record<string, string>)?.[col.key] || "—"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Keine SIPOC-Daten definiert
          </p>
        )}
      </CardContent>
    </Card>
  );
}
