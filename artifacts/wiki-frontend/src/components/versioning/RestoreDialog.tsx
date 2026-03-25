import { useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

interface RestoreDialogProps {
  revisionId: string;
  revisionNo: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
}

export function RestoreDialog({
  revisionId,
  revisionNo,
  open,
  onOpenChange,
  nodeId,
}: RestoreDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiBase = import.meta.env.BASE_URL + "api";

  const handleRestore = useCallback(async () => {
    try {
      await customFetch(`${apiBase}/content/revisions/${revisionId}/restore`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      toast({
        title: "Revision wiederhergestellt",
        description: `Revision ${revisionNo} wurde als neue aktuelle Revision wiederhergestellt.`,
      });

      queryClient.invalidateQueries({
        queryKey: [`/api/content/nodes/${nodeId}/revisions`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/content/nodes/${nodeId}`],
      });
      onOpenChange(false);
    } catch {
      toast({
        variant: "destructive",
        title: "Fehler bei der Wiederherstellung",
      });
    }
  }, [
    apiBase,
    revisionId,
    revisionNo,
    nodeId,
    toast,
    queryClient,
    onOpenChange,
  ]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revision wiederherstellen?</AlertDialogTitle>
          <AlertDialogDescription>
            Revision <strong>{revisionNo}</strong> wird als neue aktuelle
            Revision wiederhergestellt. Die bestehende Revision bleibt in der
            Historie erhalten. Eine neue Revision wird mit dem Inhalt der
            ausgewählten Revision erstellt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={handleRestore}>
            Wiederherstellen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
