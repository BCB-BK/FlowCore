import { useState, useMemo, useEffect } from "react";
import {
  useCreateNode,
  useCreateRevision,
  useRootNodes,
} from "@/hooks/use-nodes";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { PeoplePicker } from "@/components/PeoplePicker";
import {
  PAGE_TYPE_REGISTRY,
  getAllowedChildTypes,
  PAGE_TYPE_CATEGORIES,
  type TemplateType,
} from "@/lib/types";
import type { CreateNodeInput } from "@workspace/api-client-react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

interface CreateNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentNodeId: string | null;
  parentTemplateType?: string;
}

export function CreateNodeDialog({
  open,
  onOpenChange,
  parentNodeId,
  parentTemplateType,
}: CreateNodeDialogProps) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [templateType, setTemplateType] = useState<
    CreateNodeInput["templateType"]
  >("core_process_overview");
  const [ownerId, setOwnerId] = useState<string | undefined>();
  const [ownerName, setOwnerName] = useState<string | undefined>();
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const createNode = useCreateNode();
  const createRevision = useCreateRevision();
  const { data: rootNodes } = useRootNodes();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const allowedTypes = useMemo(() => {
    if (parentTemplateType) {
      return getAllowedChildTypes(parentTemplateType);
    }
    return Object.keys(PAGE_TYPE_REGISTRY) as TemplateType[];
  }, [parentTemplateType]);

  useEffect(() => {
    if (allowedTypes.length > 0) {
      setTemplateType(allowedTypes[0] as CreateNodeInput["templateType"]);
    }
  }, [allowedTypes]);

  const groupedTypes = useMemo(() => {
    const groups: Record<string, TemplateType[]> = {};
    for (const t of allowedTypes) {
      const def = PAGE_TYPE_REGISTRY[t];
      if (def) {
        const cat = def.category;
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(t);
      }
    }
    return groups;
  }, [allowedTypes]);

  const selectedDef = PAGE_TYPE_REGISTRY[templateType as TemplateType];

  const handleCreate = async () => {
    if (!title.trim()) return;

    try {
      const node = await createNode.mutateAsync({
        data: {
          title: title.trim(),
          templateType,
          parentNodeId: effectiveParentId || undefined,
          ownerId: ownerId || undefined,
        },
      });

      const metadata: Record<string, unknown> = {};
      if (ownerId) {
        metadata.owner = ownerId;
        metadata.owner_display = ownerName;
      }

      await createRevision.mutateAsync({
        nodeId: node.id,
        data: {
          title: title.trim(),
          content: metadata,
          structuredFields: {},
          changeType: "editorial",
          changeSummary: "Erstellt",
        },
      });

      resetAndClose();
      navigate(`/node/${node.id}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Fehler beim Erstellen",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    }
  };

  const effectiveParentId = parentNodeId ?? selectedParentId;

  const resetAndClose = () => {
    setStep(0);
    setTitle("");
    setOwnerId(undefined);
    setOwnerName(undefined);
    setSelectedParentId(null);
    onOpenChange(false);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      resetAndClose();
    } else {
      onOpenChange(true);
    }
  };

  if (allowedTypes.length === 0 && parentTemplateType) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keine Unterseiten erlaubt</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Dieser Seitentyp erlaubt keine Unterseiten.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {parentNodeId ? "Unterseite anlegen" : "Neue Seite anlegen"}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            {[0, 1, 2].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Wählen Sie den Seitentyp für die neue Seite.
            </p>
            {Object.entries(groupedTypes).map(([category, types]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {PAGE_TYPE_CATEGORIES[
                    category as keyof typeof PAGE_TYPE_CATEGORIES
                  ]?.labelDe ?? category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {types.map((t) => {
                    const def = PAGE_TYPE_REGISTRY[t];
                    if (!def) return null;
                    const isSelected = templateType === t;
                    return (
                      <Card
                        key={t}
                        className={`cursor-pointer transition-all hover:shadow-sm ${
                          isSelected
                            ? "ring-2 ring-primary border-primary"
                            : "hover:border-primary/40"
                        }`}
                        onClick={() =>
                          setTemplateType(t as CreateNodeInput["templateType"])
                        }
                      >
                        <CardContent className="flex items-start gap-3 p-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                            style={{ backgroundColor: def.color }}
                          >
                            <PageTypeIcon
                              iconName={def.icon}
                              className="h-4 w-4"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{def.labelDe}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {def.descriptionDe}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 py-2">
            {selectedDef && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: selectedDef.color }}
                >
                  <PageTypeIcon
                    iconName={selectedDef.icon}
                    className="h-4 w-4"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">{selectedDef.labelDe}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedDef.descriptionDe}
                  </p>
                </div>
              </div>
            )}

            {selectedDef?.helpText && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                <p className="font-medium mb-1">Hinweis zur Erstellung</p>
                <p className="text-xs">{selectedDef.helpText}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                placeholder={
                  templateType === "core_process_overview"
                    ? "z.B. Kernprozess Personal"
                    : templateType === "policy"
                      ? "z.B. Datenschutzrichtlinie"
                      : "Titel eingeben..."
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && title.trim()) setStep(2);
                }}
                autoFocus
              />
            </div>

            <Separator />

            <PeoplePicker
              label="Prozesseigner / Verantwortlicher"
              description="Verantwortliche Person für diesen Inhalt"
              value={ownerId}
              displayValue={ownerName}
              onChange={(id, name) => {
                setOwnerId(id);
                setOwnerName(name);
              }}
              required={
                selectedDef?.metadataFields.some(
                  (f) => f.key === "owner" && f.required,
                ) ?? false
              }
              includeGroups
            />

            {!parentNodeId && rootNodes && rootNodes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Übergeordnete Seite (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Wählen Sie eine übergeordnete Seite oder lassen Sie das Feld
                    leer für eine Stammseite.
                  </p>
                  <Select
                    value={selectedParentId ?? "__none__"}
                    onValueChange={(v) =>
                      setSelectedParentId(v === "__none__" ? null : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Stammebene (keine Elternseite)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        Stammebene (keine Elternseite)
                      </SelectItem>
                      {rootNodes.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Überprüfen Sie die Angaben und erstellen Sie die Seite.
            </p>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-3">
                {selectedDef && (
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: selectedDef.color }}
                  >
                    <PageTypeIcon
                      iconName={selectedDef.icon}
                      className="h-5 w-5"
                    />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDef?.labelDe}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="mt-0.5">
                    <Badge
                      variant="outline"
                      className="bg-yellow-100 text-yellow-800"
                    >
                      Entwurf
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Elternseite</span>
                  <p className="mt-0.5 font-medium">
                    {effectiveParentId
                      ? (rootNodes?.find((n) => n.id === effectiveParentId)
                          ?.title ?? "Wird zugeordnet")
                      : "Stammebene"}
                  </p>
                </div>
                {ownerName && (
                  <div>
                    <span className="text-muted-foreground">
                      Verantwortlicher
                    </span>
                    <p className="mt-0.5 font-medium">{ownerName}</p>
                  </div>
                )}
              </div>

              {selectedDef && selectedDef.sections.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Vordefinierte Abschnitte
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {selectedDef.sections.map((s) => (
                        <Badge
                          key={s.key}
                          variant={s.required ? "default" : "outline"}
                          className="text-xs"
                        >
                          {s.label}
                          {s.required && " *"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="mr-auto"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Zurück
            </Button>
          )}
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Abbrechen
          </Button>
          {step < 2 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !title.trim()}
            >
              Weiter
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || createNode.isPending}
            >
              {createNode.isPending ? "Wird erstellt..." : "Anlegen"}
              {!createNode.isPending && <Check className="ml-1 h-4 w-4" />}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
