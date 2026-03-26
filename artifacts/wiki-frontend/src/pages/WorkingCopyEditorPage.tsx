import { useRoute, useLocation } from "wouter";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNode } from "@/hooks/use-nodes";
import { useToast } from "@/hooks/use-toast";
import { NodeBreadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Send,
  Loader2,
  Save,
  CheckCircle2,
} from "lucide-react";
import { PAGE_TYPE_LABELS, getPageType } from "@/lib/types";
import {
  useGetActiveWorkingCopy,
  useCreateWorkingCopy,
  useUpdateWorkingCopy,
  useSubmitWorkingCopy,
  useCancelWorkingCopy,
  getGetActiveWorkingCopyQueryKey,
} from "@workspace/api-client-react";
import type { WorkingCopy } from "@workspace/api-client-react";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { PageLayout } from "@/components/layouts/PageLayout";
import { MetadataPanel } from "@/components/metadata/MetadataPanel";
import { CompletenessIndicator } from "@/components/metadata/CompletenessIndicator";
import { BlockEditor } from "@/components/editor";
import { StatusBadge } from "@/components/versioning/StatusBadge";
import { WorkingCopyBanner } from "@/components/versioning/WorkingCopyBanner";
import { PageAssistant } from "@/components/ai/PageAssistant";
import { CreateNodeDialog } from "@/components/CreateNodeDialog";
import type { JSONContent } from "@tiptap/react";
import { useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Bot } from "lucide-react";

const AUTOSAVE_DELAY_MS = 2000;

const CHANGE_TYPE_LABELS: Record<string, string> = {
  editorial: "Redaktionell",
  minor: "Kleinere Änderung",
  major: "Größere Änderung",
  regulatory: "Regulatorisch",
  structural: "Strukturell",
};

export function WorkingCopyEditorPage() {
  const [, params] = useRoute("/nodes/:id/edit");
  const nodeId = params?.id;
  const { data: node, isLoading: nodeLoading } = useNode(nodeId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activeWCQuery = useGetActiveWorkingCopy(nodeId || "", {
    query: { queryKey: [`/api/content/nodes/${nodeId || ""}/working-copy`], enabled: !!nodeId, retry: false },
  });
  const activeWC = activeWCQuery.data;
  const wcLoading = activeWCQuery.isLoading;

  const createWorkingCopy = useCreateWorkingCopy();
  const updateWorkingCopy = useUpdateWorkingCopy();
  const submitWorkingCopy = useSubmitWorkingCopy();
  const cancelWorkingCopy = useCancelWorkingCopy();

  const [submitOpen, setSubmitOpen] = useState(false);
  const [changeType, setChangeType] = useState("editorial");
  const [changeSummary, setChangeSummary] = useState("");
  const [submitComment, setSubmitComment] = useState("");
  const [showPageAssist, setShowPageAssist] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      localStructuredFieldsRef.current = (activeWC.structuredFields as Record<string, unknown>) ?? {};
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

  const doSave = useCallback(
    async (patch: {
      title?: string;
      content?: Record<string, unknown>;
      structuredFields?: Record<string, unknown>;
      editorSnapshot?: Record<string, unknown>;
      changeType?: "editorial" | "minor" | "major" | "regulatory" | "structural";
    }) => {
      const wc = wcRef.current;
      if (!wc || (wc.status !== "draft" && wc.status !== "changes_requested")) return;
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
    (patch: Parameters<typeof doSave>[0]) => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        doSave(patch).catch(() => {});
      }, AUTOSAVE_DELAY_MS);
    },
    [doSave],
  );

  const handleEditorSave = useCallback(
    async (json: JSONContent) => {
      const sf = { ...localStructuredFieldsRef.current, _editorContent: json };
      localStructuredFieldsRef.current = sf;
      scheduleAutosave({ structuredFields: sf });
    },
    [scheduleAutosave],
  );

  const handleSectionSave = useCallback(
    async (sectionKey: string, value: string) => {
      const sf = { ...localStructuredFieldsRef.current, [sectionKey]: value };
      localStructuredFieldsRef.current = sf;
      scheduleAutosave({ structuredFields: sf });
    },
    [scheduleAutosave],
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

  const handleSubmit = useCallback(async () => {
    if (!activeWC) return;
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
      await submitWorkingCopy.mutateAsync({
        workingCopyId: activeWC.id,
        data: {
          changeType: changeType as "editorial" | "minor" | "major" | "regulatory" | "structural",
          changeSummary: changeSummary || undefined,
          comment: submitComment || undefined,
        },
      });
      toast({ title: "Zur Prüfung eingereicht" });
      setSubmitOpen(false);
      if (nodeId) {
        queryClient.invalidateQueries({ queryKey: getGetActiveWorkingCopyQueryKey(nodeId) });
      }
      navigate(`/node/${nodeId}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: err instanceof Error ? err.message : "Fehler beim Einreichen",
      });
    }
  }, [
    activeWC, doSave, editableMetadata, changeType,
    changeSummary, submitComment, submitWorkingCopy, toast, nodeId, queryClient, navigate,
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

  const canEdit = activeWC.status === "draft" || activeWC.status === "changes_requested";
  const pageDef = getPageType(node.templateType);
  const metadata: Record<string, unknown> = editableMetadata;

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
            <Badge variant="secondary">
              {PAGE_TYPE_LABELS[node.templateType] || node.templateType}
            </Badge>
            <Badge variant="outline">Arbeitskopie</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{activeWC.title || node.title}</h1>
          <p className="text-sm text-muted-foreground">{node.displayCode}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/node/${nodeId}`)}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Zurück
          </Button>
          {canEdit && (
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

      <WorkingCopyBanner workingCopy={activeWC} />

      {lastSavedAt && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          Zuletzt gespeichert: {lastSavedAt.toLocaleTimeString("de-DE")}
        </div>
      )}

      <Tabs defaultValue="content" className="w-full">
        <TabsList>
          <TabsTrigger value="content">Inhalt</TabsTrigger>
          <TabsTrigger value="metadata">Metadaten</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4">
          <PageLayout
            templateType={node.templateType}
            structuredFields={wcStructuredFields}
            onSectionSave={canEdit ? handleSectionSave : undefined}
          />

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
                  KI-Assistent
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
            sectionData={wcStructuredFields}
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

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Zur Prüfung einreichen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ihre Arbeitskopie wird in den Freigabe-Pool der zuständigen Prozessmanager übermittelt.
          </p>
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
              <Label>Zusammenfassung der Änderungen</Label>
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
            <Button onClick={handleSubmit} disabled={submitWorkingCopy.isPending}>
              {submitWorkingCopy.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Einreichen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateNodeDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        parentNodeId={node.id}
        parentTemplateType={node.templateType}
      />
    </div>
  );
}
