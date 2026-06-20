import { useState, useCallback, useId } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
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
  Link2,
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
  linkedNodeIds?: string[];
  onChange: (clusters: Cluster[], removedLinkedNodeIds?: string[]) => void;
  onCreateInCluster?: (clusterId: string) => void;
  onLinkExistingNode?: (clusterId: string) => void;
}

const NOT_ASSIGNED_SENTINEL = "__none__";

export function ClusterManager({
  clusters,
  children,
  linkedNodeIds = [],
  onChange,
  onCreateInCluster,
  onLinkExistingNode,
}: ClusterManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overClusterId, setOverClusterId] = useState<string | null>(null);
  const dndId = useId();

  const linkedNodeIdSet = new Set(linkedNodeIds);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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
      onChange(clusters.map((c) => c.id === clusterId ? { ...c, title: editingTitle.trim() } : c));
      setEditingId(null);
      setEditingTitle("");
    },
    [clusters, editingTitle, onChange],
  );

  const handleDeleteCluster = useCallback(
    (clusterId: string) => {
      const deletedCluster = clusters.find((c) => c.id === clusterId);
      const removedLinkedIds = deletedCluster
        ? deletedCluster.childNodeIds.filter((id) => linkedNodeIdSet.has(id))
        : [];
      onChange(clusters.filter((c) => c.id !== clusterId), removedLinkedIds);
    },
    [clusters, linkedNodeIdSet, onChange],
  );

  const handleMoveUp = useCallback(
    (idx: number) => {
      if (idx <= 0) return;
      const reordered = [...clusters];
      [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
      onChange(reordered.map((c, i) => ({ ...c, sortOrder: i })));
    },
    [clusters, onChange],
  );

  const handleMoveDown = useCallback(
    (idx: number) => {
      if (idx >= clusters.length - 1) return;
      const reordered = [...clusters];
      [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
      onChange(reordered.map((c, i) => ({ ...c, sortOrder: i })));
    },
    [clusters, onChange],
  );

  const handleAssignChild = useCallback(
    (childId: string, newClusterId: string | null) => {
      const updated = clusters.map((c) => ({
        ...c,
        childNodeIds: c.childNodeIds.filter((id) => id !== childId),
      }));
      if (newClusterId) {
        const target = updated.find((c) => c.id === newClusterId);
        if (target) target.childNodeIds = [...target.childNodeIds, childId];
      }
      onChange(updated);
    },
    [clusters, onChange],
  );

  const handleRemoveFromCluster = useCallback(
    (childId: string, clusterId: string) => {
      const updated = clusters.map((c) =>
        c.id === clusterId
          ? { ...c, childNodeIds: c.childNodeIds.filter((id) => id !== childId) }
          : c,
      );
      const removedLinkedIds = linkedNodeIdSet.has(childId) ? [childId] : [];
      onChange(updated, removedLinkedIds);
    },
    [clusters, linkedNodeIdSet, onChange],
  );

  const findClusterForItem = (itemId: string) =>
    clusters.find((c) => c.childNodeIds.includes(itemId))?.id ?? null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | null;
    if (!overId) { setOverClusterId(null); return; }
    const clusterHit = clusters.find((c) => c.id === overId);
    if (clusterHit) { setOverClusterId(clusterHit.id); return; }
    const itemCluster = findClusterForItem(overId);
    setOverClusterId(itemCluster);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverClusterId(null);
    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;
    const sourceClusterId = findClusterForItem(draggedId);
    const overIsCluster = clusters.some((c) => c.id === overId);
    const targetClusterId = overIsCluster ? overId : findClusterForItem(overId);

    if (!targetClusterId) return;

    const updated = clusters.map((c) => ({
      ...c,
      childNodeIds: c.childNodeIds.filter((id) => id !== draggedId),
    }));

    const targetCluster = updated.find((c) => c.id === targetClusterId);
    if (!targetCluster) return;

    if (sourceClusterId === targetClusterId && !overIsCluster) {
      const sourceCluster = updated.find((c) => c.id === sourceClusterId);
      if (sourceCluster) {
        const oldIndex = sourceCluster.childNodeIds.indexOf(draggedId);
        sourceCluster.childNodeIds.splice(0, 0, draggedId);
        const freshCluster = clusters.find((c) => c.id === sourceClusterId)!;
        const originalIds = freshCluster.childNodeIds.filter((id) => id !== draggedId);
        const overIdx = originalIds.indexOf(overId);
        const newIds = [...originalIds];
        newIds.splice(overIdx >= 0 ? overIdx : newIds.length, 0, draggedId);
        sourceCluster.childNodeIds = newIds;
      }
    } else {
      if (overIsCluster) {
        targetCluster.childNodeIds = [...targetCluster.childNodeIds, draggedId];
      } else {
        const overIdx = targetCluster.childNodeIds.indexOf(overId);
        targetCluster.childNodeIds.splice(overIdx >= 0 ? overIdx : targetCluster.childNodeIds.length, 0, draggedId);
      }
    }

    onChange(updated);
  };

  const activeNode = activeId ? children.find((c) => c.id === activeId) : null;
  const activeIsLinked = activeId ? linkedNodeIdSet.has(activeId) : false;

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Cluster-Gruppen</h3>
            {clusters.length > 0 && (
              <Badge variant="secondary" className="text-xs">{clusters.length}</Badge>
            )}
          </div>
          {!addingNew && (
            <Button variant="outline" size="sm" onClick={() => setAddingNew(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Cluster
            </Button>
          )}
        </div>

        {clusters.length === 0 && !addingNew && (
          <p className="text-xs text-muted-foreground py-2">
            Keine Cluster angelegt. Erstellen Sie Cluster, um Unterseiten thematisch zu gruppieren.
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
                if (e.key === "Escape") { setAddingNew(false); setNewTitle(""); }
              }}
            />
            <Button variant="default" size="sm" className="h-8 w-8 p-0" onClick={handleAddCluster} disabled={!newTitle.trim()}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setAddingNew(false); setNewTitle(""); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {clusters.map((cluster, idx) => {
          const clusterChildren = cluster.childNodeIds
            .map((id) => children.find((c) => c.id === id))
            .filter((c): c is ChildNode => !!c);

          return (
            <Card
              key={cluster.id}
              className={`overflow-hidden transition-colors ${overClusterId === cluster.id && activeId && !cluster.childNodeIds.includes(activeId) ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
            >
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
                      <Button variant="default" size="sm" className="h-7 w-7 p-0" onClick={() => handleRename(cluster.id)}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-sm font-medium flex-1">{cluster.title}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">{clusterChildren.length}</Badge>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleMoveUp(idx)} disabled={idx === 0}>
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleMoveDown(idx)} disabled={idx === clusters.length - 1}>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditingId(cluster.id); setEditingTitle(cluster.title); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteCluster(cluster.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                <SortableContext
                  id={cluster.id}
                  items={cluster.childNodeIds}
                  strategy={verticalListSortingStrategy}
                >
                  {clusterChildren.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1 px-1">Noch keine Unterseiten zugeordnet</p>
                  ) : (
                    clusterChildren.map((child) => (
                      <SortableChildRow
                        key={child.id}
                        child={child}
                        clusters={clusters}
                        currentClusterId={cluster.id}
                        isLinked={linkedNodeIdSet.has(child.id)}
                        onAssign={handleAssignChild}
                        onRemove={handleRemoveFromCluster}
                      />
                    ))
                  )}
                </SortableContext>

                <div className="flex gap-1 mt-1">
                  {onCreateInCluster && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-7 text-xs text-muted-foreground hover:text-foreground border border-dashed"
                      onClick={() => onCreateInCluster(cluster.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Neue Seite
                    </Button>
                  )}
                  {onLinkExistingNode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-7 text-xs text-muted-foreground hover:text-foreground border border-dashed"
                      onClick={() => onLinkExistingNode(cluster.id)}
                    >
                      <Link2 className="h-3 w-3 mr-1" />
                      Seite verlinken
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {unassigned.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-medium text-muted-foreground">Nicht zugeordnet</h4>
              <Badge variant="secondary" className="text-[10px] h-4 px-1">{unassigned.length}</Badge>
            </div>
            <div className="space-y-1">
              {unassigned.map((child) => (
                <UnassignedChildRow
                  key={child.id}
                  child={child}
                  clusters={clusters}
                  isLinked={linkedNodeIdSet.has(child.id)}
                  onAssign={handleAssignChild}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeNode && (
          <DragOverlayItem child={activeNode} isLinked={activeIsLinked} />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function SortableChildRow({
  child,
  clusters,
  currentClusterId,
  isLinked,
  onAssign,
  onRemove,
}: {
  child: ChildNode;
  clusters: Cluster[];
  currentClusterId: string;
  isLinked: boolean;
  onAssign: (childId: string, clusterId: string | null) => void;
  onRemove: (childId: string, clusterId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: child.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const typeDef = getPageType(child.templateType);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/50 group select-none"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
        aria-label="Verschieben"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {typeDef && (
        <div className="flex h-5 w-5 items-center justify-center rounded text-white shrink-0" style={{ backgroundColor: typeDef.color }}>
          <PageTypeIcon iconName={typeDef.icon} className="h-2.5 w-2.5" />
        </div>
      )}
      {isLinked && <Link2 className="h-3 w-3 text-muted-foreground shrink-0" aria-label="Verlinkte Seite" />}
      <span className="text-xs flex-1 min-w-0 truncate">{child.title}</span>
      {child.displayCode && (
        <span className="text-[10px] text-muted-foreground shrink-0">{child.displayCode}</span>
      )}
      <button
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5 rounded"
        aria-label={isLinked ? "Verlinkung entfernen" : "Aus Cluster entfernen"}
        onClick={(e) => { e.stopPropagation(); onRemove(child.id, currentClusterId); }}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function UnassignedChildRow({
  child,
  clusters,
  isLinked,
  onAssign,
}: {
  child: ChildNode;
  clusters: Cluster[];
  isLinked: boolean;
  onAssign: (childId: string, clusterId: string | null) => void;
}) {
  const typeDef = getPageType(child.templateType);
  return (
    <div className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/50 group">
      {typeDef && (
        <div className="flex h-5 w-5 items-center justify-center rounded text-white shrink-0" style={{ backgroundColor: typeDef.color }}>
          <PageTypeIcon iconName={typeDef.icon} className="h-2.5 w-2.5" />
        </div>
      )}
      {isLinked && <Link2 className="h-3 w-3 text-muted-foreground shrink-0" aria-label="Verlinkte Seite" />}
      <span className="text-xs flex-1 min-w-0 truncate">{child.title}</span>
      {child.displayCode && (
        <span className="text-[10px] text-muted-foreground shrink-0">{child.displayCode}</span>
      )}
      {clusters.length > 0 && (
        <select
          className="h-6 text-[10px] bg-background border rounded px-1 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          value={NOT_ASSIGNED_SENTINEL}
          onChange={(e) => onAssign(child.id, e.target.value === NOT_ASSIGNED_SENTINEL ? null : e.target.value)}
        >
          <option value={NOT_ASSIGNED_SENTINEL}>Nicht zugeordnet</option>
          {clusters.map((cl) => (
            <option key={cl.id} value={cl.id}>{cl.title}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function DragOverlayItem({ child, isLinked }: { child: ChildNode; isLinked: boolean }) {
  const typeDef = getPageType(child.templateType);
  return (
    <div className="flex items-center gap-2 px-1.5 py-1 rounded bg-background border shadow-lg opacity-95">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {typeDef && (
        <div className="flex h-5 w-5 items-center justify-center rounded text-white shrink-0" style={{ backgroundColor: typeDef.color }}>
          <PageTypeIcon iconName={typeDef.icon} className="h-2.5 w-2.5" />
        </div>
      )}
      {isLinked && <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />}
      <span className="text-xs truncate max-w-[200px]">{child.title}</span>
    </div>
  );
}
