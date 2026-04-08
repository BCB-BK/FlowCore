import { useState, useCallback } from "react";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Layers,
  GripVertical,
} from "lucide-react";
import type { Cluster } from "@/lib/clusters";
import { generateClusterId } from "@/lib/clusters";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { getPageType } from "@/lib/types";

interface ChildNode {
  id: string;
  title: string;
  templateType: string;
  displayCode?: string | null;
}

interface ClusterManagerProps {
  clusters: Cluster[];
  children: ChildNode[];
  onChange: (clusters: Cluster[]) => void;
}

const NOT_ASSIGNED_SENTINEL = "__none__";

export function ClusterManager({
  clusters,
  children,
  onChange,
}: ClusterManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const assignedMap = new Map<string, string>();
  for (const cl of clusters) {
    for (const childId of cl.childNodeIds) {
      assignedMap.set(childId, cl.id);
    }
  }

  const unassigned = children.filter((c) => !assignedMap.has(c.id));

  const handleAddCluster = useCallback(() => {
    if (!newTitle.trim()) return;
    const newCluster: Cluster = {
      id: generateClusterId(),
      title: newTitle.trim(),
      sortOrder: clusters.length,
      childNodeIds: [],
    };
    onChange([...clusters, newCluster]);
    setNewTitle("");
    setAddingNew(false);
  }, [clusters, newTitle, onChange]);

  const handleRename = useCallback(
    (clusterId: string) => {
      if (!editingTitle.trim()) return;
      onChange(
        clusters.map((c) =>
          c.id === clusterId ? { ...c, title: editingTitle.trim() } : c,
        ),
      );
      setEditingId(null);
      setEditingTitle("");
    },
    [clusters, editingTitle, onChange],
  );

  const handleDelete = useCallback(
    (clusterId: string) => {
      onChange(clusters.filter((c) => c.id !== clusterId));
    },
    [clusters, onChange],
  );

  const handleMoveUp = useCallback(
    (idx: number) => {
      if (idx <= 0) return;
      const reordered = [...clusters];
      [reordered[idx - 1], reordered[idx]] = [
        reordered[idx],
        reordered[idx - 1],
      ];
      onChange(
        reordered.map((c, i) => ({ ...c, sortOrder: i })),
      );
    },
    [clusters, onChange],
  );

  const handleMoveDown = useCallback(
    (idx: number) => {
      if (idx >= clusters.length - 1) return;
      const reordered = [...clusters];
      [reordered[idx], reordered[idx + 1]] = [
        reordered[idx + 1],
        reordered[idx],
      ];
      onChange(
        reordered.map((c, i) => ({ ...c, sortOrder: i })),
      );
    },
    [clusters, onChange],
  );

  const handleAssignChild = useCallback(
    (childId: string, clusterId: string | null) => {
      const updated = clusters.map((c) => ({
        ...c,
        childNodeIds: c.childNodeIds.filter((id) => id !== childId),
      }));
      if (clusterId) {
        const target = updated.find((c) => c.id === clusterId);
        if (target) {
          target.childNodeIds = [...target.childNodeIds, childId];
        }
      }
      onChange(updated);
    },
    [clusters, onChange],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Cluster-Gruppen</h3>
          {clusters.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {clusters.length}
            </Badge>
          )}
        </div>
        {!addingNew && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddingNew(true)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Cluster
          </Button>
        )}
      </div>

      {clusters.length === 0 && !addingNew && (
        <p className="text-xs text-muted-foreground py-2">
          Keine Cluster angelegt. Erstellen Sie Cluster, um Unterseiten
          thematisch zu gruppieren.
        </p>
      )}

      {addingNew && (
        <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Cluster-Name..."
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddCluster();
              if (e.key === "Escape") {
                setAddingNew(false);
                setNewTitle("");
              }
            }}
          />
          <Button
            variant="default"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleAddCluster}
            disabled={!newTitle.trim()}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              setAddingNew(false);
              setNewTitle("");
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {clusters.map((cluster, idx) => {
        const clusterChildren = cluster.childNodeIds
          .map((id) => children.find((c) => c.id === id))
          .filter((c): c is ChildNode => !!c);

        return (
          <Card key={cluster.id} className="overflow-hidden">
            <CardHeader className="py-2 px-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {editingId === cluster.id ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(cluster.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleRename(cluster.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-sm font-medium flex-1">
                      {cluster.title}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-4 px-1"
                    >
                      {clusterChildren.length}
                    </Badge>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === clusters.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setEditingId(cluster.id);
                          setEditingTitle(cluster.title);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(cluster.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {clusterChildren.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1 px-1">
                  Noch keine Unterseiten zugeordnet
                </p>
              ) : (
                clusterChildren.map((child) => (
                  <ChildAssignmentRow
                    key={child.id}
                    child={child}
                    clusters={clusters}
                    currentClusterId={cluster.id}
                    onAssign={handleAssignChild}
                  />
                ))
              )}
            </CardContent>
          </Card>
        );
      })}

      {unassigned.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-medium text-muted-foreground">
              Nicht zugeordnet
            </h4>
            <Badge variant="secondary" className="text-[10px] h-4 px-1">
              {unassigned.length}
            </Badge>
          </div>
          <div className="space-y-1">
            {unassigned.map((child) => (
              <ChildAssignmentRow
                key={child.id}
                child={child}
                clusters={clusters}
                currentClusterId={null}
                onAssign={handleAssignChild}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChildAssignmentRow({
  child,
  clusters,
  currentClusterId,
  onAssign,
}: {
  child: ChildNode;
  clusters: Cluster[];
  currentClusterId: string | null;
  onAssign: (childId: string, clusterId: string | null) => void;
}) {
  const typeDef = getPageType(child.templateType);

  return (
    <div className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/50 group">
      {typeDef && (
        <div
          className="flex h-5 w-5 items-center justify-center rounded text-white shrink-0"
          style={{ backgroundColor: typeDef.color }}
        >
          <PageTypeIcon iconName={typeDef.icon} className="h-2.5 w-2.5" />
        </div>
      )}
      <span className="text-xs flex-1 min-w-0 truncate">{child.title}</span>
      {child.displayCode && (
        <span className="text-[10px] text-muted-foreground shrink-0">
          {child.displayCode}
        </span>
      )}
      {clusters.length > 0 && (
        <Select
          value={currentClusterId ?? NOT_ASSIGNED_SENTINEL}
          onValueChange={(val) =>
            onAssign(child.id, val === NOT_ASSIGNED_SENTINEL ? null : val)
          }
        >
          <SelectTrigger className="h-6 w-[120px] text-[10px] shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NOT_ASSIGNED_SENTINEL}>
              Nicht zugeordnet
            </SelectItem>
            {clusters.map((cl) => (
              <SelectItem key={cl.id} value={cl.id}>
                {cl.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
