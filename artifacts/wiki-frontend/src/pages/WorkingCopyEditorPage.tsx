import { useRoute, useLocation } from "wouter";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNode, useNodeRevisions } from "@/hooks/use-nodes";
import { useToast } from "@/hooks/use-toast";
import { NodeBreadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { Button } from "@workspace/ui/button";
import { Progress } from "@workspace/ui/progress";
import { Skeleton } from "@workspace/ui/skeleton";
import { Label } from "@workspace/ui/label";
import { Textarea } from "@workspace/ui/textarea";
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
  ArrowLeft,
  Send,
  Loader2,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
  Layers,
  FolderOpen,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { PAGE_TYPE_LABELS, getPageType, validateForPublication, getPublicationReadiness, getGuidedSections, getDisplayProfile } from "@/lib/types";
import type { ValidationResult } from "@/lib/types";
import { parseClusters, groupChildrenByClusters } from "@/lib/clusters";
import type { Cluster } from "@/lib/clusters";
import { isFieldEmpty } from "@/lib/field-empty";
import { ClusterManager } from "@/components/clusters/ClusterManager";
import { useNodeChildren } from "@/hooks/use-nodes";
import {
  useGetActiveWorkingCopy,
  useCreateWorkingCopy,
  useUpdateWorkingCopy,
  useSubmitWorkingCopy,
  useCancelWorkingCopy,
  useGetPrincipal,
  getGetActiveWorkingCopyQueryKey,
} from "@workspace/api-client-react";
import type { WorkingCopy } from "@workspace/api-client-react";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { PageLayout } from "@/components/layouts/PageLayout";
import { MetadataPanel } from "@/components/metadata/MetadataPanel";
import { CompletenessIndicator } from "@/components/metadata/CompletenessIndicator";
import { useSetupMode } from "@/hooks/use-setup-mode";
import { BlockEditorWithBoundary as BlockEditor } from "@/components/editor";
import { StatusBadge } from "@/components/versioning/StatusBadge";
import { WorkingCopyBanner } from "@/components/versioning/WorkingCopyBanner";
import { PageAssistant } from "@/components/ai/PageAssistant";
import { CreateNodeDialog } from "@/components/CreateNodeDialog";
import type { JSONContent } from "@tiptap/react";
import { useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Bot, Sparkles, AlertCircle, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const AUTOSAVE_DELAY_MS = 2000;

const CHANGE_TYPE_LABELS: Record<string, string> = {
  editorial: "Redaktionell",
  minor: "Kleinere Änderung",
  major: "Größere Änderung",
  regulatory: "Regulatorisch",
  structural: "Strukturell",
};

const CONTENT_HEADING_MAP: Record<string, string> = {
  policy: "Richtlinientext",
  procedure_instruction: "Ablaufbeschreibung",
  work_instruction: "Arbeitsschritte",
  meeting_protocol: "Besprechungspunkte",
  training_resource: "Schulungsinhalt",
  use_case: "Normalablauf",
};

export function WorkingCopyEditorPage() {
  const [, params] = useRoute("/nodes/:id/edit");
  const nodeId = params?.id;
  const { data: node, isLoading: nodeLoading } = useNode(nodeId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: currentUser } = useAuth();
  const { setupMode: isSetupMode } = useSetupMode();

  const activeWCQuery = useGetActiveWorkingCopy(nodeId || "", {
    query: { queryKey: [`/api/content/nodes/${nodeId || ""}/working-copy`], enabled: !!nodeId, retry: false },
  });
  const activeWC = activeWCQuery.data;
  const wcLoading = activeWCQuery.isLoading;

  const wcAuthorId = activeWC?.authorId;
  const wcIsOwn = !currentUser || wcAuthorId === currentUser?.principalId;
  const { data: wcAuthor } = useGetPrincipal(wcAuthorId || "", {
    query: { queryKey: [`/api/principals/${wcAuthorId || ""}`], enabled: !!wcAuthorId && !wcIsOwn },
  });

  const { data: revisions } = useNodeRevisions(nodeId);
  const isOverviewPage = getDisplayProfile(node?.templateType ?? "") === "overview_container";
  const { data: nodeChildren } = useNodeChildren(isOverviewPage ? nodeId : undefined);

  const publishedSF = useMemo<Record<string, unknown>>(() => {
    if (!revisions || !Array.isArray(revisions) || revisions.length === 0) return {};
    const rev = revisions[0] as { structuredFields?: Record<string, unknown> | null };
    return (rev.structuredFields as Record<string, unknown>) ?? {};
  }, [revisions]);

  const publishedMeta = useMemo<Record<string, unknown>>(() => {
    if (!revisions || !Array.isArray(revisions) || revisions.length === 0) return {};
    const rev = revisions[0] as { content?: Record<string, unknown> | null };
    return (rev.content as Record<string, unknown>) ?? {};
  }, [revisions]);

  const createWorkingCopy = useCreateWorkingCopy();
  const updateWorkingCopy = useUpdateWorkingCopy();
  const submitWorkingCopy = useSubmitWorkingCopy();
  const cancelWorkingCopy = useCancelWorkingCopy();

  const [submitOpen, setSubmitOpen] = useState(false);
  const [changeType, setChangeType] = useState("editorial");
  const [changeSummary, setChangeSummary] = useState("");
  const [submitComment, setSubmitComment] = useState("");
  const [showPageAssist, setShowPageAssist] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingClusterId, setPendingClusterId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [validationSFSnapshot, setValidationSFSnapshot] = useState<Record<string, unknown>>({});

  const wcRef = useRef<WorkingCopy | null>(null);
  useEffect(() => {
    if (activeWC) wcRef.current = activeWC;
  }, [activeWC]);

  const autoCreateAttempted = useRef(false);
  useEffect(() => {
    if (!wcLoading && !activeWC && nodeId && !autoCreateAttempted.current) {
      autoCreateAttempted.current = true;
      createWorkingCopy.mutateAsync({ nodeId }).then(() => {
        queryClient.invalidateQueries({
          queryKey: [`/api/content/nodes/${nodeId}/working-copy`],
        });
      }).catch(() => {
        toast({
          variant: "destructive",
          title: "Arbeitskopie konnte nicht erstellt werden",
        });
        navigate(`/node/${nodeId}`);
      });
    }
  }, [wcLoading, activeWC, nodeId, createWorkingCopy, toast, navigate, queryClient]);

  const wcContent = useMemo(() => {
    if (!activeWC) return {};
    return (activeWC.content as Record<string, unknown>) ?? {};
  }, [activeWC]);

  const wcStructuredFields = useMemo(() => {
    if (!activeWC) return {};
    return (activeWC.structuredFields as Record<string, unknown>) ?? {};
  }, [activeWC]);

  const localStructuredFieldsRef = useRef<Record<string, unknown>>({});
  useEffect(() => {
    if (activeWC) {
      const sf = (activeWC.structuredFields as Record<string, unknown>) ?? {};
      localStructuredFieldsRef.current = sf;
      setValidationSFSnapshot(sf);
    }
  }, [activeWC]);

  const editorContent = useMemo(() => {
    if (
      wcStructuredFields._editorContent &&
      typeof wcStructuredFields._editorContent === "object"
    ) {
      return wcStructuredFields._editorContent as JSONContent;
    }
    return null;
  }, [wcStructuredFields]);

  const previewStructuredFields = useMemo(() => {
    if (!showPreview) return wcStructuredFields;
    return { ...localStructuredFieldsRef.current };
  }, [showPreview, wcStructuredFields]);

  const previewEditorContent = useMemo(() => {
    const sf = showPreview ? localStructuredFieldsRef.current : wcStructuredFields;
    if (sf._editorContent && typeof sf._editorContent === "object") {
      return sf._editorContent as JSONContent;
    }
    return null;
  }, [showPreview, wcStructuredFields]);

  const [editableMetadata, setEditableMetadata] = useState<Record<string, unknown>>({});
  const [metadataDisplayValues, setMetadataDisplayValues] = useState<Record<string, string>>({});
  const metadataInitRef = useRef(false);

  useEffect(() => {
    if (activeWC && !metadataInitRef.current) {
      const content = (activeWC.content as Record<string, unknown>) ?? {};
      setEditableMetadata(content);
      const dv: Record<string, string> = {};
      for (const [k, v] of Object.entries(content)) {
        if (k.endsWith("_display") && typeof v === "string") {
          dv[k.replace(/_display$/, "")] = v;
        }
      }
      setMetadataDisplayValues(dv);
      metadataInitRef.current = true;
    }
  }, [activeWC]);

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<Record<string, unknown>>({});

  type SavePatch = {
    title?: string;
    content?: Record<string, unknown>;
    structuredFields?: Record<string, unknown>;
    editorSnapshot?: Record<string, unknown>;
    changeType?: "editorial" | "minor" | "major" | "regulatory" | "structural";
  };

  const doSave = useCallback(
    async (patch: SavePatch) => {
      const wc = wcRef.current;
      const editableStatuses = ["draft", "changes_requested", "submitted", "in_review"];
      if (!wc || !editableStatuses.includes(wc.status)) return;
      setIsSaving(true);
      try {
        await updateWorkingCopy.mutateAsync({
          workingCopyId: wc.id,
          data: patch,
        });
        setLastSavedAt(new Date());
      } finally {
        setIsSaving(false);
      }
    },
    [updateWorkingCopy],
  );

  const scheduleAutosave = useCallback(
    (patch: SavePatch) => {
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        const merged = { ...pendingPatchRef.current } as SavePatch;
        pendingPatchRef.current = {};
        doSave(merged).catch(() => {});
      }, AUTOSAVE_DELAY_MS);
    },
    [doSave],
  );

  const handleEditorSave = useCallback(
    async (json: JSONContent) => {
      const sf = { ...localStructuredFieldsRef.current, _editorContent: json };
      localStructuredFieldsRef.current = sf;
      setValidationSFSnapshot(sf);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      const merged = { ...pendingPatchRef.current, structuredFields: sf } as SavePatch;
      pendingPatchRef.current = {};
      await doSave(merged);
    },
    [doSave],
  );

  const handleEditorContentChange = useCallback(
    (json: JSONContent) => {
      const sf = { ...localStructuredFieldsRef.current, _editorContent: json };
      localStructuredFieldsRef.current = sf;
      setValidationSFSnapshot(sf);
      scheduleAutosave({ structuredFields: sf });
    },
    [scheduleAutosave],
  );

  const handleSectionSave = useCallback(
    async (sectionKey: string, value: unknown) => {
      const sf = { ...localStructuredFieldsRef.current, [sectionKey]: value };
      localStructuredFieldsRef.current = sf;
      setValidationSFSnapshot(sf);
      scheduleAutosave({ structuredFields: sf });
    },
    [scheduleAutosave],
  );

  const editorClusters = useMemo(
    () => parseClusters(validationSFSnapshot._clusters ?? wcStructuredFields._clusters),
    [validationSFSnapshot._clusters, wcStructuredFields._clusters],
  );

  const handleClusterChange = useCallback(
    (updatedClusters: Cluster[]) => {
      const sf = { ...localStructuredFieldsRef.current, _clusters: updatedClusters };
      localStructuredFieldsRef.current = sf;
      setValidationSFSnapshot(sf);
      scheduleAutosave({ structuredFields: sf });
    },
    [scheduleAutosave],
  );

  const handleCreateInCluster = useCallback(
    (clusterId: string) => {
      setPendingClusterId(clusterId);
      setShowCreate(true);
    },
    [],
  );

  const handleNodeCreatedInCluster = useCallback(
    (newNodeId: string) => {
      if (!pendingClusterId) return;
      const currentClusters = parseClusters(localStructuredFieldsRef.current._clusters);
      const updated = currentClusters.map((c) =>
        c.id === pendingClusterId
          ? { ...c, childNodeIds: [...c.childNodeIds, newNodeId] }
          : c,
      );
      const sf = { ...localStructuredFieldsRef.current, _clusters: updated };
      localStructuredFieldsRef.current = sf;
      setValidationSFSnapshot(sf);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      const merged = { ...pendingPatchRef.current, structuredFields: sf } as SavePatch;
      pendingPatchRef.current = {};
      doSave(merged).catch(() => {});
      setPendingClusterId(null);
    },
    [pendingClusterId, doSave],
  );

  const handleMetadataChange = useCallback(
    (key: string, value: unknown, displayValue?: string) => {
      setEditableMetadata((prev) => {
        const next = { ...prev, [key]: value };
        if (displayValue !== undefined) {
          next[`${key}_display`] = displayValue;
        }
        scheduleAutosave({ content: next });
        return next;
      });
      if (displayValue !== undefined) {
        setMetadataDisplayValues((prev) => ({ ...prev, [key]: displayValue }));
      }
    },
    [scheduleAutosave],
  );

  const handleTrackMediaUsage = useCallback(
    (assetId: string) => {
      if (!nodeId) return;
      customFetch(`/api/media/assets/${assetId}/usages`, {
        method: "POST",
        body: JSON.stringify({
          nodeId,
          revisionId: null,
          usageContext: "editor_content",
        }),
      }).catch(() => {});
    },
    [nodeId],
  );

  const handleManualSave = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const wc = wcRef.current;
    if (!wc) return;
    try {
      await doSave({
        content: editableMetadata,
        structuredFields: localStructuredFieldsRef.current,
      });
      toast({ title: "Gespeichert" });
    } catch {
      toast({ variant: "destructive", title: "Speichern fehlgeschlagen" });
    }
  }, [doSave, editableMetadata, toast]);

  const submitValidation = useMemo<ValidationResult | null>(() => {
    if (!node) return null;
    return validateForPublication(node.templateType, editableMetadata, validationSFSnapshot);
  }, [node, editableMetadata, validationSFSnapshot]);

  const handleSubmit = useCallback(async () => {
    if (!activeWC || !node) return;

    if (!isSetupMode) {
      const validation = validateForPublication(node.templateType, editableMetadata, validationSFSnapshot);
      if (validation && !validation.valid) {
        toast({
          variant: "destructive",
          title: "Veröffentlichungsanforderungen nicht erfüllt",
          description: `${validation.errors.length} Fehler müssen behoben werden.`,
        });
        return;
      }
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    try {
      await doSave({
        content: editableMetadata,
        structuredFields: localStructuredFieldsRef.current,
        changeType: changeType as "editorial" | "minor" | "major" | "regulatory" | "structural",
      });
    } catch {
      toast({ variant: "destructive", title: "Speichern vor Einreichen fehlgeschlagen" });
      return;
    }

    try {
      const submitResult = await submitWorkingCopy.mutateAsync({
        workingCopyId: activeWC.id,
        data: {
          changeType: changeType as "editorial" | "minor" | "major" | "regulatory" | "structural",
          changeSummary: changeSummary || undefined,
          comment: submitComment || undefined,
        },
      });
      const wasAutoPublished = submitResult?.status === "published";
      toast({ title: wasAutoPublished ? "Direkt ver\u00F6ffentlicht (Freigabekette inaktiv)" : "Zur Pr\u00FCfung eingereicht" });
      setSubmitOpen(false);
      if (nodeId) {
        const invalidations = [
          queryClient.invalidateQueries({ queryKey: getGetActiveWorkingCopyQueryKey(nodeId) }),
        ];
        if (wasAutoPublished) {
          invalidations.push(
            queryClient.invalidateQueries({ queryKey: [`/api/content/nodes/${nodeId}`] }),
            queryClient.invalidateQueries({ queryKey: [`/api/content/nodes/${nodeId}/revisions`] }),
            queryClient.invalidateQueries({ queryKey: [`/api/content/nodes/${nodeId}/children`] }),
            queryClient.invalidateQueries({ queryKey: ["/api/content/nodes/roots"] }),
          );
        }
        await Promise.all(invalidations);
      }
      navigate(`/node/${nodeId}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: err instanceof Error ? err.message : "Fehler beim Einreichen",
      });
    }
  }, [
    activeWC, node, doSave, editableMetadata, validationSFSnapshot, changeType,
    changeSummary, submitComment, submitWorkingCopy, toast, nodeId, queryClient, navigate, isSetupMode,
  ]);

  const handleCancel = useCallback(async () => {
    if (!activeWC) return;
    try {
      await cancelWorkingCopy.mutateAsync({
        workingCopyId: activeWC.id,
        data: {},
      });
      toast({ title: "Arbeitskopie abgebrochen" });
      if (nodeId) {
        queryClient.invalidateQueries({ queryKey: getGetActiveWorkingCopyQueryKey(nodeId) });
      }
      navigate(`/node/${nodeId}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: err instanceof Error ? err.message : "Fehler",
      });
    }
  }, [activeWC, cancelWorkingCopy, toast, nodeId, queryClient, navigate]);

  if (nodeLoading || wcLoading) {
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
        <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
          Zurück zum Hub
        </Button>
      </div>
    );
  }

  if (!activeWC) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Arbeitskopie wird erstellt...</p>
      </div>
    );
  }

  const isOwnWc = !currentUser || activeWC.authorId === currentUser.principalId;
  const isReviewPhase = activeWC.status === "submitted" || activeWC.status === "in_review";
  const hasEditPermission = currentUser?.permissions?.includes("edit_working_copy") ?? false;
  const hasAmendPermission = currentUser?.permissions?.includes("amend_working_copy_in_review") ?? false;
  const isDraftOrReturned = activeWC.status === "draft" || activeWC.status === "changes_requested";
  const canEdit = ((isOwnWc || hasEditPermission) && isDraftOrReturned) || (isReviewPhase && hasAmendPermission);
  const pageDef = getPageType(node.templateType);
  const metadata: Record<string, unknown> = editableMetadata;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <NodeBreadcrumbs nodeId={nodeId} />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {pageDef && (
              <div
                className="flex h-7 w-7 items-center justify-center rounded-md text-white shrink-0"
                style={{ backgroundColor: pageDef.color }}
              >
                <PageTypeIcon iconName={pageDef.icon} className="h-3.5 w-3.5" />
              </div>
            )}
            <Badge variant="secondary">
              {PAGE_TYPE_LABELS[node.templateType] || node.templateType}
            </Badge>
            <Badge variant="outline">Arbeitskopie</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight break-words">{activeWC.title || node.title}</h1>
          <p className="text-sm text-muted-foreground">{node.displayCode}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/node/${nodeId}`)}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Zurück
          </Button>
          <Button
            variant={showPreview ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
            className="gap-1.5"
          >
            {showPreview ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            Vorschau
          </Button>
          {canEdit && !showPreview && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSave}
                disabled={isSaving}
                className="gap-1.5"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Speichern
              </Button>
              <Button
                size="sm"
                onClick={() => setSubmitOpen(true)}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Einreichen
              </Button>
            </>
          )}
        </div>
      </div>

      {!showPreview && (
        <WorkingCopyBanner
          workingCopy={activeWC}
          currentUserId={currentUser?.principalId}
          authorName={wcAuthor?.displayName ?? undefined}
        />
      )}

      {showPreview && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 px-4 py-3">
          <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Vorschau
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              So sieht die Seite nach Ver{"ö"}ffentlichung aus. Leere Abschnitte werden ausgeblendet.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(false)}
            className="shrink-0"
          >
            <EyeOff className="h-3.5 w-3.5 mr-1" />
            Bearbeitung fortsetzen
          </Button>
        </div>
      )}

      {!showPreview && lastSavedAt && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          Zuletzt gespeichert: {lastSavedAt.toLocaleTimeString("de-DE")}
        </div>
      )}

      {!showPreview && canEdit && node && (() => {
        const readiness = getPublicationReadiness(node.templateType, editableMetadata, validationSFSnapshot);
        const guided = getGuidedSections(node.templateType);
        return (
          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Veröffentlichungsbereitschaft</span>
              </div>
              <Badge variant={readiness.ready ? "default" : "secondary"} className={readiness.ready ? "bg-green-600" : ""}>
                {readiness.percentage}%
              </Badge>
            </div>
            <Progress value={readiness.percentage} className="h-2" />
            {readiness.missingRequired.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-red-600 dark:text-red-400">Pflichtfelder fehlen:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {readiness.missingRequired.map((m) => (
                    <li key={m} className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-red-500" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {readiness.missingRecommended.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Empfohlen:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {readiness.missingRecommended.map((m) => (
                    <li key={m} className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {guided.length > 0 && (
              <div className="space-y-1 pt-1 border-t">
                <p className="text-xs font-medium text-muted-foreground">Empfohlene Bearbeitungsreihenfolge:</p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  {guided.map((s) => (
                    <li key={s.key}>{s.label}{s.helpText ? ` — ${s.helpText}` : ""}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        );
      })()}

      {showPreview ? (
        <div className="space-y-6">
          <PageLayout
            templateType={node.templateType}
            structuredFields={previewStructuredFields}
            pageType={node.templateType}
            nodeId={node.id}
          />

          {isOverviewPage && nodeChildren && nodeChildren.length > 0 && (() => {
            const previewClusters = parseClusters(previewStructuredFields._clusters);
            const clusterGroups = previewClusters.length > 0
              ? groupChildrenByClusters(nodeChildren, previewClusters)
              : [];
            return (
              <div className="space-y-6">
                <h3 className="text-base font-semibold">
                  {node.templateType === "core_process_overview" ? "Bereiche & Prozesse" : "Zugehörige Seiten"}
                </h3>
                {previewClusters.length > 0 ? (
                  clusterGroups.map(({ cluster, children: groupChildren }) => (
                    <div key={cluster?.id ?? "__unassigned__"} className="rounded-lg border bg-card">
                      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/40">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
                          <Layers className="h-4 w-4 text-primary" />
                        </div>
                        <h4 className="text-sm font-semibold flex-1">{cluster?.title ?? "Sonstige"}</h4>
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
                                <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">{idx + 1}.</span>
                                {childDef ? (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0" style={{ backgroundColor: childDef.color }}>
                                    <PageTypeIcon iconName={childDef.icon} className="h-3.5 w-3.5" />
                                  </div>
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm group-hover:text-primary transition-colors">{child.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground">{child.displayCode}</span>
                                    {childDef && <span className="text-[10px] text-muted-foreground/70">{childDef.label}</span>}
                                  </div>
                                </div>
                                <StatusBadge status={child.status as Parameters<typeof StatusBadge>[0]["status"]} compact />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="px-4 py-3 text-sm text-muted-foreground">Noch keine Seiten in diesem Cluster</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border bg-card divide-y">
                    {nodeChildren.map((child, idx) => {
                      const childDef = getPageType(child.templateType);
                      return (
                        <div
                          key={child.id}
                          className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors group"
                          onClick={() => navigate(`/node/${child.id}`)}
                        >
                          <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">{idx + 1}.</span>
                          {childDef ? (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0" style={{ backgroundColor: childDef.color }}>
                              <PageTypeIcon iconName={childDef.icon} className="h-3.5 w-3.5" />
                            </div>
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm group-hover:text-primary transition-colors">{child.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{child.displayCode}</p>
                          </div>
                          <StatusBadge status={child.status as Parameters<typeof StatusBadge>[0]["status"]} compact />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {!isFieldEmpty(previewEditorContent) && (
            <div className="mt-6">
              <h3 className="text-base font-semibold mb-3">{CONTENT_HEADING_MAP[node.templateType] ?? "Inhalt"}</h3>
              <BlockEditor
                content={previewEditorContent}
                onSave={() => {}}
                editable={false}
                nodeId={nodeId}
                parentTemplateType={node?.templateType}
              />
            </div>
          )}

          <MetadataPanel
            templateType={node.templateType}
            metadata={metadata}
            displayValues={metadataDisplayValues}
            onChange={() => {}}
            readOnly
          />
        </div>
      ) : (
        <Tabs defaultValue="content" className="w-full">
          <TabsList>
            <TabsTrigger value="content">Inhalt</TabsTrigger>
            <TabsTrigger value="metadata">Metadaten</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-4">
            <PageLayout
              templateType={node.templateType}
              structuredFields={validationSFSnapshot}
              onSectionSave={canEdit ? handleSectionSave : undefined}
              pageType={node.templateType}
              nodeId={node.id}
            />

            {isOverviewPage && canEdit && nodeChildren && (
              <div className="mt-6 rounded-lg border p-4">
                <ClusterManager
                  clusters={editorClusters}
                  children={nodeChildren.map((c) => ({
                    id: c.id,
                    title: c.title,
                    templateType: c.templateType,
                    displayCode: c.displayCode,
                  }))}
                  onChange={handleClusterChange}
                  onCreateInCluster={handleCreateInCluster}
                />
              </div>
            )}

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
                  onSave={handleEditorSave}
                  onContentChange={handleEditorContentChange}
                  editable={canEdit}
                  nodeId={nodeId}
                  lastSavedAt={lastSavedAt}
                  onTrackMediaUsage={handleTrackMediaUsage}
                  onCreateSubpage={() => setShowCreate(true)}
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
          </TabsContent>

          <TabsContent value="metadata" className="mt-4 space-y-4">
            <CompletenessIndicator
              templateType={node.templateType}
              metadata={metadata}
              sectionData={validationSFSnapshot}
            />
            <MetadataPanel
              templateType={node.templateType}
              metadata={metadata}
              displayValues={metadataDisplayValues}
              onChange={canEdit ? handleMetadataChange : () => {}}
              readOnly={!canEdit}
            />
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Zur Prüfung einreichen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ihre Arbeitskopie wird in den Freigabe-Pool der zuständigen Prozessmanager übermittelt.
          </p>

          {submitOpen && (() => {
            const currentSF = localStructuredFieldsRef.current;
            const currentContent = editableMetadata;

            const items: Array<{ label: string; color: string; detail?: string }> = [];

            const editorChanged = JSON.stringify(currentSF._editorContent) !== JSON.stringify(publishedSF._editorContent);
            if (editorChanged) items.push({ label: "Seiteninhalt (Editor)", color: "bg-blue-500" });

            const allSFKeys = new Set([
              ...Object.keys(currentSF).filter(k => k !== "_editorContent"),
              ...Object.keys(publishedSF).filter(k => k !== "_editorContent"),
            ]);
            for (const key of allSFKeys) {
              if (JSON.stringify(currentSF[key]) !== JSON.stringify(publishedSF[key])) {
                const isNew = !publishedSF[key];
                items.push({ label: key, color: "bg-green-500", detail: isNew ? "neu" : "geändert" });
              }
            }

            const allMetaKeys = new Set([
              ...Object.keys(currentContent).filter(k => !k.endsWith("_display")),
              ...Object.keys(publishedMeta).filter(k => !k.endsWith("_display")),
            ]);
            const metaChanges: string[] = [];
            for (const key of allMetaKeys) {
              if (JSON.stringify(currentContent[key]) !== JSON.stringify(publishedMeta[key])) {
                metaChanges.push(key);
              }
            }
            if (metaChanges.length > 0) {
              items.push({ label: `Metadaten (${metaChanges.length} Felder)`, color: "bg-orange-500" });
            }

            return items.length > 0 ? (
              <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Änderungen gegenüber der veröffentlichten Version ({items.length})</p>
                <div className="space-y-1 text-xs">
                  {items.map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span>{item.label}</span>
                      {item.detail && <Badge variant="secondary" className="text-[10px] h-4 px-1">{item.detail}</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-md border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  {Object.keys(publishedSF).length === 0 ? "Erste Version — kein Vergleich verfügbar." : "Keine Änderungen gegenüber der veröffentlichten Version erkannt."}
                </p>
              </div>
            );
          })()}

          {submitOpen && isSetupMode && (
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700 p-3 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Anlage-Modus aktiv</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">Pflichtfeld-Pr{"ü"}fung ist deaktiviert. Seiten k{"ö"}nnen auch ohne vollst{"ä"}ndige Metadaten eingereicht werden.</p>
              </div>
            </div>
          )}

          {submitOpen && submitValidation && !submitValidation.valid && !isSetupMode && (
            <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-3 space-y-2">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Ver{"ö"}ffentlichungsanforderungen nicht erf{"ü"}llt ({submitValidation.readinessPercentage}% bereit)
              </p>
              <ul className="text-xs space-y-1">
                {submitValidation.errors.map((e) => (
                  <li key={e.field} className="flex items-start gap-1.5 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{e.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {submitOpen && submitValidation && submitValidation.valid && submitValidation.warnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-3 space-y-2">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Empfehlungen</p>
              <ul className="text-xs space-y-1">
                {submitValidation.warnings.map((w) => (
                  <li key={w.field} className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{w.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Art der Änderung</Label>
              <Select value={changeType} onValueChange={setChangeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CHANGE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Zusammenfassung der Änderungen</Label>
                {activeWC && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={aiSummaryLoading}
                    onClick={async () => {
                      setAiSummaryLoading(true);
                      try {
                        const apiBase = import.meta.env.BASE_URL + "api";
                        const result = await customFetch<{ summary: string }>(
                          `${apiBase}/content/working-copies/${activeWC.id}/generate-summary`,
                          { method: "POST" },
                        );
                        setChangeSummary(result.summary);
                      } catch {
                        toast({ variant: "destructive", title: "KI-Zusammenfassung fehlgeschlagen" });
                      } finally {
                        setAiSummaryLoading(false);
                      }
                    }}
                  >
                    {aiSummaryLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    KI-Zusammenfassung
                  </Button>
                )}
              </div>
              <Textarea
                placeholder="Beschreiben Sie kurz, was geändert wurde..."
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>Kommentar für den Prüfer (optional)</Label>
              <Textarea
                placeholder="Hinweise für den Prozessmanager..."
                value={submitComment}
                onChange={(e) => setSubmitComment(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={submitWorkingCopy.isPending || (!isSetupMode && submitValidation !== null && !submitValidation.valid)}>
              {submitWorkingCopy.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Einreichen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateNodeDialog
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) setPendingClusterId(null);
        }}
        parentNodeId={node.id}
        parentTemplateType={node.templateType}
        onNodeCreated={pendingClusterId ? handleNodeCreatedInCluster : undefined}
      />
    </div>
  );
}
