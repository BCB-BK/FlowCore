import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/card";
import { Button } from "@workspace/ui/button";
import { Badge } from "@workspace/ui/badge";
import { Input } from "@workspace/ui/input";
import { Label } from "@workspace/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/select";
import { Switch } from "@workspace/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/tooltip";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Star,
  CheckCircle,
  Bell,
  Copy,
  AlertCircle,
  ChevronRight,
  X,
  Clock,
  GitBranch,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { PAGE_TYPE_LABELS, PAGE_TYPE_REGISTRY } from "@/lib/types";

interface WorkflowStep {
  id?: string;
  stepNumber: number;
  name: string;
  roles: string[];
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  enforceSoD: boolean;
  steps: WorkflowStep[];
}

interface PageTypeAssignment {
  id: string;
  pageType: string;
  workflowId: string;
}

interface NotificationRule {
  id: string;
  eventType: string;
  recipientTypes: string[];
  channels: string[];
  reminderAfterDays: number | null;
  escalationAfterDays: number | null;
  isEnabled: boolean;
}

const AVAILABLE_ROLES = [
  { value: "editor", label: "Editor" },
  { value: "reviewer", label: "Reviewer" },
  { value: "approver", label: "Approver" },
  { value: "process_manager", label: "Process Manager" },
  { value: "compliance_manager", label: "Compliance Manager" },
  { value: "system_admin", label: "System Admin" },
];

const RECIPIENT_TYPE_LABELS: Record<string, string> = {
  owner: "Verantwortlicher",
  deputy: "Stellvertreter",
  reviewer: "Reviewer",
  approver: "Freigeber",
  process_manager: "Process Manager",
};

const CHANNEL_LABELS: Record<string, string> = {
  in_app: "In-App",
  teams: "MS Teams",
};

interface EventTypeConfig {
  eventType: string;
  label: string;
  category: "workflow" | "schedule";
  trigger: string;
  messageTemplate: { title: string; body: string };
  supportsReminder: boolean;
}

const NOTIFICATION_EVENT_CONFIG: EventTypeConfig[] = [
  {
    eventType: "working_copy_submitted",
    label: "Arbeitskopie eingereicht",
    category: "workflow",
    trigger: "Wird ausgelöst, wenn ein Editor eine Arbeitskopie zur Überprüfung einreicht.",
    messageTemplate: {
      title: "Review angefordert",
      body: `{actor} hat eine Arbeitskopie von \u201E{page}\u201C zur \u00DCberpr\u00FCfung eingereicht.`,
    },
    supportsReminder: false,
  },
  {
    eventType: "working_copy_approved",
    label: "Arbeitskopie freigegeben",
    category: "workflow",
    trigger: "Wird ausgelöst, wenn ein Reviewer oder Approver die Arbeitskopie freigibt.",
    messageTemplate: {
      title: "Arbeitskopie freigegeben",
      body: `{actor} hat die Arbeitskopie von \u201E{page}\u201C freigegeben.`,
    },
    supportsReminder: false,
  },
  {
    eventType: "working_copy_returned",
    label: "Arbeitskopie zurückgegeben",
    category: "workflow",
    trigger: "Wird ausgelöst, wenn ein Reviewer die Arbeitskopie zur Überarbeitung an den Autor zurückgibt.",
    messageTemplate: {
      title: "Überarbeitung erforderlich",
      body: `{actor} hat die Arbeitskopie von \u201E{page}\u201C zur \u00DCberarbeitung zur\u00FCckgegeben.`,
    },
    supportsReminder: false,
  },
  {
    eventType: "working_copy_published",
    label: "Neue Version veröffentlicht",
    category: "workflow",
    trigger: "Wird ausgelöst, wenn eine freigegebene Arbeitskopie als neue Version veröffentlicht wird.",
    messageTemplate: {
      title: "Neue Version veröffentlicht",
      body: `{actor} hat \u201E{page}\u201C als neue Version ver\u00F6ffentlicht.`,
    },
    supportsReminder: false,
  },
  {
    eventType: "review_overdue",
    label: "Review überfällig",
    category: "schedule",
    trigger: "Wird automatisch geprüft, wenn das nächste Review-Datum einer Seite überschritten ist.",
    messageTemplate: {
      title: "Review überfällig",
      body: `Die Seite \u201E{page}\u201C ist seit {days} Tagen \u00FCberf\u00E4llig f\u00FCr ein Review.`,
    },
    supportsReminder: true,
  },
  {
    eventType: "review_overdue_escalation",
    label: "Review überfällig \u2014 Eskalation",
    category: "schedule",
    trigger: "Wird ausgelöst, wenn ein überfälliges Review nach der konfigurierten Eskalationsfrist weiterhin offen ist.",
    messageTemplate: {
      title: "Überfälliges Review \u2014 Eskalation",
      body: `Die Seite \u201E{page}\u201C ist seit {days} Tagen \u00FCberf\u00E4llig. Eskalation an Process Manager.`,
    },
    supportsReminder: false,
  },
  {
    eventType: "task_overdue",
    label: "Offene Aufgabe überfällig",
    category: "schedule",
    trigger: "Wird ausgelöst, wenn eine zugewiesene Aufgabe (z.\u00A0B. Review, Freigabe) die Frist überschreitet.",
    messageTemplate: {
      title: "Aufgabe überfällig",
      body: `Ihre Aufgabe zu \u201E{page}\u201C ist seit {days} Tagen \u00FCberf\u00E4llig.`,
    },
    supportsReminder: true,
  },
  {
    eventType: "open_review_overdue",
    label: "Offener Review-Workflow überfällig",
    category: "schedule",
    trigger: "Wird ausgelöst, wenn ein aktiver Review-Workflow (eingereichte Arbeitskopie) zu lange auf Bearbeitung wartet.",
    messageTemplate: {
      title: "Offener Review überfällig",
      body: `Der Review-Workflow f\u00FCr \u201E{page}\u201C wartet seit {days} Tagen auf Bearbeitung.`,
    },
    supportsReminder: true,
  },
];

