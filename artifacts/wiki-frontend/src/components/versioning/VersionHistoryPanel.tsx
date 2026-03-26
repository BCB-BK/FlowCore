import { useState } from "react";
import { useNodeRevisions } from "@/hooks/use-nodes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  History,
  GitBranch,
  RotateCcw,
  ArrowLeftRight,
  FileCheck,
  FilePen,
  FileSearch,
  Archive,
  User,
  Shield,
  CalendarClock,
  Pencil,
  BookOpen,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { RestoreDialog } from "./RestoreDialog";
import { RevisionDiffView } from "./RevisionDiffView";

interface Revision {
  id: string;
  revisionNo: number;
  versionLabel?: string | null;
  status: string;
  changeType: string;
  changeSummary?: string | null;
  title: string;
  authorId?: string | null;
  reviewerId?: string | null;
  approverId?: string | null;
  basedOnRevisionId?: string | null;
  validFrom?: string | null;
  createdAt: string;
  nextReviewDate?: string | null;
}

interface ActiveWorkingCopy {
  id: string;
  status: string;
  title: string;
  authorId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  changeSummary?: string | null;
  changeType?: string | null;
}

interface VersionHistoryPanelProps {
  nodeId: string;
  activeWorkingCopy?: ActiveWorkingCopy | null;
}

const statusIcons: Record<string, typeof FileCheck> = {
  published: FileCheck,
  draft: FilePen,
  in_review: FileSearch,
  archived: Archive,
  approved: FileCheck,
};

