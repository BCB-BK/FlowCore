import { useMemo } from "react";
import { Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import {
  useGetBacklinks,
  getGetBacklinksQueryKey,
} from "@workspace/api-client-react";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { PAGE_TYPE_LABELS, getPageType } from "@/lib/types";
import { useSafeLinkProps } from "@/hooks/use-unsaved-changes";

/**
 * Relation types already shown in RelatedContentSidebar (structural relationships).
 * BacklinksPanel must exclude these to avoid showing the same link twice.
 */
const SIDEBAR_OWNED_TYPES = new Set([
  "related_to",
  "uses_template",
  "depends_on",
  "implements_policy",
  "upstream_of",
  "downstream_of",
  "replaces",
  "references",
]);

const RELATION_TO_CATEGORY: Record<string, string> = {
  linked: "Querverweise",
  cross_reference: "Querverweise",
  referenced: "Querverweise",
  inline_wiki_link: "Wiki-Link",
  parent_child: "Cluster",
};

const CATEGORY_ORDER = ["Querverweise", "Wiki-Link", "Cluster", "Verknüpfung"];

function getCategory(relationType: string): string {
  return RELATION_TO_CATEGORY[relationType] ?? "Verknüpfung";
}

interface BacklinksPanelProps {
  nodeId: string;
}

export function BacklinksPanel({ nodeId }: BacklinksPanelProps) {
  const getLinkProps = useSafeLinkProps();
  const { data: backlinks, isLoading } = useGetBacklinks(nodeId, {
    query: { queryKey: getGetBacklinksQueryKey(nodeId), staleTime: 0 },
  });

  const { grouped, hiddenCount } = useMemo(() => {
    if (!backlinks || backlinks.length === 0)
      return { grouped: null, hiddenCount: 0 };
    const map = new Map<string, typeof backlinks>();
    let hidden = 0;
    for (const link of backlinks) {
      if (SIDEBAR_OWNED_TYPES.has(link.relationType)) {
        hidden++;
        continue;
      }
      const cat = getCategory(link.relationType);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(link);
    }
    const groups = CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      links: map.get(c)!,
    }));
    if (groups.length === 0 && hidden === 0)
      return { grouped: null, hiddenCount: 0 };
    if (groups.length === 0) return { grouped: null, hiddenCount: hidden };
    return { grouped: groups, hiddenCount: hidden };
  }, [backlinks]);

  if (isLoading) return null;
  if (!grouped && hiddenCount === 0) return null;

  const visibleCount = grouped
    ? grouped.reduce((sum, g) => sum + g.links.length, 0)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Wird verlinkt von
          <Badge variant="outline" className="ml-1">
            {visibleCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {grouped &&
          grouped.map(({ category, links }) => (
            <div key={category}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                {category} ({links.length})
              </p>
              <div className="space-y-0.5">
                {links.map((link) => {
                  const pageDef = link.sourceTemplateType
                    ? getPageType(link.sourceTemplateType)
                    : null;
                  return (
                    <a
                      key={link.id}
                      {...getLinkProps(`/node/${link.sourceId}`)}
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
                        {(link.sourceDisplayCode ||
                          link.sourceTemplateType) && (
                          <p className="text-[10px] text-muted-foreground">
                            {link.sourceDisplayCode}
                            {link.sourceDisplayCode &&
                              link.sourceTemplateType && <> · </>}
                            {link.sourceTemplateType &&
                              (PAGE_TYPE_LABELS[link.sourceTemplateType] ||
                                link.sourceTemplateType)}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {category}
                      </Badge>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        {hiddenCount > 0 && (
          <p className="text-[11px] text-muted-foreground border-t pt-2 mt-1">
            {hiddenCount === 1
              ? "1 strukturelle Beziehung wird"
              : `${hiddenCount} strukturelle Beziehungen werden`}{" "}
            in „Beziehungen & Navigation" angezeigt.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
