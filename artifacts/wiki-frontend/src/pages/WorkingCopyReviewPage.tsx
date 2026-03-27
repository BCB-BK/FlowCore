import { useRoute, useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { useNode, useNodeRevisions } from "@/hooks/use-nodes";
import { NodeBreadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Eye,
  ArrowLeftRight,
  FileText,
  Pencil,
  ChevronDown,
  Save,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getPageType } from "@/lib/types";
import {
  useGetActiveWorkingCopy,
  useGetPrincipal,
  customFetch,
} from "@workspace/api-client-react";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { BlockEditorWithBoundary as BlockEditor } from "@/components/editor";
import { WorkingCopyBanner } from "@/components/versioning/WorkingCopyBanner";
import { WorkingCopyActions } from "@/components/versioning/WorkingCopyActions";
import { WorkingCopyTimeline } from "@/components/versioning/WorkingCopyTimeline";
import { InlineTextDiff } from "@/components/versioning/InlineTextDiff";
import { useAuth } from "@/hooks/use-auth";
import type { JSONContent } from "@tiptap/react";
import { formatFieldLabel, formatValueForDisplay } from "@/lib/text-diff";

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
  const [editableSummary, setEditableSummary] = useState<string | null>(null);
  const [savingSummary, setSavingSummary] = useState(false);
  const [generatingAiSummary, setGeneratingAiSummary] = useState(false);
  const [lastReturnComment, setLastReturnComment] = useState<string | null>(null);
  const { toast } = useToast();
  const apiBase = import.meta.env.BASE_URL + "api";

  const hasReviewPermission = currentUser?.permissions?.includes("review_working_copy") ?? false;

  useEffect(() => {
    if (!activeWC?.id) return;
    if (activeWC.status !== "changes_requested") {
      setLastReturnComment(null);
      return;
    }
    customFetch<Array<{ eventType: string; comment?: string | null }>>(
      `${apiBase}/content/working-copies/${activeWC.id}/events`,
    )
      .then((events) => {
        const returnEvents = events.filter(
          (e) => e.eventType === "returned_for_changes" && e.comment,
        );
        const lastReturn = returnEvents.length > 0 ? returnEvents[returnEvents.length - 1] : null;
        setLastReturnComment(lastReturn?.comment ?? null);
      })
      .catch(() => setLastReturnComment(null));
  }, [activeWC?.id, activeWC?.status, apiBase]);

  const handleGenerateAiSummary = async () => {
    if (!activeWC) return;
    setGeneratingAiSummary(true);
    try {
      const result = await customFetch<{ summary: string }>(
        `${apiBase}/content/working-copies/${activeWC.id}/generate-summary`,
        { method: "POST" },
      );
      toast({ title: "KI-Zusammenfassung generiert" });
      activeWCQuery.refetch();
      if (result.summary) {
        setEditableSummary(result.summary);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fehler";
      toast({ variant: "destructive", title: message });
    } finally {
      setGeneratingAiSummary(false);
    }
  };

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

  const isReviewPhase = activeWC.status === "submitted" || activeWC.status === "in_review";
  const isApprovedPhase = activeWC.status === "approved_for_publish";
  const canReview = isReviewPhase;
  const showActions = isReviewPhase || isApprovedPhase;
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

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <PageTypeIcon iconName={node.templateType} />
            <Badge variant="outline">{statusLabel}</Badge>
            {!showActions && (
              <Badge variant="secondary">Nur Ansicht</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight break-words">
            {activeWC.title || node.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {node.displayCode}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
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
        lastReturnComment={lastReturnComment}
      />

      {showActions && (
        <WorkingCopyActions
          workingCopy={activeWC}
          nodeId={nodeId!}
          templateType={node?.templateType}
          currentUserId={currentUser?.principalId}
          userPermissions={currentUser?.permissions}
          sodRules={currentUser?.sodRules}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {activeWC.lastAiSummary && <Sparkles className="h-4 w-4 text-amber-500" />}
              Zusammenfassung
              {activeWC.changeType && (
                <Badge variant="outline" className="text-xs">{activeWC.changeType}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeWC.changeSummary && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Beschreibung des Autors</p>
                <p className="text-sm">{activeWC.changeSummary}</p>
              </div>
            )}
            {activeWC.lastAiSummary && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> KI-Zusammenfassung
                  </p>
                  {showActions && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs gap-1 text-muted-foreground"
                      disabled={generatingAiSummary}
                      onClick={handleGenerateAiSummary}
                    >
                      {generatingAiSummary ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                      Neu generieren
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{activeWC.lastAiSummary}</p>
              </div>
            )}

            {hasReviewPermission && showActions && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Finale Zusammenfassung (wird mit der Version veröffentlicht)
                </p>
                <Textarea
                  value={editableSummary ?? activeWC.lastManualSummary ?? activeWC.lastAiSummary ?? activeWC.changeSummary ?? ""}
                  onChange={(e) => setEditableSummary(e.target.value)}
                  placeholder="Zusammenfassung bearbeiten oder übernehmen..."
                  rows={3}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  className="mt-2 gap-1"
                  disabled={savingSummary || editableSummary === null}
                  onClick={async () => {
                    if (editableSummary === null) return;
                    setSavingSummary(true);
                    try {
                      await customFetch(`${apiBase}/content/working-copies/${activeWC.id}/summary`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ summary: editableSummary }),
                      });
                      toast({ title: "Zusammenfassung gespeichert" });
                      activeWCQuery.refetch();
                    } catch {
                      toast({ variant: "destructive", title: "Speichern fehlgeschlagen" });
                    } finally {
                      setSavingSummary(false);
                      setEditableSummary(null);
                    }
                  }}
                >
                  {savingSummary ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Zusammenfassung speichern
                </Button>
              </div>
            )}

            {showActions && !activeWC.lastAiSummary && (
              <div className="pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={generatingAiSummary}
                  onClick={handleGenerateAiSummary}
                >
                  {generatingAiSummary ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  KI-Zusammenfassung generieren
                </Button>
              </div>
            )}

            {!activeWC.changeSummary && !activeWC.lastAiSummary && !hasReviewPermission && (
              <p className="text-sm text-muted-foreground italic">Keine Zusammenfassung vorhanden.</p>
            )}
          </CardContent>
        </Card>
        <div>
          <WorkingCopyTimeline workingCopyId={activeWC.id} />
        </div>
      </div>

      <Tabs
        value={reviewMode}
        onValueChange={(v) => setReviewMode(v as ReviewMode)}
      >
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="changes" className="gap-1.5 whitespace-nowrap">
              <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
              Änderungen
            </TabsTrigger>
            <TabsTrigger value="before_after" className="gap-1.5 whitespace-nowrap">
              <Eye className="h-3.5 w-3.5 shrink-0" />
              Vorher / Nachher
            </TabsTrigger>
            <TabsTrigger value="full" className="gap-1.5 whitespace-nowrap">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              Komplette Arbeitskopie
            </TabsTrigger>
          </TabsList>
        </div>

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

              {diffSections.map((diff) => {
                const oldStr = formatValueForDisplay(diff.oldVal);
                const newStr = formatValueForDisplay(diff.newVal);
                const isTextual = typeof diff.oldVal === "string" || typeof diff.newVal === "string";
                return (
                  <div key={diff.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">{formatFieldLabel(diff.key)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {diff.oldVal ? "geändert" : "neu"}
                      </Badge>
                    </div>
                    {isTextual && diff.oldVal != null && diff.newVal != null ? (
                      <div className="rounded-md border p-3 bg-muted/20">
                        <InlineTextDiff oldText={oldStr} newText={newStr} />
                      </div>
                    ) : (
                      <>
                        {diff.oldVal != null && (
                          <div className="rounded-md border p-3 bg-red-50 dark:bg-red-950/20 text-sm whitespace-pre-wrap line-through text-muted-foreground">
                            {oldStr}
                          </div>
                        )}
                        <div className="rounded-md border p-3 bg-green-50 dark:bg-green-950/20 text-sm whitespace-pre-wrap">
                          {newStr}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {diffMetadata.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-sm font-medium">
                      Metadaten ({diffMetadata.length} geändert)
                    </span>
                  </div>
                  <div className="rounded-md border bg-muted/20 divide-y">
                    {diffMetadata.map((m) => {
                      const oldStr = formatValueForDisplay(m.oldVal);
                      const newStr = formatValueForDisplay(m.newVal);
                      const isTextual = typeof m.oldVal === "string" && typeof m.newVal === "string";
                      return (
                        <div key={m.key} className="px-3 py-2 text-sm">
                          <span className="font-medium">{formatFieldLabel(m.key)}</span>
                          {isTextual && m.oldVal != null && m.newVal != null ? (
                            <div className="mt-1">
                              <InlineTextDiff oldText={oldStr} newText={newStr} />
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <div className="text-red-600 dark:text-red-400 line-through">
                                {m.oldVal != null ? oldStr : "—"}
                              </div>
                              <div className="text-green-600 dark:text-green-400">
                                {m.newVal != null ? newStr : "—"}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                    {diffSections.map((diff) => {
                      const oldStr = formatValueForDisplay(diff.oldVal);
                      const newStr = formatValueForDisplay(diff.newVal);
                      return (
                        <div key={diff.key}>
                          <p className="text-sm font-medium mb-2">
                            {formatFieldLabel(diff.key)}
                          </p>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Vorher
                              </p>
                              <div className="rounded-md border p-3 bg-red-50/30 dark:bg-red-950/10 text-sm whitespace-pre-wrap min-h-[40px]">
                                {diff.oldVal ? (
                                  oldStr
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
                              <div className="rounded-md border p-3 bg-green-50/30 dark:bg-green-950/10 text-sm whitespace-pre-wrap min-h-[40px]">
                                {diff.newVal ? (
                                  newStr
                                ) : (
                                  <span className="text-muted-foreground italic">
                                    Leer
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
