import { useState } from "react";
import { useLocation } from "wouter";
import {
  Plus,
  Layers,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  MoveRight,
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
  clusters?: Cluster[];
  onAssignToCluster?: (childId: string, clusterId: string | null) => void;
}

const MAX_VISIBLE = 10;
const NOT_ASSIGNED_SENTINEL = "__none__";

function ClusterSection({
  cluster,
  children,
  canCreate,
  onCreateInCluster,
  allClusters,
  onAssignToCluster,
}: {
  cluster: Cluster | null;
  children: ChildNode[];
  canCreate: boolean;
  onCreateInCluster: (clusterId: string | null) => void;
  allClusters?: Cluster[];
  onAssignToCluster?: (childId: string, clusterId: string | null) => void;
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
                    <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                      {child.title}
                    </p>
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

export function DocRegistryView({
  clusterGroups,
  allChildren,
  canCreate,
  onCreateInCluster,
  clusters,
  onAssignToCluster,
}: DocRegistryViewProps) {
  if (clusterGroups.length === 0) {
    const sorted = [...allChildren].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    if (sorted.length === 0) {
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
      <ClusterSection
        cluster={null}
        children={sorted}
        canCreate={canCreate}
        onCreateInCluster={onCreateInCluster}
        allClusters={clusters}
        onAssignToCluster={onAssignToCluster}
      />
    );
  }

  return (
    <div className="space-y-4">
      {clusterGroups.map(({ cluster, children }) => (
        <ClusterSection
          key={cluster?.id ?? "__unassigned__"}
          cluster={cluster}
          children={children}
          canCreate={canCreate}
          onCreateInCluster={onCreateInCluster}
          allClusters={clusters}
          onAssignToCluster={onAssignToCluster}
        />
      ))}
    </div>
  );
}
