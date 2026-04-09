import { useRoute, useLocation } from "wouter";
import {
  useNode,
  useNodeChildren,
  useNodeRevisions,
  useUpdateNode,
} from "@/hooks/use-nodes";
import { useToast } from "@/hooks/use-toast";
import { NodeBreadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { Button } from "@workspace/ui/button";
import { Skeleton } from "@workspace/ui/skeleton";
import { Input } from "@workspace/ui/input";
import { Label } from "@workspace/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/tabs";
import {
  FolderOpen,
  Plus,
  Trash2,
  FileEdit,
  Loader2,
  Eye,
} from "lucide-react";
import { PAGE_TYPE_LABELS, getPageType, getAllowedChildTypes, getDisplayProfile } from "@/lib/types";
import type { TemplateType } from "@/lib/types";
import { parseClusters, groupChildrenByClusters } from "@/lib/clusters";
import { Layers } from "lucide-react";
import type { UpdateNodeInput } from "@workspace/api-client-react";
import {
  useGetActiveWorkingCopy,
  useCreateWorkingCopy,
  useGetPrincipal,
  useCreateDeletionRequest,
  useGetNodeDeletionRequest,
  useCancelDeletionRequest,
  getGetNodeDeletionRequestQueryKey,
} from "@workspace/api-client-react";
import { CreateNodeDialog } from "@/components/CreateNodeDialog";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { PageLayout } from "@/components/layouts/PageLayout";
import { PageHeader } from "@/components/layouts/PageHeader";
import { QuickFactsStrip } from "@/components/layouts/QuickFactsStrip";
import { MetadataPanel } from "@/components/metadata/MetadataPanel";
import { TagManager } from "@/components/tags/TagManager";
import { RelatedContentSidebar } from "@/components/content/RelatedContentSidebar";
import { GlossaryTermsPanel } from "@/components/content/GlossaryTermsPanel";
import { SourceReferencesPanel } from "@/components/content/SourceReferencesPanel";
import { CompletenessIndicator } from "@/components/metadata/CompletenessIndicator";
import { BlockEditorWithBoundary as BlockEditor } from "@/components/editor";
import { StatusBadge } from "@/components/versioning/StatusBadge";
import { WatchButton } from "@/components/versioning/WatchButton";
import { VersionHistoryPanel } from "@/components/versioning/VersionHistoryPanel";
import { WorkingCopyBanner } from "@/components/versioning/WorkingCopyBanner";
import { WorkingCopyActions } from "@/components/versioning/WorkingCopyActions";
import type { JSONContent } from "@tiptap/react";
import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageAssistant } from "@/components/ai/PageAssistant";
import { ShareToTeams } from "@/components/teams/ShareToTeams";
import { Bot } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isFieldEmpty } from "@/lib/field-empty";

const CONTENT_HEADING_MAP: Record<string, string> = {
  policy: "Richtlinientext",
  procedure_instruction: "Ablaufbeschreibung",
  work_instruction: "Arbeitsschritte",
  meeting_protocol: "Besprechungspunkte",
  training_resource: "Schulungsinhalt",
  use_case: "Normalablauf",
};

