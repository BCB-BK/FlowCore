import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Button } from "@workspace/ui/button";
import { Badge } from "@workspace/ui/badge";
import { Textarea } from "@workspace/ui/textarea";
import { Pencil, Check, X, Type } from "lucide-react";
import { FieldHelpTooltip } from "@/components/metadata/FieldHelpTooltip";
import type { FieldHelp } from "@/lib/types";
import { FieldAiButton } from "@/components/ai/FieldAiButton";
import { RichSectionEditor } from "./RichSectionEditor";
import { sanitizeHtml } from "@/lib/sanitize-html";
import {
  looksLikeHtml,
  plainTextToHtml,
  htmlToPlainText,
  isRichTextEmpty,
} from "@workspace/shared/rich-text";

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
  pageType?: string;
  nodeId?: string;
  showAiAssist?: boolean;
  /** Redaktionelle Empfehlung: Zeichenumfang (nicht blockierend) */
  softLimitChars?: number;
  /** Redaktionelle Empfehlung: Anzahl Einträge/Punkte (nicht blockierend) */
  softLimitItems?: number;
}

/** Zeichenzahl des reinen Textes — HTML-Auszeichnung zählt nicht mit. */
function countChars(value: string): number {
  return (looksLikeHtml(value) ? htmlToPlainText(value) : value).trim().length;
}

/**
 * Anzahl der Einträge: Listenpunkte im formatierten Modus, sonst
 * nicht-leere Zeilen (Aufzählungszeichen werden nicht doppelt gezählt).
 */
function countItems(value: string): number {
  if (looksLikeHtml(value)) {
    const listItems = value.match(/<li\b/gi);
    if (listItems) return listItems.length;
    return htmlToPlainText(value)
      .split("\n")
      .filter((line) => line.trim().length > 0).length;
  }
  return value.split("\n").filter((line) => line.trim().length > 0).length;
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
  pageType,
  nodeId,
  showAiAssist = true,
  softLimitChars,
  softLimitItems,
}: EditableSectionCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Formatierungsmodus: automatisch aktiv, wenn der Inhalt bereits HTML ist —
  // sonst per Schalter oder durch Einfügen formatierter Inhalte aktivierbar.
  const [richMode, setRichMode] = useState(() => looksLikeHtml(value));

  // Dependency intentionally limited to [editing] — cursor-placement runs only
  // when entering edit mode, not on every keystroke (which would jump cursor to end).
  useEffect(() => {
    if (editing && !richMode && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(draft.length, draft.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  useEffect(() => {
    setDraft(value);
    setRichMode(looksLikeHtml(value));
  }, [value]);

  /**
   * Formatierte Inhalte aus der Zwischenablage (Word, Confluence, Web)
   * übernehmen: Enthält die Zwischenablage HTML, wechselt das Feld
   * automatisch in den Formatierungsmodus, statt die Auszeichnung zu
   * verwerfen.
   */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const html = e.clipboardData?.getData("text/html");
      if (!html || !looksLikeHtml(html)) return;

      e.preventDefault();
      const clean = sanitizeHtml(html);
      const el = e.currentTarget;
      const before = draft.slice(0, el.selectionStart ?? draft.length);
      const after = draft.slice(el.selectionEnd ?? draft.length);
      const merged = `${plainTextToHtml(before)}${clean}${plainTextToHtml(after)}`;
      setDraft(merged);
      setRichMode(true);
    },
    [draft],
  );

  const toggleRichMode = useCallback(() => {
    setRichMode((prev) => {
      if (!prev) setDraft((d) => plainTextToHtml(d));
      return !prev;
    });
  }, []);

  const handleSave = () => {
    onSave?.(sectionKey, draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleAiApply = useCallback(
    (newValue: string) => {
      setDraft(newValue);
      if (!editing) {
        onSave?.(sectionKey, newValue);
      }
    },
    [editing, onSave, sectionKey],
  );

  const getFieldValue = useCallback(() => {
    return draft;
  }, [draft]);

  // Redaktionelle Empfehlung — bewusst nur ein Hinweis, kein Speicher-Blocker.
  const softLimit = (() => {
    if (softLimitChars) {
      const count = countChars(draft);
      return {
        count,
        limit: softLimitChars,
        over: count > softLimitChars,
        text: `${count.toLocaleString("de-DE")} / ${softLimitChars.toLocaleString("de-DE")} Zeichen`,
        hint: "Empfehlung: knapper fassen — Details gehören auf die verknüpften Standardseiten.",
      };
    }
    if (softLimitItems) {
      const count = countItems(draft);
      return {
        count,
        limit: softLimitItems,
        over: count > softLimitItems,
        text: `${count} / ${softLimitItems} Einträge`,
        hint: "Empfehlung: auf die wesentlichen Punkte verdichten.",
      };
    }
    return null;
  })();

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
              {required && onSave && (
                <span className="text-destructive text-xs">*</span>
              )}
            </CardTitle>
            {/* Pflicht-/Empfehlungshinweise sind Redaktionshilfen — in der
                Leseansicht bleiben sie aus. */}
            {onSave && (
              <RequirementBadge
                requirement={requirement}
                publishRequired={publishRequired}
              />
            )}
            <FieldHelpTooltip
              fillHelp={help?.fillHelp}
              example={help?.example}
              badExample={help?.badExample}
              expectedFormat={help?.expectedFormat}
              helpText={helpText}
              guidingQuestions={guidingQuestions}
            />
          </div>
          <div className="flex items-center gap-1">
            {showAiAssist && onSave && pageType && (
              <FieldAiButton
                fieldKey={sectionKey}
                pageType={pageType}
                nodeId={nodeId}
                getValue={getFieldValue}
                onApply={handleAiApply}
              />
            )}
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
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 text-xs ${richMode ? "text-primary" : "text-muted-foreground"}`}
                  onClick={toggleRichMode}
                  title={
                    richMode
                      ? "Formatierung ausschalten (Inhalt bleibt als HTML erhalten)"
                      : "Formatierung einschalten – für Aufzählungen, Fettungen und Überschriften"
                  }
                >
                  <Type className="h-3 w-3 mr-1" />
                  Formatierung
                </Button>
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
              </>
            )}
          </div>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          richMode ? (
            <RichSectionEditor
              value={draft}
              onChange={setDraft}
              placeholder={help?.placeholder ?? `${label} eingeben...`}
              autoFocus
            />
          ) : (
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className="min-h-[120px] text-sm"
              placeholder={help?.placeholder ?? `${label} eingeben...`}
            />
          )
        ) : children ? (
          children
        ) : isRichTextEmpty(draft) ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyText}
          </p>
        ) : looksLikeHtml(draft) ? (
          // Formatierte Inhalte werden bereinigt gerendert (Allowlist-Sanitizer)
          <div
            className="text-sm prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(draft) }}
          />
        ) : (
          <div className="text-sm whitespace-pre-wrap">{draft}</div>
        )}
        {editing && softLimit && (
          <p
            className={`mt-1.5 text-[11px] ${
              softLimit.over ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            }`}
          >
            {softLimit.text}
            {softLimit.over && ` \u00b7 ${softLimit.hint}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
