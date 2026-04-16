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
import { Shield, Save, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const LEVEL_LABELS: Record<string, { label: string; description: string; color: string }> = {
  public: {
    label: "\u00D6ffentlich",
    description: "Jeder mit URL kann die Seite sehen",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  internal: {
    label: "Intern",
    description: "Jeder mit mindestens Ansichts-Freigabe",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  confidential: {
    label: "Vertraulich",
    description: "Nur ausgew\u00E4hlte Rollen (z.\u00A0B. F\u00FChrungsebene)",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  },
  strictly_confidential: {
    label: "Streng vertraulich",
    description: "Nur h\u00F6chste Freigabestufe (z.\u00A0B. CEO)",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
};

const ROLE_LABELS: Record<string, string> = {
  system_admin: "System-Administrator",
  process_manager: "Prozessmanager",
  editor: "Editor",
  reviewer: "Reviewer",
  approver: "Genehmiger",
  compliance_manager: "Compliance-Manager",
  viewer: "Betrachter",
};

const ALL_ROLES = [
  "system_admin",
  "process_manager",
  "compliance_manager",
  "editor",
  "reviewer",
  "approver",
  "viewer",
];

interface LevelConfig {
  level: string;
  allowedRoles: string[];
}

export function ConfidentialityTab() {
  const [config, setConfig] = useState<LevelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { toast } = useToast();

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await customFetch<LevelConfig[]>("/api/confidentiality-config");
      setConfig(data);
    } catch {
      toast({
        title: "Fehler",
        description: "Vertraulichkeits-Konfiguration konnte nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const toggleRole = (level: string, role: string) => {
    setConfig((prev) =>
      prev.map((entry) => {
        if (entry.level !== level) return entry;
        const roles = entry.allowedRoles.includes(role)
          ? entry.allowedRoles.filter((r) => r !== role)
          : [...entry.allowedRoles, role];
        return { ...entry, allowedRoles: roles };
      }),
    );
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const data = await customFetch<LevelConfig[]>("/api/confidentiality-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setConfig(data);
      setDirty(false);
      toast({
        title: "Gespeichert",
        description: "Vertraulichkeits-Konfiguration wurde aktualisiert.",
      });
    } catch {
      toast({
        title: "Fehler",
        description: "Speichern fehlgeschlagen.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Vertraulichkeitsstufen
          </CardTitle>
          <CardDescription>
            Legen Sie fest, welche Rollen Seiten mit der jeweiligen
            Vertraulichkeitsstufe sehen d{"\u00FC"}rfen. Benannte Personen auf
            einer Seite (Prozesseigner, Stellvertreter, Pr{"\u00FC"}fer,
            Freigeber) haben unabh{"\u00E4"}ngig davon immer Zugang.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {config.map((entry) => {
              const levelInfo = LEVEL_LABELS[entry.level];
              if (!levelInfo) return null;
              return (
                <div
                  key={entry.level}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={levelInfo.color}>
                          {levelInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {levelInfo.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {entry.allowedRoles.length} von {ALL_ROLES.length} Rollen
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {ALL_ROLES.map((role) => {
                      const isChecked = entry.allowedRoles.includes(role);
                      return (
                        <label
                          key={role}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-primary/10 border-primary/30"
                              : "bg-muted/30 border-transparent hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRole(entry.level, role)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span>{ROLE_LABELS[role] || role}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button onClick={handleSave} disabled={!dirty || saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Speichern
            </Button>
            {dirty && (
              <span className="text-sm text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Ungespeicherte {"\u00C4"}nderungen
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hinweis zur Funktionsweise</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
            <span>
              Jede Seite hat ein Metadatenfeld{" "}
              <strong>Vertraulichkeit</strong>. Der hier eingestellte
              Rollenzugang wird beim {"\u00D6"}ffnen der Seite gepr{"\u00FC"}ft.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
            <span>
              <strong>Benannte Personen</strong> (Prozesseigner, Pr
              {"\u00FC"}fer, Freigeber) haben <em>immer</em> Zugang zu ihrer
              Seite, auch wenn ihre Rolle die Stufe nicht erlaubt.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
            <span>
              Seiten ohne gesetzte Vertraulichkeitsstufe werden wie{" "}
              <strong>{"\u00D6"}ffentlich</strong> behandelt.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
            <span>
              Vertrauliche Seiten erscheinen nicht in Suchergebnissen f
              {"\u00FC"}r Personen ohne Freigabe.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
