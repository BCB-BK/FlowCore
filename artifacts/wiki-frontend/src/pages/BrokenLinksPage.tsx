import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { AlertTriangle, Link2Off, FileQuestion } from "lucide-react";
import { useLocation } from "wouter";
import { useGetBrokenLinks } from "@workspace/api-client-react";
import { PAGE_TYPE_LABELS } from "@/lib/types";

export function BrokenLinksPage() {
  const { data, isLoading } = useGetBrokenLinks();
  const [, navigate] = useLocation();

  const brokenCount = data?.brokenRelations?.length ?? 0;
  const orphanCount = data?.orphanedNodes?.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <h1 className="text-2xl font-bold tracking-tight">
          Defekte Verknüpfungen
        </h1>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Lade Bericht...</p>
      ) : brokenCount === 0 && orphanCount === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-sm">
              Keine defekten Verknüpfungen oder verwaisten Seiten gefunden.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {brokenCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Link2Off className="h-4 w-4 text-destructive" />
                  Defekte Relationen ({brokenCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data?.brokenRelations?.map((rel) => (
                  <div
                    key={rel.relationId}
                    className="flex items-center gap-2 text-sm p-2 rounded hover:bg-accent cursor-pointer"
                    onClick={() => navigate(`/node/${rel.sourceNodeId}`)}
                  >
                    <Link2Off className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">
                        {rel.sourceTitle}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {rel.sourceDisplayCode} → Ziel fehlt
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {rel.relationType}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {orphanCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileQuestion className="h-4 w-4 text-yellow-600" />
                  Verwaiste Seiten ({orphanCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data?.orphanedNodes?.map((node) => (
                  <div
                    key={node.id}
                    className="flex items-center gap-2 text-sm p-2 rounded hover:bg-accent cursor-pointer"
                    onClick={() => navigate(`/node/${node.id}`)}
                  >
                    <FileQuestion className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">
                        {node.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {node.displayCode} ·{" "}
                        {PAGE_TYPE_LABELS[node.templateType || ""] ||
                          node.templateType}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
