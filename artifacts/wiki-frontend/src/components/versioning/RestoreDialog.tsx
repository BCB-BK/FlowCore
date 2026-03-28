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
} from "@workspace/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useLocation } from "wouter";

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
  const [, navigate] = useLocation();

  const handleRestore = useCallback(async () => {
    try {
      await customFetch(`${apiBase}/content/revisions/${revisionId}/restore`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      toast({
        title: "Arbeitskopie erstellt",
        description: `Eine Arbeitskopie mit dem Inhalt von Revision ${revisionNo} wurde erstellt. Die Änderungen müssen geprüft und freigegeben werden, bevor sie veröffentlicht werden.`,
      });

      queryClient.invalidateQueries({
        queryKey: [`/api/content/nodes/${nodeId}/revisions`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/content/nodes/${nodeId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/content/nodes/${nodeId}/working-copy`],
      });
      onOpenChange(false);
      navigate(`/nodes/${nodeId}/edit`);
    } catch (err) {
      const errObj = err as { code?: string; message?: string; data?: { code?: string; error?: string } };
      const isConflict =
        errObj.code === "WORKING_COPY_ACTIVE" ||
        errObj.data?.code === "WORKING_COPY_ACTIVE" ||
        (typeof (errObj.data?.error ?? errObj.message) === "string" &&
          (errObj.data?.error ?? errObj.message ?? "").includes("aktive Arbeitskopie"));
      toast({
        variant: "destructive",
        title: isConflict
          ? "Arbeitskopie bereits vorhanden"
          : "Fehler bei der Wiederherstellung",
        description: isConflict
          ? "Es existiert bereits eine aktive Arbeitskopie für diese Seite. Bitte schließen Sie diese zuerst ab."
          : undefined,
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
    navigate,
  ]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revision wiederherstellen?</AlertDialogTitle>
          <AlertDialogDescription>
            Der Inhalt von Revision <strong>{revisionNo}</strong> wird als neue
            Arbeitskopie erstellt. Diese muss anschließend den regulären
            Prüf- und Freigabeprozess durchlaufen, bevor sie veröffentlicht
            werden kann. Die bestehende Versionshistorie bleibt unverändert.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={handleRestore}>
            Als Arbeitskopie wiederherstellen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
