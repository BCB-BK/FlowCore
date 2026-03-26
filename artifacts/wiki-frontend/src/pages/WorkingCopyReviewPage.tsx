import { useRoute, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useNode, useNodeRevisions } from "@/hooks/use-nodes";
import { NodeBreadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Eye,
  ArrowLeftRight,
  FileText,
  Pencil,
  ChevronDown,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getPageType } from "@/lib/types";
import {
  useGetActiveWorkingCopy,
  useGetPrincipal,
} from "@workspace/api-client-react";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { BlockEditor } from "@/components/editor";
import { WorkingCopyBanner } from "@/components/versioning/WorkingCopyBanner";
import { WorkingCopyActions } from "@/components/versioning/WorkingCopyActions";
import { useAuth } from "@/hooks/use-auth";
import type { JSONContent } from "@tiptap/react";

type ReviewMode = "changes" | "before_after" | "full";

interface RevisionRecord {
  versionLabel?: string | null;
  structuredFields?: Record<string, unknown> | null;
  content?: Record<string, unknown> | null;
  title?: string | null;
}

function extractEditorContent(sf: Record<string, unknown>): JSONContent | null {
  if (sf._editorContent && typeof sf._editorContent === "object") {
    return sf._editorContent as JSONContent;
  }
  return null;
}

function extractSections(
  sf: Record<string, unknown>,
): Array<{ key: string; value: unknown }> {
  const result: Array<{ key: string; value: unknown }> = [];
  for (const [key, val] of Object.entries(sf)) {
    if (key === "_editorContent") continue;
    if (val && typeof val === "string" && val.trim()) {
      result.push({ key, value: val });
    }
  }
  return result;
}

function extractMetadata(
  content: Record<string, unknown>,
): Array<{ key: string; value: unknown }> {
  const result: Array<{ key: string; value: unknown }> = [];
  for (const [key, val] of Object.entries(content)) {
    if (key.endsWith("_display")) continue;
    if (val !== null && val !== undefined && val !== "") {
      result.push({ key, value: val });
    }
  }
  return result;
}

