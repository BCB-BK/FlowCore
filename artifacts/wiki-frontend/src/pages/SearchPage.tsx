import { useState } from "react";
import { useAllNodes } from "@/hooks/use-nodes";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { PAGE_TYPE_LABELS } from "@/lib/types";
import { StatusBadge } from "@/components/versioning/StatusBadge";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const { data: allNodes } = useAllNodes();
  const [, navigate] = useLocation();

  const filtered = allNodes?.filter(
    (n) =>
      !n.isDeleted &&
      (n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.displayCode.toLowerCase().includes(query.toLowerCase()) ||
        n.templateType.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Suche</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Titel, Display-Code oder Seitentyp eingeben..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {query.length > 0 && filtered && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {filtered.length} Ergebnis{filtered.length !== 1 ? "se" : ""}
          </p>
          {filtered.map((node) => (
            <Card
              key={node.id}
              className="cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => navigate(`/node/${node.id}`)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{node.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {node.displayCode} ·{" "}
                    {PAGE_TYPE_LABELS[node.templateType] || node.templateType}
                  </p>
                </div>
                <StatusBadge
                  status={
                    node.status as Parameters<typeof StatusBadge>[0]["status"]
                  }
                  compact
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {query.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Geben Sie einen Suchbegriff ein, um Inhalte zu finden.
        </p>
      )}
    </div>
  );
}
