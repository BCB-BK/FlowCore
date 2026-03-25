import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Minus, Plus, Equal } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

interface RevisionDiffViewProps {
  revisionIdA: string;
  revisionIdB: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DiffResult {
  revisionA: {
    id: string;
    revisionNo: number;
    title: string;
    status: string;
    createdAt: string;
    authorId?: string | null;
  };
  revisionB: {
    id: string;
    revisionNo: number;
    title: string;
    status: string;
    createdAt: string;
    authorId?: string | null;
  };
  metadataChanges: Record<string, { old: unknown; new: unknown }>;
  structuredFieldChanges: Record<string, { old: unknown; new: unknown }>;
  contentChanged: boolean;
  contentA?: Record<string, unknown> | null;
  contentB?: Record<string, unknown> | null;
  nodeContext?: {
    relations: Array<{
      id: string;
      sourceNodeId: string;
      targetNodeId: string;
      relationType: string;
      description: string | null;
    }>;
    tags: Array<{
      tagId: string;
      tagName: string;
      tagSlug: string;
    }>;
  };
}

const FIELD_LABELS: Record<string, string> = {
  title: "Titel",
  status: "Status",
  changeType: "Änderungstyp",
  versionLabel: "Version",
  reviewerId: "Prüfer",
  approverId: "Genehmiger",
};

export function RevisionDiffView({
  revisionIdA,
  revisionIdB,
  open,
  onOpenChange,
}: RevisionDiffViewProps) {
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(true);
  const apiBase = import.meta.env.BASE_URL + "api";

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    customFetch<DiffResult>(
      `${apiBase}/content/revisions/${revisionIdA}/diff/${revisionIdB}`,
    )
      .then(setDiff)
      .catch(() => setDiff(null))
      .finally(() => setLoading(false));
  }, [open, revisionIdA, revisionIdB, apiBase]);

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return "(leer)";
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return String(val);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Revisionsvergleich
            {diff && (
              <span className="text-sm font-normal text-muted-foreground">
                Rev. {diff.revisionA.revisionNo}
                <ArrowRight className="h-3 w-3 inline mx-1" />
                Rev. {diff.revisionB.revisionNo}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : diff ? (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 bg-red-50/30 dark:bg-red-950/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      Rev. {diff.revisionA.revisionNo}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {diff.revisionA.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{diff.revisionA.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(diff.revisionA.createdAt).toLocaleString("de-DE")}
                  </p>
                </div>
                <div className="rounded-lg border p-3 bg-green-50/30 dark:bg-green-950/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      Rev. {diff.revisionB.revisionNo}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {diff.revisionB.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{diff.revisionB.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(diff.revisionB.createdAt).toLocaleString("de-DE")}
                  </p>
                </div>
              </div>

              <Separator />

              {Object.keys(diff.metadataChanges).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    Metadaten-Änderungen
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(diff.metadataChanges).map(
                      ([field, change]) => (
                        <div key={field} className="rounded border p-2 text-sm">
                          <span className="font-medium text-muted-foreground">
                            {FIELD_LABELS[field] || field}:
                          </span>
                          <div className="flex items-start gap-2 mt-1">
                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded text-xs">
                              <Minus className="h-3 w-3" />
                              {formatValue(change.old)}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded text-xs">
                              <Plus className="h-3 w-3" />
                              {formatValue(change.new)}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {Object.keys(diff.structuredFieldChanges).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    Governance-Felder-Änderungen
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(diff.structuredFieldChanges).map(
                      ([field, change]) => (
                        <div key={field} className="rounded border p-2 text-sm">
                          <span className="font-medium text-muted-foreground">
                            {field}:
                          </span>
                          <div className="flex items-start gap-2 mt-1">
                            <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded text-xs break-all">
                              <Minus className="h-3 w-3 inline mr-1" />
                              {formatValue(change.old)}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded text-xs break-all">
                              <Plus className="h-3 w-3 inline mr-1" />
                              {formatValue(change.new)}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="rounded border p-3">
                <div className="flex items-center gap-2">
                  {diff.contentChanged ? (
                    <>
                      <Plus className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">
                        Inhalt wurde geändert
                      </span>
                    </>
                  ) : (
                    <>
                      <Equal className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Inhalt unverändert
                      </span>
                    </>
                  )}
                </div>
                {diff.contentChanged && diff.contentA && diff.contentB && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded border bg-red-50/30 dark:bg-red-950/10 p-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        <Minus className="h-3 w-3 inline mr-1" />
                        Rev. {diff.revisionA.revisionNo}
                      </p>
                      <pre className="text-xs whitespace-pre-wrap break-all max-h-[200px] overflow-auto">
                        {JSON.stringify(diff.contentA, null, 2)}
                      </pre>
                    </div>
                    <div className="rounded border bg-green-50/30 dark:bg-green-950/10 p-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        <Plus className="h-3 w-3 inline mr-1" />
                        Rev. {diff.revisionB.revisionNo}
                      </p>
                      <pre className="text-xs whitespace-pre-wrap break-all max-h-[200px] overflow-auto">
                        {JSON.stringify(diff.contentB, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {diff.nodeContext &&
                (diff.nodeContext.relations.length > 0 ||
                  diff.nodeContext.tags.length > 0) && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Verknüpfungen & Tags (aktueller Stand)
                    </h4>
                    {diff.nodeContext.relations.length > 0 && (
                      <div className="space-y-1 mb-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Verknüpfungen
                        </p>
                        {diff.nodeContext.relations.map((rel) => (
                          <div
                            key={rel.id}
                            className="flex items-center gap-2 text-xs rounded border px-2 py-1"
                          >
                            <Badge variant="outline" className="text-[10px]">
                              {rel.relationType}
                            </Badge>
                            <span className="text-muted-foreground">
                              → {rel.targetNodeId}
                            </span>
                            {rel.description && (
                              <span className="italic text-muted-foreground">
                                {rel.description}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {diff.nodeContext.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {diff.nodeContext.tags.map((tag) => (
                          <Badge
                            key={tag.tagId}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag.tagName}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {Object.keys(diff.metadataChanges).length === 0 &&
                Object.keys(diff.structuredFieldChanges).length === 0 &&
                !diff.contentChanged && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Equal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      Keine Unterschiede zwischen den Revisionen gefunden.
                    </p>
                  </div>
                )}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-center py-8 text-muted-foreground">
            Fehler beim Laden des Vergleichs
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