export function WorkingCopyReviewPage() {
  const [, params] = useRoute("/nodes/:id/review");
  const nodeId = params?.id;
  const { data: node, isLoading: nodeLoading } = useNode(nodeId);
  const [, navigate] = useLocation();
  const { data: currentUser } = useAuth();

  const activeWCQuery = useGetActiveWorkingCopy(nodeId || "", {
    query: {
      queryKey: [`/api/content/nodes/${nodeId || ""}/working-copy`],
      enabled: !!nodeId,
      retry: false,
    },
  });
  const activeWC = activeWCQuery.data;
  const wcLoading = activeWCQuery.isLoading;

  const wcAuthorId = activeWC?.authorId;
  const { data: wcAuthor } = useGetPrincipal(wcAuthorId || "", {
    query: {
      queryKey: [`/api/principals/${wcAuthorId || ""}`],
      enabled: !!wcAuthorId,
    },
  });

  const { data: revisions } = useNodeRevisions(nodeId);

  const [reviewMode, setReviewMode] = useState<ReviewMode>("changes");

  const publishedRevision = useMemo<RevisionRecord | null>(() => {
    if (!revisions || !Array.isArray(revisions) || revisions.length === 0)
      return null;
    return revisions[0] as RevisionRecord;
  }, [revisions]);

  const publishedSF = useMemo<Record<string, unknown>>(() => {
    return (publishedRevision?.structuredFields as Record<string, unknown>) ?? {};
  }, [publishedRevision]);

  const publishedEditorContent = useMemo(
    () => extractEditorContent(publishedSF),
    [publishedSF],
  );

  const publishedSections = useMemo(
    () => extractSections(publishedSF),
    [publishedSF],
  );

  const publishedMetadata = useMemo(
    () =>
      extractMetadata(
        (publishedRevision?.content as Record<string, unknown>) ?? {},
      ),
    [publishedRevision],
  );

  const wcStructuredFields = useMemo(() => {
    if (!activeWC) return {};
    return (activeWC.structuredFields as Record<string, unknown>) ?? {};
  }, [activeWC]);

  const wcEditorContent = useMemo(
    () => extractEditorContent(wcStructuredFields),
    [wcStructuredFields],
  );

  const wcSections = useMemo(
    () => extractSections(wcStructuredFields),
    [wcStructuredFields],
  );

  const wcMetadata = useMemo(
    () =>
      extractMetadata((activeWC?.content as Record<string, unknown>) ?? {}),
    [activeWC],
  );

  const diffSections = useMemo(() => {
    const allKeys = new Set([
      ...Object.keys(publishedSF).filter((k) => k !== "_editorContent"),
      ...Object.keys(wcStructuredFields).filter((k) => k !== "_editorContent"),
    ]);
    const changed: Array<{
      key: string;
      oldVal: unknown;
      newVal: unknown;
    }> = [];
    for (const key of allKeys) {
      const oldVal = publishedSF[key];
      const newVal = wcStructuredFields[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changed.push({ key, oldVal, newVal });
      }
    }
    return changed;
  }, [publishedSF, wcStructuredFields]);

  const diffMetadata = useMemo(() => {
    const pubMeta =
      (publishedRevision?.content as Record<string, unknown>) ?? {};
    const wcMeta = (activeWC?.content as Record<string, unknown>) ?? {};
    const allKeys = new Set([
      ...Object.keys(pubMeta).filter((k) => !k.endsWith("_display")),
      ...Object.keys(wcMeta).filter((k) => !k.endsWith("_display")),
    ]);
    const changed: Array<{ key: string; oldVal: unknown; newVal: unknown }> =
      [];
    for (const key of allKeys) {
      const oldVal = pubMeta[key];
      const newVal = wcMeta[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changed.push({ key, oldVal, newVal });
      }
    }
    return changed;
  }, [publishedRevision, activeWC]);

  const unchangedSections = useMemo(() => {
    if (!publishedRevision) return [];
    const changedKeys = new Set(diffSections.map((d) => d.key));
    return Object.entries(publishedSF)
      .filter(
        ([key]) =>
          key !== "_editorContent" && !changedKeys.has(key) && publishedSF[key],
      )
      .map(([key, value]) => ({ key, value }));
  }, [publishedSF, diffSections, publishedRevision]);

  const editorChanged = useMemo(() => {
    return (
      JSON.stringify(publishedEditorContent) !==
      JSON.stringify(wcEditorContent)
    );
  }, [publishedEditorContent, wcEditorContent]);

  if (nodeLoading || wcLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Seite nicht gefunden</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/")}
        >
          Zurück zum Hub
        </Button>
      </div>
    );
  }

  if (!activeWC) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <p className="text-muted-foreground">
          Keine aktive Arbeitskopie vorhanden
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate(`/node/${nodeId}`)}
        >
          Zur Seite
        </Button>
      </div>
    );
  }

  const canReview =
    activeWC.status === "submitted" || activeWC.status === "in_review";
  const pageDef = getPageType(node.templateType);
  const isFirstVersion = !publishedRevision;

  const statusLabel =
    activeWC.status === "submitted"
      ? "Eingereicht"
      : activeWC.status === "in_review"
        ? "In Prüfung"
        : activeWC.status === "approved_for_publish"
          ? "Freigegeben"
          : activeWC.status;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <NodeBreadcrumbs nodeId={nodeId} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <PageTypeIcon iconName={node.templateType} />
            <Badge variant="outline">{statusLabel}</Badge>
            {!canReview && (
              <Badge variant="secondary">Nur Ansicht</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {activeWC.title || node.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {node.displayCode}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {canReview && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/nodes/${nodeId}/edit`)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Arbeitskopie bearbeiten
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/node/${nodeId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Zurück
          </Button>
        </div>
      </div>

      <WorkingCopyBanner
        workingCopy={activeWC}
        currentUserId={currentUser?.principalId}
        authorName={wcAuthor?.displayName ?? undefined}
      />

      {canReview && (
        <WorkingCopyActions
          workingCopy={activeWC}
          nodeId={nodeId!}
          currentUserId={currentUser?.principalId}
        />
      )}

      <Tabs
        value={reviewMode}
        onValueChange={(v) => setReviewMode(v as ReviewMode)}
      >
        <TabsList>
          <TabsTrigger value="changes" className="gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Nur Änderungen
          </TabsTrigger>
          <TabsTrigger value="before_after" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Vorher / Nachher
          </TabsTrigger>
          <TabsTrigger value="full" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Komplette Arbeitskopie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="changes" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Geänderte Bereiche
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editorChanged && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">
                      Seiteninhalt (Editor)
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      geändert
                    </Badge>
                  </div>
                  {wcEditorContent && (
                    <div className="rounded-md border p-3 bg-muted/20">
                      <BlockEditor
                        content={wcEditorContent}
                        onSave={async () => {}}
                        editable={false}
                        nodeId={nodeId}
                      />
                    </div>
                  )}
                </div>
              )}

              {diffSections.map((diff) => (
                <div key={diff.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">{diff.key}</span>
                    <Badge variant="secondary" className="text-xs">
                      {diff.oldVal ? "geändert" : "neu"}
                    </Badge>
                  </div>
                  {diff.oldVal != null && (
                    <div className="rounded-md border p-3 bg-red-50 dark:bg-red-950/20 text-sm whitespace-pre-wrap line-through text-muted-foreground">
                      {String(diff.oldVal)}
                    </div>
                  )}
                  <div className="rounded-md border p-3 bg-green-50 dark:bg-green-950/20 text-sm whitespace-pre-wrap">
                    {String(diff.newVal ?? "")}
                  </div>
                </div>
              ))}

              {diffMetadata.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-sm font-medium">
                      Metadaten ({diffMetadata.length} geändert)
                    </span>
                  </div>
                  <div className="rounded-md border bg-muted/20 divide-y">
                    {diffMetadata.map((m) => (
                      <div key={m.key} className="px-3 py-2 text-sm">
                        <span className="font-medium">{m.key}</span>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="text-muted-foreground line-through">
                            {m.oldVal != null ? String(m.oldVal) : "—"}
                          </div>
                          <div>
                            {m.newVal != null ? String(m.newVal) : "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {unchangedSections.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between text-muted-foreground"
                    >
                      <span>
                        {unchangedSections.length} unveränderte Bereiche
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {unchangedSections.map((section) => (
                      <div key={section.key} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-gray-300" />
                          <span className="text-sm text-muted-foreground">
                            {section.key}
                          </span>
                        </div>
                        <div className="rounded-md border p-3 bg-muted/10 text-sm whitespace-pre-wrap text-muted-foreground">
                          {String(section.value)}
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {!editorChanged &&
                diffSections.length === 0 &&
                diffMetadata.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {isFirstVersion
                      ? "Erste Version — kein Vergleich verfügbar."
                      : "Keine Änderungen erkannt."}
                  </p>
                )}
            </CardContent>
          </Card>

          {activeWC.changeSummary && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Zusammenfassung des Autors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{activeWC.changeSummary}</p>
                {activeWC.changeType && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {activeWC.changeType}
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="before_after" className="mt-4 space-y-4">
          {isFirstVersion && (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Erste Version — es gibt keine veröffentlichte Version zum
                Vergleich. Wechseln Sie zu "Komplette Arbeitskopie" um den
                gesamten Inhalt zu sehen.
              </CardContent>
            </Card>
          )}

          {!isFirstVersion && (
            <>
              {(editorChanged ||
                publishedEditorContent ||
                wcEditorContent) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Seiteninhalt (Editor)
                      {editorChanged && (
                        <Badge
                          variant="secondary"
                          className="ml-2 text-xs"
                        >
                          geändert
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Vorher (Version{" "}
                          {publishedRevision?.versionLabel || "1"})
                        </p>
                        <div className="rounded-md border p-3 min-h-[60px] bg-muted/10">
                          {publishedEditorContent ? (
                            <BlockEditor
                              content={publishedEditorContent}
                              onSave={async () => {}}
                              editable={false}
                              nodeId={nodeId}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              Kein Editor-Inhalt
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Nachher (Arbeitskopie)
                        </p>
                        <div className="rounded-md border p-3 min-h-[60px] bg-muted/10">
                          {wcEditorContent ? (
                            <BlockEditor
                              content={wcEditorContent}
                              onSave={async () => {}}
                              editable={false}
                              nodeId={nodeId}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              Kein Editor-Inhalt
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {diffSections.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Strukturierte Felder
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {diffSections.map((diff) => (
                      <div key={diff.key}>
                        <p className="text-sm font-medium mb-2">
                          {diff.key}
                        </p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Vorher
                            </p>
                            <div className="rounded-md border p-3 bg-muted/10 text-sm whitespace-pre-wrap min-h-[40px]">
                              {diff.oldVal ? (
                                String(diff.oldVal)
                              ) : (
                                <span className="text-muted-foreground italic">
                                  Leer
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Nachher
                            </p>
                            <div className="rounded-md border p-3 bg-muted/10 text-sm whitespace-pre-wrap min-h-[40px]">
                              {diff.newVal ? (
                                String(diff.newVal)
                              ) : (
                                <span className="text-muted-foreground italic">
                                  Leer
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {!editorChanged && diffSections.length === 0 && (
                <Card>
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    Keine Unterschiede zur veröffentlichten Version erkannt.
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="full" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Komplette Arbeitskopie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {pageDef?.sections && pageDef.sections.length > 0 && (
                <div className="space-y-4">
                  {pageDef.sections.map((section) => {
                    const val = wcStructuredFields[section.key];
                    return (
                      <div key={section.key}>
                        <h3 className="text-sm font-medium mb-1">
                          {section.label}
                        </h3>
                        {val ? (
                          <div className="text-sm whitespace-pre-wrap border rounded-md p-3 bg-muted/20">
                            {String(val)}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Noch kein Inhalt
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {wcEditorContent && (
                <div>
                  <h3 className="text-sm font-medium mb-2">
                    Seiteninhalt (Editor)
                  </h3>
                  <div className="border rounded-md p-3">
                    <BlockEditor
                      content={wcEditorContent}
                      onSave={async () => {}}
                      editable={false}
                      nodeId={nodeId}
                    />
                  </div>
                </div>
              )}

              {wcMetadata.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Metadaten</h3>
                  <div className="border rounded-md p-3 bg-muted/20">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {wcMetadata.map((m) => (
                        <div key={m.key}>
                          <span className="text-muted-foreground">
                            {m.key}:
                          </span>{" "}
                          <span>{String(m.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
