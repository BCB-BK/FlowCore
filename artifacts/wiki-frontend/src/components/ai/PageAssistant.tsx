import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Loader2,
  RefreshCw,
  AlignLeft,
  Expand,
  Shrink,
  SpellCheck,
  Search,
  Copy,
  Check,
  X,
  Briefcase,
  MessageSquare,
  LayoutList,
  ClipboardCheck,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Action =
  | "reformulate"
  | "summarize"
  | "expand"
  | "shorten"
  | "grammar"
  | "gap_analysis"
  | "professionalize"
  | "adjust_tone"
  | "restructure"
  | "template_completeness";

interface ActionDef {
  key: Action;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const ACTIONS: ActionDef[] = [
  {
    key: "reformulate",
    label: "Umformulieren",
    icon: <RefreshCw className="h-4 w-4" />,
    description: "Text umformulieren und verbessern",
  },
  {
    key: "summarize",
    label: "Zusammenfassen",
    icon: <AlignLeft className="h-4 w-4" />,
    description: "Kompakte Zusammenfassung erstellen",
  },
  {
    key: "expand",
    label: "Erweitern",
    icon: <Expand className="h-4 w-4" />,
    description: "Mit Details und Erklärungen ergänzen",
  },
  {
    key: "shorten",
    label: "Kürzen",
    icon: <Shrink className="h-4 w-4" />,
    description: "Auf das Wesentliche reduzieren",
  },
  {
    key: "grammar",
    label: "Korrektur",
    icon: <SpellCheck className="h-4 w-4" />,
    description: "Grammatik und Rechtschreibung prüfen",
  },
  {
    key: "gap_analysis",
    label: "Lückenanalyse",
    icon: <Search className="h-4 w-4" />,
    description: "Fehlende Informationen identifizieren",
  },
  {
    key: "professionalize",
    label: "Professionalisieren",
    icon: <Briefcase className="h-4 w-4" />,
    description: "In professionellen Unternehmens-Ton überführen",
  },
  {
    key: "adjust_tone",
    label: "Ton anpassen",
    icon: <MessageSquare className="h-4 w-4" />,
    description: "Sachlich, klar und neutral formulieren",
  },
  {
    key: "restructure",
    label: "Umstrukturieren",
    icon: <LayoutList className="h-4 w-4" />,
    description: "Mit Überschriften und Aufzählungen neu gliedern",
  },
  {
    key: "template_completeness",
    label: "Vollständigkeit",
    icon: <ClipboardCheck className="h-4 w-4" />,
    description: "Fehlende Felder und Lücken im Seitentemplate prüfen",
  },
];

interface PageAssistantProps {
  nodeId?: string;
  getSelectedText: () => string;
  onClose?: () => void;
}

export function PageAssistant({
  nodeId,
  getSelectedText,
  onClose,
}: PageAssistantProps) {
  const [result, setResult] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleAction = useCallback(
    async (action: Action) => {
      const text = getSelectedText();
      if (!text.trim()) return;

      setActiveAction(action);
      setResult("");
      setIsStreaming(true);
      setCopied(false);

      const controller = new AbortController();
      abortRef.current = controller;

      let current = "";

      try {
        const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
        const response = await fetch(`${baseUrl}/api/ai/page-assist`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Dev-Principal-Id": "00000000-0000-0000-0000-000000000001",
          },
          body: JSON.stringify({ action, text, nodeId }),
          signal: controller.signal,
        });

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
                setResult(current);
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
          setResult(
            "Fehler bei der KI-Verarbeitung. Bitte versuchen Sie es erneut.",
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [getSelectedText, nodeId],
  );

  const handleCopy = useCallback(() => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  return (
    <Card className="w-full">
      <CardHeader className="py-3 px-4 border-b flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          KI-Schreibassistent
        </CardTitle>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Wählen Sie Text im Editor aus und klicken Sie eine Aktion:
        </p>

        <div className="grid grid-cols-2 gap-1.5">
          {ACTIONS.map((a) => (
            <Tooltip key={a.key}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeAction === a.key ? "default" : "outline"}
                  size="sm"
                  className="justify-start gap-2 text-xs"
                  disabled={isStreaming}
                  onClick={() => handleAction(a.key)}
                >
                  {isStreaming && activeAction === a.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    a.icon
                  )}
                  {a.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{a.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {(result || isStreaming) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Ergebnis
              </span>
              {result && !isStreaming && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" /> Kopiert
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Kopieren
                    </>
                  )}
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-60">
              <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                {result || <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
