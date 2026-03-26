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
import {
  ArrowRight,
  Minus,
  Plus,
  Equal,
  FileText,
  Settings,
  Layers,
  Tag,
  Link2,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { InlineTextDiff } from "./InlineTextDiff";
import { formatFieldLabel, formatValueForDisplay } from "@/lib/text-diff";

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

function DiffFieldRow({
  label,
  oldVal,
  newVal,
}: {
  label: string;
  oldVal: unknown;
  newVal: unknown;
}) {
  const oldStr = formatValueForDisplay(oldVal);
  const newStr = formatValueForDisplay(newVal);
  const isAdded = oldVal === null || oldVal === undefined;
  const isRemoved = newVal === null || newVal === undefined;
  const isTextual = typeof oldVal === "string" && typeof newVal === "string";

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="px-3 py-1.5 bg-muted/50 border-b">
        <span className="text-sm font-medium">{formatFieldLabel(label)}</span>
        {isAdded && (
          <Badge variant="outline" className="ml-2 text-[10px] h-4 text-green-600 border-green-300">
            Hinzugefügt
          </Badge>
        )}
        {isRemoved && (
          <Badge variant="outline" className="ml-2 text-[10px] h-4 text-red-600 border-red-300">
            Entfernt
          </Badge>
        )}
      </div>
      {isTextual && !isAdded && !isRemoved ? (
        <div className="p-3">
          <InlineTextDiff oldText={oldStr} newText={newStr} />
        </div>
      ) : (
        <div className="grid grid-cols-2 divide-x">
          <div className="p-2 bg-red-50/40 dark:bg-red-950/10">
            <div className="flex items-start gap-1">
              <Minus className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
              <span className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                {oldStr}
              </span>
            </div>
          </div>
          <div className="p-2 bg-green-50/40 dark:bg-green-950/10">
            <div className="flex items-start gap-1">
              <Plus className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
              <span className="text-xs text-green-700 dark:text-green-300 whitespace-pre-wrap break-all">
                {newStr}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffSectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: typeof FileText;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h4 className="text-sm font-semibold">{title}</h4>
      <Badge variant="secondary" className="text-[10px] h-4">
        {count}
      </Badge>
    </div>
  );
}

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

  const totalChanges = diff
    ? Object.keys(diff.metadataChanges).length +
      Object.keys(diff.structuredFieldChanges).length +
      (diff.contentChanged ? 1 : 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Revisionsvergleich
            {diff && (
              <>
                <span className="text-sm font-normal text-muted-foreground">
                  Rev. {diff.revisionA.revisionNo}
                  <ArrowRight className="h-3 w-3 inline mx-1" />
                  Rev. {diff.revisionB.revisionNo}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {totalChanges} {totalChanges === 1 ? "Änderung" : "Änderungen"}
                </Badge>
              </>
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
          <ScrollArea className="max-h-[65vh]">
            <div className="space-y-5 pr-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 bg-red-50/30 dark:bg-red-950/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs font-mono">
                      Rev. {diff.revisionA.revisionNo}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {diff.revisionA.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium truncate">{diff.revisionA.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(diff.revisionA.createdAt).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="rounded-lg border p-3 bg-green-50/30 dark:bg-green-950/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs font-mono">
                      Rev. {diff.revisionB.revisionNo}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {diff.revisionB.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium truncate">{diff.revisionB.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(diff.revisionB.createdAt).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <Separator />

              {Object.keys(diff.metadataChanges).length > 0 && (
                <div>
                  <DiffSectionHeader
                    icon={Settings}
                    title="Metadaten"
                    count={Object.keys(diff.metadataChanges).length}
                  />
                  <div className="space-y-2">
                    {Object.entries(diff.metadataChanges).map(([field, change]) => (
                      <DiffFieldRow
                        key={field}
                        label={field}
                        oldVal={change.old}
                        newVal={change.new}
                      />
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(diff.structuredFieldChanges).length > 0 && (
                <div>
                  <DiffSectionHeader
                    icon={Layers}
                    title="Governance-Felder"
                    count={Object.keys(diff.structuredFieldChanges).length}
                  />
                  <div className="space-y-2">
                    {Object.entries(diff.structuredFieldChanges).map(([field, change]) => (
                      <DiffFieldRow
                        key={field}
                        label={field}
                        oldVal={change.old}
                        newVal={change.new}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {diff.contentChanged ? (
                    <>
                      <span className="text-sm font-medium">
                        Block-Inhalt geändert
                      </span>
                      <Badge variant="outline" className="text-[10px] h-4 text-amber-600 border-amber-300">
                        Geändert
                      </Badge>
                    </>
                  ) : (
                    <>
                      <Equal className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Block-Inhalt unverändert
                      </span>
                    </>
                  )}
                </div>
              </div>

              {diff.nodeContext &&
                (diff.nodeContext.relations.length > 0 ||
                  diff.nodeContext.tags.length > 0) && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      Verknüpfungen & Tags
                    </h4>
                    {diff.nodeContext.relations.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {diff.nodeContext.relations.map((rel) => (
                          <div
                            key={rel.id}
                            className="flex items-center gap-2 text-xs rounded border px-2 py-1"
                          >
                            <Badge variant="outline" className="text-[10px]">
                              {rel.relationType}
                            </Badge>
                            <span className="text-muted-foreground">
                              {rel.targetNodeId.substring(0, 8)}…
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {diff.nodeContext.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {diff.nodeContext.tags.map((tag) => (
                          <Badge key={tag.tagId} variant="secondary" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag.tagName}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {totalChanges === 0 && (
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
