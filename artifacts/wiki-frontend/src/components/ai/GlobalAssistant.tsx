import { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { ScrollArea } from "@workspace/ui/scroll-area";
import { Switch } from "@workspace/ui/switch";
import {
  Bot,
  Send,
  Loader2,
  FileText,
  ExternalLink,
  Globe,
  Sparkles,
  Eye,
  X,
} from "lucide-react";
import { getDefaultHeaders } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

type SourceType = "wiki" | "connector" | "web";

interface AiSource {
  nodeId: string;
  title: string;
  displayCode: string;
  templateType: string;
  snippet: string;
  sourceType: SourceType;
  contentStatus?: string;
  externalUrl?: string;
  sourceSystemName?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: AiSource[];
  confidence?: "high" | "medium" | "low";
  webSearchUsed?: boolean;
}

export const OPEN_ASSISTANT_EVENT = "open-global-assistant";

export function GlobalAssistant() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [includeUnpublished, setIncludeUnpublished] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const { data: authData } = useAuth();

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener(OPEN_ASSISTANT_EVENT, handler);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, handler);
  }, []);

  const PRIVILEGED_ROLES = [
    "editor",
    "reviewer",
    "approver",
    "process_manager",
    "compliance_manager",
    "system_admin",
  ];
  const userRoles = authData?.roles?.map((r: { role: string }) => r.role) ?? [];
  const canToggleUnpublished = userRoles.some((r: string) =>
    PRIVILEGED_ROLES.includes(r),
  );

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
    let webSearchActive = false;

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
          ...getDefaultHeaders(),
        },
        body: JSON.stringify({
          query: userQuery,
          ...(includeUnpublished && canToggleUnpublished
            ? { includeUnpublished: true }
            : {}),
        }),
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

            if (data.type === "sources" || data.type === "sources_update") {
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
            } else if (data.type === "web_search_started") {
              webSearchActive = true;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    webSearchUsed: true,
                  };
                }
                return updated;
              });
            } else if (data.type === "done") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    confidence: data.confidence,
                    webSearchUsed: data.webSearchUsed || webSearchActive,
                  };
                }
                return updated;
              });
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
  }, [query, isStreaming, includeUnpublished, canToggleUnpublished]);

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
    <Card className="fixed bottom-6 right-6 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[80vh] h-[560px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="py-3 px-4 border-b flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          FlowCore-Assistent
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
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm prose prose-sm max-w-none">
                    {msg.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>

                  {(msg.confidence || msg.webSearchUsed) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {msg.confidence && (
                        <Badge
                          variant={
                            msg.confidence === "high"
                              ? "default"
                              : msg.confidence === "medium"
                                ? "secondary"
                                : "destructive"
                          }
                          className="text-[10px]"
                        >
                          {msg.confidence === "high"
                            ? "Hohe Konfidenz"
                            : msg.confidence === "medium"
                              ? "Mittlere Konfidenz"
                              : "Geringe Konfidenz"}
                        </Badge>
                      )}
                      {msg.webSearchUsed && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Globe className="h-3 w-3" />
                          Web-Quellen verwendet
                        </Badge>
                      )}
                    </div>
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        Quellen:
                      </p>
                      {msg.sources.map((src, srcIdx) => (
                        <button
                          key={`${src.nodeId || "web"}-${srcIdx}-${i}`}
                          className="flex items-center gap-2 text-xs text-left w-full rounded border px-2 py-1.5 hover:bg-accent transition-colors"
                          onClick={() => {
                            if (src.sourceType === "web") {
                              return;
                            }
                            if (
                              src.sourceType === "connector" &&
                              src.externalUrl
                            ) {
                              window.open(src.externalUrl, "_blank");
                            } else if (src.nodeId) {
                              navigate(`/node/${src.nodeId}`);
                            }
                          }}
                        >
                          {src.sourceType === "web" ? (
                            <Globe className="h-3 w-3 shrink-0 text-blue-500" />
                          ) : src.sourceType === "connector" ? (
                            <ExternalLink className="h-3 w-3 shrink-0 text-orange-500" />
                          ) : (
                            <FileText className="h-3 w-3 shrink-0 text-primary" />
                          )}
                          <span className="truncate flex-1">
                            {src.sourceType !== "web" && (
                              <>
                                <span className="font-medium">
                                  {src.displayCode}
                                </span>{" "}
                              </>
                            )}
                            {src.title}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0"
                          >
                            {src.sourceType === "web"
                              ? "Web"
                              : src.sourceType === "connector"
                                ? src.sourceSystemName || "Extern"
                                : src.templateType.replace(/_/g, " ")}
                          </Badge>
                          {src.contentStatus && src.contentStatus !== "published" && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] shrink-0"
                            >
                              {src.contentStatus === "draft"
                                ? "Entwurf"
                                : src.contentStatus === "in_review"
                                  ? "In Prüfung"
                                  : src.contentStatus}
                            </Badge>
                          )}
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

      <div className="border-t p-3 space-y-2">
        {canToggleUnpublished && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>Unveröffentlichte einbeziehen</span>
            <Switch
              checked={includeUnpublished}
              onCheckedChange={setIncludeUnpublished}
              className="ml-auto h-4 w-7"
            />
          </div>
        )}
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
