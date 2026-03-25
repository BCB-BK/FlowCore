import { useRoute, useLocation } from "wouter";
import {
  useNode,
  useNodeChildren,
  useDeleteNode,
  useUpdateNode,
} from "@/hooks/use-nodes";
import { useToast } from "@/hooks/use-toast";
import { NodeBreadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import {
  PAGE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  getPageType,
} from "@/lib/types";
import type { UpdateNodeInput } from "@workspace/api-client-react";
import { CreateNodeDialog } from "@/components/CreateNodeDialog";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { PageLayout } from "@/components/layouts/PageLayout";
import { MetadataPanel } from "@/components/metadata/MetadataPanel";
import { CompletenessIndicator } from "@/components/metadata/CompletenessIndicator";
import { useState } from "react";

export function NodeDetail() {
  const [, params] = useRoute("/node/:id");
  const nodeId = params?.id;
  const { data: node, isLoading } = useNode(nodeId);
  const { data: children } = useNodeChildren(nodeId);
  const deleteNode = useDeleteNode();
  const updateNode = useUpdateNode();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const { toast } = useToast();

  const [editTitle, setEditTitle] = useState("");
  const [editTemplateType, setEditTemplateType] = useState<
    NonNullable<UpdateNodeInput["templateType"]>
  >("core_process_overview");

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
  const structuredFields: Record<string, unknown> = {};
  const metadata: Record<string, unknown> = {};

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
            <Badge
              variant="outline"
              className={STATUS_COLORS[node.status] || ""}
            >
              {STATUS_LABELS[node.status] || node.status}
            </Badge>
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
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            <Pencil className="mr-1 h-4 w-4" />
            Bearbeiten
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
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Seitendetails</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                    <span>System-ID</span>
                  </div>
                  <p className="font-mono text-xs">{node.immutableId}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                    <span>Display-Code</span>
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

          <PageLayout
            templateType={node.templateType}
            structuredFields={structuredFields}
          />
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
            onChange={() => {}}
            readOnly
          />
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
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_COLORS[child.status] || ""}`}
                      >
                        {STATUS_LABELS[child.status] || child.status}
                      </Badge>
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
