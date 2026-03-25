import { useState } from "react";
import { useCreateNode } from "@/hooks/use-nodes";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_TYPE_LABELS } from "@/lib/types";
import type { CreateNodeInput } from "@workspace/api-client-react";

interface CreateNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentNodeId: string | null;
}

export function CreateNodeDialog({
  open,
  onOpenChange,
  parentNodeId,
}: CreateNodeDialogProps) {
  const [title, setTitle] = useState("");
  const [templateType, setTemplateType] = useState<
    CreateNodeInput["templateType"]
  >("core_process_overview");
  const createNode = useCreateNode();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!title.trim()) return;

    try {
      const node = await createNode.mutateAsync({
        data: {
          title: title.trim(),
          templateType,
          parentNodeId: parentNodeId || undefined,
        },
      });

      setTitle("");
      onOpenChange(false);
      navigate(`/node/${node.id}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Fehler beim Erstellen",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {parentNodeId ? "Unterseite anlegen" : "Neue Seite anlegen"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              placeholder="z.B. Kernprozess Personal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Seitentyp</Label>
            <Select
              value={templateType}
              onValueChange={(v) =>
                setTemplateType(v as CreateNodeInput["templateType"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAGE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || createNode.isPending}
          >
            {createNode.isPending ? "Wird erstellt..." : "Anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
