import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Check, X, Plus, Loader2, Wand2 } from "lucide-react";
import { useMemo } from "react";

interface FieldAiDiffDialogProps {
  open: boolean;
  onClose: () => void;
  originalText: string;
  suggestion: string;
  isStreaming: boolean;
  actionLabel: string;
  onApply: () => void;
  onDiscard: () => void;
  onAppend: () => void;
}

function computeSimpleDiff(
  original: string,
  suggestion: string,
): { type: "same" | "removed" | "added"; text: string }[] {
  const origLines = original.split("\n");
  const sugLines = suggestion.split("\n");
  const result: { type: "same" | "removed" | "added"; text: string }[] = [];

  const maxLen = Math.max(origLines.length, sugLines.length);
  for (let i = 0; i < maxLen; i++) {
    const origLine = i < origLines.length ? origLines[i] : undefined;
    const sugLine = i < sugLines.length ? sugLines[i] : undefined;

    if (origLine === sugLine) {
      result.push({ type: "same", text: origLine! });
    } else {
      if (origLine !== undefined) {
        result.push({ type: "removed", text: origLine });
      }
      if (sugLine !== undefined) {
        result.push({ type: "added", text: sugLine });
      }
    }
  }

  return result;
}

export function FieldAiDiffDialog({
  open,
  onClose,
  originalText,
  suggestion,
  isStreaming,
  actionLabel,
  onApply,
  onDiscard,
  onAppend,
}: FieldAiDiffDialogProps) {
  const diff = useMemo(
    () => (suggestion ? computeSimpleDiff(originalText, suggestion) : []),
    [originalText, suggestion],
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-4 w-4 text-primary" />
            KI-Vorschlag: {actionLabel}
            {isStreaming && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Generiert…
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Vorher</p>
            <ScrollArea className="h-[300px] rounded-md border p-3">
              <div className="text-sm whitespace-pre-wrap">
                {originalText || (
                  <span className="text-muted-foreground">(leer)</span>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Nachher</p>
            <ScrollArea className="h-[300px] rounded-md border p-3">
              <div className="text-sm whitespace-pre-wrap">
                {suggestion ? (
                  suggestion
                ) : isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-muted-foreground">(leer)</span>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {diff.length > 0 && !isStreaming && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Änderungen
            </p>
            <ScrollArea className="h-[120px] rounded-md border p-3">
              <div className="text-xs font-mono space-y-0.5">
                {diff.map((d, i) => (
                  <div
                    key={i}
                    className={
                      d.type === "removed"
                        ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 px-1 rounded"
                        : d.type === "added"
                          ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 px-1 rounded"
                          : "text-muted-foreground px-1"
                    }
                  >
                    {d.type === "removed" ? "- " : d.type === "added" ? "+ " : "  "}
                    {d.text || " "}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onDiscard}>
            <X className="h-3.5 w-3.5 mr-1" />
            Verwerfen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onAppend}
            disabled={isStreaming || !suggestion}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ergänzen
          </Button>
          <Button
            size="sm"
            onClick={onApply}
            disabled={isStreaming || !suggestion}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
