import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@workspace/ui/input";
import { Button } from "@workspace/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/card";
import { Label } from "@workspace/ui/label";
import { Switch } from "@workspace/ui/switch";
import { Textarea } from "@workspace/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/select";
import { Badge } from "@workspace/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/tooltip";
import {
  Save,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  useGetAiSettings,
  useUpdateAiSettings,
  useGetAiUsageStats,
  getGetAiSettingsQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AiFieldProfilesPanel } from "./AiFieldProfilesPanel";

interface AvailableModel {
  id: string;
  label: string;
}

function useAvailableModels() {
  return useQuery<{ models: AvailableModel[] }>({
    queryKey: ["ai-available-models"],
    queryFn: () => customFetch<{ models: AvailableModel[] }>("/api/ai/models"),
    staleTime: 5 * 60 * 1000,
  });
}

export function AISettingsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetAiSettings();
  const { data: stats } = useGetAiUsageStats({ days: 30 });
  const { data: modelsData, isLoading: modelsLoading } = useAvailableModels();
  const updateMutation = useUpdateAiSettings();
  const availableModels = modelsData?.models ?? [];

  const [enabled, setEnabled] = useState(false);
  const [model, setModel] = useState("gpt-5.2");
  const [sourceMode, setSourceMode] = useState("wiki_only");
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [maxCompletionTokens, setMaxCompletionTokens] = useState(8192);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [sourcePriority, setSourcePriority] = useState("wiki_first");
  const [responseLanguage, setResponseLanguage] = useState("auto");
  const [citationStyle, setCitationStyle] = useState("inline");
  const [maxSourcesPerAnswer, setMaxSourcesPerAnswer] = useState(12);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setModel(settings.model);
      setSourceMode(settings.sourceMode);
      setWebSearchEnabled(settings.webSearchEnabled);
      setMaxCompletionTokens(settings.maxCompletionTokens);
      setSystemPrompt(settings.systemPrompt || "");
      const pp = (settings.promptPolicies || {}) as Record<string, unknown>;
      setSourcePriority((pp.sourcePriority as string) || "wiki_first");
      setResponseLanguage((pp.responseLanguage as string) || "auto");
      setCitationStyle((pp.citationStyle as string) || "inline");
      setMaxSourcesPerAnswer((pp.maxSourcesPerAnswer as number) || 12);
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate(
      {
        data: {
          enabled,
          model,
          sourceMode: sourceMode as
            | "wiki_only"
            | "wiki_and_connectors"
            | "wiki_connectors_web",
          webSearchEnabled,
          maxCompletionTokens,
          systemPrompt: systemPrompt || null,
          promptPolicies: {
            sourcePriority,
            responseLanguage,
            citationStyle,
            maxSourcesPerAnswer,
          },
        },
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: getGetAiSettingsQueryKey(),
          });
          toast({
            title: "Einstellungen gespeichert",
            description: "Die KI-Einstellungen wurden aktualisiert.",
          });
        },
        onError: () => {
          toast({
            title: "Fehler",
            description: "Einstellungen konnten nicht gespeichert werden.",
            variant: "destructive",
          });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            Konfiguration des FlowCore-Assistenten
          </p>
        </div>
        <Badge variant={enabled ? "default" : "secondary"}>
          {enabled ? "Aktiviert" : "Deaktiviert"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grundeinstellungen</CardTitle>
          <CardDescription>
            Aktivierung und Konfiguration des FlowCore-Assistenten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ai-enabled">FlowCore-Assistent aktivieren</Label>
              <p className="text-sm text-muted-foreground">
                Aktiviert den FlowCore-Assistenten und den
                FlowCore-Schreibassistenten
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="model">Modell</Label>
                {modelsLoading && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
                {!modelsLoading && availableModels.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {availableModels.length} verfügbar
                  </Badge>
                )}
              </div>
              <Select
                value={model}
                onValueChange={setModel}
                disabled={modelsLoading}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Modell wählen…" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.length > 0 ? (
                    availableModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.id}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                      <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {!modelsLoading && availableModels.length === 0 && (
                <p className="text-xs text-amber-600">
                  Modelle konnten nicht von der API abgerufen werden –
                  Fallback-Liste aktiv
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-mode">Quellmodus</Label>
              <Select
                value={sourceMode}
                onValueChange={(v) => {
                  if (v === "wiki_connectors_web") return;
                  setSourceMode(v);
                }}
              >
                <SelectTrigger id="source-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wiki_only">Nur Wiki-Inhalte</SelectItem>
                  <SelectItem value="wiki_and_connectors">
                    Wiki + Konnektoren
                  </SelectItem>
                  <SelectItem
                    value="wiki_connectors_web"
                    disabled
                    className="opacity-40 cursor-not-allowed"
                  >
                    Wiki + Konnektoren + Web (demnächst)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between opacity-40 cursor-not-allowed select-none">
                <div>
                  <Label className="cursor-not-allowed">
                    Web-Suche erlauben
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Web-Suche ist noch nicht freigegeben
                  </p>
                </div>
                <Switch id="web-search" checked={false} disabled />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Web-Suche wird in einer zukünftigen Version freigeschaltet
            </TooltipContent>
          </Tooltip>

          <div className="space-y-2">
            <Label htmlFor="max-tokens">Max. Antwort-Tokens</Label>
            <Input
              id="max-tokens"
              type="number"
              min={1024}
              max={16384}
              value={maxCompletionTokens}
              onChange={(e) =>
                setMaxCompletionTokens(parseInt(e.target.value, 10) || 8192)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="system-prompt">System-Prompt</Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
              placeholder="Optionaler System-Prompt für den Assistenten..."
            />
          </div>

          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending
              ? "Speichern..."
              : "Einstellungen speichern"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Antwort-Richtlinien</CardTitle>
          <CardDescription>
            Steuere das Verhalten des Assistenten bei Quellenpriorisierung,
            Sprache und Zitierweise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source-priority">Quellen-Priorisierung</Label>
              <Select value={sourcePriority} onValueChange={setSourcePriority}>
                <SelectTrigger id="source-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wiki_first">
                    Wiki-Inhalte zuerst
                  </SelectItem>
                  <SelectItem value="connector_first">
                    Konnektoren zuerst
                  </SelectItem>
                  <SelectItem value="equal">Gleichwertig</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="response-language">Antwortsprache</Label>
              <Select
                value={responseLanguage}
                onValueChange={setResponseLanguage}
              >
                <SelectTrigger id="response-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    Automatisch (Sprache der Frage)
                  </SelectItem>
                  <SelectItem value="de">Immer Deutsch</SelectItem>
                  <SelectItem value="en">Immer Englisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="citation-style">Zitierweise</Label>
              <Select value={citationStyle} onValueChange={setCitationStyle}>
                <SelectTrigger id="citation-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline">Inline-Zitate [1], [2]</SelectItem>
                  <SelectItem value="footnote">Fußnoten</SelectItem>
                  <SelectItem value="none">Keine Zitate im Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-sources">Max. Quellen pro Antwort</Label>
              <Input
                id="max-sources"
                type="number"
                min={1}
                max={20}
                value={maxSourcesPerAnswer}
                onChange={(e) =>
                  setMaxSourcesPerAnswer(parseInt(e.target.value, 10) || 12)
                }
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending
              ? "Speichern..."
              : "Richtlinien speichern"}
          </Button>
        </CardContent>
      </Card>

      <AiFieldProfilesPanel />

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Nutzungsstatistiken (letzte 30 Tage)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Anfragen gesamt"
                value={stats.summary.totalQueries}
                icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
              />
              <StatCard
                label="Fehler"
                value={stats.summary.errorCount}
                icon={<AlertCircle className="h-4 w-4 text-red-500" />}
              />
              <StatCard
                label="Ohne Ergebnis"
                value={stats.summary.zeroResultCount}
                icon={<AlertCircle className="h-4 w-4 text-yellow-500" />}
              />
              <StatCard
                label="Durchschn. Latenz"
                value={`${stats.summary.avgLatencyMs}ms`}
                icon={<CheckCircle className="h-4 w-4 text-green-500" />}
              />
            </div>

            {stats.byAction.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Nach Aktion</h4>
                <div className="space-y-2">
                  {stats.byAction.map(
                    (a: { action: string; count: number }) => (
                      <div
                        key={a.action}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground capitalize">
                          {a.action.replace("_", " ")}
                        </span>
                        <Badge variant="secondary">{a.count}</Badge>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
