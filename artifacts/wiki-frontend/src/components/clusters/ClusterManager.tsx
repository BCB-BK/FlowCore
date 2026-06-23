import { useState, useCallback, useId, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
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
import { Card, CardHeader, CardTitle } from "@workspace/ui/card";
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
  const dndId = useId();

  // Lokaler State für DnD – wird in onDragOver in Echtzeit aktualisiert
  // damit SortableContext-Instanzen unterschiedlicher Cluster das Item "sehen"
  const [localClusters, setLocalClusters] = useState<Cluster[]>(clusters);
  const isDragging = useRef(false);

  // Prop-Sync: Wenn clusters von außen kommt (z.B. nach autosave) und kein Drag läuft
  useEffect(() => {
    if (!isDragging.current) {
      setLocalClusters(clusters);
    }
  }, [clusters]);

  const linkedNodeIdSet = new Set(linkedNodeIds);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // assignedMap und unassigned nutzen localClusters damit DnD sofort sichtbar ist
  const assignedMap = new Map<string, string>();
  for (const cl of localClusters) {
    for (const childId of cl.childNodeIds) {
      assignedMap.set(childId, cl.id);
    }
  }

  const unassigned = children.filter((c) => !assignedMap.has(c.id));

  // --- Nicht-DnD-Handler: operieren weiterhin auf `clusters`-Prop via onChange ---

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

  // --- DnD-Handler ---

  const findContainerForItem = (itemId: string, inClusters: Cluster[]) =>
    inClusters.find((c) => c.childNodeIds.includes(itemId))?.id ?? null;

  const handleDragStart = (event: DragStartEvent) => {
    isDragging.current = true;
    setActiveId(event.active.id as string);
  };

  /**
   * Cross-Container-Move in Echtzeit:
   * Wenn das Item über einen anderen Cluster (oder ein Item darin) bewegt wird,
   * verschieben wir es sofort in localClusters. So "sieht" der Ziel-SortableContext
   * das Item und kann korrekt sortieren.
   */
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    const sourceContainerId = findContainerForItem(draggedId, localClusters);
    const overIsCluster = localClusters.some((c) => c.id === overId);
    const targetContainerId = overIsCluster
      ? overId
      : findContainerForItem(overId, localClusters);

    // Nichts tun wenn gleicher Container oder Ziel unbekannt
    if (!targetContainerId || sourceContainerId === targetContainerId) return;

    setLocalClusters((prev) => {
      const next = prev.map((c) => ({ ...c, childNodeIds: [...c.childNodeIds] }));
      const src = next.find((c) => c.id === sourceContainerId);
      const tgt = next.find((c) => c.id === targetContainerId);
      if (!src || !tgt) return prev;

      // Aus Quelle entfernen
      src.childNodeIds = src.childNodeIds.filter((id) => id !== draggedId);

      // In Ziel einfügen: vor dem over-Item oder ans Ende
      if (overIsCluster) {
        tgt.childNodeIds = [...tgt.childNodeIds, draggedId];
      } else {
        const overIdx = tgt.childNodeIds.indexOf(overId);
        tgt.childNodeIds.splice(overIdx >= 0 ? overIdx : tgt.childNodeIds.length, 0, draggedId);
      }

      return next;
    });
  };

  /**
   * Finales Reordering:
   * Bei Drop im gleichen Container → arrayMove.
   * Danach localClusters an Parent melden (onChange).
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    isDragging.current = false;
    setActiveId(null);

    setLocalClusters((prev) => {
      let next = prev;

      if (over) {
        const draggedId = active.id as string;
        const overId = over.id as string;
        const overIsCluster = prev.some((c) => c.id === overId);

        // Nur intra-Container Reordering – Cross-Container wurde schon in onDragOver erledigt
        if (!overIsCluster) {
          const containerId = findContainerForItem(draggedId, prev);
          const overContainerId = findContainerForItem(overId, prev);
          if (containerId && containerId === overContainerId) {
            next = prev.map((c) => {
              if (c.id !== containerId) return c;
              const oldIdx = c.childNodeIds.indexOf(draggedId);
              const newIdx = c.childNodeIds.indexOf(overId);
              if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return c;
              return { ...c, childNodeIds: arrayMove(c.childNodeIds, oldIdx, newIdx) };
            });
          }
        }
      }

      onChange(next);
      return next;
    });
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
            {localClusters.length > 0 && (
              <Badge variant="secondary" className="text-xs">{localClusters.length}</Badge>
            )}
          </div>
          {!addingNew && (
            <Button variant="outline" size="sm" onClick={() => setAddingNew(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Cluster
            </Button>
          )}
        </div>

        {localClusters.length === 0 && !addingNew && (
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

        {localClusters.map((cluster, idx) => {
          const clusterChildren = cluster.childNodeIds
            .map((id) => children.find((c) => c.id === id))
            .filter((c): c is ChildNode => !!c);

          return (
            <Card
              key={cluster.id}
              className="overflow-hidden transition-colors"
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
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleMoveDown(idx)} disabled={idx === localClusters.length - 1}>
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
              <DroppableClusterBody clusterId={cluster.id} isDragging={!!activeId}>
                <SortableContext
                  id={cluster.id}
                  items={cluster.childNodeIds}
                  strategy={verticalListSortingStrategy}
                >
                  {clusterChildren.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1 px-1 select-none">
                      {activeId ? "Hierher ziehen …" : "Noch keine Unterseiten zugeordnet"}
                    </p>
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
              </DroppableClusterBody>
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

/**
 * Registriert jeden Cluster-Container als explizite Drop-Zone via useDroppable.
 * Das ist notwendig, damit auch LEERE Cluster als Drop-Ziel erkannt werden –
 * SortableContext allein erzeugt ohne Items keine Drop-Zone.
 */
function DroppableClusterBody({
  clusterId,
  isDragging,
  children,
}: {
  clusterId: string;
  isDragging: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: clusterId });
  return (
    <div
      ref={setNodeRef}
      className={`p-2 space-y-1 min-h-[40px] rounded transition-colors ${
        isOver && isDragging ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""
      }`}
    >
      {children}
    </div>
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
