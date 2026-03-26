import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useApproveWorkingCopy,
  useReturnWorkingCopyForChanges,
  usePublishWorkingCopy,
  useCancelWorkingCopy,
  getGetActiveWorkingCopyQueryKey,
} from "@workspace/api-client-react";
import type { WorkingCopy } from "@workspace/api-client-react";
import {
  CheckCircle2,
  RotateCcw,
  Upload,
  XCircle,
  Loader2,
} from "lucide-react";

interface WorkingCopyActionsProps {
  workingCopy: WorkingCopy;
  nodeId: string;
  currentUserId?: string;
  userPermissions?: string[];
}

export function WorkingCopyActions({ workingCopy, nodeId, currentUserId, userPermissions }: WorkingCopyActionsProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const approve = useApproveWorkingCopy();
  const returnForChanges = useReturnWorkingCopyForChanges();
  const publish = usePublishWorkingCopy();
  const cancel = useCancelWorkingCopy();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetActiveWorkingCopyQueryKey(nodeId) });
    queryClient.invalidateQueries({ queryKey: [`/api/content/nodes/${nodeId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/content/nodes/${nodeId}/revisions`] });
  };

  const resetDialogs = () => {
    setComment("");
    setVersionLabel("");
    setApproveOpen(false);
    setReturnOpen(false);
    setPublishOpen(false);
    setCancelOpen(false);
  };

  const handleApprove = async () => {
    try {
      await approve.mutateAsync({
        workingCopyId: workingCopy.id,
        data: { comment: comment || undefined },
      });
      toast({ title: "Arbeitskopie freigegeben" });
      resetDialogs();
      invalidate();
    } catch (err) {
      toast({
        variant: "destructive",
        title: err instanceof Error ? err.message : "Fehler bei der Freigabe",
      });
    }
  };

  const handleReturn = async () => {
    try {
      await returnForChanges.mutateAsync({
        workingCopyId: workingCopy.id,
        data: { comment: comment || undefined },
      });
      toast({ title: "Zur Überarbeitung zurückgegeben" });
      resetDialogs();
      invalidate();
    } catch (err) {
      toast({
        variant: "destructive",
        title: err instanceof Error ? err.message : "Fehler",
      });
    }
  };

  const handlePublish = async () => {
    if (!versionLabel.trim()) return;
    try {
      await publish.mutateAsync({
        workingCopyId: workingCopy.id,
        data: { versionLabel: versionLabel.trim() },
      });
      toast({ title: "Veröffentlicht", description: `Version ${versionLabel.trim()}` });
      resetDialogs();
      invalidate();
    } catch (err) {
      toast({
        variant: "destructive",
        title: err instanceof Error ? err.message : "Fehler beim Veröffentlichen",
      });
    }
  };

  const handleCancel = async () => {
    try {
      await cancel.mutateAsync({
        workingCopyId: workingCopy.id,
        data: { comment: comment || undefined },
      });
      toast({ title: "Arbeitskopie abgebrochen" });
      resetDialogs();
      invalidate();
    } catch (err) {
      toast({
        variant: "destructive",
        title: err instanceof Error ? err.message : "Fehler",
      });
    }
  };

  const isOwner = !currentUserId || workingCopy.authorId === currentUserId;
  const hasApprovePermission = !userPermissions || userPermissions.includes("approve_page");
  const isReviewerOrApprover =
    workingCopy.reviewerId === currentUserId ||
    workingCopy.approverId === currentUserId;

  const showApproveReturn =
    (workingCopy.status === "submitted" || workingCopy.status === "in_review") &&
    (hasApprovePermission || isReviewerOrApprover);
  const showPublish =
    workingCopy.status === "approved_for_publish" &&
    (hasApprovePermission || isReviewerOrApprover || isOwner);
  const showCancel =
    isOwner &&
    (workingCopy.status === "draft" ||
    workingCopy.status === "submitted" ||
    workingCopy.status === "changes_requested");

  if (!showApproveReturn && !showPublish && !showCancel) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showApproveReturn && (
          <>
            <Button
              size="sm"
              onClick={() => setApproveOpen(true)}
              className="gap-1.5 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Freigeben
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReturnOpen(true)}
              className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Zurückgeben
            </Button>
          </>
        )}
        {showPublish && (
          <Button
            size="sm"
            onClick={() => setPublishOpen(true)}
            className="gap-1.5 bg-green-600 hover:bg-green-700"
          >
            <Upload className="h-3.5 w-3.5" />
            Veröffentlichen
          </Button>
        )}
        {showCancel && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCancelOpen(true)}
            className="gap-1.5 text-destructive"
          >
            <XCircle className="h-3.5 w-3.5" />
            Abbrechen
          </Button>
        )}
      </div>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arbeitskopie freigeben</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Kommentar (optional)</Label>
              <Textarea
                placeholder="Anmerkungen zur Freigabe..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveOpen(false); setComment(""); }}>
              Abbrechen
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approve.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approve.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Freigeben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zur Überarbeitung zurückgeben</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Begründung</Label>
              <Textarea
                placeholder="Bitte erläutern Sie, was geändert werden soll..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReturnOpen(false); setComment(""); }}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleReturn}
              disabled={returnForChanges.isPending}
            >
              {returnForChanges.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Zurückgeben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Version veröffentlichen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Versionslabel *</Label>
              <Input
                placeholder="z.B. 2.0, 1.3.1"
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPublishOpen(false); setVersionLabel(""); }}>
              Abbrechen
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publish.isPending || !versionLabel.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {publish.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Veröffentlichen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arbeitskopie abbrechen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Alle nicht veröffentlichten Änderungen in dieser Arbeitskopie gehen verloren.
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Kommentar (optional)</Label>
              <Textarea
                placeholder="Grund für den Abbruch..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelOpen(false); setComment(""); }}>
              Zurück
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancel.isPending}
            >
              {cancel.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
