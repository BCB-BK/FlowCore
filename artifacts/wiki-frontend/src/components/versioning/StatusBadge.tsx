import { Badge } from "@/components/ui/badge";
import {
  FileCheck,
  FilePen,
  FileSearch,
  Archive,
  AlertTriangle,
  UserX,
  Clock,
} from "lucide-react";

export type NodeStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived"
  | "deleted";

interface StatusBadgeProps {
  status: NodeStatus;
  nextReviewDate?: string | null;
  ownerId?: string | null;
  compact?: boolean;
}

const STATUS_CONFIG: Record<
  NodeStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof FileCheck;
    className: string;
  }
> = {
  draft: {
    label: "Entwurf",
    variant: "secondary",
    icon: FilePen,
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  in_review: {
    label: "In Prüfung",
    variant: "outline",
    icon: FileSearch,
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  },
  approved: {
    label: "Genehmigt",
    variant: "outline",
    icon: FileCheck,
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  },
  published: {
    label: "Veröffentlicht",
    variant: "default",
    icon: FileCheck,
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  archived: {
    label: "Archiviert",
    variant: "secondary",
    icon: Archive,
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  deleted: {
    label: "Gelöscht",
    variant: "destructive",
    icon: AlertTriangle,
    className: "",
  },
};

export function StatusBadge({
  status,
  nextReviewDate,
  ownerId,
  compact,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;

  const isOverdue =
    nextReviewDate &&
    new Date(nextReviewDate) < new Date() &&
    status !== "archived";
  const isMissingOwner = !ownerId && status === "published";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {compact ? undefined : config.label}
      </Badge>

      {isOverdue && (
        <Badge
          variant="destructive"
          className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          <Clock className="h-3 w-3 mr-1" />
          {compact ? undefined : "Überprüfung überfällig"}
        </Badge>
      )}

      {isMissingOwner && (
        <Badge
          variant="outline"
          className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300"
        >
          <UserX className="h-3 w-3 mr-1" />
          {compact ? undefined : "Kein Besitzer"}
        </Badge>
      )}
    </div>
  );
}

export function getStatusColor(status: NodeStatus): string {
  const map: Record<NodeStatus, string> = {
    draft: "text-gray-500",
    in_review: "text-blue-500",
    approved: "text-emerald-500",
    published: "text-green-600",
    archived: "text-amber-500",
    deleted: "text-red-500",
  };
  return map[status] || "text-gray-500";
}
