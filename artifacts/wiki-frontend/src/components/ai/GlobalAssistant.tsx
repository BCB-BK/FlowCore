import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Send,
  Loader2,
  FileText,
  ExternalLink,
  Sparkles,
  X,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { useLocation } from "wouter";

type SourceType = "wiki" | "connector" | "web";

interface AiSource {
  nodeId: string;
  title: string;
  displayCode: string;
  templateType: string;
  snippet: string;
  sourceType: SourceType;
  externalUrl?: string;
  sourceSystemName?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: AiSource[];
}

export function GlobalAssistant() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  const handleAsk = useCallback(async () => {
    if (!query.trim() || isStreaming) return;
    const userQuery = query.trim();
    setQuery("");

    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let currentSources: AiSource[] = [];
    let currentContent = "";

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", sources: [] },
    ]);

    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/api/ai/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Dev-Principal-Id": "00000000-0000-0000-0000-000000000001",
        },
        body: JSON.stringify({ query: userQuery }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

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

            if (data.type === "sources") {
              currentSources = data.sources || [];
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    sources: currentSources,
                  };
                }
                return updated;
              });
            } else if (data.type === "content") {
              currentContent += data.content;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: currentContent,
                  };
                }
                return updated;
              });
            } else if (data.type === "done") {
              break;
            }
          } catch {
            // skip malformed SSE data
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content:
                "Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
            };
          }
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [query, isStreaming]);

  if (!isOpen) {
    return (
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[420px] h-[560px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="py-3 px-4 border-b flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          KI-Wissensassistent
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-12">
              <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>Stellen Sie eine Frage zum Wiki-Wissen</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "text-right" : ""}>
              {msg.role === "user" ? (
                <div className="inline-block bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm max-w-[85%]">
                  {msg.content}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
                    {msg.content || (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        Quellen:
                      </p>
                      {msg.sources.map((src) => (
                        <button
                          key={`${src.nodeId}-${i}`}
                          className="flex items-center gap-2 text-xs text-left w-full rounded border px-2 py-1.5 hover:bg-accent transition-colors"
                          onClick={() => {
                            if (
                              src.sourceType === "connector" &&
                              src.externalUrl
                            ) {
                              window.open(src.externalUrl, "_blank");
                            } else {
                              navigate(`/node/${src.nodeId}`);
                            }
                          }}
                        >
                          {src.sourceType === "connector" ? (
                            <ExternalLink className="h-3 w-3 shrink-0 text-orange-500" />
                          ) : (
                            <FileText className="h-3 w-3 shrink-0 text-primary" />
                          )}
                          <span className="truncate flex-1">
                            <span className="font-medium">
                              {src.displayCode}
                            </span>{" "}
                            {src.title}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0"
                          >
                            {src.sourceType === "connector"
                              ? src.sourceSystemName || "Extern"
                              : src.templateType.replace(/_/g, " ")}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
        >
          <Input
            placeholder="Frage stellen..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isStreaming}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isStreaming || !query.trim()}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
