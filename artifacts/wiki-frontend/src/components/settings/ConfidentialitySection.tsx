import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import {
  Shield,
  Search,
  Loader2,
  Trash2,
  User,
  Users,
  Plus,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import {
  useSearchPeople,
  getSearchPeopleQueryKey,
  useSearchGroups,
  getSearchGroupsQueryKey,
  useCreatePrincipal,
  useListPrincipals,
  getListPrincipalsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const LEVEL_META: Record<
  string,
  { label: string; description: string; color: string; badgeClass: string }
> = {
  internal: {
    label: "Intern",
    description: "Inhalte nur f\u00FCr zugewiesene Benutzer und Gruppen sichtbar",
    color: "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30",
    badgeClass:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  confidential: {
    label: "Vertraulich",
    description:
      "Eingeschr\u00E4nkter Zugang \u2014 nur ausgew\u00E4hlte Personen/Gruppen",
    color: "border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/30",
    badgeClass:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  },
  strictly_confidential: {
    label: "Streng vertraulich",
    description: "H\u00F6chste Stufe \u2014 minimaler Personenkreis",
    color: "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30",
    badgeClass:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
};

const LEVELS_ORDER = ["internal", "confidential", "strictly_confidential"];

interface Assignment {
  id: string;
  principalId: string;
  displayName: string;
  email: string | null;
  principalType: string;
  assignedAt: string;
}

interface LevelConfig {
  level: string;
  assignments: Assignment[];
}

export function ConfidentialitySection() {
  const [config, setConfig] = useState<LevelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await customFetch<LevelConfig[]>(
        "/api/confidentiality-config",
      );
      setConfig(data);
    } catch {
      toast({
        title: "Fehler",
        description:
          "Vertraulichkeits-Konfiguration konnte nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Vertraulichkeitsstufen
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Weisen Sie Benutzer und Gruppen den Vertraulichkeitsstufen zu.
          Nur zugewiesene Personen k{"\u00F6"}nnen Seiten dieser Stufe sehen.
        </p>
      </div>

      {LEVELS_ORDER.map((level) => {
        const meta = LEVEL_META[level];
        const levelData = config.find((c) => c.level === level);
        return (
          <LevelCard
            key={level}
            level={level}
            meta={meta}
            assignments={levelData?.assignments ?? []}
            onChanged={loadConfig}
          />
        );
      })}

      <Card className="bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
            <span>
              <strong>{"\u00D6"}ffentliche</strong> Seiten sind f{"\u00FC"}r
              alle angemeldeten Nutzer sichtbar und ben{"\u00F6"}tigen keine
              Zuweisung.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
            <span>
              <strong>Benannte Personen</strong> (Prozesseigner, Pr{"\u00FC"}
              fer, Freigeber) haben <em>immer</em> Zugang zu ihrer Seite.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
            <span>
              Seiten ohne zugewiesene Vertraulichkeitsstufe werden wie{" "}
              <strong>{"\u00D6"}ffentlich</strong> behandelt.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LevelCard({
  level,
  meta,
  assignments,
  onChanged,
}: {
  level: string;
  meta: (typeof LEVEL_META)[string];
  assignments: Assignment[];
  onChanged: () => void;
}) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <Card className={meta.color}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Badge className={meta.badgeClass}>{meta.label}</Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              {meta.description}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {assignments.length} Zuweisungen
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.length > 0 && (
          <div className="space-y-1.5">
            {assignments.map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                level={level}
                onRemoved={onChanged}
              />
            ))}
          </div>
        )}

        {assignments.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground italic py-2">
            Noch keine Zuweisungen f{"\u00FC"}r diese Stufe
          </p>
        )}

        {isAdding ? (
          <AddPrincipalToLevel
            level={level}
            existingPrincipalIds={assignments.map((a) => a.principalId)}
            onDone={() => {
              setIsAdding(false);
              onChanged();
            }}
            onCancel={() => setIsAdding(false)}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Benutzer / Gruppe hinzuf{"\u00FC"}gen
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function AssignmentRow({
  assignment,
  level,
  onRemoved,
}: {
  assignment: Assignment;
  level: string;
  onRemoved: () => void;
}) {
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await customFetch("/api/confidentiality-config/assign", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, principalId: assignment.principalId }),
      });
      toast({
        title: "Entfernt",
        description: `${assignment.displayName} wurde von der Stufe entfernt.`,
      });
      onRemoved();
    } catch {
      toast({
        title: "Fehler",
        description: "Konnte nicht entfernt werden.",
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-background/60 border">
      <div className="flex items-center gap-2 min-w-0">
        {assignment.principalType === "group" ? (
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {assignment.displayName}
            {assignment.principalType === "group" && (
              <span className="text-xs text-muted-foreground ml-1">
                (Gruppe)
              </span>
            )}
          </p>
          {assignment.email && (
            <p className="text-xs text-muted-foreground truncate">
              {assignment.email}
            </p>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
        onClick={handleRemove}
        disabled={removing}
      >
        {removing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

interface GraphSearchResult {
  id: string;
  displayName: string;
  email?: string;
  jobTitle?: string;
  kind: "person" | "group";
}

function AddPrincipalToLevel({
  level,
  existingPrincipalIds,
  onDone,
  onCancel,
}: {
  level: string;
  existingPrincipalIds: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const createPrincipal = useCreatePrincipal();

  const { data: principals } = useListPrincipals(
    { limit: 500 },
    { query: { queryKey: getListPrincipalsQueryKey({ limit: 500 }) } },
  );

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(q), 300);
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
      enabled: searchEnabled,
    },
  });

  const existingExternalIds = useMemo(() => {
    if (!principals) return new Set<string>();
    const externalIds = new Set<string>();
    for (const p of principals) {
      if (existingPrincipalIds.includes(p.id) && p.externalId) {
        externalIds.add(p.externalId);
      }
    }
    return externalIds;
  }, [principals, existingPrincipalIds]);

  const results: GraphSearchResult[] = useMemo(() => {
    const items: GraphSearchResult[] = [];
    if (peopleResults) {
      for (const p of peopleResults) {
        if (!existingExternalIds.has(p.id)) {
          items.push({
            id: p.id,
            displayName: p.displayName,
            email: p.email ?? undefined,
            jobTitle: p.jobTitle ?? undefined,
            kind: "person",
          });
        }
      }
    }
    if (groupResults) {
      for (const g of groupResults) {
        if (!existingExternalIds.has(g.id)) {
          items.push({
            id: g.id,
            displayName: g.displayName,
            kind: "group",
          });
        }
      }
    }
    return items;
  }, [peopleResults, groupResults, existingExternalIds]);

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

  const handleSelect = async (item: GraphSearchResult) => {
    setIsAdding(true);
    setIsOpen(false);
    try {
      const principal = await createPrincipal.mutateAsync({
        data: {
          externalId: item.id,
          principalType: item.kind === "group" ? "group" : "user",
          displayName: item.displayName,
          email: item.email ?? null,
        },
      });

      await customFetch("/api/confidentiality-config/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, principalId: principal.id }),
      });

      toast({
        title: "Hinzugef\u00FCgt",
        description: `${item.displayName} wurde der Stufe zugewiesen.`,
      });
      onDone();
    } catch {
      toast({
        title: "Fehler",
        description: `${item.displayName} konnte nicht zugewiesen werden.`,
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 relative" ref={wrapperRef}>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-9"
            placeholder="Name oder E-Mail suchen..."
            value={query}
            onChange={(e) => {
              handleQueryChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            disabled={isAdding}
            autoFocus
          />
        </div>

        {isOpen && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
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
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {item.displayName}
                    {item.kind === "group" && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (Gruppe)
                      </span>
                    )}
                  </p>
                  {(item.email || item.jobTitle) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.email}
                      {item.jobTitle && ` \u00B7 ${item.jobTitle}`}
                    </p>
                  )}
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

      <Button variant="ghost" size="sm" onClick={onCancel} disabled={isAdding}>
        Abbrechen
      </Button>

      {isAdding && (
        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
      )}
    </div>
  );
}
