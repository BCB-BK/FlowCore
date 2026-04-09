import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@workspace/ui/dialog";
import { Button } from "@workspace/ui/button";
import { Badge } from "@workspace/ui/badge";
import {
  useListRootNodes,
  useGetNodeChildren,
  useMoveNode,
  getGetNodeQueryKey,
  getGetNodeChildrenQueryKey,
  getListRootNodesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { getPageType } from "@/lib/types";

interface MoveNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  nodeTitle: string;
  nodeDisplayCode: string | null;
  currentParentId: string | null;
}

function TreePickerNode({
  node,
  excludeId,
  selectedId,
  onSelect,
  depth,
}: {
  node: { id: string; title: string; displayCode: string | null; templateType: string };
  excludeId: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const { data: children } = useGetNodeChildren(node.id, {
    query: { enabled: expanded },
  });

  if (node.id === excludeId) return null;

  const pageDef = getPageType(node.templateType);
  const isSelected = selectedId === node.id;
  const filteredChildren = children?.filter((c) => c.id !== excludeId) ?? [];

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer text-sm transition-colors ${
          isSelected
            ? "bg-primary/10 ring-1 ring-primary/30"
            : "hover:bg-muted/60"
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        <button
          className="p-0.5 hover:bg-muted rounded shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        {pageDef ? (
          <div
            className="flex h-5 w-5 items-center justify-center rounded text-white shrink-0"
            style={{ backgroundColor: pageDef.color }}
          >
            <PageTypeIcon iconName={pageDef.icon} className="h-3 w-3" />
          </div>
        ) : (
          <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="truncate font-medium">{node.title}</span>
        {node.displayCode && (
          <span className="text-[10px] text-muted-foreground shrink-0">
            {node.displayCode}
          </span>
        )}
      </div>
      {expanded &&
        filteredChildren.map((child) => (
          <TreePickerNode
            key={child.id}
            node={child}
            excludeId={excludeId}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

export function MoveNodeDialog({
  open,
  onOpenChange,
  nodeId,
  nodeTitle,
  nodeDisplayCode,
  currentParentId,
}: MoveNodeDialogProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: roots } = useListRootNodes({
    query: { enabled: open },
  });

  const moveMutation = useMoveNode({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNodeQueryKey(nodeId) });
        if (currentParentId) {
          queryClient.invalidateQueries({
            queryKey: getGetNodeChildrenQueryKey(currentParentId),
          });
        }
        if (selectedParentId) {
          queryClient.invalidateQueries({
            queryKey: getGetNodeChildrenQueryKey(selectedParentId),
          });
        }
        queryClient.invalidateQueries({
          queryKey: getListRootNodesQueryKey(),
        });
        onOpenChange(false);
        setSelectedParentId(null);
      },
    },
  });

  const isSameParent = selectedParentId === currentParentId;
  const canMove = selectedParentId !== null && !isSameParent && !moveMutation.isPending;

  const handleMove = () => {
    if (!selectedParentId) return;
    moveMutation.mutate({
      nodeId,
      data: { newParentNodeId: selectedParentId },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Seite verschieben</DialogTitle>
          <DialogDescription>
            {"W\u00E4hlen Sie die neue \u00FCbergeordnete Seite f\u00FCr "}
            <strong>{nodeTitle}</strong>
            {nodeDisplayCode && (
              <Badge variant="outline" className="ml-1 text-[10px]">
                {nodeDisplayCode}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-md p-2 min-h-[200px] max-h-[400px]">
          {roots && roots.length > 0 ? (
            roots.map((root) => (
              <TreePickerNode
                key={root.id}
                node={root}
                excludeId={nodeId}
                selectedId={selectedParentId}
                onSelect={setSelectedParentId}
                depth={0}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Lade Seitenstruktur...
            </div>
          )}
        </div>

        {isSameParent && selectedParentId && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Die Seite befindet sich bereits unter dieser Elternseite.
          </p>
        )}

        {moveMutation.isError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Fehler beim Verschieben: {(moveMutation.error as Error)?.message ?? "Unbekannter Fehler"}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleMove} disabled={!canMove}>
            {moveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-1" />
            )}
            Verschieben
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
