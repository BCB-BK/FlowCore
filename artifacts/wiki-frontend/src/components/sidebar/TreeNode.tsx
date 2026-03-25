import { useState } from "react";
import { useNodeChildren } from "@/hooks/use-nodes";
import { useLocation } from "wouter";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

function StatusDot({ status }: { status: string }) {
  const colorClass = getStatusColor(status as NodeStatus);
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full shrink-0 ${colorClass.replace("text-", "bg-")}`}
      title={status}
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

  if (!isContainer || level >= MAX_DEPTH) {
    return (
      <SidebarMenuItem>
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
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={isActive}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("[data-chevron]")) {
                return;
              }
              navigate(`/node/${node.id}`);
            }}
          >
            <ChevronRight
              data-chevron
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
            />
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{node.title}</span>
            <StatusDot status={node.status} />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub>
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
