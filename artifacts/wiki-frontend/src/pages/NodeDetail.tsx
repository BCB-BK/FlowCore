import { useRoute, useLocation, useSearch } from "wouter";
import { useSafeLinkProps } from "@/hooks/use-unsaved-changes";
import {
  useNode,
  useNodeChildren,
  useNodeRevisions,
  useUpdateNode,
} from "@/hooks/use-nodes";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";
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
  ArrowRightLeft,
  Check,
  X,
} from "lucide-react";
import { PAGE_TYPE_LABELS, getPageType, getAllowedChildTypes, getDisplayProfile } from "@/lib/types";
import { parseClusters, groupChildrenByClusters, generateClusterId } from "@/lib/clusters";
import type { UpdateNodeInput } from "@workspace/api-client-react";
import {
  useGetActiveWorkingCopy,
  useCreateWorkingCopy,
  useUpdateWorkingCopy,
  useGetPrincipal,
  useCreateDeletionRequest,
  useGetNodeDeletionRequest,
  useCancelDeletionRequest,
  getGetNodeDeletionRequestQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import { CreateNodeDialog } from "@/components/CreateNodeDialog";
import { DocRegistryView } from "@/components/registry/DocRegistryView";
import { MoveNodeDialog } from "@/components/MoveNodeDialog";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { PageLayout } from "@/components/layouts/PageLayout";
import { GenericLayout, meetingProtocolTopConfig, meetingProtocolBottomConfig } from "@/components/layouts/layout-engine";
import { PageHeader } from "@/components/layouts/PageHeader";
import { QuickFactsStrip } from "@/components/layouts/QuickFactsStrip";
import { MetadataPanel } from "@/components/metadata/MetadataPanel";
import { TagManager } from "@/components/tags/TagManager";
import { RelatedContentSidebar } from "@/components/content/RelatedContentSidebar";
import { GlossaryTermsPanel } from "@/components/content/GlossaryTermsPanel";
import { SourceReferencesPanel } from "@/components/content/SourceReferencesPanel";
import { BacklinksPanel } from "@/components/content/BacklinksPanel";
import { ReferencesEditor } from "@/components/compound/ReferencesEditor";
import { CompletenessIndicator } from "@/components/metadata/CompletenessIndicator";
import { BlockEditorWithBoundary as BlockEditor } from "@/components/editor";
import { StatusBadge } from "@/components/versioning/StatusBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/tooltip";
import { WatchButton } from "@/components/versioning/WatchButton";
import { VersionHistoryPanel } from "@/components/versioning/VersionHistoryPanel";
import { WorkingCopyBanner } from "@/components/versioning/WorkingCopyBanner";
import { WorkingCopyActions } from "@/components/versioning/WorkingCopyActions";
import type { JSONContent } from "@tiptap/react";
import { useState, useCallback, useMemo } from "react";
import { useQueryClient, useQueries } from "@tanstack/react-query";
import { ShareToTeams } from "@/components/teams/ShareToTeams";
import { useAuth } from "@/hooks/use-auth";
import { isFieldEmpty } from "@/lib/field-empty";


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

const CONTENT_HEADING_MAP: Record<string, string> = {
  policy: "Richtlinientext",
  procedure_instruction: "Ablaufbeschreibung",
  work_instruction: "Arbeitsschritte",
  meeting_protocol: "Entscheidungen",
  training_resource: "Schulungsinhalt",
  use_case: "Normalablauf",
};

export function NodeDetail() {
  const [, params] = useRoute("/node/:id");
  const nodeId = params?.id;
  const { data: node, isLoading, error: nodeError } = useNode(nodeId);
  useDocumentTitle(node?.title);
  const { data: currentUser } = useAuth();
  const { data: children } = useNodeChildren(nodeId);
  const { data: revisions } = useNodeRevisions(nodeId);
  const queryClient = useQueryClient();
  const updateNode = useUpdateNode();
  const createWorkingCopy = useCreateWorkingCopy();
  const updateWorkingCopy = useUpdateWorkingCopy();
  const createDeletionRequest = useCreateDeletionRequest();
  const cancelDeletionRequest = useCancelDeletionRequest();
  const [, navigate] = useLocation();
  const getLinkProps = useSafeLinkProps();
  const search = useSearch();
  const VALID_TABS = ["content", "metadata", "versions", "children"] as const;
  type ValidTab = (typeof VALID_TABS)[number];
  const activeTab = useMemo<ValidTab>(() => {
    const t = new URLSearchParams(search).get("tab");
    return (VALID_TABS as readonly string[]).includes(t ?? "") ? (t as ValidTab) : "content";
  }, [search]);
  const handleTabChange = useCallback(
    (value: string) => { navigate(`/node/${nodeId}?tab=${value}`, { replace: true }); },
    [navigate, nodeId],
  );
  const [showCreate, setShowCreate] = useState(false);
  const [createPresetType, setCreatePresetType] = useState<string | undefined>(undefined);
  const [createInClusterId, setCreateInClusterId] = useState<string | null>(null);
  const [createDialogInitialMode, setCreateDialogInitialMode] = useState<"create" | "link">("create");
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [showMoveNode, setShowMoveNode] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [showAddCluster, setShowAddCluster] = useState(false);
  const [newClusterTitle, setNewClusterTitle] = useState("");
  const [isAddingCluster, setIsAddingCluster] = useState(false);
  const { toast } = useToast();

  const pageDef = useMemo(() => {
    if (!node) return undefined;
    return getPageType(node.templateType);
  }, [node]);

  const isOverviewPage = getDisplayProfile(node?.templateType ?? "") === "overview_container";
  const showsClusterArea = pageDef?.supportsClusterGroups === true;
  const showQuickFacts = !isOverviewPage && !showsClusterArea && !!pageDef;

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
    query: { queryKey: getGetNodeDeletionRequestQueryKey(nodeId || ""), enabled: !!nodeId },
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

  const clusters = useMemo(() => {
    // Prefer working copy's _clusters once loaded — so cluster assignments
    // made via handleNodeCreatedInCluster are immediately visible without publish
    if (!wcLoading) {
      const wcSF = activeWC?.structuredFields as Record<string, unknown> | null | undefined;
      if (wcSF?._clusters) return parseClusters(wcSF._clusters);
    }
    return parseClusters(structuredFields._clusters);
  }, [structuredFields._clusters, activeWC, wcLoading]);

  // Verlinkte Nodes (Cross-References): im Working-Copy als _linkedNodeIds gespeichert
  const linkedNodeIds = useMemo(() => {
    if (!wcLoading && activeWC) {
      const wcSF = activeWC.structuredFields as Record<string, unknown> | null | undefined;
      if (Array.isArray(wcSF?._linkedNodeIds)) return wcSF!._linkedNodeIds as string[];
    }
    const ids = structuredFields._linkedNodeIds;
    return Array.isArray(ids) ? (ids as string[]) : [];
  }, [activeWC, wcLoading, structuredFields]);

  const linkedNodeQueries = useQueries({
    queries: linkedNodeIds.map((id) => ({
      queryKey: [`/api/content/nodes/${id}`],
      queryFn: () => customFetch<Record<string, unknown>>(`/api/content/nodes/${id}`),
    })),
  });

  const linkedNodes = useMemo(
    () => linkedNodeQueries.filter((q) => q.data != null).map((q) => q.data as unknown as NonNullable<typeof children>[number]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linkedNodeQueries.map((q) => q.dataUpdatedAt).join(",")],
  );

  const linkedNodeIdSet = useMemo(() => new Set(linkedNodeIds), [linkedNodeIds]);

  const clusterGroups = useMemo(() => {
    if (clusters.length === 0) return [];
    const childrenArr = children ?? [];
    const childIdSet = new Set(childrenArr.map((c) => c.id));
    // Echte Kinder + verlinkte Nodes zusammenführen (ohne Duplikate)
    const allNodes = [...childrenArr, ...linkedNodes.filter((ln) => !childIdSet.has(ln.id))];
    // Auch bei leerem allNodes Cluster-Boxen rendern (verlinkte Nodes könnten noch laden)
    const raw = groupChildrenByClusters(allNodes, clusters);
    return raw.map((group) => {
      // Cluster-Kinder: childNodeIds-Reihenfolge beibehalten (vom Editor gesetzt)
      // Nicht-zugeordnete Kinder: nach displayCode sortieren
      const processedChildren =
        group.cluster === null
          ? sortByDisplayCode(group.children)
          : group.children;
      return { ...group, children: processedChildren };
    }).filter((g) => g.children.length > 0 || g.cluster !== null);
  }, [children, clusters, linkedNodes, sortByDisplayCode]);

  const editorContent = useMemo(() => {
    const raw = structuredFields._editorContent ?? structuredFields.discussion;
    if (raw && typeof raw === "object") {
      return raw as JSONContent;
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

  const handleNodeCreatedInCluster = useCallback(
    async (newNodeId: string) => {
      if (!nodeId) return;
      const clusterId = createInClusterId;
      setCreateInClusterId(null);
      if (!clusterId) return;
      try {
        let wc = activeWC;
        if (!wc) {
          wc = await createWorkingCopy.mutateAsync({ nodeId });
        }
        const currentClusters = parseClusters(
          (wc.structuredFields as Record<string, unknown>)?._clusters,
        );
        const updatedClusters = currentClusters.map((c) =>
          c.id === clusterId
            ? { ...c, childNodeIds: [...c.childNodeIds, newNodeId] }
            : c,
        );
        await updateWorkingCopy.mutateAsync({
          workingCopyId: wc.id,
          data: {
            structuredFields: {
              ...((wc.structuredFields as Record<string, unknown>) ?? {}),
              _clusters: updatedClusters,
            },
          },
        });
        await queryClient.invalidateQueries({
          queryKey: [`/api/content/nodes/${nodeId}/children`],
        });
        await queryClient.invalidateQueries({
          queryKey: [`/api/content/nodes/${nodeId}/working-copy`],
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Cluster-Zuordnung fehlgeschlagen",
          description:
            err instanceof Error ? err.message : "Unbekannter Fehler",
        });
      }
    },
    [nodeId, createInClusterId, activeWC, createWorkingCopy, updateWorkingCopy, queryClient, toast],
  );

  // Verlinkt eine bestehende Seite im Cluster, ohne ihren parentNodeId zu ändern
  const handleLinkExistingInCluster = useCallback(
    async (linkedNodeId: string) => {
      if (!nodeId) return;
      const clusterId = createInClusterId;
      setCreateInClusterId(null);
      if (!clusterId) return;
      try {
        let wc = activeWC;
        if (!wc) wc = await createWorkingCopy.mutateAsync({ nodeId });
        const sfNow = (wc.structuredFields as Record<string, unknown>) ?? {};
        const currentClusters = parseClusters(sfNow._clusters);
        const updatedClusters = currentClusters.map((c) =>
          c.id === clusterId
            ? { ...c, childNodeIds: [...c.childNodeIds, linkedNodeId] }
            : c,
        );
        const currentLinked = Array.isArray(sfNow._linkedNodeIds)
          ? (sfNow._linkedNodeIds as string[])
          : [];
        const updatedLinked = currentLinked.includes(linkedNodeId)
          ? currentLinked
          : [...currentLinked, linkedNodeId];
        await updateWorkingCopy.mutateAsync({
          workingCopyId: wc.id,
          data: {
            structuredFields: { ...sfNow, _clusters: updatedClusters, _linkedNodeIds: updatedLinked },
          },
        });
        // Pre-fetch linked node und dann WC invalidieren – Reihenfolge kritisch:
        // Daten müssen im Cache sein BEVOR der WC-Re-render linkedNodeQueries triggert
        await queryClient.prefetchQuery({
          queryKey: [`/api/content/nodes/${linkedNodeId}`],
          queryFn: () => customFetch<Record<string, unknown>>(`/api/content/nodes/${linkedNodeId}`),
        });
        await queryClient.invalidateQueries({
          queryKey: [`/api/content/nodes/${nodeId}/working-copy`],
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Verlinkung fehlgeschlagen",
          description: err instanceof Error ? err.message : "Unbekannter Fehler",
        });
      }
    },
    [nodeId, createInClusterId, activeWC, createWorkingCopy, updateWorkingCopy, queryClient, toast],
  );

  // Verlinkt eine bestehende Seite ohne Cluster-Kontext (allgemeine Verlinkung)
  const handleLinkExistingNode = useCallback(
    async (linkedNodeId: string) => {
      if (!nodeId) return;
      try {
        let wc = activeWC;
        if (!wc) wc = await createWorkingCopy.mutateAsync({ nodeId });
        const sfNow = (wc.structuredFields as Record<string, unknown>) ?? {};
        const currentLinked = Array.isArray(sfNow._linkedNodeIds)
          ? (sfNow._linkedNodeIds as string[])
          : [];
        if (currentLinked.includes(linkedNodeId)) return;
        await updateWorkingCopy.mutateAsync({
          workingCopyId: wc.id,
          data: {
            structuredFields: { ...sfNow, _linkedNodeIds: [...currentLinked, linkedNodeId] },
          },
        });
        await queryClient.prefetchQuery({
          queryKey: [`/api/content/nodes/${linkedNodeId}`],
          queryFn: () => customFetch<Record<string, unknown>>(`/api/content/nodes/${linkedNodeId}`),
        });
        await queryClient.invalidateQueries({
          queryKey: [`/api/content/nodes/${nodeId}/working-copy`],
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Verlinkung fehlgeschlagen",
          description: err instanceof Error ? err.message : "Unbekannter Fehler",
        });
      }
    },
    [nodeId, activeWC, createWorkingCopy, updateWorkingCopy, queryClient, toast],
  );

  const handleAssignToCluster = useCallback(
    async (childId: string, clusterId: string | null) => {
      if (!nodeId) return;
      try {
        let wc = activeWC;
        if (!wc) {
          wc = await createWorkingCopy.mutateAsync({ nodeId });
        }
        const currentClusters = parseClusters(
          (wc.structuredFields as Record<string, unknown>)?._clusters,
        );
        const updated = currentClusters.map((c) => ({
          ...c,
          childNodeIds: c.childNodeIds.filter((id) => id !== childId),
        }));
        if (clusterId) {
          const target = updated.find((c) => c.id === clusterId);
          if (target) target.childNodeIds = [...target.childNodeIds, childId];
        }
        await updateWorkingCopy.mutateAsync({
          workingCopyId: wc.id,
          data: {
            structuredFields: {
              ...((wc.structuredFields as Record<string, unknown>) ?? {}),
              _clusters: updated,
            },
          },
        });
        await queryClient.invalidateQueries({
          queryKey: [`/api/content/nodes/${nodeId}/working-copy`],
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Zuordnung fehlgeschlagen",
          description: err instanceof Error ? err.message : "Unbekannter Fehler",
        });
      }
    },
    [nodeId, activeWC, createWorkingCopy, updateWorkingCopy, queryClient, toast],
  );

  const handleRemoveFromCluster = useCallback(
    async (childId: string, clusterId: string) => {
      if (!nodeId) return;
      try {
        let wc = activeWC;
        if (!wc) {
          wc = await createWorkingCopy.mutateAsync({ nodeId });
        }
        const sfNow = (wc.structuredFields as Record<string, unknown>) ?? {};
        const currentClusters = parseClusters(sfNow._clusters);
        const updatedClusters = currentClusters.map((c) =>
          c.id === clusterId
            ? { ...c, childNodeIds: c.childNodeIds.filter((id) => id !== childId) }
            : c,
        );
        const currentLinked = Array.isArray(sfNow._linkedNodeIds)
          ? (sfNow._linkedNodeIds as string[])
          : [];
        const updatedLinked = linkedNodeIdSet.has(childId)
          ? currentLinked.filter((id) => id !== childId)
          : currentLinked;
        await updateWorkingCopy.mutateAsync({
          workingCopyId: wc.id,
          data: {
            structuredFields: {
              ...sfNow,
              _clusters: updatedClusters,
              _linkedNodeIds: updatedLinked,
            },
          },
        });
        await queryClient.invalidateQueries({
          queryKey: [`/api/content/nodes/${nodeId}/working-copy`],
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Entfernen fehlgeschlagen",
          description: err instanceof Error ? err.message : "Unbekannter Fehler",
        });
      }
    },
    [nodeId, activeWC, linkedNodeIdSet, createWorkingCopy, updateWorkingCopy, queryClient, toast],
  );

  const handleDeleteCluster = useCallback(
    async (clusterId: string) => {
      if (!nodeId) return;
      try {
        let wc = activeWC;
        if (!wc) {
          wc = await createWorkingCopy.mutateAsync({ nodeId });
        }
        const sfNow = (wc.structuredFields as Record<string, unknown>) ?? {};
        const currentClusters = parseClusters(sfNow._clusters);
        const clusterToDelete = currentClusters.find((c) => c.id === clusterId);
        const updatedClusters = currentClusters.filter((c) => c.id !== clusterId);
        const currentLinked = Array.isArray(sfNow._linkedNodeIds)
          ? (sfNow._linkedNodeIds as string[])
          : [];
        const removedLinkedIds = clusterToDelete
          ? clusterToDelete.childNodeIds.filter((id) => linkedNodeIdSet.has(id))
          : [];
        const updatedLinked = currentLinked.filter((id) => !removedLinkedIds.includes(id));
        await updateWorkingCopy.mutateAsync({
          workingCopyId: wc.id,
          data: {
            structuredFields: {
              ...sfNow,
              _clusters: updatedClusters,
              _linkedNodeIds: updatedLinked,
            },
          },
        });
        await queryClient.invalidateQueries({
          queryKey: [`/api/content/nodes/${nodeId}/working-copy`],
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Cluster löschen fehlgeschlagen",
          description: err instanceof Error ? err.message : "Unbekannter Fehler",
        });
      }
    },
    [nodeId, activeWC, linkedNodeIdSet, createWorkingCopy, updateWorkingCopy, queryClient, toast],
  );

  const handleAddCluster = useCallback(async () => {
    if (!nodeId || !newClusterTitle.trim()) return;
    setIsAddingCluster(true);
    try {
      let wc = activeWC;
      if (!wc) {
        wc = await createWorkingCopy.mutateAsync({ nodeId });
      }
      const currentClusters = parseClusters(
        (wc.structuredFields as Record<string, unknown>)?._clusters,
      );
      const newCluster = {
        id: generateClusterId(),
        title: newClusterTitle.trim(),
        sortOrder: currentClusters.length,
        childNodeIds: [],
      };
      await updateWorkingCopy.mutateAsync({
        workingCopyId: wc.id,
        data: {
          structuredFields: {
            ...((wc.structuredFields as Record<string, unknown>) ?? {}),
            _clusters: [...currentClusters, newCluster],
          },
        },
      });
      await queryClient.invalidateQueries({
        queryKey: [`/api/content/nodes/${nodeId}/working-copy`],
      });
      setNewClusterTitle("");
      setShowAddCluster(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Cluster konnte nicht angelegt werden",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    } finally {
      setIsAddingCluster(false);
    }
  }, [nodeId, newClusterTitle, activeWC, createWorkingCopy, updateWorkingCopy, queryClient, toast]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const isConfidentialityDenied =
    nodeError &&
    typeof nodeError === "object" &&
    "status" in (nodeError as any) &&
    (nodeError as any).status === 403;

  if (isConfidentialityDenied) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
          <svg
            className="h-8 w-8 text-amber-600 dark:text-amber-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-3">Kein Zugang</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Du hast leider keine Freigabe, diese Seite zu {"\u00F6"}ffnen.
          Liegt deines Erachtens ein Fehler in der Freigabe vor, wende dich
          bitte an deine*n Vorgesetzte*n.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => navigate("/")}
        >
          Zur{"\u00FC"}ck zum Hub
        </Button>
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
          Zur{"\u00FC"}ck zum Hub
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
    <div className="max-w-4xl w-full mx-auto space-y-6 min-w-0">
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
        {canEditStructure && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMoveNode(true)}
        >
          <ArrowRightLeft className="h-4 w-4 mr-1" />
          Verschieben
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full min-h-[300px]">
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

        <TabsContent value="content" className="mt-4 w-full min-w-0">
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

          {showsClusterArea && (
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold shrink-0">
                  {isOverviewPage
                    ? (node.templateType === "core_process_overview" ? "Bereiche & Prozesse" : "Zugehörige Seiten")
                    : (pageDef?.labelDe ? `${pageDef.labelDe}-Inhalte` : "Inhalte")}
                </h3>
                {canCreate && (
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    {showAddCluster ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={newClusterTitle}
                          onChange={(e) => setNewClusterTitle(e.target.value)}
                          placeholder="Cluster-Name..."
                          className="h-8 text-sm w-44"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddCluster();
                            if (e.key === "Escape") {
                              setShowAddCluster(false);
                              setNewClusterTitle("");
                            }
                          }}
                        />
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={handleAddCluster}
                          disabled={!newClusterTitle.trim() || isAddingCluster}
                        >
                          {isAddingCluster ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => {
                            setShowAddCluster(false);
                            setNewClusterTitle("");
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Neuen Cluster anlegen"
                        onClick={() => setShowAddCluster(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <DocRegistryView
                clusterGroups={clusterGroups}
                allChildren={children ?? []}
                canCreate={canCreate}
                canEdit={isOverviewPage ? canEdit : undefined}
                clusters={clusters}
                onAssignToCluster={clusters.length > 0 ? handleAssignToCluster : undefined}
                linkedNodeIds={isOverviewPage ? linkedNodeIdSet : undefined}
                onRemoveFromCluster={isOverviewPage && activeWC ? handleRemoveFromCluster : undefined}
                onDeleteCluster={isOverviewPage ? handleDeleteCluster : undefined}
                onCreateInCluster={(clusterId) => {
                  setCreateInClusterId(clusterId);
                  setCreatePresetType(undefined);
                  setCreateDialogInitialMode("create");
                  setShowCreate(true);
                }}
                onLinkInCluster={(clusterId) => {
                  setCreateInClusterId(clusterId);
                  setCreatePresetType(undefined);
                  setCreateDialogInitialMode("link");
                  setShowCreate(true);
                }}
              />
            </div>
          )}

          {isOverviewPage && !isFieldEmpty(editorContent) && (
          <div className="mb-6">
            <h3 className="text-base font-semibold mb-3">{CONTENT_HEADING_MAP[node.templateType] ?? "Inhalt"}</h3>
            <BlockEditor
              content={editorContent}
              onSave={async () => {}}
              editable={false}
              nodeId={nodeId}
              parentTemplateType={node?.templateType}
            />
          </div>
          )}

          {isOverviewPage && !isFieldEmpty(getReferencesValue(structuredFields, node.templateType)) && (
            <div className="mb-6">
              <ReferencesEditor
                value={getReferencesValue(structuredFields, node.templateType)}
                sectionKey={getReferencesKey(node.templateType)}
                nodeId={nodeId}
              />
            </div>
          )}

          {!isOverviewPage && node.templateType === "meeting_protocol" ? (
            <div className="mb-6 space-y-4">
              <GenericLayout
                config={meetingProtocolTopConfig}
                structuredFields={structuredFields}
              />
              {!isFieldEmpty(getReferencesValue(structuredFields, node.templateType)) && (
                <ReferencesEditor
                  value={getReferencesValue(structuredFields, node.templateType)}
                  sectionKey={getReferencesKey(node.templateType)}
                  nodeId={nodeId}
                />
              )}
              {!isFieldEmpty(editorContent) && (
                <div>
                  <h3 className="text-base font-semibold mb-3">{CONTENT_HEADING_MAP[node.templateType] ?? "Inhalt"}</h3>
                  <BlockEditor
                    content={editorContent}
                    onSave={async () => {}}
                    editable={false}
                    nodeId={nodeId}
                    parentTemplateType={node?.templateType}
                  />
                </div>
              )}
              <GenericLayout
                config={meetingProtocolBottomConfig}
                structuredFields={structuredFields}
              />
              {nodeId && (
                <div className="mt-4">
                  <TagManager nodeId={nodeId} />
                </div>
              )}
            </div>
          ) : !isOverviewPage ? (
            <>
              <div className="mb-6 space-y-4">
                <PageLayout
                  templateType={node.templateType}
                  structuredFields={structuredFields}
                />
                {nodeId && (
                  <div className="mt-4">
                    <TagManager nodeId={nodeId} />
                  </div>
                )}
              </div>

              {!isFieldEmpty(editorContent) && (
              <div className="mt-6">
                <h3 className="text-base font-semibold mb-3">{CONTENT_HEADING_MAP[node.templateType] ?? "Inhalt"}</h3>
                <BlockEditor
                  content={editorContent}
                  onSave={async () => {}}
                  editable={false}
                  nodeId={nodeId}
                  parentTemplateType={node?.templateType}
                />
              </div>
              )}

              {!isFieldEmpty(getReferencesValue(structuredFields, node.templateType)) && (
                <div className="mt-6">
                  <ReferencesEditor
                    value={getReferencesValue(structuredFields, node.templateType)}
                    sectionKey={getReferencesKey(node.templateType)}
                    nodeId={nodeId}
                  />
                </div>
              )}
            </>
          ) : null}

          {!isOverviewPage && nodeId && (
            <>
              <div className="mt-4"><RelatedContentSidebar nodeId={nodeId} /></div>
              <div className="mt-4"><GlossaryTermsPanel nodeId={nodeId} /></div>
              <div className="mt-4"><BacklinksPanel nodeId={nodeId} /></div>
            </>
          )}

          {nodeId && <SourceReferencesPanel nodeId={nodeId} />}
        </TabsContent>

        <TabsContent value="metadata" className="mt-4 space-y-4 w-full min-w-0">
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
              <BacklinksPanel nodeId={nodeId} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="versions" className="mt-4 space-y-4 w-full min-w-0">
          {activeWC && nodeId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Aktive Arbeitskopie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <WorkingCopyBanner
                  workingCopy={activeWC}
                  currentUserId={currentUser?.principalId}
                  authorName={activeWC.authorDisplayName ?? wcAuthor?.displayName ?? undefined}
                  onNavigateToEditor={() => navigate(`/nodes/${nodeId}/edit`)}
                />
                <WorkingCopyActions workingCopy={activeWC} nodeId={nodeId} templateType={node?.templateType} currentUserId={currentUser?.principalId} userPermissions={currentUser?.permissions} sodRules={currentUser?.sodRules} />
              </CardContent>
            </Card>
          )}
          {nodeId && <VersionHistoryPanel nodeId={nodeId} activeWorkingCopy={activeWC ? { id: activeWC.id, status: activeWC.status, title: activeWC.title ?? "", authorId: activeWC.authorId, createdAt: activeWC.createdAt, updatedAt: activeWC.updatedAt, changeSummary: activeWC.changeSummary } : null} />}
        </TabsContent>

        <TabsContent value="children" className="mt-4 w-full min-w-0">
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
                const wcAuthorName = (child as unknown as { activeWorkingCopyAuthorName?: string | null }).activeWorkingCopyAuthorName;
                return (
                  <Card
                    key={child.id}
                    className="hover:shadow-sm transition-shadow overflow-hidden"
                  >
                    <a {...getLinkProps(`/node/${child.id}`)} className="block">
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
                        {wcAuthorName && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  role="status"
                                  className="shrink-0 text-amber-500 dark:text-amber-400 cursor-default"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                >
                                  <FileEdit className="h-4 w-4" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Arbeitskopie von {wcAuthorName} geöffnet
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <StatusBadge
                          status={
                            child.status as Parameters<
                              typeof StatusBadge
                            >[0]["status"]
                          }
                          compact
                        />
                      </CardContent>
                    </a>
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
                {activeWC && pageDef && pageDef.allowedChildTypes.length > 0 && (
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
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) {
            setCreateInClusterId(null);
            setCreateDialogInitialMode("create");
          }
        }}
        parentNodeId={node.id}
        parentTemplateType={node.templateType}
        presetType={createPresetType}
        initialMode={createDialogInitialMode}
        onNodeCreated={createInClusterId ? handleNodeCreatedInCluster : undefined}
        onLinkExistingNode={createInClusterId ? handleLinkExistingInCluster : handleLinkExistingNode}
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

      {nodeId && (
        <MoveNodeDialog
          open={showMoveNode}
          onOpenChange={setShowMoveNode}
          nodeId={nodeId}
          nodeTitle={node.title}
          nodeDisplayCode={node.displayCode}
          currentParentId={node.parentNodeId ?? null}
        />
      )}
    </div>
  );
}
