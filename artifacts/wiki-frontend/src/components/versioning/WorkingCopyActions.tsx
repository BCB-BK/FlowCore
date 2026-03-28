import { useState, useMemo } from "react";
import { Button } from "@workspace/ui/button";
import { Label } from "@workspace/ui/label";
import { Input } from "@workspace/ui/input";
import { Textarea } from "@workspace/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/dialog";
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
  ShieldAlert,
  AlertCircle,
} from "lucide-react";
import { validateForPublication } from "@/lib/types";

interface WorkingCopyActionsProps {
  workingCopy: WorkingCopy;
  nodeId: string;
  templateType?: string;
  currentUserId?: string;
  userPermissions?: string[];
  sodRules?: Record<string, boolean>;
}

export function WorkingCopyActions({ workingCopy, nodeId, templateType, currentUserId, userPermissions, sodRules }: WorkingCopyActionsProps) {
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

  const publishValidation = useMemo(() => {
    if (!templateType) return null;
    const metadata = (workingCopy.content as Record<string, unknown>) ?? {};
    const sectionData = (workingCopy.structuredFields as Record<string, unknown>) ?? {};
    return validateForPublication(templateType, metadata, sectionData);
  }, [templateType, workingCopy.content, workingCopy.structuredFields]);

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
    if (publishValidation && !publishValidation.valid) {
      toast({
        variant: "destructive",
        title: "Veröffentlichungsanforderungen nicht erfüllt",
        description: `${publishValidation.errors.length} Fehler müssen behoben werden.`,
      });
      return;
    }
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

  const isAuthor = !!currentUserId && workingCopy.authorId === currentUserId;
  const isSubmitter = !!currentUserId && workingCopy.submittedBy === currentUserId;
  const isSodSubject = isSubmitter || (!workingCopy.submittedBy && isAuthor);
  const isOwner = !currentUserId || isAuthor;
  const hasReviewPermission = userPermissions?.includes("review_working_copy") ?? false;
  const hasPublishPermission = userPermissions?.includes("publish_working_copy") ?? false;
  const hasCancelPermission = userPermissions?.includes("cancel_working_copy") ?? false;

  const sodReviewEnabled = sodRules?.four_eyes_review !== false;
  const sodPublishEnabled = sodRules?.four_eyes_publish !== false;
  const authorBlockedFromReview = isSodSubject && sodReviewEnabled;
  const authorBlockedFromPublish = isSodSubject && sodPublishEnabled;

  const isReviewPhase =
    workingCopy.status === "submitted" || workingCopy.status === "in_review";
  const showApproveReturn = isReviewPhase && hasReviewPermission && !authorBlockedFromReview;
  const showSodBlockedHint = isReviewPhase && hasReviewPermission && authorBlockedFromReview;
  const showPublish =
    workingCopy.status === "approved_for_publish" &&
    hasPublishPermission &&
    !authorBlockedFromPublish;
  const showPublishSodHint =
    workingCopy.status === "approved_for_publish" &&
    hasPublishPermission &&
    authorBlockedFromPublish;
  const showCancel =
    (isOwner || hasCancelPermission) &&
    (workingCopy.status === "draft" ||
    workingCopy.status === "submitted" ||
    workingCopy.status === "changes_requested");

  if (!showApproveReturn && !showPublish && !showCancel && !showSodBlockedHint && !showPublishSodHint) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center">
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
        {showSodBlockedHint && (
          <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Vier-Augen-Prinzip: Eigene Arbeitskopien können nicht selbst freigegeben werden.</span>
          </div>
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
        {showPublishSodHint && (
          <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Vier-Augen-Prinzip: Eigene Arbeitskopien können nicht selbst veröffentlicht werden.</span>
          </div>
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
          {publishValidation && !publishValidation.valid && (
            <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-3 space-y-2">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Veröffentlichungsanforderungen nicht erfüllt ({publishValidation.readinessPercentage}% bereit)
              </p>
              <ul className="text-xs space-y-1">
                {publishValidation.errors.map((e) => (
                  <li key={e.field} className="flex items-start gap-1.5 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{e.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
              disabled={publish.isPending || !versionLabel.trim() || (publishValidation !== null && !publishValidation.valid)}
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
