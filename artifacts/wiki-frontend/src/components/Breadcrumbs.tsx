import { useNodeAncestors, useNode } from "@/hooks/use-nodes";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@workspace/ui/breadcrumb";
import { Home } from "lucide-react";
import { Fragment, useMemo } from "react";
import { useSafeLinkProps } from "@/hooks/use-unsaved-changes";

interface BreadcrumbsProps {
  nodeId?: string;
}

const MAX_VISIBLE = 3;

export function NodeBreadcrumbs({ nodeId }: BreadcrumbsProps) {
  const { data: ancestors } = useNodeAncestors(nodeId);
  const { data: currentNode } = useNode(nodeId);
  const getLinkProps = useSafeLinkProps();

  const { collapsed, visible } = useMemo(() => {
    if (!ancestors || ancestors.length <= MAX_VISIBLE) {
      return { collapsed: [], visible: ancestors ?? [] };
    }
    return {
      collapsed: ancestors.slice(0, ancestors.length - MAX_VISIBLE),
      visible: ancestors.slice(ancestors.length - MAX_VISIBLE),
    };
  }, [ancestors]);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            className="flex items-center gap-1"
            {...getLinkProps("/")}
          >
            <Home className="h-3.5 w-3.5" />
            Hub
          </BreadcrumbLink>
        </BreadcrumbItem>

        {collapsed.length > 0 && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                {...getLinkProps(`/node/${collapsed[collapsed.length - 1].id}`)}
                title={collapsed.map((a) => a.title).join(" → ")}
              >
                <BreadcrumbEllipsis />
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}

        {visible.map((ancestor, idx) => {
          const depth = collapsed.length + idx + 1;
          return (
            <Fragment key={ancestor.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="flex items-center gap-1.5"
                  {...getLinkProps(`/node/${ancestor.id}`)}
                >
                  <span className="hidden sm:inline text-[10px] text-muted-foreground font-mono bg-muted/60 px-1 rounded">
                    L{depth}
                  </span>
                  <span>{ancestor.title}</span>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </Fragment>
          );
        })}

        {currentNode && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1.5">
                <span className="hidden sm:inline text-[10px] text-muted-foreground font-mono bg-muted/60 px-1 rounded">
                  L{(ancestors?.length ?? 0) + 1}
                </span>
                <span>{currentNode.title}</span>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
