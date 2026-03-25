import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import {
  Send,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Shield,
  Clock,
  Loader2,
} from "lucide-react";

interface ReviewWorkflowPanelProps {
  nodeId: string;
  revisionId: string;
  revisionStatus: string;
}

interface WorkflowData {
  id: string;
  status: string;
  initiatedBy: string | null;
  createdAt: string;
  completedAt: string | null;
  approvals: Array<{
    id: string;
    reviewerId: string | null;
    decision: string | null;
    comment: string | null;
    decidedAt: string | null;
  }>;
}

const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  pending: "Ausstehend",
  in_progress: "In Bearbeitung",
  approved: "Genehmigt",
  rejected: "Abgelehnt",
  cancelled: "Abgebrochen",
};

export function ReviewWorkflowPanel({
  nodeId,
  revisionId,
  revisionStatus,
}: ReviewWorkflowPanelProps) {
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [rejectDecision, setRejectDecision] = useState("rejected");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiBase = import.meta.env.BASE_URL + "api";

  const fetchWorkflow = useCallback(async () => {
    try {
      const data = await customFetch<WorkflowData>(
        `${apiBase}/content/revisions/${revisionId}/workflow`,
      );
      setWorkflow(data);
    } catch {
      setWorkflow(null);
    } finally {
      setLoading(false);
    }
  }, [apiBase, revisionId]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [`/api/content/nodes/${nodeId}/revisions`],
    });
    queryClient.invalidateQueries({
      queryKey: [`/api/content/nodes/${nodeId}`],
    });
  }, [queryClient, nodeId]);

  const handleSubmitForReview = useCallback(async () => {
    setSubmitting(true);
    try {
      await customFetch(
        `${apiBase}/content/revisions/${revisionId}/submit-for-review`,
        {
          method: "POST",
          body: JSON.stringify({
            reviewerId: reviewerId || undefined,
            comment: comment || undefined,
          }),
        },
      );
      toast({ title: "Zur Prüfung eingereicht" });
      setSubmitDialogOpen(false);
      setComment("");
      setReviewerId("");
      fetchWorkflow();
      invalidate();
    } catch (err) {
      toast({
        variant: "destructive",
        title: err instanceof Error ? err.message : "Fehler",
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    apiBase,
    revisionId,
    reviewerId,
    comment,
    toast,
    fetchWorkflow,
    invalidate,
  ]);

  const handleApprove = useCallback(async () => {
    setSubmitting(true);
    try {
      await customFetch(`${apiBase}/content/revisions/${revisionId}/approve`, {
        method: "POST",
        body: JSON.stringify({
          comment: comment || undefined,
          nextReviewDate: nextReviewDate || undefined,
        }),
      });
      toast({ title: "Revision genehmigt" });
      setApproveDialogOpen(false);
      setComment("");
      setNextReviewDate("");
      fetchWorkflow();
      invalidate();
    } catch {
      toast({ variant: "destructive", title: "Fehler bei der Genehmigung" });
    } finally {
      setSubmitting(false);
    }
  }, [
    apiBase,
    revisionId,
    comment,
    nextReviewDate,
    toast,
    fetchWorkflow,
    invalidate,
  ]);

  const handleReject = useCallback(async () => {
    setSubmitting(true);
    try {
      await customFetch(`${apiBase}/content/revisions/${revisionId}/reject`, {
        method: "POST",
        body: JSON.stringify({
          comment: comment || undefined,
          decision: rejectDecision,
        }),
      });
      toast({
        title:
          rejectDecision === "returned_for_changes"
            ? "Zur Überarbeitung zurückgegeben"
            : "Revision abgelehnt",
      });
      setRejectDialogOpen(false);
      setComment("");
      fetchWorkflow();
      invalidate();
    } catch {
      toast({ variant: "destructive", title: "Fehler bei der Ablehnung" });
    } finally {
      setSubmitting(false);
    }
  }, [
    apiBase,
    revisionId,
    comment,
    rejectDecision,
    toast,
    fetchWorkflow,
    invalidate,
  ]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const canSubmit = revisionStatus === "draft";
  const canApproveReject = revisionStatus === "in_review";

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Review & Freigabe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workflow && (
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      workflow.status === "approved"
                        ? "default"
                        : workflow.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {WORKFLOW_STATUS_LABELS[workflow.status] || workflow.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(workflow.createdAt).toLocaleString("de-DE")}
                  </span>
                </div>
              </div>

              {workflow.approvals.length > 0 && (
                <div className="mt-2 space-y-1">
                  {workflow.approvals.map((approval) => (
                    <div
                      key={approval.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      {approval.decision === "approved" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : approval.decision === "rejected" ? (
                        <XCircle className="h-3.5 w-3.5 text-red-600" />
                      ) : approval.decision === "returned_for_changes" ? (
                        <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span>
                        {approval.decision
                          ? `${approval.decision === "approved" ? "Genehmigt" : approval.decision === "rejected" ? "Abgelehnt" : "Zurückgegeben"}`
                          : "Ausstehend"}
                      </span>
                      {approval.comment && (
                        <span className="text-muted-foreground italic truncate max-w-[200px]">
                          — {approval.comment}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {canSubmit && (
              <Button
                size="sm"
                onClick={() => setSubmitDialogOpen(true)}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Zur Prüfung einreichen
              </Button>
            )}
            {canApproveReject && (
              <>
                <Button
                  size="sm"
                  onClick={() => setApproveDialogOpen(true)}
                  className="gap-1.5 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Genehmigen
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setRejectDialogOpen(true)}
                  className="gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Ablehnen / Zurückgeben
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zur Prüfung einreichen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Prüfer-ID (optional)</Label>
              <Input
                placeholder="ID des zugewiesenen Prüfers"
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Kommentar (optional)</Label>
              <Textarea
                placeholder="Kommentar zur Einreichung..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubmitDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button onClick={handleSubmitForReview} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Einreichen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revision genehmigen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Kommentar (optional)</Label>
              <Textarea
                placeholder="Anmerkungen zur Genehmigung..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Nächstes Prüfdatum (optional)</Label>
              <Input
                type="date"
                value={nextReviewDate}
                onChange={(e) => setNextReviewDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleApprove}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Genehmigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revision ablehnen / zurückgeben</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Entscheidung</Label>
              <Select value={rejectDecision} onValueChange={setRejectDecision}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rejected">Ablehnen</SelectItem>
                  <SelectItem value="returned_for_changes">
                    Zur Überarbeitung zurückgeben
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Begründung</Label>
              <Textarea
                placeholder="Bitte erläutern Sie Ihre Entscheidung..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {rejectDecision === "returned_for_changes"
                ? "Zurückgeben"
                : "Ablehnen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
