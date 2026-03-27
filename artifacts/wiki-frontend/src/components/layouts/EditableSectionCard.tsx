import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X } from "lucide-react";
import { FieldHelpTooltip } from "@/components/metadata/FieldHelpTooltip";
import type { FieldHelp } from "@/lib/types";

interface EditableSectionCardProps {
  sectionKey: string;
  label: string;
  description?: string;
  required?: boolean;
  icon?: React.ReactNode;
  value: string;
  onSave?: (key: string, value: unknown) => void;
  emptyText?: string;
  children?: React.ReactNode;
  help?: FieldHelp;
  helpText?: string;
  guidingQuestions?: string[];
  requirement?: "required" | "recommended" | "conditional";
  publishRequired?: boolean;
}

function RequirementBadge({ requirement, publishRequired }: { requirement?: string; publishRequired?: boolean }) {
  if (requirement === "required" || publishRequired) {
    return <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 leading-none">Pflicht</Badge>;
  }
  if (requirement === "recommended") {
    return <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 leading-none bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Empfohlen</Badge>;
  }
  if (requirement === "conditional") {
    return <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 leading-none">Bedingt</Badge>;
  }
  return null;
}

export function EditableSectionCard({
  sectionKey,
  label,
  description,
  required,
  icon,
  value,
  onSave,
  emptyText = "Noch kein Inhalt",
  children,
  help,
  helpText,
  guidingQuestions,
  requirement,
  publishRequired,
}: EditableSectionCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(draft.length, draft.length);
    }
  }, [editing, draft.length]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = () => {
    onSave?.(sectionKey, draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {icon}
              {label}
              {required && <span className="text-destructive text-xs">*</span>}
            </CardTitle>
            <RequirementBadge requirement={requirement} publishRequired={publishRequired} />
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
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(true)}
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
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[120px] text-sm"
            placeholder={help?.placeholder ?? `${label} eingeben...`}
          />
        ) : children ? (
          children
        ) : value ? (
          <div className="text-sm whitespace-pre-wrap">{value}</div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyText}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
