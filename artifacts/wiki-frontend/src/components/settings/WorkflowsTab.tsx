import { useState, useEffect, useCallback } from "react";
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
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Star,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Bell,
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
  owner: "Verantwortlicher (Owner)",
  deputy: "Stellvertreter",
  reviewer: "Reviewer",
  approver: "Freigeber",
  process_manager: "Process Manager",
  role_based: "Rollenbasiert",
  explicit: "Explizite Personen",
};

const CHANNEL_LABELS: Record<string, string> = {
  in_app: "In-App",
  teams: "Teams-Chat",
  email: "E-Mail",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  working_copy_submitted: "Arbeitskopie eingereicht",
  working_copy_approved: "Arbeitskopie freigegeben",
  working_copy_returned: "Arbeitskopie zurückgegeben",
  working_copy_published: "Neue Version veröffentlicht",
  review_overdue: "Review überfällig",
  review_overdue_escalation: "Review überfällig – Eskalation",
  task_overdue: "Offene Aufgabe überfällig",
  open_review_overdue: "Offener Review überfällig",
};

const RECIPIENT_TYPES = [
  "owner",
  "deputy",
  "reviewer",
  "approver",
  "process_manager",
];

const CHANNELS = ["in_app", "teams"];

const DEFAULT_WORKFLOW_SENTINEL = "__default__";

