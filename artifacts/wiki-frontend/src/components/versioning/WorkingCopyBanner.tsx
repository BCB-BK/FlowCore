import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileEdit,
  Send,
  Clock,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import type { WorkingCopy } from "@workspace/api-client-react";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }
> = {
  draft: {
    label: "Entwurf",
    color: "text-yellow-800 dark:text-yellow-200",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    icon: FileEdit,
  },
  submitted: {
    label: "Zur Prüfung eingereicht",
    color: "text-blue-800 dark:text-blue-200",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: Send,
  },
  in_review: {
    label: "In Prüfung",
    color: "text-purple-800 dark:text-purple-200",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    icon: Clock,
  },
  changes_requested: {
    label: "Änderung zurückgegeben",
    color: "text-orange-800 dark:text-orange-200",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: RotateCcw,
  },
  approved_for_publish: {
    label: "Freigegeben",
    color: "text-green-800 dark:text-green-200",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Abgebrochen",
    color: "text-gray-800 dark:text-gray-200",
    bgColor: "bg-gray-50 dark:bg-gray-950/30",
    borderColor: "border-gray-200 dark:border-gray-800",
    icon: XCircle,
  },
  published: {
    label: "Veröffentlicht",
    color: "text-green-800 dark:text-green-200",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    icon: CheckCircle2,
  },
};

interface WorkingCopyBannerProps {
  workingCopy: WorkingCopy;
  currentUserId?: string;
  authorName?: string;
  onNavigateToEditor?: () => void;
  isCreating?: boolean;
  lastReturnComment?: string | null;
}

export function WorkingCopyBanner({
  workingCopy,
  currentUserId,
  authorName,
  onNavigateToEditor,
  isCreating,
  lastReturnComment,
}: WorkingCopyBannerProps) {
  const config = STATUS_CONFIG[workingCopy.status] || STATUS_CONFIG.draft;
  const Icon = config.icon;
  const canEdit = workingCopy.status === "draft" || workingCopy.status === "changes_requested";
  const isOwnWc = !currentUserId || workingCopy.authorId === currentUserId;
  const showReturnComment = workingCopy.status === "changes_requested" && lastReturnComment;

  const createdDate = workingCopy.createdAt
    ? new Date(workingCopy.createdAt).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-0">
      <div
        className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${showReturnComment ? "rounded-b-none" : ""} ${config.bgColor} ${config.borderColor}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={`h-4 w-4 flex-shrink-0 ${config.color}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium ${config.color}`}>
                Arbeitskopie
              </span>
              <Badge variant="outline" className="text-xs">
                {config.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {!isOwnWc && (
                <span>Geöffnet von {authorName || "anderem Benutzer"} </span>
              )}
              {createdDate && (
                <span>{isOwnWc ? `Erstellt am ${createdDate}` : `am ${createdDate}`}</span>
              )}
            </p>
            {workingCopy.changeSummary && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {workingCopy.changeSummary}
              </p>
            )}
          </div>
        </div>

        {canEdit && onNavigateToEditor && isOwnWc && (
          <Button
            size="sm"
            onClick={onNavigateToEditor}
            disabled={isCreating}
            className="gap-1.5 flex-shrink-0"
          >
            {isCreating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" />
            )}
            Weiter bearbeiten
          </Button>
        )}
        {canEdit && !isOwnWc && (
          <Badge variant="secondary" className="text-xs flex-shrink-0">
            Gesperrt
          </Badge>
        )}
      </div>

      {showReturnComment && (
        <div className="border border-t-0 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 rounded-b-lg p-3">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-orange-800 dark:text-orange-200">
                Rückmeldung vom Prüfer
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-0.5 whitespace-pre-wrap">
                {lastReturnComment}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