const CHANGE_TYPE_ICONS: Record<string, typeof Pencil> = {
  editorial: Pencil,
  minor: Pencil,
  major: BookOpen,
  regulatory: AlertTriangle,
  structural: Wrench,
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  editorial: "Redaktionell",
  minor: "Kleinere Änderung",
  major: "Größere Änderung",
  regulatory: "Regulatorisch",
  structural: "Strukturell",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isReviewOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function VersionHistoryPanel({ nodeId, activeWorkingCopy }: VersionHistoryPanelProps) {
  const { data: revisions, isLoading } = useNodeRevisions(nodeId);
  const [selectedForDiff, setSelectedForDiff] = useState<string[]>([]);
  const [restoreRevisionId, setRestoreRevisionId] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const toggleDiffSelection = (revId: string) => {
    setSelectedForDiff((prev) => {
      if (prev.includes(revId)) return prev.filter((id) => id !== revId);
      if (prev.length >= 2) return [prev[1], revId];
      return [...prev, revId];
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const revisionList = (revisions as Revision[]) || [];

  const wcStatusLabels: Record<string, string> = {
    draft: "Entwurf",
    submitted: "Eingereicht",
    in_review: "In Prüfung",
    changes_requested: "Änderung zurückgegeben",
    approved_for_publish: "Freigegeben",
    cancelled: "Abgebrochen",
    published: "Veröffentlicht",
  };

  return (
    <>
      {activeWorkingCopy && (
        <Card className="mb-4 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FilePen className="h-4 w-4 text-blue-500" />
              Aktive Arbeitskopie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {wcStatusLabels[activeWorkingCopy.status] || activeWorkingCopy.status}
              </Badge>
              {activeWorkingCopy.changeType && (
                <Badge variant="secondary" className="text-[10px] h-4">
                  {CHANGE_TYPE_LABELS[activeWorkingCopy.changeType] || activeWorkingCopy.changeType}
                </Badge>
              )}
              {activeWorkingCopy.title && (
                <span className="text-sm font-medium truncate">{activeWorkingCopy.title}</span>
              )}
            </div>
            {activeWorkingCopy.authorId && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <User className="h-2.5 w-2.5" />
                Autor: {activeWorkingCopy.authorId.substring(0, 8)}…
              </p>
            )}
            {activeWorkingCopy.updatedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Letzte Änderung: {formatDate(activeWorkingCopy.updatedAt)}
              </p>
            )}
            {activeWorkingCopy.status === "changes_requested" && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1 font-medium">
                <AlertTriangle className="h-2.5 w-2.5" />
                Änderungen angefordert – zur Überarbeitung zurückgegeben
              </p>
            )}
            {activeWorkingCopy.changeSummary && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                {activeWorkingCopy.changeSummary}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Versionshistorie
              {revisionList.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4">
                  {revisionList.length}
                </Badge>
              )}
            </CardTitle>
            {selectedForDiff.length === 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiff(true)}
                className="gap-1"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Vergleichen
              </Button>
            )}
          </div>
          {selectedForDiff.length > 0 && selectedForDiff.length < 2 && (
            <p className="text-xs text-muted-foreground mt-1">
              Wählen Sie eine zweite Revision zum Vergleichen
            </p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {revisionList.length === 0 ? (
            <div className="px-4 pb-4 text-center text-sm text-muted-foreground py-8">
              Noch keine veröffentlichten Versionen vorhanden.
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="divide-y">
                {revisionList.map((rev, index) => {
                  const Icon = statusIcons[rev.status] || FilePen;
                  const ChangeIcon = CHANGE_TYPE_ICONS[rev.changeType] || Pencil;
                  const isSelected = selectedForDiff.includes(rev.id);
                  const isLatest = index === 0;
                  const overdue = isLatest && isReviewOverdue(rev.nextReviewDate);

                  return (
                    <div
                      key={rev.id}
                      className={`relative flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors ${isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}`}
                    >
                      <div className="flex flex-col items-center pt-0.5 shrink-0">
                        <div
                          className={`rounded-full p-1.5 ${rev.status === "published" ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300" : "bg-muted text-muted-foreground"}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        {index < revisionList.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1 min-h-[20px]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm font-mono">
                            v{rev.revisionNo}
                          </span>
                          {rev.versionLabel && (
                            <Badge variant="outline" className="text-[10px] h-4 font-mono">
                              <GitBranch className="h-2.5 w-2.5 mr-0.5" />
                              {rev.versionLabel}
                            </Badge>
                          )}
                          <StatusBadge
                            status={rev.status as Parameters<typeof StatusBadge>[0]["status"]}
                            compact
                          />
                          {isLatest && (
                            <Badge variant="secondary" className="text-[10px] h-4 bg-primary/10 text-primary">
                              Aktuell
                            </Badge>
                          )}
                          {rev.changeType && (
                            <Badge variant="outline" className="text-[10px] h-4 gap-0.5">
                              <ChangeIcon className="h-2.5 w-2.5" />
                              {CHANGE_TYPE_LABELS[rev.changeType] || rev.changeType}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(rev.createdAt)}
                        </p>

                        {rev.changeSummary && (
                          <p className="text-xs mt-1 line-clamp-2 text-muted-foreground">
                            {rev.changeSummary}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-1.5">
                          {rev.authorId && (
                            <span className="flex items-center gap-0.5">
                              <User className="h-2.5 w-2.5" />
                              {rev.authorId.substring(0, 8)}…
                            </span>
                          )}
                          {rev.reviewerId && (
                            <span className="flex items-center gap-0.5">
                              <FileSearch className="h-2.5 w-2.5" />
                              {rev.reviewerId.substring(0, 8)}…
                            </span>
                          )}
                          {rev.approverId && (
                            <span className="flex items-center gap-0.5">
                              <Shield className="h-2.5 w-2.5" />
                              {rev.approverId.substring(0, 8)}…
                            </span>
                          )}
                        </div>

                        {rev.basedOnRevisionId && (
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                            <RotateCcw className="h-2.5 w-2.5" />
                            Wiederhergestellt von Rev. {revisionList.find((r) => r.id === rev.basedOnRevisionId)?.revisionNo || "?"}
                          </p>
                        )}

                        {rev.validFrom && (
                          <div className="text-[11px] mt-1 flex items-center gap-1 text-muted-foreground">
                            <CalendarClock className="h-2.5 w-2.5" />
                            Gültig ab: {new Date(rev.validFrom).toLocaleDateString("de-DE")}
                          </div>
                        )}

                        {isLatest && rev.nextReviewDate && (
                          <div className={`text-[11px] mt-1 flex items-center gap-1 ${overdue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}`}>
                            <CalendarClock className="h-2.5 w-2.5" />
                            Nächste Prüfung: {new Date(rev.nextReviewDate).toLocaleDateString("de-DE")}
                            {overdue && " (überfällig)"}
                          </div>
                        )}

                        <div className="flex items-center gap-1 mt-2">
                          <Button
                            variant={isSelected ? "default" : "ghost"}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => toggleDiffSelection(rev.id)}
                          >
                            <ArrowLeftRight className="h-3 w-3 mr-1" />
                            {isSelected ? "Ausgewählt" : "Vergleichen"}
                          </Button>
                          {!isLatest && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs px-2"
                              onClick={() => setRestoreRevisionId(rev.id)}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Wiederherstellen
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {restoreRevisionId && (
        <RestoreDialog
          revisionId={restoreRevisionId}
          revisionNo={
            revisionList.find((r) => r.id === restoreRevisionId)?.revisionNo || 0
          }
          open={!!restoreRevisionId}
          onOpenChange={(open) => {
            if (!open) setRestoreRevisionId(null);
          }}
          nodeId={nodeId}
        />
      )}

      {showDiff && selectedForDiff.length === 2 && (
        <RevisionDiffView
          revisionIdA={selectedForDiff[0]}
          revisionIdB={selectedForDiff[1]}
          open={showDiff}
          onOpenChange={setShowDiff}
        />
      )}
    </>
  );
}
