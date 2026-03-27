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
  getRecommendedChildTypes,
  getVariantsByCategory,
  PAGE_TYPE_CATEGORIES,
  VARIANT_CATEGORY_LABELS,
  buildInitialEditorContent,
  type TemplateType,
  type VariantCategory,
} from "@/lib/types";
import type { CreateNodeInput } from "@workspace/api-client-react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Star,
  Zap,
  Settings2,
  ClipboardCheck,
  Image,
  FolderOpen,
} from "lucide-react";

const VARIANT_CATEGORY_ICONS: Record<VariantCategory, React.ReactNode> = {
  schlank: <Zap className="h-4 w-4" />,
  standard: <Settings2 className="h-4 w-4" />,
  qm_detail: <ClipboardCheck className="h-4 w-4" />,
  grafisch: <Image className="h-4 w-4" />,
  container: <FolderOpen className="h-4 w-4" />,
};

interface CreateNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentNodeId: string | null;
  parentTemplateType?: string;
  presetType?: string;
}

export function CreateNodeDialog({
  open,
  onOpenChange,
  parentNodeId,
  parentTemplateType,
  presetType,
}: CreateNodeDialogProps) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [templateType, setTemplateType] = useState<
    CreateNodeInput["templateType"]
  >("core_process_overview");
  const [selectedVariant, setSelectedVariant] = useState<string>("blank");
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

  const recommendedTypes = useMemo(() => {
    if (parentTemplateType) {
      return getRecommendedChildTypes(parentTemplateType);
    }
    return [];
  }, [parentTemplateType]);

  useEffect(() => {
    if (presetType && allowedTypes.includes(presetType as TemplateType)) {
      setTemplateType(presetType as CreateNodeInput["templateType"]);
      setStep(1);
    } else if (allowedTypes.length > 0) {
      const firstRecommended = recommendedTypes.length > 0 ? recommendedTypes[0] : allowedTypes[0];
      setTemplateType(firstRecommended as CreateNodeInput["templateType"]);
    }
  }, [allowedTypes, presetType, recommendedTypes]);

  useEffect(() => {
    const def = PAGE_TYPE_REGISTRY[templateType as TemplateType];
    if (def?.variants?.length) {
      const standardVariant = def.variants.find((v) => v.variantCategory === "standard");
      const hasBlank = def.variants.some((v) => v.key === "blank");
      setSelectedVariant(
        standardVariant?.key ?? (hasBlank ? "blank" : def.variants[0].key)
      );
    }
  }, [templateType]);

  const groupedTypes = useMemo(() => {
    const recommended = new Set(recommendedTypes);
    const groups: Record<string, { types: TemplateType[]; isRecommended: boolean }> = {};

    if (recommended.size > 0) {
      const recTypes = allowedTypes.filter((t) => recommended.has(t));
      if (recTypes.length > 0) {
        groups["__recommended__"] = { types: recTypes, isRecommended: true };
      }
    }

    for (const t of allowedTypes) {
      if (recommended.has(t)) continue;
      const def = PAGE_TYPE_REGISTRY[t];
      if (def) {
        const cat = def.category;
        if (!groups[cat]) groups[cat] = { types: [], isRecommended: false };
        groups[cat].types.push(t);
      }
    }
    return groups;
  }, [allowedTypes, recommendedTypes]);

  const selectedDef = PAGE_TYPE_REGISTRY[templateType as TemplateType];

  const variantsByCat = useMemo(() => {
    if (!selectedDef) return [];
    const grouped = getVariantsByCategory(templateType as string);
    const order: VariantCategory[] = ["schlank", "standard", "qm_detail", "grafisch", "container"];
    return order
      .filter((c) => grouped[c].length > 0)
      .map((c) => ({ category: c, variants: grouped[c] }));
  }, [selectedDef, templateType]);

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
      metadata.templateVariant = selectedVariant;

      const variantDef = selectedDef?.variants.find(
        (v) => v.key === selectedVariant,
      );
      const structuredInit: Record<string, unknown> = {};
      if (variantDef?.prefilledSections) {
        for (const sKey of variantDef.prefilledSections) {
          structuredInit[sKey] = "";
        }
      }

      if (variantDef?.initialBlocks && variantDef.initialBlocks.length > 0) {
        structuredInit._editorContent = buildInitialEditorContent(variantDef.initialBlocks);
      }

      await createRevision.mutateAsync({
        nodeId: node.id,
        data: {
          title: title.trim(),
          content: metadata,
          structuredFields: structuredInit,
          changeType: "editorial",
          changeSummary: `Erstellt (Vorlage: ${variantDef?.label ?? selectedVariant})`,
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
    setSelectedVariant("blank");
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
            {[0, 1, 2, 3].map((s) => (
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
            {Object.entries(groupedTypes).map(([category, { types, isRecommended }]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  {isRecommended ? (
                    <>
                      <Star className="h-3 w-3 text-amber-500" />
                      <span className="text-amber-700 dark:text-amber-400">Empfohlen</span>
                    </>
                  ) : (
                    PAGE_TYPE_CATEGORIES[
                      category as keyof typeof PAGE_TYPE_CATEGORIES
                    ]?.labelDe ?? category
                  )}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {types.map((t) => {
                    const def = PAGE_TYPE_REGISTRY[t];
                    if (!def) return null;
                    const isSelected = templateType === t;
                    const isRec = recommendedTypes.includes(t);
                    return (
                      <Card
                        key={t}
                        className={`cursor-pointer transition-all hover:shadow-sm ${
                          isSelected
                            ? "ring-2 ring-primary border-primary"
                            : "hover:border-primary/40"
                        } ${isRec && !isRecommended ? "border-amber-200 dark:border-amber-800" : ""}`}
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
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              {def.labelDe}
                              {isRec && !isRecommended && (
                                <Star className="h-3 w-3 text-amber-500 shrink-0" />
                              )}
                            </p>
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

        {step === 1 && selectedDef && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Wählen Sie eine Vorlage für <strong>{selectedDef.labelDe}</strong>.
            </p>
            <div className="space-y-4">
              {variantsByCat.map(({ category, variants }) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-muted-foreground">
                      {VARIANT_CATEGORY_ICONS[category]}
                    </span>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {VARIANT_CATEGORY_LABELS[category].label}
                    </h4>
                    <span className="text-[10px] text-muted-foreground">
                      — {VARIANT_CATEGORY_LABELS[category].description}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {variants.map((variant) => {
                      const isActive = selectedVariant === variant.key;
                      return (
                        <Card
                          key={variant.key}
                          className={`cursor-pointer transition-all ${
                            isActive
                              ? "border-primary ring-1 ring-primary"
                              : "hover:border-muted-foreground/30"
                          }`}
                          onClick={() => setSelectedVariant(variant.key)}
                        >
                          <CardContent className="flex items-center gap-3 p-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm">{variant.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {variant.description}
                              </p>
                              {variant.prefilledSections &&
                                variant.prefilledSections.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {variant.prefilledSections.map((sKey) => {
                                      const sec = selectedDef.sections.find(
                                        (s) => s.key === sKey,
                                      );
                                      return (
                                        <Badge
                                          key={sKey}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {sec?.label ?? sKey}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                )}
                              {variant.initialBlocks && variant.initialBlocks.length > 0 && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                                  ✓ Vorstrukturierte Blöcke werden angelegt
                                </p>
                              )}
                            </div>
                            {isActive && (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {selectedDef.helpText && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                <p className="font-medium mb-1">Hinweis zur Erstellung</p>
                <p className="text-xs">{selectedDef.helpText}</p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
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
                  if (e.key === "Enter" && title.trim()) setStep(3);
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

        {step === 3 && (
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
                <div>
                  <span className="text-muted-foreground">Vorlage</span>
                  <p className="mt-0.5 font-medium">
                    {selectedDef?.variants.find(
                      (v) => v.key === selectedVariant,
                    )?.label ?? selectedVariant}
                  </p>
                </div>
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

              {(() => {
                const variantDef = selectedDef?.variants.find((v) => v.key === selectedVariant);
                if (variantDef?.initialBlocks && variantDef.initialBlocks.length > 0) {
                  return (
                    <>
                      <Separator />
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                        <p className="font-medium mb-1">Vorstrukturierter Inhalt</p>
                        <p className="text-xs">
                          Die Seite wird mit {variantDef.initialBlocks.length} vorbereiteten
                          Inhaltsbausteinen angelegt (Überschriften, Listen, Tabellen).
                          Sie können sofort mit dem Ausfüllen beginnen.
                        </p>
                      </div>
                    </>
                  );
                }
                return null;
              })()}
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
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && !title.trim()}
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
