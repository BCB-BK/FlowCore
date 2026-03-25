import { calculateCompleteness } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle } from "lucide-react";

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
  const { percentage, filled, total, missing } = calculateCompleteness(
    templateType,
    metadata,
    sectionData,
  );

  if (total === 0) return null;

  const isComplete = percentage === 100;

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
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-medium text-sm mb-1">
              Vollständigkeit: {filled}/{total} Pflichtfelder
            </p>
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Vollständigkeit</span>
        <span className="text-sm text-muted-foreground">
          {filled}/{total} Pflichtfelder ({percentage}%)
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
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
