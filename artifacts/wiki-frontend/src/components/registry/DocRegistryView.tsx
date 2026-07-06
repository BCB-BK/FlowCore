import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Plus,
  Layers,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  MoveRight,
  Link2,
  Filter,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "@workspace/ui/button";
import { Badge } from "@workspace/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/select";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { StatusBadge } from "@/components/versioning/StatusBadge";
import { getPageType } from "@/lib/types";
import type { Cluster } from "@/lib/clusters";

interface ChildNode {
  id: string;
  title: string;
  displayCode?: string | null;
  templateType: string;
  status: string;
  updatedAt: string;
  publishedRevisionId?: string | null;
}

interface DocRegistryViewProps {
  clusterGroups: { cluster: Cluster | null; children: ChildNode[] }[];
  allChildren: ChildNode[];
  canCreate: boolean;
  onCreateInCluster: (clusterId: string | null) => void;
  onLinkInCluster?: (clusterId: string | null) => void;
  clusters?: Cluster[];
  onAssignToCluster?: (childId: string, clusterId: string | null) => void;
  canEdit?: boolean;
  linkedNodeIds?: Set<string>;
  onRemoveFromCluster?: (childId: string, clusterId: string) => void;
  onDeleteCluster?: (clusterId: string) => void;
}

const MAX_VISIBLE = 10;
const NOT_ASSIGNED_SENTINEL = "__none__";

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  in_review: "In Prüfung",
  approved: "Genehmigt",
  published: "Veröffentlicht",
  archived: "Archiviert",
};