export function NodeDetail() {
  const [, params] = useRoute("/node/:id");
  const nodeId = params?.id;
  const { data: node, isLoading } = useNode(nodeId);
  const { data: currentUser } = useAuth();
  const { data: children } = useNodeChildren(nodeId);
  const { data: revisions } = useNodeRevisions(nodeId);
  const queryClient = useQueryClient();
  const updateNode = useUpdateNode();
  const createWorkingCopy = useCreateWorkingCopy();
  const createDeletionRequest = useCreateDeletionRequest();
  const cancelDeletionRequest = useCancelDeletionRequest();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [createPresetType, setCreatePresetType] = useState<string | undefined>(undefined);
  const [showEdit, setShowEdit] = useState(false);
  const [showPageAssist, setShowPageAssist] = useState(false);
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const { toast } = useToast();

  const pageDef = useMemo(() => {
    if (!node) return undefined;
    return getPageType(node.templateType);
  }, [node]);

  const isOverviewPage = getDisplayProfile(node?.templateType ?? "") === "overview_container";
  const showQuickFacts = !isOverviewPage && !!pageDef;

  const allowedChildTypes = useMemo(() => {
    if (!node) return [];
    return getAllowedChildTypes(node.templateType);
  }, [node]);

  const sortByDisplayCode = useCallback(
    <T extends { displayCode?: string | null }>(items: T[]): T[] =>
      [...items].sort((a, b) => {
        const codeA = a.displayCode ?? "";
        const codeB = b.displayCode ?? "";
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: "base" });
      }),
    [],
  );

  const publishedChildren = useMemo(() => {
    if (!children) return [];
    return sortByDisplayCode(
      children.filter((c) => c.status === "published" || c.publishedRevisionId),
    );
  }, [children, sortByDisplayCode]);

  const groupedChildren = useMemo(() => {
    if (publishedChildren.length === 0) return {};
    const groups: Record<string, typeof publishedChildren> = {};
    for (const child of publishedChildren) {
      const type = child.templateType;
      if (!groups[type]) groups[type] = [];
      groups[type].push(child);
    }
    return groups;
  }, [publishedChildren]);

  const isPublished = useCallback((c: { status: string; publishedRevisionId?: string | null }) => {
    return c.status === "published" || !!c.publishedRevisionId;
  }, []);

  const userPerms = currentUser?.permissions ?? [];
  const canCreate = userPerms.includes("create_page");
  const canEdit = userPerms.includes("edit_content");
  const canArchive = userPerms.includes("archive_page");
  const canEditStructure = userPerms.includes("edit_structure");
  const canReview = userPerms.includes("review_page");

  const activeWCQuery = useGetActiveWorkingCopy(nodeId || "", {
    query: { queryKey: [`/api/content/nodes/${nodeId || ""}/working-copy`], enabled: !!nodeId, retry: false },
  });
  const activeWC = activeWCQuery.data;
  const wcLoading = activeWCQuery.isLoading;

  const pendingDeletionQuery = useGetNodeDeletionRequest(nodeId || "", {
    query: { enabled: !!nodeId },
  });

  const wcAuthorId = activeWC?.authorId;
  const isOwnWc = !currentUser || wcAuthorId === currentUser?.principalId;
  const { data: wcAuthor } = useGetPrincipal(wcAuthorId || "", {
    query: { queryKey: [`/api/principals/${wcAuthorId || ""}`], enabled: !!wcAuthorId && !isOwnWc },
  });

  const latestRevision =
    revisions && revisions.length > 0 ? revisions[0] : null;

  const nodeOwnerId = node?.ownerId ?? undefined;
  const revisionHasOwner = !!(latestRevision?.content as Record<string, unknown> | undefined)?.owner;
  const { data: ownerPrincipal } = useGetPrincipal(nodeOwnerId || "", {
    query: { queryKey: [`/api/principals/${nodeOwnerId || ""}`], enabled: !!nodeOwnerId && !revisionHasOwner },
  });

  const [editTitle, setEditTitle] = useState("");
  const [editTemplateType, setEditTemplateType] = useState<
    NonNullable<UpdateNodeInput["templateType"]>
  >("core_process_overview");
  const revisionContent =
    (latestRevision?.content as Record<string, unknown>) ?? {};

  const metadataDisplayValues = useMemo(() => {
    const dv: Record<string, string> = {};
    for (const [k, v] of Object.entries(revisionContent)) {
      if (k.endsWith("_display") && typeof v === "string") {
        dv[k.replace(/_display$/, "")] = v;
      }
    }
    if (!dv.owner && ownerPrincipal?.displayName) {
      dv.owner = ownerPrincipal.displayName;
    }
    return dv;
  }, [revisionContent, ownerPrincipal]);

  const structuredFields: Record<string, unknown> = useMemo(
    () => (latestRevision?.structuredFields as Record<string, unknown>) ?? {},
    [latestRevision?.structuredFields],
  );

  const clusters = useMemo(
    () => parseClusters(structuredFields._clusters),
    [structuredFields._clusters],
  );

  const clusterGroups = useMemo(() => {
    if (!children || children.length === 0 || clusters.length === 0) return [];
    const raw = groupChildrenByClusters(children, clusters);
    return raw.map((group) => {
      const sorted = sortByDisplayCode(
        group.cluster === null ? group.children.filter(isPublished) : group.children,
      );
      return { ...group, children: sorted };
    }).filter((g) => g.children.length > 0 || g.cluster !== null);
  }, [children, clusters, isPublished, sortByDisplayCode]);

  const editorContent = useMemo(() => {
    if (
      structuredFields._editorContent &&
      typeof structuredFields._editorContent === "object"
    ) {
      return structuredFields._editorContent as JSONContent;
    }
    return null;
  }, [structuredFields]);

  const governanceFields = useMemo(() => {
    if (!structuredFields.governance || typeof structuredFields.governance !== "object") return {};
    return structuredFields.governance as Record<string, string>;
  }, [structuredFields]);

  const enrichedMetadata = useMemo(() => {
    const base: Record<string, unknown> = { ...revisionContent };
    if (!base.owner && nodeOwnerId) {
      base.owner = nodeOwnerId;
      if (ownerPrincipal?.displayName) {
        base.owner_display = ownerPrincipal.displayName;
      }
    }
    return base;
  }, [revisionContent, nodeOwnerId, ownerPrincipal]);

  const handleCreateOrResumeWC = useCallback(async () => {
    if (!nodeId) return;
    if (activeWC) {
      navigate(`/nodes/${nodeId}/edit`);
      return;
    }
    try {
      await createWorkingCopy.mutateAsync({ nodeId });
      navigate(`/nodes/${nodeId}/edit`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Fehler beim Erstellen der Arbeitskopie",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    }
  }, [nodeId, activeWC, createWorkingCopy, navigate, toast]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
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

  const metadata: Record<string, unknown> = enrichedMetadata;

  const handleDeletionRequest = async () => {
    if (!deleteReason.trim()) return;
    try {
      await createDeletionRequest.mutateAsync({
        data: { nodeId: node.id, reason: deleteReason.trim() },
      });
      toast({ title: "L\u00F6schanfrage eingereicht" });
      setShowDeleteRequest(false);
      setDeleteReason("");
      queryClient.invalidateQueries({
        queryKey: getGetNodeDeletionRequestQueryKey(node.id),
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Fehler beim Einreichen der L\u00F6schanfrage",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    }
  };

  const handleCancelDeletion = async (requestId: string) => {
    try {
      await cancelDeletionRequest.mutateAsync({ requestId });
      toast({ title: "L\u00F6schanfrage zur\u00FCckgezogen" });
      queryClient.invalidateQueries({
        queryKey: getGetNodeDeletionRequestQueryKey(node.id),
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    }
  };

  const openEditDialog = () => {
    setEditTitle(node.title);
    setEditTemplateType(
      node.templateType as NonNullable<UpdateNodeInput["templateType"]>,
    );
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    try {
      await updateNode.mutateAsync({
        nodeId: node.id,
        data: {
          title: editTitle.trim(),
          templateType: editTemplateType,
        },
      });
      setShowEdit(false);
      toast({ title: "Gespeichert" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Fehler beim Speichern",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    }
  };

  const ownerDisplayName =
    metadataDisplayValues.owner ||
    (revisionContent.owner_display ? String(revisionContent.owner_display) : undefined) ||
    ownerPrincipal?.displayName ||
    (revisionContent.owner ? String(revisionContent.owner) : undefined) ||
    undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <NodeBreadcrumbs nodeId={nodeId} />

      <div className="flex items-center justify-end gap-2 shrink-0 flex-wrap">
        {nodeId && (
          <ShareToTeams
            nodeId={nodeId}
            pageTitle={node.title}
            displayCode={node.displayCode ?? undefined}
          />
        )}
        {nodeId && <WatchButton nodeId={nodeId} />}
        {wcLoading ? (
          <Button variant="outline" size="sm" disabled className="min-w-[180px]">
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            Laden…
          </Button>
        ) : (() => {
          const isOwnWc = !activeWC || activeWC.authorId === currentUser?.principalId;
          const wcEditable = activeWC && (activeWC.status === "draft" || activeWC.status === "changes_requested");
          const wcReviewable = activeWC && (activeWC.status === "submitted" || activeWC.status === "in_review");
          if (activeWC && wcReviewable && canReview) {
            return (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate(`/nodes/${nodeId}/review`)}
              >
                <Eye className="mr-1 h-4 w-4" />
                Prüfen
              </Button>
            );
          }
          if (!canEdit) return null;
          if (activeWC && !isOwnWc && !wcReviewable) {
            return (
              <Button variant="outline" size="sm" disabled>
                <FileEdit className="mr-1 h-4 w-4" />
                Arbeitskopie gesperrt
              </Button>
            );
          }
          if (activeWC && !wcEditable) {
            return null;
          }
          return (
            <Button
              variant={activeWC ? "default" : "outline"}
              size="sm"
              onClick={activeWC ? () => navigate(`/nodes/${nodeId}/edit`) : handleCreateOrResumeWC}
              disabled={createWorkingCopy.isPending}
            >
              {createWorkingCopy.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <FileEdit className="mr-1 h-4 w-4" />
              )}
              {activeWC ? "Arbeitskopie fortsetzen" : "Arbeitskopie erstellen"}
            </Button>
          );
        })()}
        {canCreate && activeWC && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Unterseite
        </Button>
        )}
        {canArchive && !pendingDeletionQuery.data && (
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={() => setShowDeleteRequest(true)}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {"L\u00F6schanfrage"}
        </Button>
        )}
      </div>

      <PageHeader
        title={node.title}
        displayCode={node.displayCode}
        templateType={node.templateType}
        status={node.status}
        metadata={metadata}
        structuredFields={structuredFields}
        nextReviewDate={governanceFields.nextReviewDate}
        ownerId={node.ownerId}
        ownerName={ownerDisplayName}
      />

      {showQuickFacts && (
        <QuickFactsStrip
          displayCode={node.displayCode}
          createdAt={node.createdAt}
          updatedAt={node.updatedAt}
          ownerName={ownerDisplayName}
          nextReviewDate={governanceFields.nextReviewDate}
        />
      )}

      <Tabs defaultValue="content" className="w-full min-h-[300px]">
        <TabsList>
          <TabsTrigger value="content">Inhalt</TabsTrigger>
          <TabsTrigger value="metadata">Metadaten</TabsTrigger>
          <TabsTrigger value="versions">Versionen</TabsTrigger>
          <TabsTrigger value="children">
            Unterseiten
            {children && children.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs h-5 px-1.5">
                {children.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4">
          {pendingDeletionQuery.data && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-destructive">{"L\u00F6schanfrage ausstehend"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {"Begr\u00FCndung: "}{pendingDeletionQuery.data.reason}
                      {" \u2014 Erstellt am "}{new Date(pendingDeletionQuery.data.createdAt).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                </div>
                {pendingDeletionQuery.data.requestedBy === currentUser?.principalId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelDeletion(pendingDeletionQuery.data!.id)}
                    disabled={cancelDeletionRequest.isPending}
                  >
                    {"Zur\u00FCckziehen"}
                  </Button>
                )}
              </div>
            </div>
          )}
          {activeWC && nodeId && (
            <div className="mb-4 space-y-3">
              <WorkingCopyBanner
                workingCopy={activeWC}
                currentUserId={currentUser?.principalId}
                authorName={wcAuthor?.displayName ?? undefined}
                onNavigateToEditor={() => navigate(`/nodes/${nodeId}/edit`)}
                isCreating={createWorkingCopy.isPending}
              />
              <WorkingCopyActions workingCopy={activeWC} nodeId={nodeId} templateType={node?.templateType} currentUserId={currentUser?.principalId} userPermissions={currentUser?.permissions} sodRules={currentUser?.sodRules} />
            </div>
          )}

          {isOverviewPage && (
            <div className="mb-6 space-y-4">
              <PageLayout
                templateType={node.templateType}
                structuredFields={structuredFields}
              />
            </div>
          )}

          {isOverviewPage && !isFieldEmpty(editorContent) && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-base font-semibold">{CONTENT_HEADING_MAP[node.templateType] ?? "Inhalt"}</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant={showPageAssist ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowPageAssist(!showPageAssist)}
                >
                  <Bot className="h-3.5 w-3.5 mr-1" />
                  FlowCore-Assistent
                </Button>
              </div>
            </div>
            <div
              className={
                showPageAssist ? "flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-4" : ""
              }
            >
              <BlockEditor
                content={editorContent}
                onSave={async () => {}}
                editable={false}
                nodeId={nodeId}
                parentTemplateType={node?.templateType}
              />
              {showPageAssist && (
                <PageAssistant
                  nodeId={nodeId}
                  getSelectedText={() => {
                    const sel = window.getSelection();
                    return sel ? sel.toString() : "";
                  }}
                  onClose={() => setShowPageAssist(false)}
                />
              )}
            </div>
          </div>
          )}

          {isOverviewPage && (
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">
                  {node.templateType === "core_process_overview" ? "Bereiche & Prozesse" : node.templateType === "area_overview" ? "Zugehörige Seiten" : "Untergeordnete Inhalte"}
                </h3>
                {canCreate && activeWC && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setCreatePresetType(undefined); setShowCreate(true); }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Hinzufügen
                </Button>
                )}
              </div>

              {(clusters.length > 0 ? (children && children.length > 0) : publishedChildren.length > 0) ? (
                clusters.length > 0 ? (
                <div className="space-y-6">
                  {clusterGroups.map(({ cluster, children: groupChildren }) => (
                    <div key={cluster?.id ?? "__unassigned__"} className="rounded-lg border bg-card">
                      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/40">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
                          <Layers className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold leading-tight">
                            {cluster?.title ?? "Sonstige"}
                          </h4>
                        </div>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
                          {groupChildren.length} {groupChildren.length === 1 ? "Seite" : "Seiten"}
                        </Badge>
                      </div>
                      {groupChildren.length > 0 ? (
                        <div className="divide-y">
                          {groupChildren.map((child, idx) => {
                            const childDef = getPageType(child.templateType);
                            return (
                              <div
                                key={child.id}
                                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors group"
                                onClick={() => navigate(`/node/${child.id}`)}
                              >
                                <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">
                                  {idx + 1}.
                                </span>
                                {childDef ? (
                                  <div
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0"
                                    style={{ backgroundColor: childDef.color }}
                                  >
                                    <PageTypeIcon iconName={childDef.icon} className="h-3.5 w-3.5" />
                                  </div>
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm group-hover:text-primary transition-colors">
                                    {child.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground">{child.displayCode}</span>
                                    {childDef && (
                                      <span className="text-[10px] text-muted-foreground/70">{childDef.label}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                                  <span>{new Date(child.updatedAt).toLocaleDateString("de-DE")}</span>
                                </div>
                                <StatusBadge
                                  status={child.status as Parameters<typeof StatusBadge>[0]["status"]}
                                  compact
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="px-4 py-3 text-sm text-muted-foreground">Noch keine Seiten in diesem Cluster</p>
                      )}
                    </div>
                  ))}
                </div>
                ) : (
                <div className="space-y-6">
                  {allowedChildTypes.map((childType) => {
                    const typeChildren = groupedChildren[childType] ?? [];
                    const typeDef = getPageType(childType);
                    if (typeChildren.length === 0) return null;
                    return (
                      <div key={childType} className="rounded-lg border bg-card">
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
                          <div className="flex items-center gap-3">
                            {typeDef && (
                              <div
                                className="flex h-7 w-7 items-center justify-center rounded-md text-white shrink-0"
                                style={{ backgroundColor: typeDef.color }}
                              >
                                <PageTypeIcon iconName={typeDef.icon} className="h-3.5 w-3.5" />
                              </div>
                            )}
                            <h4 className="text-sm font-semibold">
                              {PAGE_TYPE_LABELS[childType] ?? childType}
                            </h4>
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                              {typeChildren.length}
                            </Badge>
                          </div>
                          {canCreate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => { setCreatePresetType(childType); setShowCreate(true); }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Neu
                          </Button>
                          )}
                        </div>
                        <div className="divide-y">
                          {typeChildren.map((child, idx) => {
                            const childDef = getPageType(child.templateType);
                            return (
                              <div
                                key={child.id}
                                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors group"
                                onClick={() => navigate(`/node/${child.id}`)}
                              >
                                <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">
                                  {idx + 1}.
                                </span>
                                {childDef ? (
                                  <div
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0"
                                    style={{ backgroundColor: childDef.color }}
                                  >
                                    <PageTypeIcon iconName={childDef.icon} className="h-3.5 w-3.5" />
                                  </div>
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm group-hover:text-primary transition-colors">
                                    {child.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {child.displayCode}
                                  </p>
                                </div>
                                <div className="hidden sm:flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                                  <span>{new Date(child.updatedAt).toLocaleDateString("de-DE")}</span>
                                </div>
                                <StatusBadge
                                  status={child.status as Parameters<typeof StatusBadge>[0]["status"]}
                                  compact
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {Object.keys(groupedChildren).filter(
                    (t) => !allowedChildTypes.includes(t as TemplateType)
                  ).map((childType) => {
                    const typeChildren = groupedChildren[childType] ?? [];
                    const typeDef = getPageType(childType);
                    return (
                      <div key={childType} className="rounded-lg border bg-card">
                        <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/40">
                          {typeDef && (
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-md text-white shrink-0"
                              style={{ backgroundColor: typeDef.color }}
                            >
                              <PageTypeIcon iconName={typeDef.icon} className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <h4 className="text-sm font-semibold">
                            {PAGE_TYPE_LABELS[childType] ?? childType}
                          </h4>
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                            {typeChildren.length}
                          </Badge>
                        </div>
                        <div className="divide-y">
                          {typeChildren.map((child, idx) => {
                            const childDef = getPageType(child.templateType);
                            return (
                              <div
                                key={child.id}
                                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors group"
                                onClick={() => navigate(`/node/${child.id}`)}
                              >
                                <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">
                                  {idx + 1}.
                                </span>
                                {childDef ? (
                                  <div
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0"
                                    style={{ backgroundColor: childDef.color }}
                                  >
                                    <PageTypeIcon iconName={childDef.icon} className="h-3.5 w-3.5" />
                                  </div>
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm group-hover:text-primary transition-colors">
                                    {child.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {child.displayCode}
                                  </p>
                                </div>
                                <StatusBadge
                                  status={child.status as Parameters<typeof StatusBadge>[0]["status"]}
                                  compact
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                )
              ) : (
                <div className="space-y-3">
                  {canCreate && allowedChildTypes.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {allowedChildTypes.slice(0, 6).map((childType) => {
                        const typeDef = getPageType(childType);
                        return (
                          <Card
                            key={childType}
                            className="border-dashed cursor-pointer hover:border-primary/40 transition-colors"
                            onClick={() => { setCreatePresetType(childType); setShowCreate(true); }}
                          >
                            <CardContent className="flex items-center gap-3 p-3">
                              {typeDef ? (
                                <div
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0 opacity-60"
                                  style={{ backgroundColor: typeDef.color }}
                                >
                                  <PageTypeIcon iconName={typeDef.icon} className="h-3.5 w-3.5" />
                                </div>
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground">
                                  {PAGE_TYPE_LABELS[childType] ?? childType}
                                </p>
                              </div>
                              <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <FolderOpen className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Noch keine {node.templateType === "core_process_overview" ? "Bereiche oder Prozesse" : "untergeordneten Inhalte"} vorhanden
                      </p>
                      {canCreate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Nutzen Sie die Kacheln oben oder den Button, um die erste Unterseite anzulegen.
                      </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {!isOverviewPage && (
            <>
              <PageLayout
                templateType={node.templateType}
                structuredFields={structuredFields}
              />

              {nodeId && (
                <div className="mt-4">
                  <TagManager nodeId={nodeId} />
                </div>
              )}
            </>
          )}

          {!isOverviewPage && !isFieldEmpty(editorContent) && (
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-base font-semibold">{CONTENT_HEADING_MAP[node.templateType] ?? "Inhalt"}</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant={showPageAssist ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowPageAssist(!showPageAssist)}
                >
                  <Bot className="h-3.5 w-3.5 mr-1" />
                  FlowCore-Assistent
                </Button>
              </div>
            </div>
            <div
              className={
                showPageAssist ? "flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-4" : ""
              }
            >
              <BlockEditor
                content={editorContent}
                onSave={async () => {}}
                editable={false}
                nodeId={nodeId}
                parentTemplateType={node?.templateType}
              />
              {showPageAssist && (
                <PageAssistant
                  nodeId={nodeId}
                  getSelectedText={() => {
                    const sel = window.getSelection();
                    return sel ? sel.toString() : "";
                  }}
                  onClose={() => setShowPageAssist(false)}
                />
              )}
            </div>
          </div>
          )}

          {!isOverviewPage && nodeId && (
            <>
              <div className="mt-4"><RelatedContentSidebar nodeId={nodeId} /></div>
              <div className="mt-4"><GlossaryTermsPanel nodeId={nodeId} /></div>
            </>
          )}

          {nodeId && <SourceReferencesPanel nodeId={nodeId} />}
        </TabsContent>

        <TabsContent value="metadata" className="mt-4 space-y-4">
          <CompletenessIndicator
            templateType={node.templateType}
            metadata={metadata}
            sectionData={structuredFields}
          />
          <MetadataPanel
            templateType={node.templateType}
            metadata={metadata}
            displayValues={metadataDisplayValues}
            onChange={() => {}}
            readOnly
          />
          {nodeId && (
            <div className="space-y-4">
              <TagManager nodeId={nodeId} />
              <RelatedContentSidebar nodeId={nodeId} />
              <GlossaryTermsPanel nodeId={nodeId} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="versions" className="mt-4 space-y-4">
          {activeWC && nodeId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Aktive Arbeitskopie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <WorkingCopyBanner
                  workingCopy={activeWC}
                  currentUserId={currentUser?.principalId}
                  authorName={wcAuthor?.displayName ?? undefined}
                  onNavigateToEditor={() => navigate(`/nodes/${nodeId}/edit`)}
                />
                <WorkingCopyActions workingCopy={activeWC} nodeId={nodeId} templateType={node?.templateType} currentUserId={currentUser?.principalId} userPermissions={currentUser?.permissions} sodRules={currentUser?.sodRules} />
              </CardContent>
            </Card>
          )}
          {nodeId && <VersionHistoryPanel nodeId={nodeId} activeWorkingCopy={activeWC ? { id: activeWC.id, status: activeWC.status, title: activeWC.title ?? "", authorId: activeWC.authorId, createdAt: activeWC.createdAt, updatedAt: activeWC.updatedAt, changeSummary: activeWC.changeSummary } : null} />}
        </TabsContent>

        <TabsContent value="children" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Unterseiten</h2>
            {canCreate && activeWC && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Hinzufügen
            </Button>
            )}
          </div>

          {children && children.length > 0 ? (
            <div className="space-y-2">
              {sortByDisplayCode(children).map((child) => {
                const childDef = getPageType(child.templateType);
                return (
                  <Card
                    key={child.id}
                    className="cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => navigate(`/node/${child.id}`)}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      {childDef ? (
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-md text-white"
                          style={{ backgroundColor: childDef.color }}
                        >
                          <PageTypeIcon
                            iconName={childDef.icon}
                            className="h-4 w-4"
                          />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {child.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {child.displayCode} ·{" "}
                          {PAGE_TYPE_LABELS[child.templateType] ||
                            child.templateType}
                        </p>
                      </div>
                      <StatusBadge
                        status={
                          child.status as Parameters<
                            typeof StatusBadge
                          >[0]["status"]
                        }
                        compact
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <FolderOpen className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Keine Unterseiten vorhanden
                </p>
                {pageDef && pageDef.allowedChildTypes.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Erlaubte Typen:{" "}
                    {pageDef.allowedChildTypes
                      .map((t) => PAGE_TYPE_LABELS[t] ?? t)
                      .join(", ")}
                  </p>
                )}
                {canCreate && activeWC && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Erste Unterseite anlegen
                </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <CreateNodeDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        parentNodeId={node.id}
        parentTemplateType={node.templateType}
        presetType={createPresetType}
      />

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seite bearbeiten</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Titel</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdate();
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-type">Seitentyp</Label>
              <Select
                value={editTemplateType}
                onValueChange={(v) =>
                  setEditTemplateType(
                    v as NonNullable<UpdateNodeInput["templateType"]>,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAGE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!editTitle.trim() || updateNode.isPending}
            >
              {updateNode.isPending ? "Wird gespeichert..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteRequest} onOpenChange={(open) => { setShowDeleteRequest(open); if (!open) setDeleteReason(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{"L\u00F6schanfrage stellen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {"Die Seite \u201E"}{node.title}{"\u201C wird zur L\u00F6schung vorgeschlagen. Ein Administrator muss die Anfrage genehmigen."}
            </p>
            <div className="space-y-2">
              <Label htmlFor="delete-reason">{"Begr\u00FCndung"}</Label>
              <Input
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder={"Warum soll die Seite gel\u00F6scht werden?"}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && deleteReason.trim()) handleDeletionRequest();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteRequest(false); setDeleteReason(""); }}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletionRequest}
              disabled={!deleteReason.trim() || createDeletionRequest.isPending}
            >
              {createDeletionRequest.isPending ? "Wird eingereicht..." : "Anfrage einreichen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
