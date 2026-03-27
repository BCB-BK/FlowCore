import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Wand2,
  Filter,
  Save,
} from "lucide-react";
import {
  useGetAiFieldProfiles,
  useCreateAiFieldProfile,
  useUpdateAiFieldProfile,
  useDeleteAiFieldProfile,
  getGetAiFieldProfilesQueryKey,
  type AiFieldProfile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const PAGE_TYPES = [
  { value: "core_process_overview", label: "Kernprozess-Übersicht" },
  { value: "process_page_text", label: "Prozessseite Text" },
  { value: "process_page_graphic", label: "Prozessseite Grafik" },
  { value: "procedure_instruction", label: "Verfahrensanweisung" },
  { value: "work_instruction", label: "Arbeitsanweisung" },
  { value: "use_case", label: "Use Case" },
  { value: "area_overview", label: "Bereichsübersicht" },
  { value: "system_documentation", label: "Systemdokumentation" },
  { value: "interface_description", label: "Schnittstellenbeschreibung" },
  { value: "training_resource", label: "Schulung / Lernressource" },
  { value: "policy", label: "Richtlinie / Policy" },
  { value: "audit_object", label: "Kontroll-/Prüfobjekt" },
  { value: "checklist", label: "Checkliste" },
  { value: "faq", label: "FAQ / Wissensartikel" },
  { value: "glossary", label: "Glossar" },
  { value: "dashboard", label: "Dashboard" },
  { value: "role_profile", label: "Rollen-/Stellenprofil" },
  { value: "meeting_protocol", label: "Meeting-Protokoll" },
];

const OPERATIONS = [
  { value: "reformulate", label: "Umformulieren" },
  { value: "professionalize", label: "Professionalisieren" },
  { value: "expand", label: "Erweitern" },
  { value: "shorten", label: "Kürzen" },
  { value: "grammar", label: "Korrektur" },
  { value: "from_bullets", label: "Aus Stichpunkten" },
];

interface ProfileFormData {
  pageType: string;
  fieldKey: string;
  label: string;
  purpose: string;
  promptInstruction: string;
  style: string;
  guardrails: string;
  allowedOperations: string[];
  isActive: boolean;
}

const emptyForm: ProfileFormData = {
  pageType: "",
  fieldKey: "",
  label: "",
  purpose: "",
  promptInstruction: "",
  style: "",
  guardrails: "",
  allowedOperations: [
    "reformulate",
    "professionalize",
    "expand",
    "shorten",
    "grammar",
  ],
  isActive: true,
};

export function AiFieldProfilesPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterPageType, setFilterPageType] = useState("");
  const [filterFieldKey, setFilterFieldKey] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormData>(emptyForm);

  const { data: profiles, isLoading } = useGetAiFieldProfiles(
    {
      pageType: filterPageType || undefined,
      fieldKey: filterFieldKey || undefined,
    },
    {
      query: {
        queryKey: getGetAiFieldProfilesQueryKey({
          pageType: filterPageType || undefined,
          fieldKey: filterFieldKey || undefined,
        }),
      },
    },
  );

  const createMutation = useCreateAiFieldProfile();
  const updateMutation = useUpdateAiFieldProfile();
  const deleteMutation = useDeleteAiFieldProfile();

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: getGetAiFieldProfilesQueryKey(),
    });
  };

  const handleCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (profile: AiFieldProfile) => {
    setEditingId(profile.id);
    setForm({
      pageType: profile.pageType || "",
      fieldKey: profile.fieldKey || "",
      label: profile.label || "",
      purpose: profile.purpose || "",
      promptInstruction: profile.promptInstruction || "",
      style: profile.style || "",
      guardrails: profile.guardrails || "",
      allowedOperations: profile.allowedOperations || [],
      isActive: profile.isActive !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = {
      data: {
        pageType: form.pageType,
        fieldKey: form.fieldKey,
        label: form.label,
        purpose: form.purpose || undefined,
        promptInstruction: form.promptInstruction || undefined,
        style: form.style || undefined,
        guardrails: form.guardrails || undefined,
        allowedOperations: form.allowedOperations,
        isActive: form.isActive,
      },
    };

    const onSuccess = () => {
      invalidate();
      setDialogOpen(false);
      toast({
        title: editingId ? "Feldprofil aktualisiert" : "Feldprofil erstellt",
        description: `Profil "${form.label}" wurde gespeichert.`,
      });
    };

    const onError = () => {
      toast({
        title: "Fehler",
        description: "Feldprofil konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    };

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, ...payload },
        { onSuccess, onError },
      );
    } else {
      createMutation.mutate(payload, { onSuccess, onError });
    }
  };

  const handleDelete = (id: string, label: string) => {
    if (!confirm(`Feldprofil "${label}" wirklich löschen?`)) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          invalidate();
          toast({
            title: "Feldprofil gelöscht",
            description: `"${label}" wurde entfernt.`,
          });
        },
      },
    );
  };

  const toggleOperation = (op: string) => {
    setForm((prev) => ({
      ...prev,
      allowedOperations: prev.allowedOperations.includes(op)
        ? prev.allowedOperations.filter((o) => o !== op)
        : [...prev.allowedOperations, op],
    }));
  };

  const getPageTypeLabel = (value: string) =>
    PAGE_TYPES.find((pt) => pt.value === value)?.label ?? value;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Feldbezogene KI-Profile
        </CardTitle>
        <CardDescription>
          Konfiguriere feldspezifische KI-Regeln, Prompts und Guardrails je
          Seitentyp und Feld
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filterPageType || "__all__"}
              onValueChange={(v) =>
                setFilterPageType(v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Alle Seitentypen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Alle Seitentypen</SelectItem>
                {PAGE_TYPES.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>
                    {pt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Feld filtern..."
                value={filterFieldKey}
                onChange={(e) => setFilterFieldKey(e.target.value)}
                className="pl-7 w-[180px]"
              />
            </div>
          </div>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Neues Profil
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !profiles || profiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Keine Feldprofile gefunden. Erstellen Sie ein neues Profil.
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{p.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {getPageTypeLabel(p.pageType)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {p.fieldKey}
                    </Badge>
                    {!p.isActive && (
                      <Badge variant="destructive" className="text-xs">
                        Inaktiv
                      </Badge>
                    )}
                  </div>
                  {p.purpose && (
                    <p className="text-xs text-muted-foreground truncate">
                      {p.purpose}
                    </p>
                  )}
                  <div className="flex gap-1">
                    {(p.allowedOperations || []).map((op) => (
                      <Badge
                        key={op}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {OPERATIONS.find((o) => o.value === op)?.label ?? op}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEdit(p)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(p.id, p.label)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Feldprofil bearbeiten" : "Neues Feldprofil"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Seitentyp *</Label>
                <Select
                  value={form.pageType}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, pageType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_TYPES.map((pt) => (
                      <SelectItem key={pt.value} value={pt.value}>
                        {pt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Feld-Key *</Label>
                <Input
                  value={form.fieldKey}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fieldKey: e.target.value }))
                  }
                  placeholder="z.B. purpose, raci, kpis"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Label *</Label>
              <Input
                value={form.label}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder="Anzeigename des Feldprofils"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Zweck</Label>
              <Textarea
                value={form.purpose}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, purpose: e.target.value }))
                }
                rows={2}
                placeholder="Was soll dieses Feld fachlich leisten?"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Prompt-Anweisung</Label>
              <Textarea
                value={form.promptInstruction}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    promptInstruction: e.target.value,
                  }))
                }
                rows={3}
                placeholder="Spezifische KI-Anweisung für dieses Feld..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Stil</Label>
              <Input
                value={form.style}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, style: e.target.value }))
                }
                placeholder="z.B. sachlich, professionell, kompakt"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Guardrails / Grenzen</Label>
              <Textarea
                value={form.guardrails}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, guardrails: e.target.value }))
                }
                rows={3}
                placeholder="Was die KI NICHT tun darf bei diesem Feld..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Erlaubte Operationen</Label>
              <div className="flex flex-wrap gap-2">
                {OPERATIONS.map((op) => (
                  <Badge
                    key={op.value}
                    variant={
                      form.allowedOperations.includes(op.value)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleOperation(op.value)}
                  >
                    {op.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="profile-active">Aktiv</Label>
                <p className="text-xs text-muted-foreground">
                  Deaktivierte Profile werden ignoriert
                </p>
              </div>
              <Switch
                id="profile-active"
                checked={form.isActive}
                onCheckedChange={(v) =>
                  setForm((prev) => ({ ...prev, isActive: v }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !form.pageType ||
                !form.fieldKey ||
                !form.label ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              <Save className="h-4 w-4 mr-1" />
              {createMutation.isPending || updateMutation.isPending
                ? "Speichern..."
                : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
