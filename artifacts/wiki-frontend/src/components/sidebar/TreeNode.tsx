import { useState } from "react";
import { useNodeChildren } from "@/hooks/use-nodes";
import { useLocation } from "wouter";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@workspace/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
} from "@workspace/ui/collapsible";
import { ChevronRight, FileText, FolderOpen } from "lucide-react";
import type { ContentNode } from "@/lib/types";
import { PAGE_TYPE_LABELS } from "@/lib/types";
import { getStatusColor } from "@/components/versioning/StatusBadge";
import type { NodeStatus } from "@/components/versioning/StatusBadge";

interface TreeNodeProps {
  node: ContentNode;
  level: number;
}

const CONTAINER_TYPES = new Set([
  "core_process_overview",
  "area_overview",
  "dashboard",
]);

const MAX_DEPTH = 4;

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  in_review: "In Prüfung",
  approved: "Freigegeben",
  published: "Veröffentlicht",
  archived: "Archiviert",
  rejected: "Abgelehnt",
};

function StatusDot({ status }: { status: string }) {
  const colorClass = getStatusColor(status as NodeStatus);
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      role="status"
      aria-label={`Status: ${label}`}
      className={`inline-block h-2 w-2 rounded-full shrink-0 ${colorClass.replace("text-", "bg-")}`}
      title={label}
    />
  );
}

export function TreeNode({ node, level }: TreeNodeProps) {
  const [open, setOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { data: children } = useNodeChildren(open ? node.id : undefined);

  const isActive = location === `/node/${node.id}`;
  const isContainer = CONTAINER_TYPES.has(node.templateType);
  const Icon = isContainer ? FolderOpen : FileText;
  const hasChildren = (node.childCount ?? 0) > 0;

  if (!hasChildren || level >= MAX_DEPTH) {
    return (
      <SidebarMenuItem role="treeitem" aria-selected={isActive}>
        <SidebarMenuButton
          isActive={isActive}
          onClick={() => navigate(`/node/${node.id}`)}
          tooltip={PAGE_TYPE_LABELS[node.templateType] || node.templateType}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{node.title}</span>
          <StatusDot status={node.status} />
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem role="treeitem" aria-expanded={open} aria-selected={isActive}>
        <div className="flex items-center">
          <button
            type="button"
            aria-label={open ? "Unterseiten einklappen" : "Unterseiten ausklappen"}
            className="flex items-center justify-center shrink-0 h-8 w-5 bg-transparent border-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            onClick={() => setOpen(!open)}
          >
            <ChevronRight
              className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
            />
          </button>
          <SidebarMenuButton
            isActive={isActive}
            onClick={() => navigate(`/node/${node.id}`)}
            className="flex-1"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{node.title}</span>
            <StatusDot status={node.status} />
          </SidebarMenuButton>
        </div>

        <CollapsibleContent>
          <SidebarMenuSub role="group">
            {children && children.length > 0 ? (
              children.map((child) => (
                <SidebarMenuSubItem key={child.id}>
                  <TreeNode node={child} level={level + 1} />
                </SidebarMenuSubItem>
              ))
            ) : children && children.length === 0 ? (
              <p className="px-3 py-1 text-xs text-muted-foreground">
                Keine Unterobjekte
              </p>
            ) : null}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
