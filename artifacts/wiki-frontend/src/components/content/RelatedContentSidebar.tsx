import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useGetBacklinks } from "@workspace/api-client-react";
import { PAGE_TYPE_LABELS } from "@/lib/types";
import { StatusBadge } from "@/components/versioning/StatusBadge";

interface RelatedContentSidebarProps {
  nodeId: string;
}

export function RelatedContentSidebar({ nodeId }: RelatedContentSidebarProps) {
  const { data: backlinks } = useGetBacklinks(nodeId);
  const [, navigate] = useLocation();

  if (!Array.isArray(backlinks) || backlinks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Verknüpfte Seiten ({backlinks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {backlinks.map((link) => (
          <button
            key={link.id}
            className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2"
            onClick={() => navigate(`/node/${link.sourceId}`)}
          >
            <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs truncate">{link.sourceTitle}</p>
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
      </CardContent>
    </Card>
  );
}
