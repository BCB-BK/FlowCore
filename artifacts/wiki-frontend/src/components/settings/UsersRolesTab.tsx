import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/select";
import { Separator } from "@workspace/ui/separator";
import {
  User,
  Users,
  Search,
  UserPlus,
  ShieldCheck,
  Trash2,
  Loader2,
  AlertCircle,
  Crown,
  Eye,
  Edit3,
  CheckSquare,
  FileCheck,
  Shield,
  Building2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/dialog";
import { Checkbox } from "@workspace/ui/checkbox";
import {
  useListPrincipals,
  getListPrincipalsQueryKey,
  useGetPrincipal,
  getGetPrincipalQueryKey,
  useAssignRole,
  useRevokeRole,
  useCreatePrincipal,
  useSearchPeople,
  getSearchPeopleQueryKey,
  useSearchGroups,
  getSearchGroupsQueryKey,
  useGetRolePermissionMatrix,
} from "@workspace/api-client-react";
import type {
  PrincipalWithRoles,
  RoleAssignment,
  AssignRoleInputRole,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<string, string> = {
  system_admin: "System-Administrator",
  process_manager: "Prozessmanager",
  editor: "Editor",
  reviewer: "Reviewer",
  approver: "Genehmiger",
  compliance_manager: "Compliance-Manager",
  viewer: "Betrachter",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  system_admin: "Voller Zugriff auf alle Funktionen und Einstellungen",
  process_manager: "Verwaltet Prozessstrukturen und Verantwortlichkeiten",
  editor: "Kann Inhalte erstellen und bearbeiten",
  reviewer: "Kann Inhalte prüfen und Änderungen vorschlagen",
  approver: "Kann Inhalte genehmigen und veröffentlichen",
  compliance_manager: "Überwacht Richtlinien und Compliance-Anforderungen",
  viewer: "Lesezugriff auf veröffentlichte Inhalte",
};

const ROLE_ICONS: Record<string, typeof Crown> = {
  system_admin: Crown,
  process_manager: Building2,
  editor: Edit3,
  reviewer: Eye,
  approver: CheckSquare,
  compliance_manager: FileCheck,
  viewer: Eye,
};

const ROLE_COLORS: Record<string, string> = {
  system_admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  process_manager:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  editor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  reviewer: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  approver: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  compliance_manager:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  viewer: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const ALL_ROLE_KEYS = [
  "system_admin",
  "process_manager",
  "editor",
  "reviewer",
  "approver",
  "compliance_manager",
  "viewer",
] as const;

const PERMISSION_LABELS: Record<string, string> = {
  view_home: "Startseite",
  view_search: "Suche",
  view_glossary: "Glossar",
  view_dashboard: "Dashboard",
  view_tasks: "Meine Aufgaben",
  view_settings: "Einstellungen",
  read_page: "Seiten lesen",
  create_page: "Seiten erstellen",
  edit_content: "Inhalte bearbeiten",
  edit_structure: "Struktur bearbeiten",
  manage_relations: "Verknüpfungen verwalten",
  submit_for_review: "Zur Prüfung einreichen",
  review_page: "Seiten prüfen",
  approve_page: "Seiten genehmigen",
  archive_page: "Seiten archivieren",
  manage_permissions: "Berechtigungen verwalten",
  manage_templates: "Templates verwalten",
  manage_settings: "Einstellungen verwalten",
  view_audit_log: "Audit-Log einsehen",
  manage_connectors: "Konnektoren verwalten",
  manage_backup: "Backup konfigurieren",
  run_backup: "Backup ausführen",
  restore_backup: "Backup wiederherstellen",
  view_backups: "Backups einsehen",
  manage_media: "Medien global verwalten",
};

const PERMISSION_GROUPS: { label: string; permissions: string[] }[] = [
  {
    label: "Ansichten",
    permissions: [
      "view_home",
      "view_search",
      "view_glossary",
      "view_dashboard",
      "view_tasks",
      "view_settings",
    ],
  },
  {
    label: "Inhalte",
    permissions: [
      "read_page",
      "create_page",
      "edit_content",
      "edit_structure",
      "manage_relations",
    ],
  },
  {
    label: "Workflow",
    permissions: [
      "submit_for_review",
      "review_page",
      "approve_page",
      "archive_page",
    ],
  },
  {
    label: "Administration",
    permissions: [
      "manage_permissions",
      "manage_templates",
      "manage_settings",
      "view_audit_log",
      "manage_connectors",
      "manage_backup",
      "run_backup",
      "restore_backup",
      "view_backups",
      "manage_media",
    ],
  },
];

interface GraphSearchResult {
  id: string;
  displayName: string;
  email?: string;
  jobTitle?: string;
  kind: "person" | "group";
}

export function UsersRolesTab() {
  const queryClient = useQueryClient();
  const [selectedPrincipalId, setSelectedPrincipalId] = useState<string | null>(
    null,
  );

  const { data: principals, isLoading } = useListPrincipals(
    { limit: 200 },
    { query: { queryKey: getListPrincipalsQueryKey({ limit: 200 }) } },
  );

  const principalsByRole = useMemo(() => {
    if (!principals) return {};
    return principals.reduce(
      (acc, p) => {
        if (p.roles && p.roles.length > 0) {
          for (const role of p.roles) {
            if (!role.revokedAt) {
              (acc[role.role] ??= []).push({ principal: p, assignment: role });
            }
          }
        }
        return acc;
      },
      {} as Record<
        string,
        { principal: PrincipalWithRoles; assignment: RoleAssignment }[]
      >,
    );
  }, [principals]);

  return (
    <div className="space-y-6">
      <AddPrincipalSection
        onPrincipalAdded={(id) => {
          queryClient.invalidateQueries({
            queryKey: getListPrincipalsQueryKey(),
          });
          setSelectedPrincipalId(id);
        }}
      />

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Aktuelle Rollenzuweisungen
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <PrincipalsList
              principals={principals ?? []}
              selectedId={selectedPrincipalId}
              onSelect={setSelectedPrincipalId}
            />
          )}
        </div>

        <div>
          {selectedPrincipalId ? (
            <PrincipalDetail
              principalId={selectedPrincipalId}
              onChanged={() => {
                queryClient.invalidateQueries({
                  queryKey: getListPrincipalsQueryKey(),
                });
              }}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Wählen Sie eine Person oder Gruppe aus, um Rollen zu verwalten
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Separator />

      <RoleOverviewSection
        principalsByRole={principalsByRole}
        onSelectPrincipal={setSelectedPrincipalId}
      />
    </div>
  );
}

function AddPrincipalSection({
  onPrincipalAdded,
}: {
  onPrincipalAdded: (id: string) => void;
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("viewer");
  const [isAdding, setIsAdding] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const createPrincipal = useCreatePrincipal();
  const assignRole = useAssignRole();

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

  const results: GraphSearchResult[] = useMemo(() => {
    const items: GraphSearchResult[] = [];
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
    if (groupResults) {
      for (const g of groupResults) {
        items.push({
          id: g.id,
          displayName: g.displayName,
          kind: "group",
        });
      }
    }
    return items;
  }, [peopleResults, groupResults]);

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

      await assignRole.mutateAsync({
        principalId: principal.id,
        data: {
          role: selectedRole as AssignRoleInputRole,
          scope: null,
        },
      });

      toast({
        title: "Hinzugefügt",
        description: `${item.displayName} wurde als ${ROLE_LABELS[selectedRole]} hinzugefügt.`,
      });

      onPrincipalAdded(principal.id);
      setQuery("");
      setDebouncedQuery("");
    } catch {
      toast({
        title: "Fehler",
        description: `${item.displayName} konnte nicht hinzugefügt werden.`,
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="h-5 w-5" />
          Person oder Gruppe hinzufügen
        </CardTitle>
        <CardDescription>
          Suchen Sie nach Personen oder Gruppen aus Microsoft Entra ID und
          weisen Sie ihnen eine Rolle zu
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="flex-1 relative" ref={wrapperRef}>
            <label className="text-sm font-medium mb-1.5 block">
              Person / Gruppe
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Name oder E-Mail suchen..."
                value={query}
                onChange={(e) => {
                  handleQueryChange(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                disabled={isAdding}
              />
            </div>

            {isOpen && results.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
                {results.map((item) => (
                  <button
                    key={`${item.kind}-${item.id}`}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-left"
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
                          {item.jobTitle && ` · ${item.jobTitle}`}
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

          <div className="w-48">
            <label className="text-sm font-medium mb-1.5 block">Rolle</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLE_KEYS.map((roleKey) => (
                  <SelectItem key={roleKey} value={roleKey}>
                    {ROLE_LABELS[roleKey]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isAdding && (
            <Loader2 className="h-5 w-5 animate-spin text-primary mb-2" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PrincipalsList({
  principals,
  selectedId,
  onSelect,
}: {
  principals: PrincipalWithRoles[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const principalsWithRoles = principals.filter(
    (p) => p.roles && p.roles.some((r) => !r.revokedAt),
  );

  const principalsWithoutRoles = principals.filter(
    (p) => !p.roles || p.roles.every((r) => r.revokedAt),
  );

  if (principalsWithRoles.length === 0 && principalsWithoutRoles.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            Noch keine Benutzer oder Gruppen registriert. Fügen Sie oben
            Personen oder Gruppen hinzu.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      {principalsWithRoles.map((p) => (
        <PrincipalRow
          key={p.id}
          principal={p}
          isSelected={p.id === selectedId}
          onSelect={() => onSelect(p.id)}
        />
      ))}
      {principalsWithoutRoles.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground pt-3 pb-1">
            Ohne Rollenzuweisung ({principalsWithoutRoles.length})
          </p>
          {principalsWithoutRoles.map((p) => (
            <PrincipalRow
              key={p.id}
              principal={p}
              isSelected={p.id === selectedId}
              onSelect={() => onSelect(p.id)}
            />
          ))}
        </>
      )}
    </div>
  );
}

function PrincipalRow({
  principal,
  isSelected,
  onSelect,
}: {
  principal: PrincipalWithRoles;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const activeRoles = (principal.roles ?? []).filter((r) => !r.revokedAt);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "hover:bg-muted/50"
      }`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted shrink-0">
        {principal.principalType === "group" ? (
          <Users className="h-4 w-4 text-muted-foreground" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {principal.displayName}
          </span>
          {principal.principalType === "group" && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              Gruppe
            </Badge>
          )}
        </div>
        {principal.email && (
          <p className="text-xs text-muted-foreground truncate">
            {principal.email}
          </p>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        {activeRoles.map((role) => {
          const roleStr = role.role as string;
          return (
            <Badge
              key={role.id}
              className={`text-[10px] ${ROLE_COLORS[roleStr]}`}
            >
              {ROLE_LABELS[roleStr] ?? roleStr}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

function PrincipalDetail({
  principalId,
  onChanged,
}: {
  principalId: string;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newRole, setNewRole] = useState<string>("");

  const { data: principal, isLoading } = useGetPrincipal(principalId, {
    query: { queryKey: getGetPrincipalQueryKey(principalId) },
  });

  const assignRoleMutation = useAssignRole();
  const revokeRoleMutation = useRevokeRole();

  const activeRoles = (principal?.roles ?? []).filter((r) => !r.revokedAt);
  const assignedRoleNames = new Set(activeRoles.map((r) => r.role as string));

  const handleAssignRole = async () => {
    if (!newRole || !principal) return;
    try {
      await assignRoleMutation.mutateAsync({
        principalId: principal.id,
        data: { role: newRole as AssignRoleInputRole, scope: null },
      });
      toast({
        title: "Rolle zugewiesen",
        description: `${ROLE_LABELS[newRole]} wurde ${principal.displayName} zugewiesen.`,
      });
      setNewRole("");
      queryClient.invalidateQueries({
        queryKey: getGetPrincipalQueryKey(principalId),
      });
      onChanged();
    } catch {
      toast({
        title: "Fehler",
        description: "Rolle konnte nicht zugewiesen werden.",
        variant: "destructive",
      });
    }
  };

  const handleRevokeRole = async (assignmentId: string, roleName: string) => {
    if (!principal) return;
    try {
      await revokeRoleMutation.mutateAsync({
        principalId: principal.id,
        assignmentId,
      });
      toast({
        title: "Rolle entfernt",
        description: `${ROLE_LABELS[roleName] ?? roleName} wurde von ${principal.displayName} entfernt.`,
      });
      queryClient.invalidateQueries({
        queryKey: getGetPrincipalQueryKey(principalId),
      });
      onChanged();
    } catch {
      toast({
        title: "Fehler",
        description: "Rolle konnte nicht entfernt werden.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!principal) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Principal nicht gefunden
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            {principal.principalType === "group" ? (
              <Users className="h-5 w-5 text-primary" />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">
              {principal.displayName}
            </CardTitle>
            {principal.email && (
              <CardDescription className="truncate">
                {principal.email}
              </CardDescription>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {principal.principalType === "group" ? "Gruppe" : "Benutzer"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {principal.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">Zugewiesene Rollen</h4>
          {activeRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Keine Rollen zugewiesen
            </p>
          ) : (
            <div className="space-y-2">
              {activeRoles.map((role) => {
                const roleStr = role.role as string;
                const Icon = ROLE_ICONS[roleStr] ?? Shield;
                return (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-2.5 rounded-md border bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {ROLE_LABELS[roleStr] ?? roleStr}
                        </p>
                        {role.scope && role.scope !== "global" && (
                          <p className="text-xs text-muted-foreground">
                            Bereich: {role.scope}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleRevokeRole(role.id, roleStr)}
                      disabled={revokeRoleMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-semibold mb-2">Rolle hinzufügen</h4>
          <div className="flex gap-2">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Rolle wählen..." />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLE_KEYS.map((roleKey) => {
                  const alreadyAssigned = assignedRoleNames.has(roleKey);
                  return (
                    <SelectItem
                      key={roleKey}
                      value={roleKey}
                      disabled={alreadyAssigned}
                    >
                      {ROLE_LABELS[roleKey]}
                      {alreadyAssigned && " (bereits zugewiesen)"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleAssignRole}
              disabled={!newRole || assignRoleMutation.isPending}
            >
              {assignRoleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleOverviewSection({
  principalsByRole,
  onSelectPrincipal,
}: {
  principalsByRole: Record<
    string,
    { principal: PrincipalWithRoles; assignment: RoleAssignment }[]
  >;
  onSelectPrincipal: (id: string) => void;
}) {
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const { data: permMatrix } = useGetRolePermissionMatrix();

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Rollen-Übersicht</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Klicken Sie auf eine Rolle, um die Berechtigungen im Detail anzuzeigen.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ALL_ROLE_KEYS.map((roleKey) => {
          const Icon = ROLE_ICONS[roleKey] ?? Shield;
          const members = principalsByRole[roleKey] ?? [];
          const perms = permMatrix?.[roleKey] ?? [];
          return (
            <Card
              key={roleKey}
              role="button"
              tabIndex={0}
              className="p-4 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setEditingRole(roleKey)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                  e.preventDefault();
                  setEditingRole(roleKey);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-md ${ROLE_COLORS[roleKey]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold">
                    {ROLE_LABELS[roleKey]}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ROLE_DESCRIPTIONS[roleKey]}
                  </p>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {perms.slice(0, 5).map((perm) => (
                      <Badge
                        key={perm}
                        variant="outline"
                        className="text-[10px] font-normal"
                      >
                        {PERMISSION_LABELS[perm] ?? perm}
                      </Badge>
                    ))}
                    {perms.length > 5 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-normal"
                      >
                        +{perms.length - 5} weitere
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {members.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        Keine Zuweisungen
                      </span>
                    ) : (
                      members.map(({ principal }) => (
                        <Badge
                          key={principal.id}
                          variant="secondary"
                          className="text-xs cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPrincipal(principal.id);
                          }}
                        >
                          {principal.principalType === "group" ? (
                            <Users className="h-3 w-3 mr-1" />
                          ) : (
                            <User className="h-3 w-3 mr-1" />
                          )}
                          {principal.displayName}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {members.length} Nutzer
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {perms.length} Rechte
                  </Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {editingRole && permMatrix && (
        <RolePermissionDialog
          roleKey={editingRole}
          permissions={permMatrix[editingRole] ?? []}
          members={principalsByRole[editingRole] ?? []}
          onClose={() => setEditingRole(null)}
          onSelectPrincipal={onSelectPrincipal}
        />
      )}
    </div>
  );
}

function RolePermissionDialog({
  roleKey,
  permissions,
  members,
  onClose,
  onSelectPrincipal,
}: {
  roleKey: string;
  permissions: string[];
  members: { principal: PrincipalWithRoles; assignment: RoleAssignment }[];
  onClose: () => void;
  onSelectPrincipal: (id: string) => void;
}) {
  const Icon = ROLE_ICONS[roleKey] ?? Shield;
  const permSet = new Set(permissions);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${ROLE_COLORS[roleKey]}`}>
              <Icon className="h-5 w-5" />
            </div>
            {ROLE_LABELS[roleKey]} — Berechtigungen
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {ROLE_DESCRIPTIONS[roleKey]}
        </p>

        <div className="space-y-5 mt-2">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.label}>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {group.label}
              </h4>
              <div className="space-y-1">
                {group.permissions.map((perm) => {
                  const hasPermission = permSet.has(perm);
                  return (
                    <label
                      key={perm}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-default"
                    >
                      <Checkbox
                        checked={hasPermission}
                        disabled
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium">
                          {PERMISSION_LABELS[perm] ?? perm}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({perm})
                        </span>
                      </div>
                      {hasPermission && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        >
                          Aktiv
                        </Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-2" />

        <div>
          <h4 className="text-sm font-semibold mb-2">
            Zugewiesene Nutzer & Gruppen ({members.length})
          </h4>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Keine Zuweisungen für diese Rolle
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {members.map(({ principal }) => (
                <Badge
                  key={principal.id}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-secondary/80"
                  onClick={() => {
                    onSelectPrincipal(principal.id);
                    onClose();
                  }}
                >
                  {principal.principalType === "group" ? (
                    <Users className="h-3 w-3 mr-1" />
                  ) : (
                    <User className="h-3 w-3 mr-1" />
                  )}
                  {principal.displayName}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
