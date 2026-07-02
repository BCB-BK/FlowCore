import { useLocation } from "wouter";
import { Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { useGetBacklinks, getGetBacklinksQueryKey } from "@workspace/api-client-react";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { PAGE_TYPE_LABELS, getPageType } from "@/lib/types";

const RELATION_TYPE_LABELS: Record<string, string> = {
  parent_child: "Eltern-Kind",
  linked: "Querverweise",
  referenced: "Referenz",
  inline_wiki_link: "Wiki-Link",
  cross_reference: "Querverweise",
  related_to: "Verwandt",
  uses_template: "Vorlage",
  depends_on: "Abhängigkeit",
  implements_policy: "Richtlinie",
  upstream_of: "Vorgelagerter Prozess",
  downstream_of: "Nachgelagerter Prozess",
  replaces: "Ersetzt",
  references: "Referenz",
};

interface BacklinksPanelProps {
  nodeId: string;
}

export function BacklinksPanel({ nodeId }: BacklinksPanelProps) {
  const [, navigate] = useLocation();
  const { data: backlinks, isLoading } = useGetBacklinks(nodeId, {
    query: { queryKey: getGetBacklinksQueryKey(nodeId), staleTime: 0 },
  });

  if (isLoading) return null;
  if (!backlinks || backlinks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Wird verlinkt von
          <Badge variant="outline" className="ml-1">
            {backlinks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0.5">
          {backlinks.map((link) => {
            const pageDef = link.sourceTemplateType
              ? getPageType(link.sourceTemplateType)
              : null;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => navigate(`/node/${link.sourceId}`)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2 transition-colors"
              >
                {pageDef && (
                  <PageTypeIcon
                    iconName={pageDef.icon}
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {link.sourceTitle}
                  </p>
                  {(link.sourceDisplayCode || link.sourceTemplateType) && (
                    <p className="text-[10px] text-muted-foreground">
                      {link.sourceDisplayCode}
                      {link.sourceDisplayCode && link.sourceTemplateType && (
                        <> · </>
                      )}
                      {link.sourceTemplateType &&
                        (PAGE_TYPE_LABELS[link.sourceTemplateType] ||
                          link.sourceTemplateType)}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {RELATION_TYPE_LABELS[link.relationType] ?? "Verknüpfung"}
                </Badge>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
