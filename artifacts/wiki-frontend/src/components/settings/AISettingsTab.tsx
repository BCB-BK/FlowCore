import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, BarChart3, AlertCircle, CheckCircle } from "lucide-react";
import {
  useGetAiSettings,
  useUpdateAiSettings,
  useGetAiUsageStats,
  getGetAiSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function AISettingsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetAiSettings();
  const { data: stats } = useGetAiUsageStats({ days: 30 });
  const updateMutation = useUpdateAiSettings();

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
          queryClient.invalidateQueries({
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
            Konfiguration des KI-gestützten Wissensassistenten
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
            Aktivierung und Konfiguration des KI-Assistenten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ai-enabled">KI-Assistent aktivieren</Label>
              <p className="text-sm text-muted-foreground">
                Aktiviert den Wissensassistenten und den Schreibassistenten
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Modell</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-5.2">GPT-5.2 (empfohlen)</SelectItem>
                  <SelectItem value="gpt-5-mini">
                    GPT-5 Mini (schneller)
                  </SelectItem>
                  <SelectItem value="gpt-5-nano">
                    GPT-5 Nano (schnellstes)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-mode">Quellmodus</Label>
              <Select value={sourceMode} onValueChange={setSourceMode}>
                <SelectTrigger id="source-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wiki_only">Nur Wiki-Inhalte</SelectItem>
                  <SelectItem value="wiki_and_connectors">
                    Wiki + Konnektoren
                  </SelectItem>
                  <SelectItem value="wiki_connectors_web">
                    Wiki + Konnektoren + Web
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="web-search">Web-Suche erlauben</Label>
              <p className="text-sm text-muted-foreground">
                Erlaubt dem Assistenten, zusätzlich im Web zu suchen
              </p>
            </div>
            <Switch
              id="web-search"
              checked={webSearchEnabled}
              onCheckedChange={setWebSearchEnabled}
            />
          </div>

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
          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Nutzungsstatistiken (letzte 30 Tage)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
