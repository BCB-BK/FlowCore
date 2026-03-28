import { useState } from "react";
import { Badge } from "@workspace/ui/badge";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/popover";
import { Plus, X, Tag } from "lucide-react";
import {
  useGetNodeTags,
  useListTags,
  useAssignTagToNode,
  useRemoveTagFromNode,
  useCreateTag,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface TagManagerProps {
  nodeId: string;
  readonly?: boolean;
}

export function TagManager({ nodeId, readonly }: TagManagerProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const queryClient = useQueryClient();

  const { data: nodeTags } = useGetNodeTags(nodeId);
  const { data: allTags } = useListTags();

  const assignMutation = useAssignTagToNode({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [`/api/tags/nodes/${nodeId}`],
        });
      },
    },
  });

  const removeMutation = useRemoveTagFromNode({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [`/api/tags/nodes/${nodeId}`],
        });
      },
    },
  });

  const createMutation = useCreateTag({
    mutation: {
      onSuccess: (tag) => {
        assignMutation.mutate({ nodeId, data: { tagId: tag.id } });
        setNewTagName("");
        queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      },
    },
  });

  const assignedIds = new Set(
    Array.isArray(nodeTags) ? nodeTags.map((t) => t.id) : [],
  );
  const availableTags = Array.isArray(allTags)
    ? allTags.filter((t) => !assignedIds.has(t.id))
    : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
        {Array.isArray(nodeTags) && nodeTags.length > 0 ? (
          nodeTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="text-xs gap-1"
              style={
                tag.color
                  ? {
                      backgroundColor: tag.color + "20",
                      borderColor: tag.color,
                    }
                  : undefined
              }
            >
              {tag.name}
              {!readonly && (
                <button
                  className="ml-0.5 hover:text-destructive"
                  onClick={() =>
                    removeMutation.mutate({ nodeId, tagId: tag.id })
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">Keine Tags</span>
        )}

        {!readonly && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2" align="start">
              <div className="space-y-2">
                {availableTags.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {availableTags.map((tag) => (
                      <button
                        key={tag.id}
                        className="w-full text-left text-sm px-2 py-1 rounded hover:bg-accent"
                        onClick={() => {
                          assignMutation.mutate({
                            nodeId,
                            data: { tagId: tag.id },
                          });
                        }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-1 border-t pt-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Neuer Tag..."
                    className="h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTagName.trim()) {
                        createMutation.mutate({
                          data: { name: newTagName.trim() },
                        });
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-7 text-xs px-2"
                    disabled={!newTagName.trim()}
                    onClick={() => {
                      if (newTagName.trim()) {
                        createMutation.mutate({
                          data: { name: newTagName.trim() },
                        });
                      }
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
