import { useState } from "react";
import { HelpCircle, Lightbulb, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/popover";
import { Button } from "@workspace/ui/button";

interface FieldHelpTooltipProps {
  fillHelp?: string;
  example?: string;
  badExample?: string;
  expectedFormat?: string;
  helpText?: string;
  guidingQuestions?: string[];
}

export function FieldHelpTooltip({
  fillHelp,
  example,
  badExample,
  expectedFormat,
  helpText,
  guidingQuestions,
}: FieldHelpTooltipProps) {
  const [open, setOpen] = useState(false);

  const hasContent = fillHelp || example || badExample || expectedFormat || helpText || (guidingQuestions && guidingQuestions.length > 0);
  if (!hasContent) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-muted-foreground hover:text-primary shrink-0"
          type="button"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm space-y-3" side="right" align="start">
        {(fillHelp || helpText) && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Lightbulb className="h-3 w-3" />
              Ausfüllhilfe
            </div>
            <p className="text-sm leading-relaxed">{fillHelp || helpText}</p>
          </div>
        )}

        {guidingQuestions && guidingQuestions.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Leitfragen</div>
            <ul className="text-xs space-y-0.5 text-muted-foreground">
              {guidingQuestions.map((q, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="shrink-0 mt-0.5">•</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {expectedFormat && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Erwartetes Format</div>
            <code className="block text-xs bg-muted p-1.5 rounded font-mono">{expectedFormat}</code>
          </div>
        )}

        {example && (
          <div className="space-y-1 p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              Gutes Beispiel
            </div>
            <p className="text-xs text-green-700 dark:text-green-300">{example}</p>
          </div>
        )}

        {badExample && (
          <div className="space-y-1 p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              Vermeiden
            </div>
            <p className="text-xs text-red-700 dark:text-red-300">{badExample}</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
