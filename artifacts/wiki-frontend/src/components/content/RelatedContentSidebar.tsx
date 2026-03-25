import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, ArrowLeft, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import {
  useGetBacklinks,
  useGetForwardLinks,
} from "@workspace/api-client-react";
import { PAGE_TYPE_LABELS } from "@/lib/types";

interface RelatedContentSidebarProps {
  nodeId: string;
}

export function RelatedContentSidebar({ nodeId }: RelatedContentSidebarProps) {
  const { data: backlinks } = useGetBacklinks(nodeId);
  const { data: forwardLinks } = useGetForwardLinks(nodeId);
  const [, navigate] = useLocation();

  const hasBacklinks = Array.isArray(backlinks) && backlinks.length > 0;
  const hasForwardLinks =
    Array.isArray(forwardLinks) && forwardLinks.length > 0;

  if (!hasBacklinks && !hasForwardLinks) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Link2 className="h-4 w-4" />
          Verknüpfte Seiten
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasBacklinks && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Eingehende Verknüpfungen ({backlinks.length})
            </p>
            <div className="space-y-1">
              {backlinks.map((link) => (
                <button
                  key={link.id}
                  className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2"
                  onClick={() => navigate(`/node/${link.sourceId}`)}
                >
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">
                      {link.sourceTitle}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {link.sourceDisplayCode} ·{" "}
                      {PAGE_TYPE_LABELS[link.sourceTemplateType || ""] ||
                        link.sourceTemplateType}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {link.relationType}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}
        {hasForwardLinks && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />
              Ausgehende Verknüpfungen ({forwardLinks.length})
            </p>
            <div className="space-y-1">
              {forwardLinks.map((link) => (
                <button
                  key={link.id}
                  className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2"
                  onClick={() => navigate(`/node/${link.targetId}`)}
                >
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">
                      {link.targetTitle}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {link.targetDisplayCode} ·{" "}
                      {PAGE_TYPE_LABELS[link.targetTemplateType || ""] ||
                        link.targetTemplateType}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {link.relationType}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
