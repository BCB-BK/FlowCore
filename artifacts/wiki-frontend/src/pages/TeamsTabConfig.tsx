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
import { Button } from "@/components/ui/button";

type TabType = "wiki-home" | "wiki-search" | "wiki-dashboard" | "wiki-page";

interface TabConfig {
  tabType: TabType;
  nodeId: string;
  label: string;
}

export function TeamsTabConfig() {
  const [config, setConfig] = useState<TabConfig>({
    tabType: "wiki-home",
    nodeId: "",
    label: "BC Wiki",
  });
  const [saved, setSaved] = useState(false);

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
    const params = new URLSearchParams(window.location.search);
    const existingConfig = params.get("tabConfig");
    if (existingConfig) {
      try {
        const parsed = JSON.parse(existingConfig) as TabConfig;
        setConfig(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSave = () => {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "teams-tab-config-save",
            config: {
              entityId: config.tabType,
              contentUrl: getContentUrl(config),
              suggestedDisplayName: config.label || "BC Wiki",
              websiteUrl: `${window.location.origin}${basePath}`,
              tabConfig: JSON.stringify(config),
            },
          },
          "*",
        );
      }
    } catch {
      // ignore
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

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
              placeholder="BC Wiki"
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            {saved ? "Gespeichert!" : "Speichern"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