function RoleBadges({ roles }: { roles: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <Badge key={r} variant="outline" className="text-xs">
          {AVAILABLE_ROLES.find((x) => x.value === r)?.label ?? r}
        </Badge>
      ))}
      {roles.length === 0 && (
        <span className="text-xs text-muted-foreground italic">Keine Rollen</span>
      )}
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

  const moveStep = (idx: number, dir: -1 | 1) => {
    const next = [...steps];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setSteps(next.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  const updateStep = (idx: number, field: keyof WorkflowStep, value: unknown) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  };

  const toggleRole = (stepIdx: number, role: string) => {
    const step = steps[stepIdx];
    const newRoles = step.roles.includes(role)
      ? step.roles.filter((r) => r !== role)
      : [...step.roles, role];
    updateStep(stepIdx, "roles", newRoles);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name ist ein Pflichtfeld");
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
          <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="wf-name">Name *</Label>
          <Input
            id="wf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Standard-Freigabe"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wf-desc">Beschreibung</Label>
          <Input
            id="wf-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kurze Beschreibung des Workflows"
          />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="wf-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
            <Label htmlFor="wf-default" className="text-sm">
              Standard-Workflow
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="wf-sod"
              checked={enforceSoD}
              onCheckedChange={setEnforceSoD}
            />
            <Label htmlFor="wf-sod" className="text-sm">
              Vier-Augen-Prinzip erzwingen (SoD)
            </Label>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Freigabeschritte</Label>
            <Button variant="outline" size="sm" onClick={addStep}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Schritt hinzufügen
            </Button>
          </div>

          {steps.map((step, idx) => (
            <Card key={idx} className="border border-border">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    Schritt {step.stepNumber}
                  </Badge>
                  <Input
                    value={step.name}
                    onChange={(e) => updateStep(idx, "name", e.target.value)}
                    className="h-7 text-sm flex-1"
                    placeholder="Schrittname"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveStep(idx, -1)}
                    disabled={idx === 0}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveStep(idx, 1)}
                    disabled={idx === steps.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeStep(idx)}
                    disabled={steps.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Zuständige Rollen (mindestens eine):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_ROLES.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => toggleRole(idx, role.value)}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs border transition-colors ${
                          step.roles.includes(role.value)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:border-primary"
                        }`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
    if (!confirm("Workflow wirklich löschen?")) return;
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

  const handleAssignment = async (pageType: string, workflowId: string) => {
    setAssignmentLoading(pageType);
    try {
      if (!workflowId) {
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
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const pageTypes = Object.keys(PAGE_TYPE_REGISTRY);

  return (
    <div className="space-y-4">
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
            <p className="text-sm text-muted-foreground text-center py-4">
              Keine Workflows konfiguriert
            </p>
          )}
          {templates.map((t) => (
            <div
              key={t.id}
              className="border rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {t.isDefault && (
                    <Star className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    {t.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {t.isDefault && (
                      <Badge variant="secondary" className="text-xs">Standard</Badge>
                    )}
                    {t.enforceSoD && (
                      <Badge variant="outline" className="text-xs">4-Augen</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditTemplate(t);
                      setShowEditor(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!t.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1 items-center">
                {t.steps.map((s, i) => (
                  <span key={s.id ?? i} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="text-muted-foreground text-xs">→</span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs bg-muted rounded px-1.5 py-0.5">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground">
                        ({s.roles.map((r) => AVAILABLE_ROLES.find((x) => x.value === r)?.label ?? r).join(" oder ")})
                      </span>
                    </span>
                  </span>
                ))}
                {t.steps.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">Keine Schritte</span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Workflow je Seitentyp</CardTitle>
          <CardDescription>
            Welcher Workflow gilt für welchen Seitentyp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pageTypes.map((pageType) => {
              const label = PAGE_TYPE_LABELS[pageType as keyof typeof PAGE_TYPE_LABELS] ?? pageType;
              const assignment = assignments.find((a) => a.pageType === pageType);
              const currentWorkflowId = assignment?.workflowId ?? "";
              return (
                <div key={pageType} className="flex items-center justify-between gap-4 py-1">
                  <span className="text-sm min-w-0 truncate">{label}</span>
                  <Select
                    value={currentWorkflowId || DEFAULT_WORKFLOW_SENTINEL}
                    onValueChange={(val) => handleAssignment(pageType, val === DEFAULT_WORKFLOW_SENTINEL ? "" : val)}
                    disabled={assignmentLoading === pageType}
                  >
                    <SelectTrigger className="w-48 h-7 text-xs">
                      <SelectValue placeholder="Standard-Workflow" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT_WORKFLOW_SENTINEL}>Standard-Workflow</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
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

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        {showEditor && (
          <WorkflowEditor
            template={editTemplate}
            onSave={load}
            onClose={() => setShowEditor(false)}
          />
        )}
      </Dialog>
    </div>
  );
}

function NotificationRulesSection() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

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
    load();
  }, [load]);

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

  const toggleRecipient = (rule: NotificationRule, type: string) => {
    const updated = {
      ...rule,
      recipientTypes: rule.recipientTypes.includes(type)
        ? rule.recipientTypes.filter((r) => r !== type)
        : [...rule.recipientTypes, type],
    };
    updateRule(updated);
  };

  const toggleChannel = (rule: NotificationRule, channel: string) => {
    const updated = {
      ...rule,
      channels: rule.channels.includes(channel)
        ? rule.channels.filter((c) => c !== channel)
        : [...rule.channels, channel],
    };
    updateRule(updated);
  };

  const toggleEnabled = (rule: NotificationRule) => {
    updateRule({ ...rule, isEnabled: !rule.isEnabled });
  };

  const updateDays = (rule: NotificationRule, field: "reminderAfterDays" | "escalationAfterDays", val: string) => {
    const num = val === "" ? null : parseInt(val, 10);
    updateRule({ ...rule, [field]: isNaN(num as number) ? null : num });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Benachrichtigungsregeln
        </CardTitle>
        <CardDescription>
          Konfigurieren Sie für jedes Ereignis die Empfänger, Kanäle und Turnus-Regeln
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rules.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Keine Benachrichtigungsregeln konfiguriert
          </p>
        )}
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`border rounded-lg p-3 space-y-3 transition-opacity ${
                !rule.isEnabled ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {EVENT_TYPE_LABELS[rule.eventType] ?? rule.eventType}
                </p>
                <div className="flex items-center gap-2">
                  {saving === rule.id && (
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full" />
                  )}
                  <Switch
                    checked={rule.isEnabled}
                    onCheckedChange={() => toggleEnabled(rule)}
                    disabled={saving === rule.id}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Empfänger:</p>
                  <div className="flex flex-wrap gap-1">
                    {RECIPIENT_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleRecipient(rule, type)}
                        disabled={saving === rule.id}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs border transition-colors disabled:opacity-50 ${
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
                  <p className="text-xs text-muted-foreground mb-1.5">Kanäle:</p>
                  <div className="flex flex-wrap gap-1">
                    {CHANNELS.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => toggleChannel(rule, ch)}
                        disabled={saving === rule.id}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs border transition-colors disabled:opacity-50 ${
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
              </div>

              {(rule.eventType === "review_overdue" ||
                rule.eventType === "review_overdue_escalation" ||
                rule.eventType === "task_overdue" ||
                rule.eventType === "open_review_overdue") && (
                <div className="flex gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                      Erinnerung nach (Tage):
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-6 w-16 text-xs"
                      value={rule.reminderAfterDays ?? ""}
                      onChange={(e) => updateDays(rule, "reminderAfterDays", e.target.value)}
                      onBlur={() => updateRule(rule)}
                      disabled={saving === rule.id}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                      Eskalation nach (Tage):
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-6 w-16 text-xs"
                      value={rule.escalationAfterDays ?? ""}
                      onChange={(e) => updateDays(rule, "escalationAfterDays", e.target.value)}
                      onBlur={() => updateRule(rule)}
                      disabled={saving === rule.id}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