const RECIPIENT_TYPES = [
  "owner",
  "deputy",
  "reviewer",
  "approver",
  "process_manager",
];

const CHANNELS = ["in_app", "teams"];

const NOT_ASSIGNED_SENTINEL = "__none__";

function DraggableStep({
  step,
  idx,
  totalSteps,
  onUpdate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}: {
  step: WorkflowStep;
  idx: number;
  totalSteps: number;
  onUpdate: (field: keyof WorkflowStep, value: unknown) => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
}) {
  const toggleRole = (role: string) => {
    const newRoles = step.roles.includes(role)
      ? step.roles.filter((r) => r !== role)
      : [...step.roles, role];
    onUpdate("roles", newRoles);
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`border rounded-lg p-3 space-y-3 transition-all cursor-grab active:cursor-grabbing ${
        isDragOver
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-muted-foreground/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
        <Badge variant="secondary" className="shrink-0 text-xs font-mono">
          {idx + 1}
        </Badge>
        <Input
          value={step.name}
          onChange={(e) => onUpdate("name", e.target.value)}
          className="h-7 text-sm flex-1"
          placeholder="Schrittname"
          onClick={(e) => e.stopPropagation()}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onRemove}
          disabled={totalSteps <= 1}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1.5">
          Zuständige Rollen:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_ROLES.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => toggleRole(role.value)}
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs border transition-colors ${
                step.roles.includes(role.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:border-primary/50"
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkflowEditor({
  template,
  onSave,
  onClose,
}: {
  template?: WorkflowTemplate;
  onSave: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);
  const [enforceSoD, setEnforceSoD] = useState(template?.enforceSoD ?? false);
  const [steps, setSteps] = useState<WorkflowStep[]>(
    template?.steps?.length
      ? template.steps.map((s) => ({ ...s }))
      : [{ stepNumber: 1, name: "Review", roles: ["reviewer"] }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        stepNumber: prev.length + 1,
        name: `Schritt ${prev.length + 1}`,
        roles: [],
      },
    ]);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 })),
    );
  };

  const updateStep = (idx: number, field: keyof WorkflowStep, value: unknown) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  };

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIdx.current !== null && dragIdx.current !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (targetIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const sourceIdx = dragIdx.current;
    if (sourceIdx === null || sourceIdx === targetIdx) return;

    setSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(sourceIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    });

    dragIdx.current = null;
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name ist ein Pflichtfeld");
      return;
    }
    if (steps.some((s) => s.roles.length === 0)) {
      setError("Jeder Schritt muss mindestens eine Rolle haben");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (template?.id) {
        await customFetch(`/api/admin/workflows/${template.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, isDefault, enforceSoD, steps }),
        });
      } else {
        await customFetch("/api/admin/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, isDefault, enforceSoD, steps }),
        });
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {template ? "Workflow bearbeiten" : "Neuer Workflow"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="wf-name">Name *</Label>
            <Input
              id="wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Standard-Freigabe"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wf-desc">Beschreibung</Label>
            <Input
              id="wf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung"
            />
          </div>
        </div>

        <div className="flex items-center gap-6 py-1">
          <div className="flex items-center gap-2">
            <Switch
              id="wf-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
            <Label htmlFor="wf-default" className="text-sm cursor-pointer">
              Standard-Workflow
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="wf-sod"
              checked={enforceSoD}
              onCheckedChange={setEnforceSoD}
            />
            <Label htmlFor="wf-sod" className="text-sm cursor-pointer">
              Vier-Augen-Prinzip (SoD)
            </Label>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Freigabeschritte</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Per Drag & Drop die Reihenfolge ändern
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addStep}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Schritt
            </Button>
          </div>

          <div className="space-y-2">
            {steps.map((step, idx) => (
              <DraggableStep
                key={`${step.id ?? "new"}-${idx}`}
                step={step}
                idx={idx}
                totalSteps={steps.length}
                onUpdate={(field, value) => updateStep(idx, field, value)}
                onRemove={() => removeStep(idx)}
                onDragStart={handleDragStart(idx)}
                onDragOver={handleDragOver(idx)}
                onDrop={handleDrop(idx)}
                onDragEnd={handleDragEnd}
                isDragOver={dragOverIdx === idx}
              />
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
            <span>Vorschau:</span>
            {steps.map((s, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <span className="font-medium">{s.name || "..."}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Abbrechen
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Speichern..." : "Speichern"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function WorkflowCard({
  template,
  assignedPageTypes,
  onEdit,
  onDuplicate,
  onDelete,
  isDeleting,
}: {
  template: WorkflowTemplate;
  assignedPageTypes: string[];
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="border rounded-lg overflow-hidden hover:border-muted-foreground/30 transition-colors">
      <div
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onEdit}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {template.isDefault && (
                <Star className="h-4 w-4 text-amber-500 shrink-0 fill-amber-500" />
              )}
              <h3 className="font-medium text-sm">{template.name}</h3>
              {template.isDefault && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Standard</Badge>
              )}
              {template.enforceSoD && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">4-Augen</Badge>
              )}
            </div>
            {template.description && (
              <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-1">
              {template.steps.map((s, i) => (
                <span key={s.id ?? i} className="flex items-center gap-0.5">
                  {i > 0 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                  <span className="inline-flex items-center gap-1 text-xs bg-muted rounded px-1.5 py-0.5">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground">
                      ({s.roles.map((r) => AVAILABLE_ROLES.find((x) => x.value === r)?.label ?? r).join(", ")})
                    </span>
                  </span>
                </span>
              ))}
              {template.steps.length === 0 && (
                <span className="text-xs text-muted-foreground italic">Keine Schritte definiert</span>
              )}
            </div>

            {assignedPageTypes.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[10px] text-muted-foreground">Zugewiesen an:</span>
                <div className="flex flex-wrap gap-1">
                  {assignedPageTypes.slice(0, 4).map((pt) => (
                    <Badge key={pt} variant="outline" className="text-[10px] px-1 py-0 font-normal">
                      {PAGE_TYPE_LABELS[pt as keyof typeof PAGE_TYPE_LABELS] ?? pt}
                    </Badge>
                  ))}
                  {assignedPageTypes.length > 4 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">
                      +{assignedPageTypes.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bearbeiten</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplizieren</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={onDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Löschen</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowsSection() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [assignments, setAssignments] = useState<PageTypeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] = useState<WorkflowTemplate | undefined>();
  const [showEditor, setShowEditor] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [{ templates: t }, { assignments: a }] = await Promise.all([
        customFetch<{ templates: WorkflowTemplate[] }>("/api/admin/workflows"),
        customFetch<{ assignments: PageTypeAssignment[] }>("/api/admin/workflow-assignments"),
      ]);
      setTemplates(t);
      setAssignments(a);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    const assignedCount = assignments.filter((a) => a.workflowId === id).length;
    const msg = assignedCount > 0
      ? `Dieser Workflow ist ${assignedCount} Seitentyp(en) zugewiesen. Wirklich löschen?`
      : "Workflow wirklich löschen?";
    if (!confirm(msg)) return;
    setDeletingId(id);
    try {
      await customFetch(`/api/admin/workflows/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler beim Löschen");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = (t: WorkflowTemplate) => {
    setEditTemplate({
      ...t,
      id: "",
      name: `${t.name} (Kopie)`,
      isDefault: false,
    } as unknown as WorkflowTemplate);
    setShowEditor(true);
  };

  const handleAssignment = async (pageType: string, workflowId: string) => {
    setAssignmentLoading(pageType);
    try {
      if (workflowId === NOT_ASSIGNED_SENTINEL || !workflowId) {
        await customFetch(`/api/admin/workflow-assignments/${pageType}`, { method: "DELETE" });
      } else {
        await customFetch(`/api/admin/workflow-assignments/${pageType}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflowId }),
        });
      }
      await load();
    } finally {
      setAssignmentLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const pageTypes = Object.keys(PAGE_TYPE_REGISTRY);
  const getAssignedPageTypes = (workflowId: string) =>
    assignments.filter((a) => a.workflowId === workflowId).map((a) => a.pageType);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Freigabeketten</CardTitle>
              <CardDescription>
                Mehrstufige Approval-Workflows anlegen und konfigurieren
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditTemplate(undefined);
                setShowEditor(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Neuer Workflow
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Noch keine Workflows</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Erstelle deinen ersten Freigabe-Workflow, um Inhalte mehrstufig prüfen zu lassen.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditTemplate(undefined);
                  setShowEditor(true);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Ersten Workflow anlegen
              </Button>
            </div>
          )}
          {templates.map((t) => (
            <WorkflowCard
              key={t.id}
              template={t}
              assignedPageTypes={getAssignedPageTypes(t.id)}
              onEdit={() => {
                setEditTemplate(t);
                setShowEditor(true);
              }}
              onDuplicate={() => handleDuplicate(t)}
              onDelete={() => handleDelete(t.id)}
              isDeleting={deletingId === t.id}
            />
          ))}
        </CardContent>
      </Card>

      {templates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Workflow je Seitentyp</CardTitle>
            <CardDescription>
              Welcher Workflow gilt für welchen Seitentyp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {pageTypes.map((pageType) => {
                const label = PAGE_TYPE_LABELS[pageType as keyof typeof PAGE_TYPE_LABELS] ?? pageType;
                const assignment = assignments.find((a) => a.pageType === pageType);
                const currentWorkflowId = assignment?.workflowId ?? "";
                const defaultWf = templates.find((t) => t.isDefault);
                return (
                  <div key={pageType} className="flex items-center justify-between gap-4 py-1.5 hover:bg-muted/30 rounded px-2 -mx-2">
                    <span className="text-sm min-w-0 truncate">{label}</span>
                    <Select
                      value={currentWorkflowId || NOT_ASSIGNED_SENTINEL}
                      onValueChange={(val) => handleAssignment(pageType, val)}
                      disabled={assignmentLoading === pageType}
                    >
                      <SelectTrigger className="w-52 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NOT_ASSIGNED_SENTINEL}>
                          {defaultWf ? `Standard (${defaultWf.name})` : "Nicht zugewiesen"}
                        </SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                            {t.isDefault ? " ★" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        {showEditor && (
          <WorkflowEditor
            template={editTemplate?.id ? editTemplate : undefined}
            onSave={load}
            onClose={() => setShowEditor(false)}
          />
        )}
      </Dialog>
    </div>
  );
}

function NotificationRuleCard({
  config,
  rule,
  saving,
  onUpdate,
}: {
  config: EventTypeConfig;
  rule: NotificationRule | null;
  saving: string | null;
  onUpdate: (rule: NotificationRule) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isSaving = saving === rule?.id;
  const isEnabled = rule?.isEnabled ?? false;

  const handleToggleEnabled = () => {
    if (!rule) return;
    onUpdate({ ...rule, isEnabled: !rule.isEnabled });
  };

  const toggleRecipient = (type: string) => {
    if (!rule) return;
    const updated = rule.recipientTypes.includes(type)
      ? rule.recipientTypes.filter((r) => r !== type)
      : [...rule.recipientTypes, type];
    onUpdate({ ...rule, recipientTypes: updated });
  };

  const toggleChannel = (channel: string) => {
    if (!rule) return;
    const updated = rule.channels.includes(channel)
      ? rule.channels.filter((c) => c !== channel)
      : [...rule.channels, channel];
    onUpdate({ ...rule, channels: updated });
  };

  const updateDays = (field: "reminderAfterDays" | "escalationAfterDays", val: string) => {
    if (!rule) return;
    const num = val === "" ? null : parseInt(val, 10);
    onUpdate({ ...rule, [field]: isNaN(num as number) ? null : num });
  };

  return (
    <div
      className={`border rounded-lg transition-all ${
        !isEnabled ? "opacity-50 bg-muted/30" : "bg-card"
      }`}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{config.label}</p>
          <p className="text-xs text-muted-foreground truncate">{config.trigger}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rule && (
            <div className="flex gap-1">
              {rule.channels.map((ch) => (
                <Badge key={ch} variant="outline" className="text-[10px] px-1.5 py-0">
                  {CHANNEL_LABELS[ch] ?? ch}
                </Badge>
              ))}
            </div>
          )}
          {isSaving && (
            <div className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full" />
          )}
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggleEnabled}
            disabled={isSaving || !rule}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          <div className="rounded-md bg-muted/50 p-2.5 space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Bell className="h-3 w-3" />
              Nachrichten-Vorlage
            </p>
            <p className="text-sm font-medium">{config.messageTemplate.title}</p>
            <p className="text-xs text-muted-foreground italic">
              {config.messageTemplate.body}
            </p>
          </div>

          {rule && (
            <>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Empfänger
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {RECIPIENT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleRecipient(type)}
                      disabled={isSaving}
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs border transition-colors disabled:opacity-50 ${
                        rule.recipientTypes.includes(type)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary"
                      }`}
                    >
                      {RECIPIENT_TYPE_LABELS[type] ?? type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Zustellkanäle
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CHANNELS.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      disabled={isSaving}
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs border transition-colors disabled:opacity-50 ${
                        rule.channels.includes(ch)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary"
                      }`}
                    >
                      {CHANNEL_LABELS[ch] ?? ch}
                    </button>
                  ))}
                </div>
              </div>

              {config.supportsReminder && (
                <div className="flex gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                      Erinnerung nach:
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        className="h-7 w-16 text-xs"
                        value={rule.reminderAfterDays ?? ""}
                        onChange={(e) => updateDays("reminderAfterDays", e.target.value)}
                        disabled={isSaving}
                      />
                      <span className="text-xs text-muted-foreground">Tagen</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                      Eskalation nach:
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        className="h-7 w-16 text-xs"
                        value={rule.escalationAfterDays ?? ""}
                        onChange={(e) => updateDays("escalationAfterDays", e.target.value)}
                        disabled={isSaving}
                      />
                      <span className="text-xs text-muted-foreground">Tagen</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRulesSection() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { rules: r } = await customFetch<{ rules: NotificationRule[] }>(
        "/api/admin/notification-rules",
      );
      setRules(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!seeded) {
        setSeeded(true);
        await customFetch("/api/admin/notification-rules/seed", { method: "POST" });
      }
      await load();
    })();
  }, [load, seeded]);

  const updateRule = async (rule: NotificationRule) => {
    setSaving(rule.id);
    try {
      await customFetch(`/api/admin/notification-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientTypes: rule.recipientTypes,
          channels: rule.channels,
          reminderAfterDays: rule.reminderAfterDays,
          escalationAfterDays: rule.escalationAfterDays,
          isEnabled: rule.isEnabled,
        }),
      });
      await load();
    } finally {
      setSaving(null);
    }
  };

  const ruleByEvent = (eventType: string) =>
    rules.find((r) => r.eventType === eventType) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const workflowEvents = NOTIFICATION_EVENT_CONFIG.filter((c) => c.category === "workflow");
  const scheduleEvents = NOTIFICATION_EVENT_CONFIG.filter((c) => c.category === "schedule");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Workflow-Ereignisse
          </CardTitle>
          <CardDescription>
            Benachrichtigungen bei Statusänderungen im Freigabe-Workflow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {workflowEvents.map((config) => (
            <NotificationRuleCard
              key={config.eventType}
              config={config}
              rule={ruleByEvent(config.eventType)}
              saving={saving}
              onUpdate={updateRule}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Zeitgesteuerte Ereignisse
          </CardTitle>
          <CardDescription>
            Automatische Erinnerungen und Eskalationen bei Fristüberschreitungen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {scheduleEvents.map((config) => (
            <NotificationRuleCard
              key={config.eventType}
              config={config}
              rule={ruleByEvent(config.eventType)}
              saving={saving}
              onUpdate={updateRule}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function WorkflowsTab() {
  const [subTab, setSubTab] = useState<"workflows" | "notifications">("workflows");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b pb-2">
        <button
          type="button"
          onClick={() => setSubTab("workflows")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            subTab === "workflows"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          Freigabeketten
        </button>
        <button
          type="button"
          onClick={() => setSubTab("notifications")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            subTab === "notifications"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          Benachrichtigungsregeln
        </button>
      </div>

      {subTab === "workflows" ? <WorkflowsSection /> : <NotificationRulesSection />}
    </div>
  );
}
