import { useEffect, useRef, useState } from "react";
import { Input } from "@workspace/ui/input";
import { Loader2, X, Search, BookOpen, ArrowRight } from "lucide-react";
import { useSearchContent } from "@workspace/api-client-react";

interface WikiNodePickerDialogProps {
  onSelect: (
    nodeId: string,
    title: string,
    url: string,
    templateType?: string,
    displayCode?: string | null,
  ) => void;
  onClose: () => void;
}

export function WikiNodePickerDialog({ onSelect, onClose }: WikiNodePickerDialogProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: searchData, isLoading } = useSearchContent(
    { q: debouncedQuery || "", limit: 10, includeUnpublished: true },
    {
      query: {
        enabled: debouncedQuery.length >= 2,
        queryKey: ["wikiNodePickerDialog", debouncedQuery],
      },
    },
  );

  const results = searchData?.results ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-background rounded-xl shadow-2xl border overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Wiki-Seite auswählen</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Seitenname suchen…"
              className="pl-9 text-sm"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
          {query.length > 0 && query.length < 2 && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Mindestens 2 Zeichen eingeben
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-[120px] max-h-72">
          {debouncedQuery.length < 2 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              Suchbegriff eingeben…
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              Keine Ergebnisse für „{debouncedQuery}"
            </div>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors flex items-center gap-3 group"
                    onClick={() => {
                      onSelect(
                        r.id,
                        r.title,
                        `/node/${r.id}`,
                        r.templateType ?? undefined,
                        r.displayCode ?? null,
                      );
                      onClose();
                    }}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 bg-amber-50 text-amber-600">
                      <BookOpen className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {r.displayCode && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {r.displayCode}
                          </span>
                        )}
                        {r.displayCode && r.templateType && (
                          <span className="text-muted-foreground text-[10px]">·</span>
                        )}
                        {r.templateType && (
                          <span className="text-[10px] text-muted-foreground">{r.templateType}</span>
                        )}
                        {r.status === "draft" && (
                          <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-amber-100 text-amber-700 leading-none">
                            Entwurf
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-4 py-2.5 border-t bg-muted/20">
          <p className="text-[11px] text-muted-foreground">
            Seite auswählen, um sie als Wiki-Link einzufügen
          </p>
        </div>
      </div>
    </div>
  );
}
