import { useState } from "react";
import { useNodeRevisions } from "@/hooks/use-nodes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  GitBranch,
  RotateCcw,
  ArrowLeftRight,
  FileCheck,
  FilePen,
  FileSearch,
  Archive,
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
  createdAt: string;
  nextReviewDate?: string | null;
}

interface VersionHistoryPanelProps {
  nodeId: string;
}

const statusIcons: Record<string, typeof FileCheck> = {
  published: FileCheck,
  draft: FilePen,
  in_review: FileSearch,
  archived: Archive,
  approved: FileCheck,
};

export function VersionHistoryPanel({ nodeId }: VersionHistoryPanelProps) {
  const { data: revisions, isLoading } = useNodeRevisions(nodeId);
  const [selectedForDiff, setSelectedForDiff] = useState<string[]>([]);
  const [restoreRevisionId, setRestoreRevisionId] = useState<string | null>(
    null,
  );
  const [showDiff, setShowDiff] = useState(false);

  const toggleDiffSelection = (revId: string) => {
    setSelectedForDiff((prev) => {
      if (prev.includes(revId)) {
        return prev.filter((id) => id !== revId);
      }
      if (prev.length >= 2) {
        return [prev[1], revId];
      }
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
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const revisionList = (revisions as Revision[]) || [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Versionshistorie
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
          <ScrollArea className="h-[500px]">
            <div className="space-y-0">
              {revisionList.map((rev, index) => {
                const Icon = statusIcons[rev.status] || FilePen;
                const isSelected = selectedForDiff.includes(rev.id);
                const isLatest = index === 0;

                return (
                  <div
                    key={rev.id}
                    className={`relative flex items-start gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-accent/50 transition-colors ${isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                  >
                    <div className="flex flex-col items-center pt-1">
                      <div
                        className={`rounded-full p-1 ${rev.status === "published" ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      {index < revisionList.length - 1 && (
                        <div className="w-px h-full bg-border mt-1 min-h-[20px]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          Rev. {rev.revisionNo}
                        </span>
                        {rev.versionLabel && (
                          <Badge variant="outline" className="text-xs">
                            <GitBranch className="h-3 w-3 mr-1" />
                            {rev.versionLabel}
                          </Badge>
                        )}
                        <StatusBadge
                          status={
                            rev.status as Parameters<
                              typeof StatusBadge
                            >[0]["status"]
                          }
                          compact
                        />
                        {isLatest && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-primary/10 text-primary"
                          >
                            Aktuell
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(rev.createdAt).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {rev.changeType && (
                          <span className="ml-2 capitalize">
                            ({rev.changeType})
                          </span>
                        )}
                      </p>

                      {rev.changeSummary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {rev.changeSummary}
                        </p>
                      )}

                      {rev.basedOnRevisionId && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" />
                          Wiederhergestellt
                        </p>
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
        </CardContent>
      </Card>

      {restoreRevisionId && (
        <RestoreDialog
          revisionId={restoreRevisionId}
          revisionNo={
            revisionList.find((r) => r.id === restoreRevisionId)?.revisionNo ||
            0
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
