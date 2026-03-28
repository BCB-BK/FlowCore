import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  useSearchPeople,
  getSearchPeopleQueryKey,
  useSearchGroups,
  getSearchGroupsQueryKey,
} from "@workspace/api-client-react";
import { Input } from "@workspace/ui/input";
import { Label } from "@workspace/ui/label";
import { Badge } from "@workspace/ui/badge";
import { User, Users, X, Search } from "lucide-react";

interface PeoplePickerProps {
  label: string;
  description?: string;
  value?: string;
  displayValue?: string;
  onChange: (id: string | undefined, displayName: string | undefined) => void;
  required?: boolean;
  includeGroups?: boolean;
}

interface SearchResult {
  id: string;
  displayName: string;
  email?: string;
  jobTitle?: string;
  kind: "person" | "group";
}

export function PeoplePicker({
  label,
  description,
  value,
  displayValue,
  onChange,
  required,
  includeGroups = false,
}: PeoplePickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [debouncedQuery, setDebouncedQuery] = useState("");

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(q);
    }, 300);
  }, []);

  const searchEnabled = debouncedQuery.length >= 2;

  const searchParams = { q: debouncedQuery };
  const { data: peopleResults } = useSearchPeople(searchParams, {
    query: {
      queryKey: getSearchPeopleQueryKey(searchParams),
      enabled: searchEnabled,
    },
  });

  const { data: groupResults } = useSearchGroups(searchParams, {
    query: {
      queryKey: getSearchGroupsQueryKey(searchParams),
      enabled: searchEnabled && includeGroups,
    },
  });

  const results: SearchResult[] = useMemo(() => {
    const items: SearchResult[] = [];
    if (peopleResults) {
      for (const p of peopleResults) {
        items.push({
          id: p.id,
          displayName: p.displayName,
          email: p.email ?? undefined,
          jobTitle: p.jobTitle ?? undefined,
          kind: "person",
        });
      }
    }
    if (groupResults && includeGroups) {
      for (const g of groupResults) {
        items.push({
          id: g.id,
          displayName: g.displayName,
          kind: "group",
        });
      }
    }
    return items;
  }, [peopleResults, groupResults, includeGroups]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SearchResult) => {
    onChange(item.id, item.displayName);
    setQuery("");
    setDebouncedQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(undefined, undefined);
  };

  return (
    <div className="space-y-1.5" ref={wrapperRef}>
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {value && displayValue ? (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1.5 py-1">
            <User className="h-3 w-3" />
            {displayValue}
            <button
              type="button"
              onClick={handleClear}
              className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder={
              includeGroups
                ? "Person oder Gruppe suchen..."
                : "Person suchen..."
            }
            value={query}
            onChange={(e) => {
              handleQueryChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />

          {isOpen && results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
              {results.map((item) => (
                <button
                  key={`${item.kind}-${item.id}`}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                  onClick={() => handleSelect(item)}
                >
                  {item.kind === "group" ? (
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {item.displayName}
                      {item.kind === "group" && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (Gruppe)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.email}
                      {item.jobTitle && ` · ${item.jobTitle}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {isOpen && searchEnabled && results.length === 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md p-3">
              <p className="text-sm text-muted-foreground text-center">
                Keine Ergebnisse
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