function ClusterSection({
  cluster,
  children,
  canCreate,
  canEdit,
  onCreateInCluster,
  onLinkInCluster,
  allClusters,
  onAssignToCluster,
  linkedNodeIds,
  onRemoveFromCluster,
  onDeleteCluster,
}: {
  cluster: Cluster | null;
  children: ChildNode[];
  canCreate: boolean;
  canEdit?: boolean;
  onCreateInCluster: (clusterId: string | null) => void;
  onLinkInCluster?: (clusterId: string | null) => void;
  allClusters?: Cluster[];
  onAssignToCluster?: (childId: string, clusterId: string | null) => void;
  linkedNodeIds?: Set<string>;
  onRemoveFromCluster?: (childId: string, clusterId: string) => void;
  onDeleteCluster?: (clusterId: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [, navigate] = useLocation();

  const sorted = [...children].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const visible = showAll ? sorted : sorted.slice(0, MAX_VISIBLE);
  const hasMore = sorted.length > MAX_VISIBLE;
  const hiddenCount = sorted.length - MAX_VISIBLE;

  const isUnassigned = cluster === null;
  const canReassign = isUnassigned && !!onAssignToCluster && allClusters && allClusters.length > 0;

  return (
    <div className={`rounded-lg border bg-card ${isUnassigned && children.length > 0 ? "border-amber-200 dark:border-amber-800" : ""}`}>
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${isUnassigned && children.length > 0 ? "bg-amber-50/60 dark:bg-amber-950/30" : "bg-muted/40"}`}>
        <div className={`flex h-7 w-7 items-center justify-center rounded-md shrink-0 ${isUnassigned && children.length > 0 ? "bg-amber-100 dark:bg-amber-900" : "bg-primary/10"}`}>
          <Layers className={`h-4 w-4 ${isUnassigned && children.length > 0 ? "text-amber-600" : "text-primary"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold leading-tight truncate ${isUnassigned && children.length > 0 ? "text-amber-700 dark:text-amber-400" : ""}`}>
            {cluster?.title ?? "Nicht zugeordnet"}
          </h4>
          {isUnassigned && children.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              Diese Seiten sind keinem Cluster zugeordnet
            </p>
          )}
        </div>
        <Badge
          variant="secondary"
          className={`text-[10px] h-5 px-1.5 shrink-0 ${isUnassigned && children.length > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400" : ""}`}
        >
          {children.length} {children.length === 1 ? "Seite" : "Seiten"}
        </Badge>
        {onLinkInCluster && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs shrink-0 text-muted-foreground hover:text-foreground"
            title="Bestehende Seite verlinken"
            onClick={() => onLinkInCluster(cluster?.id ?? null)}
          >
            <Link2 className="h-3 w-3 mr-1" />
            Verlinken
          </Button>
        )}
        {canCreate && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs shrink-0"
            onClick={() => onCreateInCluster(cluster?.id ?? null)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Neu
          </Button>
        )}
        {canEdit && cluster?.id && onDeleteCluster && (
          <button
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
            aria-label="Cluster löschen"
            title="Cluster löschen"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCluster(cluster.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {visible.length > 0 ? (
        <div className="divide-y">
          {visible.map((child) => {
            const childDef = getPageType(child.templateType);
            return (
              <div
                key={child.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group"
              >
                <div
                  className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/node/${child.id}`)}
                >
                  {childDef ? (
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0"
                      style={{ backgroundColor: childDef.color }}
                    >
                      <PageTypeIcon iconName={childDef.icon} className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                      <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                        {child.title}
                      </p>
                      {linkedNodeIds?.has(child.id) && (
                        <span title="Verlinkte Seite (kein Kind dieser Seite)" className="shrink-0">
                          <Link2 className="h-3 w-3 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {child.displayCode}
                      </span>
                      {childDef && (
                        <span className="text-[10px] text-muted-foreground/70">
                          {childDef.labelDe ?? childDef.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                    <span>
                      {new Date(child.updatedAt).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                  <StatusBadge
                    status={
                      child.status as Parameters<typeof StatusBadge>[0]["status"]
                    }
                    compact
                  />
                </div>
                {canEdit && cluster?.id && onRemoveFromCluster && (
                  <button
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
                    aria-label={linkedNodeIds?.has(child.id) ? "Verlinkung entfernen" : "Aus Cluster entfernen"}
                    title={linkedNodeIds?.has(child.id) ? "Verlinkung entfernen" : "Aus Cluster entfernen"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromCluster(child.id, cluster.id);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {canReassign && allClusters && (
                  <Select
                    value={NOT_ASSIGNED_SENTINEL}
                    onValueChange={(val) =>
                      onAssignToCluster!(child.id, val === NOT_ASSIGNED_SENTINEL ? null : val)
                    }
                  >
                    <SelectTrigger
                      className="h-7 w-[140px] text-[10px] shrink-0 border-amber-300 text-amber-700 hover:border-amber-400 focus:ring-amber-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoveRight className="h-3 w-3 mr-1 shrink-0" />
                      <SelectValue placeholder="Zuordnen…" />
                    </SelectTrigger>
                    <SelectContent onClick={(e) => e.stopPropagation()}>
                      <SelectItem value={NOT_ASSIGNED_SENTINEL} disabled>
                        Cluster wählen…
                      </SelectItem>
                      {allClusters.map((cl) => (
                        <SelectItem key={cl.id} value={cl.id}>
                          {cl.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Seiten in diesem Cluster
          </p>
          {canCreate && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => onCreateInCluster(cluster?.id ?? null)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Erste Seite anlegen
            </Button>
          )}
        </div>
      )}

      {hasMore && (
        <div className="px-4 py-2 border-t flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Weniger anzeigen
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                {hiddenCount} weitere anzeigen
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterBar({
  filterStatus,
  setFilterStatus,
  filterType,
  setFilterType,
  availableTypes,
  activeFilterCount,
  onClear,
}: {
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  availableTypes: string[];
  activeFilterCount: number;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        <Filter className="h-3.5 w-3.5" />
        <span>Filter:</span>
      </div>

      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="h-7 w-[140px] text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Status</SelectItem>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <SelectItem key={val} value={val}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {availableTypes.length > 1 && (
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-7 w-[160px] text-xs">
            <SelectValue placeholder="Seitentyp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Seitentypen</SelectItem>
            {availableTypes.map((t) => {
              const def = getPageType(t);
              return (
                <SelectItem key={t} value={t}>
                  {def?.labelDe ?? def?.label ?? t}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={onClear}
        >
          <X className="h-3 w-3 mr-1" />
          Filter zurücksetzen
          <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
            {activeFilterCount}
          </Badge>
        </Button>
      )}
    </div>
  );
}

export function DocRegistryView({
  clusterGroups,
  allChildren,
  canCreate,
  onCreateInCluster,
  onLinkInCluster,
  clusters,
  onAssignToCluster,
  canEdit,
  linkedNodeIds,
  onRemoveFromCluster,
  onDeleteCluster,
}: DocRegistryViewProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const availableTypes = useMemo(
    () => [...new Set(allChildren.map((c) => c.templateType))].sort(),
    [allChildren],
  );

  const activeFilterCount = (filterStatus !== "all" ? 1 : 0) + (filterType !== "all" ? 1 : 0);
  const hasActiveFilter = activeFilterCount > 0;

  function matchesFilter(child: ChildNode) {
    if (filterStatus !== "all" && child.status !== filterStatus) return false;
    if (filterType !== "all" && child.templateType !== filterType) return false;
    return true;
  }

  function clearFilters() {
    setFilterStatus("all");
    setFilterType("all");
  }

  const filteredClusterGroups = useMemo(() => {
    if (!hasActiveFilter) return clusterGroups;
    return clusterGroups
      .map(({ cluster, children }) => ({
        cluster,
        children: children.filter(matchesFilter),
      }))
      .filter(({ children }) => children.length > 0);
  }, [clusterGroups, filterStatus, filterType, hasActiveFilter]);

  const filteredFlatChildren = useMemo(
    () => allChildren.filter(matchesFilter),
    [allChildren, filterStatus, filterType],
  );

  const showFilterBar = allChildren.length > 0;

  if (clusterGroups.length === 0) {
    const sorted = [...filteredFlatChildren].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    if (allChildren.length === 0) {
      return (
        <div className="rounded-lg border bg-card px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Seiten vorhanden
          </p>
          {canCreate && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => onCreateInCluster(null)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Erste Seite anlegen
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {showFilterBar && (
          <FilterBar
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterType={filterType}
            setFilterType={setFilterType}
            availableTypes={availableTypes}
            activeFilterCount={activeFilterCount}
            onClear={clearFilters}
          />
        )}
        {sorted.length === 0 ? (
          <div className="rounded-lg border bg-card px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">Keine Einträge entsprechen dem Filter</p>
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={clearFilters}>
              Filter zurücksetzen
            </Button>
          </div>
        ) : (
          <ClusterSection
            cluster={null}
            children={sorted}
            canCreate={canCreate}
            canEdit={canEdit}
            onCreateInCluster={onCreateInCluster}
            onLinkInCluster={onLinkInCluster}
            allClusters={clusters}
            onAssignToCluster={onAssignToCluster}
            linkedNodeIds={linkedNodeIds}
            onRemoveFromCluster={onRemoveFromCluster}
            onDeleteCluster={onDeleteCluster}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showFilterBar && (
        <FilterBar
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterType={filterType}
          setFilterType={setFilterType}
          availableTypes={availableTypes}
          activeFilterCount={activeFilterCount}
          onClear={clearFilters}
        />
      )}

      {filteredClusterGroups.length === 0 && hasActiveFilter ? (
        <div className="rounded-lg border bg-card px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">Keine Einträge entsprechen dem Filter</p>
          <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={clearFilters}>
            Filter zurücksetzen
          </Button>
        </div>
      ) : (
        filteredClusterGroups.map(({ cluster, children }) => (
          <ClusterSection
            key={cluster?.id ?? "__unassigned__"}
            cluster={cluster}
            children={children}
            canCreate={canCreate}
            canEdit={canEdit}
            onCreateInCluster={onCreateInCluster}
            onLinkInCluster={onLinkInCluster}
            allClusters={clusters}
            onAssignToCluster={onAssignToCluster}
            linkedNodeIds={linkedNodeIds}
            onRemoveFromCluster={onRemoveFromCluster}
            onDeleteCluster={onDeleteCluster}
          />
        ))
      )}
    </div>
  );
}
