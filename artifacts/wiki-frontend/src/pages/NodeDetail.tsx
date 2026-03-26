import { useRoute, useLocation } from "wouter";
import {
  useNode,
  useNodeChildren,
  useNodeRevisions,
  useDeleteNode,
  useUpdateNode,
} from "@/hooks/use-nodes";
import { useToast } from "@/hooks/use-toast";
import { NodeBreadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FolderOpen,
  Plus,
  Trash2,
  Clock,
  Hash,
  Calendar,
  Pencil,
  FileEdit,
  Loader2,
  Eye,
} from "lucide-react";
import { PAGE_TYPE_LABELS, getPageType } from "@/lib/types";
import type { UpdateNodeInput } from "@workspace/api-client-react";
import {
  useGetActiveWorkingCopy,
  useCreateWorkingCopy,
  useGetPrincipal,
} from "@workspace/api-client-react";
import { CreateNodeDialog } from "@/components/CreateNodeDialog";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { PageLayout } from "@/components/layouts/PageLayout";
import { MetadataPanel } from "@/components/metadata/MetadataPanel";
import { TagManager } from "@/components/tags/TagManager";
import { RelatedContentSidebar } from "@/components/content/RelatedContentSidebar";
import { GlossaryTermsPanel } from "@/components/content/GlossaryTermsPanel";
import { SourceReferencesPanel } from "@/components/content/SourceReferencesPanel";
import { CompletenessIndicator } from "@/components/metadata/CompletenessIndicator";
import { BlockEditor } from "@/components/editor";
import { StatusBadge } from "@/components/versioning/StatusBadge";
import { WatchButton } from "@/components/versioning/WatchButton";
import { VersionHistoryPanel } from "@/components/versioning/VersionHistoryPanel";
import { WorkingCopyBanner } from "@/components/versioning/WorkingCopyBanner";
import { WorkingCopyActions } from "@/components/versioning/WorkingCopyActions";
import type { JSONContent } from "@tiptap/react";
import { useState, useCallback, useMemo } from "react";
import { PageAssistant } from "@/components/ai/PageAssistant";
import { ShareToTeams } from "@/components/teams/ShareToTeams";
import { Bot } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function NodeDetail() {
  const [, params] = useRoute("/node/:id");
  const nodeId = params?.id;
  const { data: node, isLoading } = useNode(nodeId);
  const { data: currentUser } = useAuth();
  const { data: children } = useNodeChildren(nodeId);
  const { data: revisions } = useNodeRevisions(nodeId);
  const deleteNode = useDeleteNode();
  const updateNode = useUpdateNode();
  const createWorkingCopy = useCreateWorkingCopy();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPageAssist, setShowPageAssist] = useState(false);
  const isOverviewPage = node?.templateType === "core_process_overview" || node?.templateType === "area_overview";
  const { toast } = useToast();

  const activeWCQuery = useGetActiveWorkingCopy(nodeId || "", {
    query: { queryKey: [`/api/content/nodes/${nodeId || ""}/working-copy`], enabled: !!nodeId, retry: false },
  });
  const activeWC = activeWCQuery.data;
  const wcLoading = activeWCQuery.isLoading;

  const wcAuthorId = activeWC?.authorId;
  const isOwnWc = !currentUser || wcAuthorId === currentUser?.principalId;
  const { data: wcAuthor } = useGetPrincipal(wcAuthorId || "", {
    query: { queryKey: [`/api/principals/${wcAuthorId || ""}`], enabled: !!wcAuthorId && !isOwnWc },
  });

  const [editTitle, setEditTitle] = useState("");
  const [editTemplateType, setEditTemplateType] = useState<
    NonNullable<UpdateNodeInput["templateType"]>
  >("core_process_overview");

  const latestRevision =
    revisions && revisions.length > 0 ? revisions[0] : null;
  const revisionContent =
    (latestRevision?.content as Record<string, unknown>) ?? {};

  const metadataDisplayValues = useMemo(() => {
    const dv: Record<string, string> = {};
    for (const [k, v] of Object.entries(revisionContent)) {
      if (k.endsWith("_display") && typeof v === "string") {
        dv[k.replace(/_display$/, "")] = v;
      }
    }
    return dv;
  }, [revisionContent]);

  const structuredFields: Record<string, unknown> = useMemo(
    () => (latestRevision?.structuredFields as Record<string, unknown>) ?? {},
    [latestRevision?.structuredFields],
  );

  const editorContent = useMemo(() => {
    if (
      structuredFields._editorContent &&
      typeof structuredFields._editorContent === "object"
    ) {
      return structuredFields._editorContent as JSONContent;
    }
    return null;
  }, [structuredFields]);

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

  const pageDef = getPageType(node.templateType);
  const metadata: Record<string, unknown> = revisionContent;

  const handleDelete = async () => {
    try {
      await deleteNode.mutateAsync({ nodeId: node.id });
      navigate("/");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Fehler beim Archivieren",
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <NodeBreadcrumbs nodeId={nodeId} />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {pageDef && (
              <div
                className="flex h-7 w-7 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: pageDef.color }}
              >
                <PageTypeIcon iconName={pageDef.icon} className="h-3.5 w-3.5" />
              </div>
            )}
            <StatusBadge
              status={
                node.status as Parameters<typeof StatusBadge>[0]["status"]
              }
              nextReviewDate={
                (
                  structuredFields as Record<
                    string,
                    Record<string, string> | undefined
                  >
                )?.governance?.nextReviewDate
              }
              ownerId={node.ownerId}
            />
            <Badge variant="secondary">
              {PAGE_TYPE_LABELS[node.templateType] || node.templateType}
            </Badge>
            <CompletenessIndicator
              templateType={node.templateType}
              metadata={metadata}
              sectionData={structuredFields}
              compact
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{node.title}</h1>
          <p className="text-sm text-muted-foreground">{node.displayCode}</p>
        </div>

        <div className="flex items-center gap-2">
          {nodeId && (
            <ShareToTeams
              nodeId={nodeId}
              pageTitle={node.title}
              displayCode={node.displayCode ?? undefined}
            />
          )}
          {nodeId && <WatchButton nodeId={nodeId} />}
          {!wcLoading && (() => {
            const isOwnWc = !activeWC || activeWC.authorId === currentUser?.principalId;
            const wcEditable = activeWC && (activeWC.status === "draft" || activeWC.status === "changes_requested");
            const wcReviewable = activeWC && (activeWC.status === "submitted" || activeWC.status === "in_review");
            if (activeWC && wcReviewable) {
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
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            <Pencil className="mr-1 h-4 w-4" />
            Eigenschaften
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Unterseite
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Seite archivieren?</AlertDialogTitle>
                <AlertDialogDescription>
                  Die Seite &quot;{node.title}&quot; wird archiviert. Dieser
                  Vorgang kann rückgängig gemacht werden.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Archivieren
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="content" className="w-full">
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

          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Seitendetails</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                    <span>FlowCore-ID</span>
                  </div>
                  <p className="font-medium">{node.displayCode}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Erstellt</span>
                  </div>
                  <p>{new Date(node.createdAt).toLocaleDateString("de-DE")}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Aktualisiert</span>
                  </div>
                  <p>{new Date(node.updatedAt).toLocaleDateString("de-DE")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {nodeId && (
            <div className="mb-4">
              <TagManager nodeId={nodeId} />
            </div>
          )}

          {nodeId && <RelatedContentSidebar nodeId={nodeId} />}
          {nodeId && <GlossaryTermsPanel nodeId={nodeId} />}

          {!isOverviewPage && (
            <PageLayout
              templateType={node.templateType}
              structuredFields={structuredFields}
            />
          )}

          {isOverviewPage && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold">
                  {node.templateType === "core_process_overview" ? "Bereiche" : "Unterseiten"}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Hinzufügen
                </Button>
              </div>
              {children && children.length > 0 ? (
              <div className="flex flex-col gap-2">
                {children.map((child) => {
                  const childDef = getPageType(child.templateType);
                  return (
                    <Card
                      key={child.id}
                      className="cursor-pointer hover:shadow-md transition-shadow group"
                      onClick={() => navigate(`/node/${child.id}`)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        {childDef ? (
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-white shrink-0"
                            style={{ backgroundColor: childDef.color }}
                          >
                            <PageTypeIcon
                              iconName={childDef.icon}
                              className="h-4 w-4"
                            />
                          </div>
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
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
                        <div className="hidden sm:flex items-center gap-6 shrink-0 text-xs text-muted-foreground">
                          <div className="text-right">
                            <span className="block text-[10px] uppercase tracking-wide">Aktualisiert</span>
                            <span>{new Date(child.updatedAt).toLocaleDateString("de-DE")}</span>
                          </div>
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
                    Noch keine {node.templateType === "core_process_overview" ? "Bereiche" : "Unterseiten"} vorhanden
                  </p>
                </CardContent>
              </Card>
              )}
            </div>
          )}

          <div className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-base font-semibold">Inhalt</h3>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Hinzufügen
            </Button>
          </div>

          {children && children.length > 0 ? (
            <div className="space-y-2">
              {children.map((child) => {
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
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Erste Unterseite anlegen
                </Button>
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
    </div>
  );
}
