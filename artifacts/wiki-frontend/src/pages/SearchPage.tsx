import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { useLocation } from "wouter";
import { PAGE_TYPE_LABELS, STATUS_LABELS } from "@/lib/types";
import { StatusBadge } from "@/components/versioning/StatusBadge";
import {
  useSearchContent,
  useListTags,
  useTrackSearchClick,
} from "@workspace/api-client-react";

function sanitizeHeadline(html: string): string {
  return html.replace(/<\/?b>/g, "").replace(/<[^>]*>/g, "");
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [templateType, setTemplateType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [tagId, setTagId] = useState<string>("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const [, navigate] = useLocation();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery, templateType, status, tagId, ownerId, dateFrom, dateTo]);

  const { data: searchData, isLoading } = useSearchContent({
    q: debouncedQuery || undefined,
    templateType: templateType || undefined,
    status: status || undefined,
    tagId: tagId || undefined,
    ownerId: ownerId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit,
    offset,
  });

  const { data: tags } = useListTags();
  const trackClick = useTrackSearchClick();

  const clearFilters = useCallback(() => {
    setTemplateType("");
    setStatus("");
    setTagId("");
    setOwnerId("");
    setDateFrom("");
    setDateTo("");
    setOffset(0);
  }, []);

  const handleResultClick = useCallback(
    (nodeId: string, position: number) => {
      trackClick.mutate({
        data: { nodeId, position },
      });
      navigate(`/node/${nodeId}`);
    },
    [trackClick, navigate],
  );

  const hasFilters =
    templateType || status || tagId || ownerId || dateFrom || dateTo;
  const totalPages = searchData ? Math.ceil(searchData.total / limit) : 0;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

      <div className="flex flex-wrap gap-2 items-center">
        <Select value={templateType} onValueChange={setTemplateType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seitentyp" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PAGE_TYPE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tagId} onValueChange={setTagId}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            {Array.isArray(tags) &&
              tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            className="w-[140px] h-9 text-xs"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="Von"
          />
          <span className="text-muted-foreground text-xs">–</span>
          <Input
            type="date"
            className="w-[140px] h-9 text-xs"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="Bis"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-3 w-3 mr-1" />
            Filter zurücksetzen
          </Button>
        )}
      </div>

      {searchData?.facets && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(searchData.facets.templateType || {}).map(
            ([key, count]) => (
              <Badge
                key={key}
                variant={templateType === key ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setTemplateType(templateType === key ? "" : key)}
              >
                {PAGE_TYPE_LABELS[key] || key} ({count})
              </Badge>
            ),
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Suche..."
            : `${searchData?.total ?? 0} Ergebnis${(searchData?.total ?? 0) !== 1 ? "se" : ""}`}
        </p>

        {searchData?.results?.map((node, idx) => (
          <Card
            key={node.id}
            className="cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => handleResultClick(node.id, offset + idx)}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {node.headline && node.headline !== node.title
                    ? sanitizeHeadline(node.headline)
                    : node.title}
                </p>
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

        {searchData && searchData.total === 0 && debouncedQuery && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Keine Ergebnisse für &quot;{debouncedQuery}&quot; gefunden.
          </p>
        )}

        {!debouncedQuery && !hasFilters && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Geben Sie einen Suchbegriff ein oder nutzen Sie die Filter.
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Seite {currentPage} von {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setOffset(offset + limit)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
