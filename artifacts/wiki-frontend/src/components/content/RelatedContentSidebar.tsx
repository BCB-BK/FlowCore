import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Link2,
  ArrowUpDown,
  GitBranch,
  Shield,
  FileText,
  Users,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  useGetBacklinks,
  useGetForwardLinks,
} from "@workspace/api-client-react";
import { useNode, useNodeChildren, useNodeSiblings } from "@/hooks/use-nodes";
import { PAGE_TYPE_LABELS } from "@/lib/types";
import { useMemo } from "react";

const RELATION_TYPE_LABELS: Record<string, string> = {
  related_to: "Verwandt",
  uses_template: "Nutzt Vorlage",
  depends_on: "Abhängig von",
  implements_policy: "Setzt Richtlinie um",
  upstream_of: "Vorgelagerter Prozess",
  downstream_of: "Nachgelagerter Prozess",
  replaces: "Ersetzt",
  references: "Referenziert",
};

const RELATION_CATEGORIES: Record<string, {
  label: string;
  icon: typeof Link2;
  types: string[];
}> = {
  process_flow: {
    label: "Prozessfluss",
    icon: ArrowUpDown,
    types: ["upstream_of", "downstream_of"],
  },
  governance: {
    label: "Governance & Richtlinien",
    icon: Shield,
    types: ["implements_policy"],
  },
  dependencies: {
    label: "Abhängigkeiten",
    icon: GitBranch,
    types: ["depends_on", "replaces"],
  },
  references: {
    label: "Verweise & Referenzen",
    icon: FileText,
    types: ["related_to", "uses_template", "references"],
  },
};

interface RelatedContentSidebarProps {
  nodeId: string;
}

export function RelatedContentSidebar({ nodeId }: RelatedContentSidebarProps) {
  const { data: backlinks } = useGetBacklinks(nodeId);
  const { data: forwardLinks } = useGetForwardLinks(nodeId);
  const { data: siblings } = useNodeSiblings(nodeId);
  const { data: children } = useNodeChildren(nodeId);
  const { data: currentNode } = useNode(nodeId);
  const [, navigate] = useLocation();

  const parentId = currentNode?.parentNodeId;
  const { data: parentNode } = useNode(parentId ?? undefined);

  const hasBacklinks = Array.isArray(backlinks) && backlinks.length > 0;
  const hasForwardLinks = Array.isArray(forwardLinks) && forwardLinks.length > 0;
  const hasSiblings = Array.isArray(siblings) && siblings.length > 0;
  const hasChildren = Array.isArray(children) && children.length > 0;
  const hasParent = !!parentNode;

  const groupedLinks = useMemo(() => {
    const allLinks = [
      ...(hasBacklinks
        ? backlinks.map((l) => ({
            ...l,
            direction: "incoming" as const,
            nodeId: l.sourceId,
            nodeTitle: l.sourceTitle,
            nodeDisplayCode: l.sourceDisplayCode,
            nodeTemplateType: l.sourceTemplateType,
          }))
        : []),
      ...(hasForwardLinks
        ? forwardLinks.map((l) => ({
            ...l,
            direction: "outgoing" as const,
            nodeId: l.targetId,
            nodeTitle: l.targetTitle,
            nodeDisplayCode: l.targetDisplayCode,
            nodeTemplateType: l.targetTemplateType,
          }))
        : []),
    ];

    const groups: Record<string, typeof allLinks> = {};
    for (const [catKey, catDef] of Object.entries(RELATION_CATEGORIES)) {
      const matching = allLinks.filter((l) =>
        catDef.types.includes(l.relationType),
      );
      if (matching.length > 0) {
        groups[catKey] = matching;
      }
    }
    return groups;
  }, [backlinks, forwardLinks, hasBacklinks, hasForwardLinks]);

  const hasAnyContent =
    hasParent ||
    hasChildren ||
    hasSiblings ||
    Object.keys(groupedLinks).length > 0;

  if (!hasAnyContent) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Link2 className="h-4 w-4" />
          Beziehungen & Navigation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasParent && parentNode && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              Übergeordnete Seite
            </p>
            <button
              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2"
              onClick={() => navigate(`/node/${parentNode.id}`)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs truncate">
                  {parentNode.title}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {parentNode.displayCode} ·{" "}
                  {PAGE_TYPE_LABELS[parentNode.templateType] || parentNode.templateType}
                </p>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
            </button>
          </div>
        )}

        {hasChildren && children && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <ArrowDown className="h-3 w-3" />
              Unterseiten ({children.length})
            </p>
            <div className="space-y-0.5">
              {children.slice(0, 5).map((child) => (
                <button
                  key={child.id}
                  className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2"
                  onClick={() => navigate(`/node/${child.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">
                      {child.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {child.displayCode}
                    </p>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              ))}
              {children.length > 5 && (
                <p className="text-[10px] text-muted-foreground px-2 pt-1">
                  + {children.length - 5} weitere
                </p>
              )}
            </div>
          </div>
        )}

        {hasSiblings && siblings && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Users className="h-3 w-3" />
              Gleichrangige Seiten ({siblings.length})
            </p>
            <div className="space-y-0.5">
              {siblings.slice(0, 5).map((sib) => (
                <button
                  key={sib.id}
                  className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2"
                  onClick={() => navigate(`/node/${sib.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">
                      {sib.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {sib.displayCode}
                    </p>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              ))}
              {siblings.length > 5 && (
                <p className="text-[10px] text-muted-foreground px-2 pt-1">
                  + {siblings.length - 5} weitere
                </p>
              )}
            </div>
          </div>
        )}

        {Object.entries(groupedLinks).map(([catKey, links]) => {
          const catDef = RELATION_CATEGORIES[catKey];
          if (!catDef) return null;
          const CatIcon = catDef.icon;
          return (
            <div key={catKey}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <CatIcon className="h-3 w-3" />
                {catDef.label} ({links.length})
              </p>
              <div className="space-y-0.5">
                {links.map((link) => (
                  <button
                    key={link.id}
                    className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2"
                    onClick={() => navigate(`/node/${link.nodeId}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">
                        {link.nodeTitle}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {link.nodeDisplayCode} ·{" "}
                        {PAGE_TYPE_LABELS[link.nodeTemplateType || ""] || link.nodeTemplateType}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {RELATION_TYPE_LABELS[link.relationType] || link.relationType}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
