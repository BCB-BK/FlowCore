import { useRoute, useLocation } from "wouter";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNode, useNodeRevisions, useUpdateNode } from "@/hooks/use-nodes";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { NodeBreadcrumbs } from "@/components/Breadcrumbs";
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
  ShieldCheck,
  Pencil,
  Plus,
  Network,
  Trash2,
} from "lucide-react";
import { Input } from "@workspace/ui/input";
import { PAGE_TYPE_LABELS, getPageType, validateForPublication, getPublicationReadiness, getGuidedSections } from "@/lib/types";
import type { ValidationResult } from "@/lib/types";
import { parseClusters, groupChildrenByClusters } from "@/lib/clusters";
import type { Cluster } from "@/lib/clusters";
import { isFieldEmpty } from "@/lib/field-empty";
import { ClusterManager } from "@/components/clusters/ClusterManager";
import { DocRegistryView } from "@/components/registry/DocRegistryView";
import { useNodeChildren } from "@/hooks/use-nodes";
import {
  useGetActiveWorkingCopy,
  useCreateWorkingCopy,
  useUpdateWorkingCopy,
  useSubmitWorkingCopy,
  useCancelWorkingCopy,
  useGetPrincipal,
  getGetActiveWorkingCopyQueryKey,
  useCreateDeletionRequest,
  useGetNodeDeletionRequest,
  getGetNodeDeletionRequestQueryKey,
} from "@workspace/api-client-react";
import type { WorkingCopy, UpdateNodeInput } from "@workspace/api-client-react";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { PageLayout } from "@/components/layouts/PageLayout";
import { GenericLayout, meetingProtocolTopConfig, meetingProtocolBottomConfig } from "@/components/layouts/layout-engine";
import { ReferencesEditor } from "@/components/compound/ReferencesEditor";
import { BacklinksPanel } from "@/components/content/BacklinksPanel";
import { MetadataPanel } from "@/components/metadata/MetadataPanel";
import { CompletenessIndicator } from "@/components/metadata/CompletenessIndicator";
import { useSetupMode } from "@/hooks/use-setup-mode";
import { BlockEditorWithBoundary as BlockEditor } from "@/components/editor";
import { StatusBadge } from "@/components/versioning/StatusBadge";
import { WorkingCopyBanner } from "@/components/versioning/WorkingCopyBanner";
import { CreateNodeDialog } from "@/components/CreateNodeDialog";
import type { JSONContent } from "@tiptap/react";
import { useQueryClient, useQueries } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Sparkles, AlertCircle, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

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
  meeting_protocol: "Entscheidungen",
  training_resource: "Schulungsinhalt",
  use_case: "Normalablauf",
};

const REFERENCES_KEY_MAP: Record<string, string> = {
  policy: "references",
  procedure_instruction: "documents",
  work_instruction: "documents",
};

function getReferencesKey(templateType: string): string {
  return REFERENCES_KEY_MAP[templateType] ?? "references";
}

