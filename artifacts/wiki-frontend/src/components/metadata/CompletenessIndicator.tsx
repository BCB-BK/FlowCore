import { calculateCompleteness, getFieldsByRequirement, getSectionsByRequirement, validateForPublication } from "@/lib/types";
import { useSetupMode } from "@/hooks/use-setup-mode";
import { Progress } from "@workspace/ui/progress";
import { Badge } from "@workspace/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/tooltip";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Construction } from "lucide-react";

interface CompletenessIndicatorProps {
  templateType: string;
  metadata: Record<string, unknown>;
  sectionData: Record<string, unknown>;
  compact?: boolean;
}

export function CompletenessIndicator({
  templateType,
  metadata,
  sectionData,
  compact,
}: CompletenessIndicatorProps) {
  const { setupMode } = useSetupMode();
  const { percentage, filled, total, missing } = calculateCompleteness(
    templateType,
    metadata,
    sectionData,
  );

  const validation = validateForPublication(templateType, metadata, sectionData);
  const fieldReqs = getFieldsByRequirement(templateType);
  const sectionReqs = getSectionsByRequirement(templateType);

  const requiredCount = fieldReqs.required.length + sectionReqs.required.length;
  const recommendedCount = fieldReqs.recommended.length + sectionReqs.recommended.length;
  const conditionalCount = fieldReqs.conditional.length + sectionReqs.conditional.length;

  if (total === 0) return null;

  const isComplete = percentage === 100;
  const publishReady = validation.valid || setupMode;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-default">
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              <span className="text-xs font-medium">{percentage}%</span>
              {setupMode && !validation.valid && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-amber-600 border-amber-200">
                  Anlage-Modus
                </Badge>
              )}
              {!publishReady && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-red-600 border-red-200">
                  Nicht publizierbar
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-medium text-sm mb-1">
              Vollständigkeit: {filled}/{total} Pflichtfelder
            </p>
            {!publishReady && (
              <p className="text-xs text-red-500 mb-1">
                {validation.errors.length} Fehler für Veröffentlichung
              </p>
            )}
            {missing.length > 0 && (
              <ul className="text-xs space-y-0.5">
                {missing.map((m) => (
                  <li key={m} className="text-muted-foreground">
                    • {m}
                  </li>
                ))}
              </ul>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Vollständigkeit</span>
        <span className="text-sm text-muted-foreground">
          {filled}/{total} Pflichtfelder ({percentage}%)
        </span>
      </div>
      <Progress value={percentage} className="h-2" />

      <div className="flex flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Pflicht: {requiredCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-muted-foreground">Empfohlen: {recommendedCount}</span>
        </div>
        {conditionalCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-muted-foreground">Bedingt: {conditionalCount}</span>
          </div>
        )}
      </div>

      {setupMode && !validation.valid && (
        <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-2.5">
          <div className="flex items-center gap-1.5">
            <Construction className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Anlage-Modus aktiv &mdash; Validierung deaktiviert
            </span>
          </div>
        </div>
      )}

      {!publishReady && (
        <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-red-600" />
            <span className="text-xs font-medium text-red-700 dark:text-red-400">
              Nicht ver\u00F6ffentlichungsbereit ({validation.readinessPercentage}%)
            </span>
          </div>
          <ul className="text-xs space-y-0.5">
            {validation.errors.map((e) => (
              <li key={e.field} className="text-red-600 dark:text-red-400 flex items-start gap-1">
                <span className="shrink-0 mt-0.5">&bull;</span>
                <span>{e.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Empfehlungen ({validation.warnings.length})
            </span>
          </div>
          <ul className="text-xs space-y-0.5">
            {validation.warnings.map((w) => (
              <li key={w.field} className="text-amber-600 dark:text-amber-400 flex items-start gap-1">
                <Info className="h-3 w-3 shrink-0 mt-0.5" />
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p className="font-medium text-amber-600">Fehlende Felder:</p>
          <ul className="list-disc list-inside">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
