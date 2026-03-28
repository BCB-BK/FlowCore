import { useState, useCallback, useRef } from "react";
import { Button } from "@workspace/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/tooltip";
import {
  Wand2,
  RefreshCw,
  Briefcase,
  Expand,
  Shrink,
  SpellCheck,
  ListChecks,
  Loader2,
} from "lucide-react";
import { getDefaultHeaders } from "@workspace/api-client-react";
import { FieldAiDiffDialog } from "./FieldAiDiffDialog";

type FieldAction =
  | "reformulate"
  | "professionalize"
  | "expand"
  | "shorten"
  | "grammar"
  | "from_bullets";

interface ActionDef {
  key: FieldAction;
  label: string;
  icon: React.ReactNode;
}

const FIELD_ACTIONS: ActionDef[] = [
  {
    key: "reformulate",
    label: "Umformulieren",
    icon: <RefreshCw className="h-3.5 w-3.5" />,
  },
  {
    key: "professionalize",
    label: "Professionalisieren",
    icon: <Briefcase className="h-3.5 w-3.5" />,
  },
  {
    key: "from_bullets",
    label: "Aus Stichpunkten",
    icon: <ListChecks className="h-3.5 w-3.5" />,
  },
  {
    key: "expand",
    label: "Erweitern",
    icon: <Expand className="h-3.5 w-3.5" />,
  },
  {
    key: "shorten",
    label: "Kürzen",
    icon: <Shrink className="h-3.5 w-3.5" />,
  },
  {
    key: "grammar",
    label: "Korrektur",
    icon: <SpellCheck className="h-3.5 w-3.5" />,
  },
];

interface FieldAiButtonProps {
  fieldKey: string;
  pageType: string;
  nodeId?: string;
  getValue: () => string;
  onApply: (newValue: string) => void;
  allowedOperations?: string[];
  className?: string;
}

export function FieldAiButton({
  fieldKey,
  pageType,
  nodeId,
  getValue,
  onApply,
  allowedOperations,
  className,
}: FieldAiButtonProps) {
  const [open, setOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [showDiff, setShowDiff] = useState(false);
  const [activeAction, setActiveAction] = useState<FieldAction | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const availableActions = allowedOperations
    ? FIELD_ACTIONS.filter((a) => allowedOperations.includes(a.key))
    : FIELD_ACTIONS;

  const handleAction = useCallback(
    async (action: FieldAction) => {
      const text = getValue();
      if (!text.trim()) return;

      setOriginalText(text);
      setActiveAction(action);
      setSuggestion("");
      setIsStreaming(true);
      setOpen(false);
      setShowDiff(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let current = "";

      try {
        const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
        let response: Response;
        try {
          response = await fetch(`${baseUrl}/api/ai/field-assist`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getDefaultHeaders(),
            },
            body: JSON.stringify({ action, text, fieldKey, pageType, nodeId }),
            signal: controller.signal,
          });
        } catch (fetchErr) {
          if ((fetchErr as Error).name === "AbortError") throw fetchErr;
          setSuggestion(
            "Server nicht erreichbar — bitte Seite neu laden.",
          );
          return;
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);
              if (data.type === "content") {
                current += data.content;
                setSuggestion(current);
              } else if (data.type === "done") {
                break;
              }
            } catch {
              // skip
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const errMsg = (err as Error).message ?? "";
          if (errMsg.startsWith("HTTP ")) {
            setSuggestion(
              "Fehler bei der KI-Verarbeitung. Bitte versuchen Sie es erneut.",
            );
          } else {
            setSuggestion(
              "Server nicht erreichbar — bitte Seite neu laden.",
            );
          }
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [getValue, fieldKey, pageType, nodeId],
  );

  const handleApply = useCallback(() => {
    onApply(suggestion);
    setShowDiff(false);
    setSuggestion("");
  }, [suggestion, onApply]);

  const handleDiscard = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setShowDiff(false);
    setSuggestion("");
    setIsStreaming(false);
  }, []);

  const handleAppend = useCallback(() => {
    const current = getValue();
    const appended = current ? `${current}\n\n${suggestion}` : suggestion;
    onApply(appended);
    setShowDiff(false);
    setSuggestion("");
  }, [suggestion, getValue, onApply]);

  if (availableActions.length === 0) return null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-6 w-6 text-muted-foreground hover:text-primary ${className ?? ""}`}
              >
                {isStreaming ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>KI-Feldassistent</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-48 p-1" align="end">
          <div className="flex flex-col">
            {availableActions.map((a) => (
              <Button
                key={a.key}
                variant="ghost"
                size="sm"
                className="justify-start gap-2 text-xs h-8"
                onClick={() => handleAction(a.key)}
              >
                {a.icon}
                {a.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <FieldAiDiffDialog
        open={showDiff}
        onClose={handleDiscard}
        originalText={originalText}
        suggestion={suggestion}
        isStreaming={isStreaming}
        actionLabel={
          activeAction
            ? availableActions.find((a) => a.key === activeAction)?.label ??
              activeAction
            : ""
        }
        onApply={handleApply}
        onDiscard={handleDiscard}
        onAppend={handleAppend}
      />
    </>
  );
}
