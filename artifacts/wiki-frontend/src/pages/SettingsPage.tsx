import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { Label } from "@workspace/ui/label";
import {
  Settings,
  Link2,
  Bot,
  FileText,
  Database,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  Shield,
  ShieldCheck,
  Tag,
  Cpu,
  ChevronDown,
  ChevronRight,
  Users,
  Eye,
  HardDrive,
  GitBranch,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { PAGE_TYPE_REGISTRY } from "@/lib/types";
import { PAGE_TYPE_LABELS } from "@/lib/types";
import type { PageTypeDefinition } from "@workspace/shared/page-types";
import { AISettingsTab } from "@/components/settings/AISettingsTab";
import { ConnectorsTab } from "@/components/settings/ConnectorsTab";
import { TemplateDetailPanel } from "@/components/settings/TemplateDetailPanel";
import { TemplatePreviewDialog } from "@/components/settings/TemplatePreviewDialog";
import { UsersRolesTab } from "@/components/settings/UsersRolesTab";
import { BackupTab } from "@/components/settings/BackupTab";
import { ConsistencyTab } from "@/components/settings/ConsistencyTab";
import { ReleaseTab } from "@/components/settings/ReleaseTab";
import { AuditTrailTab } from "@/components/settings/AuditTrailTab";
import { WorkflowsTab } from "@/components/settings/WorkflowsTab";
import { useAuth } from "@/hooks/use-auth";

interface SystemInfo {
  system: { version: string; environment: string; uptime: number };
  database: { status: string; version: string };
  auth: {
    devMode: boolean;
    entraConfigured: boolean;
    entraTenantId: string | null;
    entraClientId: string | null;
  };
  integrations: {
    openai: { configured: boolean; baseUrl: string };
    teams: { appId: string | null; configured: boolean };
  };
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? "bg-green-500" : "bg-red-400"}`}
    />
  );
}

export function SettingsPage() {
  const { data: user } = useAuth();
  const perms = useMemo(() => new Set(user?.permissions ?? []), [user]);

  const tabs = useMemo(() => {
    const t: { value: string; label: string; icon: typeof Server }[] = [];
    if (perms.has("manage_settings")) {
      t.push({ value: "general", label: "Allgemein", icon: Server });
    }
    if (perms.has("manage_permissions")) {
      t.push({ value: "users", label: "Benutzer & Rollen", icon: Users });
    }
    if (perms.has("manage_settings")) {
      t.push({ value: "connections", label: "Verbindungen", icon: Link2 });
      t.push({ value: "ai", label: "FlowCore-Assistent", icon: Bot });
    }
    if (perms.has("manage_templates")) {
      t.push({ value: "templates", label: "Seitentemplates", icon: FileText });
    }
    if (perms.has("manage_connectors")) {
      t.push({ value: "connectors", label: "Konnektoren", icon: Database });
    }
    if (perms.has("view_backups") || perms.has("manage_backup")) {
      t.push({ value: "backups", label: "Backup", icon: HardDrive });
    }
    if (perms.has("view_audit_log") || perms.has("manage_settings")) {
      t.push({ value: "audit", label: "Audit-Trail", icon: Eye });
    }
    if (perms.has("manage_settings")) {
      t.push({ value: "workflows", label: "Workflows", icon: GitBranch });
      t.push({ value: "consistency", label: "Konsistenz", icon: ShieldCheck });
      t.push({ value: "releases", label: "Releases", icon: Tag });
    }
    return t;
  }, [perms]);

  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    if (tabs.length > 0 && !tabs.find((t) => t.value === activeTab)) {
      setActiveTab(tabs[0].value);
    }
  }, [tabs, activeTab]);

  if (tabs.length === 0) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center text-muted-foreground">
        Sie haben keine Berechtigung, die Einstellungen zu sehen.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Einstellungen</h1>
          <p className="text-muted-foreground">
            System, Verbindungen, KI und Seitentemplates konfigurieren
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 pb-1" style={{ scrollbarWidth: "thin" }}>
          <TabsList className="inline-flex w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 whitespace-nowrap">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="general" className="mt-6">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UsersRolesTab />
        </TabsContent>

        <TabsContent value="connections" className="mt-6">
          <ConnectionsTab />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AISettingsTab />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplatesTab />
        </TabsContent>

        <TabsContent value="connectors" className="mt-6">
          <ConnectorsTab />
        </TabsContent>

        <TabsContent value="backups" className="mt-6">
          <BackupTab />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditTrailTab />
        </TabsContent>

        <TabsContent value="workflows" className="mt-6">
          <WorkflowsTab />
        </TabsContent>

        <TabsContent value="consistency" className="mt-6">
          <ConsistencyTab />
        </TabsContent>

        <TabsContent value="releases" className="mt-6">
          <ReleaseTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralTab() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customFetch<SystemInfo>("/api/admin/system-info")
      .then((data) => {
        setInfo(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!info) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Systeminformationen konnten nicht geladen werden
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <InfoItem
              label="Version"
              value={`FlowCore v${info.system.version}`}
            />
            <InfoItem label="Umgebung" value={info.system.environment} />
            <InfoItem
              label="Laufzeit"
              value={formatUptime(info.system.uptime)}
            />
            <div>
              <p className="text-sm text-muted-foreground">Datenbank</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <StatusDot ok={info.database.status === "connected"} />
                <span className="text-sm font-medium">
                  {info.database.status === "connected"
                    ? "Verbunden"
                    : "Getrennt"}
                </span>
              </div>
              {info.database.version && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {info.database.version}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentifizierung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">Entwicklermodus</p>
                <p className="text-xs text-muted-foreground">
                  Automatische Anmeldung ohne SSO
                </p>
              </div>
              <Badge variant={info.auth.devMode ? "secondary" : "outline"}>
                {info.auth.devMode ? "Aktiv" : "Inaktiv"}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">Microsoft Entra SSO</p>
                <p className="text-xs text-muted-foreground">
                  {info.auth.entraTenantId
                    ? `Tenant: ${info.auth.entraTenantId}`
                    : "Kein Tenant konfiguriert"}
                </p>
              </div>
              <Badge
                variant={info.auth.entraConfigured ? "default" : "destructive"}
              >
                {info.auth.entraConfigured ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Konfiguriert
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Nicht konfiguriert
                  </span>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConnectionsTab() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [flowcoreUpn, setFlowcoreUpn] = useState("flowcore@bildungscampus-backnang.de");
  const [flowcoreUpnEdit, setFlowcoreUpnEdit] = useState("");
  const [flowcoreSaving, setFlowcoreSaving] = useState(false);
  const [flowcoreTesting, setFlowcoreTesting] = useState(false);
  const [flowcoreTestResult, setFlowcoreTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    Promise.all([
      customFetch<SystemInfo>("/api/admin/system-info"),
      customFetch<{ upn: string }>("/api/admin/flowcore-account"),
    ])
      .then(([sys, fc]) => {
        setInfo(sys);
        setFlowcoreUpn(fc.upn);
        setFlowcoreUpnEdit(fc.upn);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSaveFlowcoreAccount = async () => {
    setFlowcoreSaving(true);
    setFlowcoreTestResult(null);
    try {
      await customFetch("/api/admin/flowcore-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upn: flowcoreUpnEdit }),
      });
      setFlowcoreUpn(flowcoreUpnEdit);
    } finally {
      setFlowcoreSaving(false);
    }
  };

  const handleTestFlowcoreAccount = async () => {
    setFlowcoreTesting(true);
    setFlowcoreTestResult(null);
    try {
      const result = await customFetch<{ success: boolean; message?: string; error?: string }>(
        "/api/admin/flowcore-account/test",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upn: flowcoreUpnEdit }),
        },
      );
      setFlowcoreTestResult({
        success: result.success ?? false,
        message: result.message ?? result.error ?? "Unbekanntes Ergebnis",
      });
    } catch (err) {
      setFlowcoreTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Verbindungstest fehlgeschlagen",
      });
    } finally {
      setFlowcoreTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!info) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Verbindungsinformationen konnten nicht geladen werden
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">OpenAI API</CardTitle>
              <Badge
                variant={
                  info.integrations.openai.configured
                    ? "default"
                    : "destructive"
                }
              >
                {info.integrations.openai.configured ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Verbunden
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Nicht konfiguriert
                  </span>
                )}
              </Badge>
            </div>
          </div>
          <CardDescription>
            FlowCore-Assistent und FlowCore-Schreibassistent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">API-Schlüssel</span>
              <span>
                {info.integrations.openai.configured
                  ? "••••••••••••••••"
                  : "Nicht gesetzt"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Basis-URL</span>
              <span className="font-mono text-xs">
                {info.integrations.openai.baseUrl}
              </span>
            </div>
          </div>
          {!info.integrations.openai.configured && (
            <p className="text-sm text-amber-600 mt-3">
              Setzen Sie die Umgebungsvariable AI_INTEGRATIONS_OPENAI_API_KEY,
              um KI-Funktionen zu aktivieren.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Microsoft Entra ID</CardTitle>
              <Badge
                variant={info.auth.entraConfigured ? "default" : "secondary"}
              >
                {info.auth.entraConfigured ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Konfiguriert
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Ausstehend
                  </span>
                )}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Single Sign-On für Azure AD / Microsoft 365
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tenant-ID</span>
              <span>{info.auth.entraTenantId || "Nicht konfiguriert"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Client-ID</span>
              <span>{info.auth.entraClientId || "Nicht konfiguriert"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Modus</span>
              <Badge variant="outline">
                {info.auth.devMode ? "Entwicklung" : "Produktion"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Microsoft Teams</CardTitle>
              <Badge
                variant={
                  info.integrations.teams.configured ? "default" : "secondary"
                }
              >
                {info.integrations.teams.configured ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Konfiguriert
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Ausstehend
                  </span>
                )}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Integration als Teams-App mit Tab-Einbettung
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">App-ID</span>
              <span>{info.integrations.teams.appId || "Nicht gesetzt"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">FlowCore-Kommunikationskonto</CardTitle>
              <Badge variant={flowcoreUpn ? "default" : "secondary"}>
                {flowcoreUpn ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Konfiguriert
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Nicht konfiguriert
                  </span>
                )}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Teams-Chat-Benachrichtigungen werden über dieses Konto als Absender verschickt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flowcore-upn" className="text-sm">
              E-Mail / UPN des Absenderkontos
            </Label>
            <Input
              id="flowcore-upn"
              type="email"
              value={flowcoreUpnEdit}
              onChange={(e) => {
                setFlowcoreUpnEdit(e.target.value);
                setFlowcoreTestResult(null);
              }}
              placeholder="flowcore@bildungscampus-backnang.de"
              className="max-w-sm"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="sm"
              onClick={handleSaveFlowcoreAccount}
              disabled={flowcoreSaving || flowcoreUpnEdit === flowcoreUpn}
            >
              {flowcoreSaving ? "Speichern..." : "Speichern"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestFlowcoreAccount}
              disabled={flowcoreTesting || !flowcoreUpnEdit}
            >
              {flowcoreTesting ? "Verbindung wird getestet..." : "Verbindung testen"}
            </Button>
            {flowcoreTestResult && (
              <span
                className={`text-sm flex items-center gap-1 ${
                  flowcoreTestResult.success ? "text-green-600" : "text-red-500"
                }`}
              >
                {flowcoreTestResult.success ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                {flowcoreTestResult.message}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Der Test prüft, ob das Konto über die Microsoft Graph API erreichbar ist und Chat-Nachrichten senden darf.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  process: "Prozesse",
  documentation: "Dokumentation",
  governance: "Governance",
  system: "System",
};

const CATEGORY_COLORS: Record<string, string> = {
  process: "bg-green-100 text-green-800",
  documentation: "bg-blue-100 text-blue-800",
  governance: "bg-red-100 text-red-800",
  system: "bg-purple-100 text-purple-800",
};

function TemplatesTab() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const templates = Object.values(PAGE_TYPE_REGISTRY) as PageTypeDefinition[];
  const previewTemplate = previewType
    ? (templates.find((t) => t.type === previewType) ?? null)
    : null;

  const categories = ["process", "documentation", "governance", "system"];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          FlowCore unterstützt {templates.length} Seitentemplates in 4
          Kategorien. Klicken Sie auf ein Template, um Details und Sektionen zu
          sehen.
        </p>
      </div>

      {previewTemplate && (
        <TemplatePreviewDialog
          template={previewTemplate}
          open
          onClose={() => setPreviewType(null)}
        />
      )}

      {categories.map((cat) => {
        const catTemplates = templates.filter((t) => t.category === cat);
        if (catTemplates.length === 0) return null;
        return (
          <div key={cat}>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Badge className={CATEGORY_COLORS[cat]}>
                {CATEGORY_LABELS[cat]}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {catTemplates.length} Templates
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {catTemplates.map((tmpl) => (
                <Card
                  key={tmpl.type}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedType === tmpl.type ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() =>
                    setSelectedType(
                      selectedType === tmpl.type ? null : tmpl.type,
                    )
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: tmpl.color }}
                          />
                          <h4 className="text-sm font-semibold">
                            {PAGE_TYPE_LABELS[tmpl.type] || tmpl.labelDe}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tmpl.descriptionDe}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px]">
                            {tmpl.sections.length} Sektionen
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {tmpl.metadataFields.length} Metadaten
                          </Badge>
                          {tmpl.allowedChildTypes.length > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {tmpl.allowedChildTypes.length} Unterseiten
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="ml-2 flex items-center gap-1">
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Musteransicht"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewType(tmpl.type);
                          }}
                        >
                          <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </button>
                        {selectedType === tmpl.type ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {catTemplates.some((t) => t.type === selectedType) && (
              <div className="mt-3">
                <TemplateDetailPanel
                  template={templates.find((t) => t.type === selectedType)!}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}
