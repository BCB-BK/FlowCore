import { useNodeAncestors, useNode } from "@/hooks/use-nodes";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLocation } from "wouter";
import { Home } from "lucide-react";
import { Fragment } from "react";

interface BreadcrumbsProps {
  nodeId?: string;
}

export function NodeBreadcrumbs({ nodeId }: BreadcrumbsProps) {
  const { data: ancestors } = useNodeAncestors(nodeId);
  const { data: currentNode } = useNode(nodeId);
  const [, navigate] = useLocation();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            className="cursor-pointer flex items-center gap-1"
            onClick={() => navigate("/")}
          >
            <Home className="h-3.5 w-3.5" />
            Hub
          </BreadcrumbLink>
        </BreadcrumbItem>

        {ancestors && ancestors.length > 0 && (
          <>
            {ancestors.map((ancestor) => (
              <Fragment key={ancestor.id}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    className="cursor-pointer"
                    onClick={() => navigate(`/node/${ancestor.id}`)}
                  >
                    {ancestor.title}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </Fragment>
            ))}
          </>
        )}

        {currentNode && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentNode.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
