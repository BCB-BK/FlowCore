import { useRoute, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useNode, useNodeRevisions } from "@/hooks/use-nodes";
import { useToast } from "@/hooks/use-toast";
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
  Loader2,
} from "lucide-react";
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

export function WorkingCopyReviewPage() {
  const [, params] = useRoute("/nodes/:id/review");
  const nodeId = params?.id;
  const { data: node, isLoading: nodeLoading } = useNode(nodeId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
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

  const wcStructuredFields = useMemo(() => {
    if (!activeWC) return {};
    return (activeWC.structuredFields as Record<string, unknown>) ?? {};
  }, [activeWC]);

  const wcEditorContent = useMemo(() => {
    if (
      wcStructuredFields._editorContent &&
      typeof wcStructuredFields._editorContent === "object"
    ) {
      return wcStructuredFields._editorContent as JSONContent;
    }
    return null;
  }, [wcStructuredFields]);

  const wcMetadata = useMemo(() => {
    if (!activeWC) return {};
    return (activeWC.content as Record<string, unknown>) ?? {};
  }, [activeWC]);

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

  const changedSections: Array<{ key: string; value: unknown }> = [];
  for (const [key, val] of Object.entries(wcStructuredFields)) {
    if (key === "_editorContent") continue;
    if (val && typeof val === "string" && val.trim()) {
      changedSections.push({ key, value: val });
    }
  }

  const changedMetadata: Array<{ key: string; value: unknown }> = [];
  for (const [key, val] of Object.entries(wcMetadata)) {
    if (key.endsWith("_display")) continue;
    if (val !== null && val !== undefined && val !== "") {
      changedMetadata.push({ key, value: val });
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <NodeBreadcrumbs nodeId={nodeId} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <PageTypeIcon iconName={node.templateType} />
            <Badge variant="outline">{activeWC.status === "submitted" ? "Eingereicht" : activeWC.status === "in_review" ? "In Prüfung" : activeWC.status}</Badge>
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
              {wcEditorContent && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">
                      Seiteninhalt (Editor)
                    </span>
                  </div>
                  <div className="rounded-md border p-3 bg-muted/20">
                    <BlockEditor
                      content={wcEditorContent}
                      onSave={async () => {}}
                      editable={false}
                      nodeId={nodeId}
                    />
                  </div>
                </div>
              )}

              {changedSections.map((section) => (
                <div key={section.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">
                      {section.key}
                    </span>
                  </div>
                  <div className="rounded-md border p-3 bg-muted/20 text-sm whitespace-pre-wrap">
                    {String(section.value)}
                  </div>
                </div>
              ))}

              {changedMetadata.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">Metadaten</span>
                  </div>
                  <div className="rounded-md border p-3 bg-muted/20">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {changedMetadata.map((m) => (
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

              {!wcEditorContent &&
                changedSections.length === 0 &&
                changedMetadata.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Keine Änderungen erkannt.
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="outline">Vorher</Badge>
                  Veröffentlichte Version
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {revisions && (revisions as Array<{ versionLabel?: string | null }>).length > 0
                    ? `Version ${(revisions as Array<{ versionLabel?: string | null }>)[0]?.versionLabel || "1"}`
                    : "Erste Version"}
                </p>
                <div className="mt-3 text-sm text-muted-foreground italic">
                  Veröffentlichter Inhalt wird hier angezeigt
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="default">Nachher</Badge>
                  Arbeitskopie
                </CardTitle>
              </CardHeader>
              <CardContent>
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

                {changedSections.length > 0 && (
                  <div className="mt-4 space-y-2 border-t pt-3">
                    {changedSections.map((s) => (
                      <div key={s.key}>
                        <span className="text-xs font-medium text-muted-foreground">
                          {s.key}
                        </span>
                        <p className="text-sm whitespace-pre-wrap">
                          {String(s.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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

              {changedMetadata.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Metadaten</h3>
                  <div className="border rounded-md p-3 bg-muted/20">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {changedMetadata.map((m) => (
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