function getReferencesValue(structuredFields: Record<string, unknown>, templateType: string): string {
  const key = getReferencesKey(templateType);
  const val = structuredFields[key];
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export function WorkingCopyEditorPage() {
  const [, params] = useRoute("/nodes/:id/edit");
  const nodeId = params?.id;
  const { data: node, isLoading: nodeLoading } = useNode(nodeId);
  useDocumentTitle(node?.title);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: currentUser } = useAuth();
  const { setupMode: isSetupMode } = useSetupMode();
  const { setDirty, confirmLeave } = useUnsavedChanges();

  useEffect(() => {
    return () => { setDirty(false); };
  }, [setDirty]);

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
  const showStructureTab = !!(getPageType(node?.templateType ?? "")?.supportsClusterGroups);
  const { data: nodeChildren } = useNodeChildren(showStructureTab ? nodeId : undefined);

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
  const createDeletionRequest = useCreateDeletionRequest();
  const pendingDeletionQuery = useGetNodeDeletionRequest(nodeId || "", {
    query: { queryKey: getGetNodeDeletionRequestQueryKey(nodeId || ""), enabled: !!nodeId },
  });

  const [submitOpen, setSubmitOpen] = useState(false);
  const [changeType, setChangeType] = useState("editorial");
  const [changeSummary, setChangeSummary] = useState("");
  const [submitComment, setSubmitComment] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [pendingClusterId, setPendingClusterId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [typeDraft, setTypeDraft] = useState("");
  const updateNode = useUpdateNode();
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [validationSFSnapshot, setValidationSFSnapshot] = useState<Record<string, unknown>>({});

  const wcRef = useRef<WorkingCopy | null>(null);
  useEffect(() => {
    if (activeWC) wcRef.current = activeWC;
  }, [activeWC]);

  const autoCreateAttempted = useRef(false);
  useEffect(() => {
    if (wcLoading || !nodeId) return;
    if (activeWC) return;

    // WC war zuvor vorhanden und ist jetzt weg → veröffentlicht oder abgebrochen
    // Nicht neu erstellen, sondern zur Ansichtsseite navigieren
    if (wcRef.current !== null) {
      navigate(`/node/${nodeId}`);
      return;
    }

    if (autoCreateAttempted.current) return;
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
  const sfInitializedRef = useRef(false);
  const sfInitWcIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeWC && activeWC.id !== sfInitWcIdRef.current) {
      const sf = (activeWC.structuredFields as Record<string, unknown>) ?? {};
      localStructuredFieldsRef.current = sf;
      setValidationSFSnapshot(sf);
      sfInitializedRef.current = true;
      sfInitWcIdRef.current = activeWC.id;
    }
  }, [activeWC]);

  const editorContent = useMemo(() => {
    const raw = wcStructuredFields._editorContent ?? wcStructuredFields.discussion;
    if (raw && typeof raw === "object") {
      return raw as JSONContent;
    }
    return null;
  }, [wcStructuredFields]);

  const previewStructuredFields = useMemo(() => {
    if (!showPreview) return wcStructuredFields;
    return { ...localStructuredFieldsRef.current };
  }, [showPreview, wcStructuredFields]);

  const previewLinkedNodeIds = useMemo(() => {
    // validationSFSnapshot ist React-State und wird bei jeder Verlinkung sofort aktualisiert.
    // previewStructuredFields ist im Edit-Mode = wcStructuredFields (Server-Stand) und hinkt nach.
    // Vereinigung beider Listen damit neu verlinkte Nodes sofort in useQueries erscheinen.
    const fromPreview = Array.isArray(previewStructuredFields._linkedNodeIds)
      ? (previewStructuredFields._linkedNodeIds as string[])
      : [];
    const fromLocal = Array.isArray(validationSFSnapshot._linkedNodeIds)
      ? (validationSFSnapshot._linkedNodeIds as string[])
      : [];
    return [...new Set([...fromPreview, ...fromLocal])];
  }, [previewStructuredFields, validationSFSnapshot]);

  const previewLinkedNodeQueries = useQueries({
    queries: previewLinkedNodeIds.map((id) => ({
      queryKey: [`/api/content/nodes/${id}`],
      queryFn: () => customFetch<Record<string, unknown>>(`/api/content/nodes/${id}`),
    })),
  });

  const previewLinkedNodes = useMemo(
    () => previewLinkedNodeQueries.filter((q) => q.data != null).map((q) => q.data as Record<string, unknown>),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previewLinkedNodeQueries.map((q) => q.dataUpdatedAt).join(",")],
  );

  const previewLinkedNodeIdSet = useMemo(() => new Set(previewLinkedNodeIds), [previewLinkedNodeIds]);

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

  // CRITICAL: nodeId-Wechsel-Cleanup – verhindert Cross-Node-Datenverschmutzung.
  // WorkingCopyEditorPage wird bei SPA-Navigation (Wouter) NICHT neu gemountet.
  // Ohne diesen Reset würde ein noch laufender autosave-Timer (AUTOSAVE_DELAY_MS=2s)
  // die structuredFields (inkl. _clusters) der alten Seite in die Working Copy
  // der neuen Seite schreiben, sobald wcRef.current auf die neue WC wechselt.
  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    pendingPatchRef.current = {};
    sfInitializedRef.current = false;
    sfInitWcIdRef.current = null;
    autoCreateAttempted.current = false;
    wcRef.current = null;
    localStructuredFieldsRef.current = {};
    setValidationSFSnapshot({});
  // nodeId als einzige Dependency – fired genau bei jedem Seitenwechsel
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  type SavePatch = {
    title?: string;
    content?: Record<string, unknown>;
    structuredFields?: Record<string, unknown>;
    editorSnapshot?: Record<string, unknown>;
    changeType?: "editorial" | "minor" | "major" | "regulatory" | "structural";
  };

  const isMountedRef = useRef(true);
  const updateWcRef = useRef(updateWorkingCopy);
  updateWcRef.current = updateWorkingCopy;

  // Unmount-Cleanup: Timer stoppen (kein State-Update auf unmounteter
  // Komponente) und ausstehende Änderungen noch abschicken, damit beim
  // Verlassen der Seite innerhalb der Autosave-Frist nichts verloren geht.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      const pending = pendingPatchRef.current;
      pendingPatchRef.current = {};
      const wc = wcRef.current;
      const editableStatuses = ["draft", "changes_requested", "submitted", "in_review"];
      if (
        Object.keys(pending).length > 0 &&
        wc &&
        editableStatuses.includes(wc.status) &&
        sfInitializedRef.current
      ) {
        updateWcRef.current
          .mutateAsync({ workingCopyId: wc.id, data: pending })
          .catch(() => {});
      }
    };
  }, []);

  const doSave = useCallback(
    async (patch: SavePatch) => {
      const wc = wcRef.current;
      const editableStatuses = ["draft", "changes_requested", "submitted", "in_review"];
      if (!wc || !editableStatuses.includes(wc.status)) return;
      if (!sfInitializedRef.current) return;
      if (isMountedRef.current) setIsSaving(true);
      try {
        await updateWorkingCopy.mutateAsync({
          workingCopyId: wc.id,
          data: patch,
        });
        if (isMountedRef.current) {
          setLastSavedAt(new Date());
          setDirty(false);
        }
      } finally {
        if (isMountedRef.current) setIsSaving(false);
      }
    },
    [updateWorkingCopy, setDirty],
  );

  const scheduleAutosave = useCallback(
    (patch: SavePatch) => {
      setDirty(true);
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        const merged = { ...pendingPatchRef.current } as SavePatch;
        pendingPatchRef.current = {};
        doSave(merged).catch(() => {});
      }, AUTOSAVE_DELAY_MS);
    },
    [doSave, setDirty],
  );

  const handleEditorSave = useCallback(
    async (json: JSONContent) => {
      if (!sfInitializedRef.current) return;
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
      if (!sfInitializedRef.current) return;
      const sf = { ...localStructuredFieldsRef.current, _editorContent: json };
      localStructuredFieldsRef.current = sf;
      setValidationSFSnapshot(sf);
      scheduleAutosave({ structuredFields: sf });
    },
    [scheduleAutosave],
  );

  const handleSectionSave = useCallback(
    async (sectionKey: string, value: unknown) => {
      if (!sfInitializedRef.current) return;
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

  const clusterGroupsForEditor = useMemo(() => {
    if (!nodeChildren || nodeChildren.length === 0 || editorClusters.length === 0) return [];
    return groupChildrenByClusters(nodeChildren, editorClusters);
  }, [nodeChildren, editorClusters]);

  const validationSectionData = useMemo(() => {
    if (node?.templateType === "meeting_protocol") {
      return {
        ...validationSFSnapshot,
        discussion: validationSFSnapshot._editorContent ?? validationSFSnapshot.discussion,
      };
    }
    return validationSFSnapshot;
  }, [node, validationSFSnapshot]);

  const handleClusterChange = useCallback(
    (updatedClusters: Cluster[], removedLinkedNodeIds?: string[]) => {
      const sfNow = localStructuredFieldsRef.current;
      const currentLinked = Array.isArray(sfNow._linkedNodeIds)
        ? (sfNow._linkedNodeIds as string[])
        : [];
      const newLinked =
        removedLinkedNodeIds && removedLinkedNodeIds.length > 0
          ? currentLinked.filter((id) => !removedLinkedNodeIds.includes(id))
          : currentLinked;
      const sf = { ...sfNow, _clusters: updatedClusters, _linkedNodeIds: newLinked };
      localStructuredFieldsRef.current = sf;
      setValidationSFSnapshot(sf);
      scheduleAutosave({ structuredFields: sf });
    },
    [scheduleAutosave],
  );

  const handleCreateInClusterFromManager = useCallback(
    (clusterId: string) => {
      setPendingClusterId(clusterId);
      setShowCreate(true);
    },
    [],
  );

  const handleLinkExistingFromManager = useCallback(
    (clusterId: string) => {
      setPendingClusterId(clusterId);
      setShowCreate(true);
    },
    [],
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

  // Verlinkt eine bestehende Seite im Cluster ohne parentNodeId-Änderung
  const handleLinkExistingInCluster = useCallback(
    (linkedNodeId: string, nodeData?: { title: string; templateType: string; displayCode?: string | null }) => {
      if (!pendingClusterId) return;
      // Node-Daten sofort in QueryClient-Cache schreiben → kein Netzwerk-Roundtrip nötig
      if (nodeData) {
        queryClient.setQueryData(
          [`/api/content/nodes/${linkedNodeId}`],
          (old: Record<string, unknown> | undefined) => old ?? { id: linkedNodeId, ...nodeData },
        );
      }
      const sfNow = localStructuredFieldsRef.current;
      const currentClusters = parseClusters(sfNow._clusters);
      const updated = currentClusters.map((c) =>
        c.id === pendingClusterId
          ? { ...c, childNodeIds: [...c.childNodeIds, linkedNodeId] }
          : c,
      );
      const currentLinked = Array.isArray(sfNow._linkedNodeIds)
        ? (sfNow._linkedNodeIds as string[])
        : [];
      const updatedLinked = currentLinked.includes(linkedNodeId)
        ? currentLinked
        : [...currentLinked, linkedNodeId];
      const sf = { ...sfNow, _clusters: updated, _linkedNodeIds: updatedLinked };
      localStructuredFieldsRef.current = sf;
      setValidationSFSnapshot(sf);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      const merged = { ...pendingPatchRef.current, structuredFields: sf } as SavePatch;
      pendingPatchRef.current = {};
      doSave(merged).catch(() => {});
      setPendingClusterId(null);
    },
    [pendingClusterId, doSave, queryClient],
  );

  // Verlinkt eine bestehende Seite ohne Cluster-Kontext (allgemeine Verlinkung im Editor)
  const handleLinkExistingNode = useCallback(
    (linkedNodeId: string, nodeData?: { title: string; templateType: string; displayCode?: string | null }) => {
      // Node-Daten sofort in QueryClient-Cache schreiben → kein Netzwerk-Roundtrip nötig
      if (nodeData) {
        queryClient.setQueryData(
          [`/api/content/nodes/${linkedNodeId}`],
          (old: Record<string, unknown> | undefined) => old ?? { id: linkedNodeId, ...nodeData },
        );
      }
      const sfNow = localStructuredFieldsRef.current;
      const currentLinked = Array.isArray(sfNow._linkedNodeIds)
        ? (sfNow._linkedNodeIds as string[])
        : [];
      if (currentLinked.includes(linkedNodeId)) return;
      const sf = { ...sfNow, _linkedNodeIds: [...currentLinked, linkedNodeId] };
      localStructuredFieldsRef.current = sf;
      setValidationSFSnapshot(sf);
      scheduleAutosave({ structuredFields: sf });
    },
    [scheduleAutosave, queryClient],
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
    return validateForPublication(node.templateType, editableMetadata, validationSectionData);
  }, [node, editableMetadata, validationSectionData]);

  const handleSubmit = useCallback(async () => {
    if (!activeWC || !node) return;

    if (!isSetupMode) {
      const validation = validateForPublication(node.templateType, editableMetadata, validationSectionData);
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
        if (wasAutoPublished) {
          queryClient.removeQueries({ queryKey: getGetActiveWorkingCopyQueryKey(nodeId) });
          queryClient.removeQueries({ queryKey: [`/api/content/nodes/${nodeId}`], exact: true });
          queryClient.removeQueries({ queryKey: [`/api/content/nodes/${nodeId}/revisions`] });
          await Promise.all([
            queryClient.refetchQueries({ queryKey: [`/api/content/nodes/${nodeId}`], exact: true }),
            queryClient.refetchQueries({ queryKey: [`/api/content/nodes/${nodeId}/revisions`] }),
            queryClient.invalidateQueries({ queryKey: [`/api/content/nodes/${nodeId}/children`] }),
            queryClient.invalidateQueries({ queryKey: ["/api/content/nodes/roots"] }),
          ]);
        } else {
          queryClient.setQueryData(
            getGetActiveWorkingCopyQueryKey(nodeId),
            submitResult,
          );
        }
      }
      setDirty(false);
      navigate(`/node/${nodeId}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: err instanceof Error ? err.message : "Fehler beim Einreichen",
      });
    }
  }, [
    activeWC, node, doSave, editableMetadata, validationSFSnapshot, changeType,
    changeSummary, submitComment, submitWorkingCopy, toast, nodeId, queryClient, navigate, isSetupMode, setDirty,
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
        queryClient.removeQueries({ queryKey: getGetActiveWorkingCopyQueryKey(nodeId) });
      }
      setDirty(false);
      navigate(`/node/${nodeId}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: err instanceof Error ? err.message : "Fehler",
      });
    }
  }, [activeWC, cancelWorkingCopy, toast, nodeId, queryClient, navigate, setDirty]);

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
  const canArchive = currentUser?.permissions?.includes("archive_page") ?? false;
  const pageDef = getPageType(node.templateType);

  const handleDeletionRequest = async () => {
    if (!deleteReason.trim()) return;
    try {
      await createDeletionRequest.mutateAsync({
        data: { nodeId: node.id, reason: deleteReason.trim() },
      });
      toast({ title: "Löschanfrage eingereicht" });
      setShowDeleteRequest(false);
      setDeleteReason("");
      queryClient.invalidateQueries({
        queryKey: getGetNodeDeletionRequestQueryKey(node.id),
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Fehler beim Einreichen der Löschanfrage",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    }
  };
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
            <div className="flex items-center gap-1 group/type">
              <Badge variant="secondary">
                {PAGE_TYPE_LABELS[node.templateType] || node.templateType}
              </Badge>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setTypeDraft(node.templateType);
                    setShowTypeDialog(true);
                  }}
                  className="opacity-0 group-hover/type:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                  title="Seitentyp ändern"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <Badge variant="outline">Arbeitskopie</Badge>
          </div>
          {isTitleEditing && canEdit ? (
            <Input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={async () => {
                setIsTitleEditing(false);
                const trimmed = titleDraft.trim();
                const currentTitle = localTitle ?? activeWC.title ?? node.title;
                if (trimmed && trimmed !== currentTitle) {
                  setLocalTitle(trimmed);
                  await doSave({ title: trimmed });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  setIsTitleEditing(false);
                  setTitleDraft(localTitle ?? activeWC.title ?? node.title);
                }
              }}
              className="text-2xl font-bold tracking-tight h-auto py-0.5 px-1 border-primary"
            />
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold tracking-tight break-words">{localTitle ?? activeWC.title ?? node.title}</h1>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(localTitle ?? activeWC.title ?? node.title);
                    setIsTitleEditing(true);
                    setTimeout(() => titleInputRef.current?.focus(), 0);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                  title="Titel bearbeiten"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          )}
          <p className="text-sm text-muted-foreground">{node.displayCode}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => confirmLeave(() => navigate(`/node/${nodeId}`))}>
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
          {canArchive && !pendingDeletionQuery.data && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => setShowDeleteRequest(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Löschanfrage
            </Button>
          )}
        </div>
      </div>

      {!showPreview && (
        <WorkingCopyBanner
          workingCopy={activeWC}
          currentUserId={currentUser?.principalId}
          authorName={activeWC?.authorDisplayName ?? wcAuthor?.displayName ?? undefined}
          canEditOthers={hasEditPermission}
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
        const readiness = getPublicationReadiness(node.templateType, editableMetadata, validationSectionData);
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

          {showStructureTab && (() => {
            const nodeChildrenArr = nodeChildren ?? [];
            const childIdSet = new Set(nodeChildrenArr.map((c) => c.id));
            const allPreviewNodes = [
              ...nodeChildrenArr,
              ...(previewLinkedNodes.filter((ln) => !childIdSet.has(ln.id as string)) as unknown as typeof nodeChildrenArr),
            ];
            const previewClusters = parseClusters(previewStructuredFields._clusters);
            if (allPreviewNodes.length === 0 && previewClusters.length === 0) return null;
            const clusterGroups = previewClusters.length > 0
              ? groupChildrenByClusters(allPreviewNodes, previewClusters)
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
                    {(nodeChildren ?? []).map((child, idx) => {
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
            {showStructureTab && (
              <TabsTrigger value="structure" className="gap-1.5">
                <Network className="h-3.5 w-3.5" />
                Struktur
                {nodeChildren && nodeChildren.length > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none">
                    {nodeChildren.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="metadata">Metadaten</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-4">
            {node.templateType === "meeting_protocol" ? (
              <div className="space-y-4">
                <GenericLayout
                  config={meetingProtocolTopConfig}
                  structuredFields={validationSFSnapshot}
                  onSectionSave={canEdit ? handleSectionSave : undefined}
                  pageType={node.templateType}
                  nodeId={node.id}
                />
                <ReferencesEditor
                  value={getReferencesValue(validationSFSnapshot, node.templateType)}
                  onSave={canEdit ? handleSectionSave : undefined}
                  sectionKey={getReferencesKey(node.templateType)}
                  nodeId={node.id}
                />
                <div>
                  <h3 className="text-base font-semibold mb-3">{CONTENT_HEADING_MAP[node.templateType] ?? "Inhalt"}</h3>
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
                    fieldKey="content"
                  />
                </div>
                <GenericLayout
                  config={meetingProtocolBottomConfig}
                  structuredFields={validationSFSnapshot}
                  onSectionSave={canEdit ? handleSectionSave : undefined}
                  pageType={node.templateType}
                  nodeId={node.id}
                />
              </div>
            ) : (
              <>
                <PageLayout
                  templateType={node.templateType}
                  structuredFields={validationSFSnapshot}
                  onSectionSave={canEdit ? handleSectionSave : undefined}
                  pageType={node.templateType}
                  nodeId={node.id}
                />

                <div className="mt-6">
                  <h3 className="text-base font-semibold mb-3">{CONTENT_HEADING_MAP[node.templateType] ?? "Inhalt"}</h3>
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
                    fieldKey="content"
                  />
                </div>

                {node && (
                  <div className="mt-6">
                    <ReferencesEditor
                      value={getReferencesValue(validationSFSnapshot, node.templateType)}
                      onSave={canEdit ? handleSectionSave : undefined}
                      sectionKey={getReferencesKey(node.templateType)}
                      nodeId={node.id}
                    />
                  </div>
                )}
              </>
            )}
            {nodeId && (
              <div className="mt-6">
                <BacklinksPanel nodeId={nodeId} />
              </div>
            )}
          </TabsContent>

          {showStructureTab && (
            <TabsContent value="structure" className="mt-4 space-y-6">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Cluster & Unterseiten</h3>
                  </div>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => { setPendingClusterId(null); setShowCreate(true); }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Neue Unterseite
                    </Button>
                  )}
                </div>
                {canEdit ? (
                  <ClusterManager
                    clusters={editorClusters}
                    children={[
                      ...(nodeChildren ?? []).map((c) => ({
                        id: c.id,
                        title: c.title,
                        templateType: c.templateType,
                        displayCode: c.displayCode,
                      })),
                      ...previewLinkedNodes
                        .filter((ln) => !(nodeChildren ?? []).find((c) => c.id === (ln.id as string)))
                        .map((ln) => ({
                          id: ln.id as string,
                          title: (ln.title as string) ?? (ln.id as string),
                          templateType: (ln.templateType as string) ?? "",
                          displayCode: (ln.displayCode as string | null | undefined) ?? null,
                        })),
                    ]}
                    linkedNodeIds={
                      Array.isArray(localStructuredFieldsRef.current._linkedNodeIds)
                        ? (localStructuredFieldsRef.current._linkedNodeIds as string[])
                        : []
                    }
                    onChange={handleClusterChange}
                    onCreateInCluster={handleCreateInClusterFromManager}
                    onLinkExistingNode={handleLinkExistingFromManager}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Keine Berechtigung zum Bearbeiten der Cluster-Struktur.
                  </p>
                )}
              </div>

              {nodeChildren && nodeChildren.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold">Vorschau der Registerstruktur</h3>
                    <Badge variant="secondary" className="text-xs">
                      {nodeChildren.length} {nodeChildren.length === 1 ? "Seite" : "Seiten"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">— Stand der Arbeitskopie</span>
                  </div>
                  <DocRegistryView
                    clusterGroups={clusterGroupsForEditor}
                    allChildren={nodeChildren.map((c) => ({
                      id: c.id,
                      title: c.title,
                      displayCode: c.displayCode,
                      templateType: c.templateType,
                      status: c.status,
                      updatedAt: c.updatedAt,
                    }))}
                    canCreate={false}
                    onCreateInCluster={() => {}}
                  />
                </div>
              )}
            </TabsContent>
          )}

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
            {nodeId && <BacklinksPanel nodeId={nodeId} />}
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
        onLinkExistingNode={pendingClusterId ? handleLinkExistingInCluster : handleLinkExistingNode}
      />

      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Seitentyp ändern</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Der Seitentyp bestimmt die verfügbaren Felder und die Struktur der Seite.
            </p>
            <Select value={typeDraft} onValueChange={setTypeDraft}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTypeDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={async () => {
                if (!typeDraft || typeDraft === node.templateType) {
                  setShowTypeDialog(false);
                  return;
                }
                try {
                  await updateNode.mutateAsync({
                    nodeId: node.id,
                    data: { templateType: typeDraft as NonNullable<UpdateNodeInput["templateType"]> },
                  });
                  setShowTypeDialog(false);
                  toast({ title: "Seitentyp geändert" });
                } catch (err) {
                  toast({
                    variant: "destructive",
                    title: "Fehler",
                    description: err instanceof Error ? err.message : "Unbekannter Fehler",
                  });
                }
              }}
              disabled={updateNode.isPending || !typeDraft || typeDraft === node.templateType}
            >
              {updateNode.isPending ? "Wird gespeichert…" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDeleteRequest}
        onOpenChange={(open) => {
          setShowDeleteRequest(open);
          if (!open) setDeleteReason("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Löschanfrage stellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {"Die Seite \u201E"}{node.title}{"\u201C wird zur Löschung vorgeschlagen. Ein Administrator muss die Anfrage genehmigen."}
            </p>
            <div className="space-y-2">
              <Label htmlFor="wc-delete-reason">Begründung</Label>
              <Input
                id="wc-delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Warum soll die Seite gelöscht werden?"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && deleteReason.trim()) handleDeletionRequest();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteRequest(false);
                setDeleteReason("");
              }}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletionRequest}
              disabled={!deleteReason.trim() || createDeletionRequest.isPending}
            >
              {createDeletionRequest.isPending ? "Wird eingereicht…" : "Löschanfrage einreichen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
