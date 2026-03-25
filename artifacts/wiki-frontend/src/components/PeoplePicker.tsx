import { useState, useCallback, useRef, useEffect } from "react";
import {
  useSearchPeople,
  getSearchPeopleQueryKey,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, X, Search } from "lucide-react";

interface PeoplePickerProps {
  label: string;
  description?: string;
  value?: string;
  displayValue?: string;
  onChange: (id: string | undefined, displayName: string | undefined) => void;
  required?: boolean;
}

export function PeoplePicker({
  label,
  description,
  value,
  displayValue,
  onChange,
  required,
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

  const searchParams = { q: debouncedQuery };
  const { data: results } = useSearchPeople(searchParams, {
    query: {
      queryKey: getSearchPeopleQueryKey(searchParams),
      enabled: debouncedQuery.length >= 2,
    },
  });

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

  const handleSelect = (person: { id: string; displayName: string }) => {
    onChange(person.id, person.displayName);
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
            placeholder="Person suchen..."
            value={query}
            onChange={(e) => {
              handleQueryChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />

          {isOpen && results && results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
              {results.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                  onClick={() => handleSelect(person)}
                >
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{person.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {person.email}
                      {person.jobTitle && ` · ${person.jobTitle}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {isOpen &&
            debouncedQuery.length >= 2 &&
            results &&
            results.length === 0 && (
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
