import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { configureTab } from "@/lib/teams";
import { useTeamsContext } from "@/hooks/useTeamsContext";

type TabType = "wiki-home" | "wiki-search" | "wiki-dashboard" | "wiki-page";

interface TabConfig {
  tabType: TabType;
  nodeId: string;
  label: string;
}

export function TeamsTabConfig() {
  const { inTeams, initialized } = useTeamsContext();
  const [config, setConfig] = useState<TabConfig>({
    tabType: "wiki-home",
    nodeId: "",
    label: "FlowCore",
  });

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const getContentUrl = useCallback(
    (cfg: TabConfig) => {
      const base = `${window.location.origin}${basePath}`;
      const teamsParams = "context=teams&theme={theme}";
      switch (cfg.tabType) {
        case "wiki-home":
          return `${base}/?${teamsParams}`;
        case "wiki-search":
          return `${base}/search?${teamsParams}`;
        case "wiki-dashboard":
          return `${base}/dashboard?${teamsParams}`;
        case "wiki-page":
          return cfg.nodeId
            ? `${base}/node/${cfg.nodeId}?${teamsParams}`
            : `${base}/?${teamsParams}`;
        default:
          return `${base}/?${teamsParams}`;
      }
    },
    [basePath],
  );

  useEffect(() => {
    if (inTeams && initialized) {
      configureTab({
        entityId: config.tabType,
        contentUrl: getContentUrl(config),
        suggestedDisplayName: config.label || "FlowCore",
        websiteUrl: `${window.location.origin}${basePath}`,
      });
    }
  }, [config, getContentUrl, basePath, inTeams, initialized]);

  const tabTypeLabels: Record<TabType, string> = {
    "wiki-home": "Wiki-Startseite",
    "wiki-search": "Suche",
    "wiki-dashboard": "Qualitäts-Dashboard",
    "wiki-page": "Bestimmte Seite",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Wiki-Tab konfigurieren</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tabType">Ansicht</Label>
            <Select
              value={config.tabType}
              onValueChange={(v) =>
                setConfig((c) => ({ ...c, tabType: v as TabType }))
              }
            >
              <SelectTrigger id="tabType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tabTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {config.tabType === "wiki-page" && (
            <div className="space-y-2">
              <Label htmlFor="nodeId">Seiten-ID</Label>
              <Input
                id="nodeId"
                placeholder="UUID der Wiki-Seite"
                value={config.nodeId}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, nodeId: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Die ID finden Sie in der URL der Seite.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="label">Tab-Bezeichnung</Label>
            <Input
              id="label"
              value={config.label}
              onChange={(e) =>
                setConfig((c) => ({ ...c, label: e.target.value }))
              }
              placeholder="FlowCore"
            />
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {inTeams
              ? 'Klicken Sie auf "Speichern" in der Teams-Kopfzeile, um den Tab zu erstellen.'
              : "Diese Seite wird innerhalb von Microsoft Teams angezeigt."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
