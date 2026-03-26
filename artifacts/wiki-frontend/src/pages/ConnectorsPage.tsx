import { useState } from "react";
import { SharePointBrowser } from "@/components/settings/SharePointBrowser";
import {
  SharePointSiteDrivePicker,
  type SharePointSelection,
} from "@/components/settings/SharePointSiteDrivePicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Database,
  Plus,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  HardDrive,
  Activity,
  Library,
  ShieldCheck,
  BookOpen,
  Image,
  Archive,
  Lock,
  Unlock,
  Loader2,
  XCircle,
  Info,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSourceSystems,
  useCreateSourceSystem,
  useUpdateSourceSystem,
  useDeleteSourceSystem,
  useTriggerSync,
  useValidateSourceSystem,
  useListStorageProviders,
  useCreateStorageProvider,
  useUpdateStorageProvider,
  useGetSyncStatus,
  getListSourceSystemsQueryKey,
  getListStorageProvidersQueryKey,
  getGetSyncStatusQueryKey,
} from "@workspace/api-client-react";

const PURPOSE_LABELS: Record<string, { label: string; icon: typeof BookOpen; color: string }> = {
  knowledge_source: { label: "Wissensquelle", icon: BookOpen, color: "text-blue-600" },
  media_archive: { label: "Medienarchiv", icon: Image, color: "text-purple-600" },
  backup_target: { label: "Backup-Ziel", icon: Archive, color: "text-amber-600" },
};

const ACCESS_MODE_LABELS: Record<string, { label: string; icon: typeof Lock }> = {
  read_only: { label: "Nur Lesen", icon: Lock },
  read_write: { label: "Lesen & Schreiben", icon: Unlock },
};

export function ConnectorsPage({ embedded }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [showCreateSystem, setShowCreateSystem] = useState(false);
  const [showCreateProvider, setShowCreateProvider] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "systems" | "providers" | "status" | "sharepoint"
  >("systems");

  return (
    <div
      className={
        embedded ? "space-y-6" : "max-w-6xl mx-auto py-6 px-4 space-y-6"
      }
    >
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="w-6 h-6" />
              Konnektoren & Quellsysteme
            </h1>
            <p className="text-muted-foreground mt-1">
              Verwalten Sie externe Quellsysteme, Speicheranbieter und
              Synchronisation
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "systems" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("systems")}
        >
          <Database className="w-4 h-4 mr-2" />
          Quellsysteme
        </Button>
        <Button
          variant={activeTab === "providers" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("providers")}
        >
          <HardDrive className="w-4 h-4 mr-2" />
          Speicheranbieter
        </Button>
        <Button
          variant={activeTab === "status" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("status")}
        >
          <Activity className="w-4 h-4 mr-2" />
          Sync-Status
        </Button>
        <Button
          variant={activeTab === "sharepoint" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("sharepoint")}
        >
          <Library className="w-4 h-4 mr-2" />
          SharePoint-Bibliotheken
        </Button>
      </div>

      {activeTab === "systems" && (
        <SourceSystemsTab
          onCreateClick={() => setShowCreateSystem(true)}
          queryClient={queryClient}
        />
      )}
      {activeTab === "providers" && (
        <StorageProvidersTab
          onCreateClick={() => setShowCreateProvider(true)}
          queryClient={queryClient}
        />
      )}
      {activeTab === "status" && <SyncStatusTab queryClient={queryClient} />}
      {activeTab === "sharepoint" && <SharePointBrowserTab />}

      {showCreateSystem && (
        <CreateSourceSystemDialog
          onClose={() => setShowCreateSystem(false)}
          queryClient={queryClient}
        />
      )}
      {showCreateProvider && (
        <CreateStorageProviderDialog
          onClose={() => setShowCreateProvider(false)}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

function SourceSystemsTab({
  onCreateClick,
  queryClient,
}: {
  onCreateClick: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const { data: systems, isLoading } = useListSourceSystems();
  const triggerSync = useTriggerSync();
  const validateSystem = useValidateSourceSystem();
  const deleteSystem = useDeleteSourceSystem();
  const [editingSystem, setEditingSystem] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [validationResult, setValidationResult] = useState<{
    systemId: string;
    valid: boolean;
    checks: Array<{ check: string; status: "ok" | "warning" | "error"; message: string }>;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onCreateClick}>
          <Plus className="w-4 h-4 mr-2" />
          Quellsystem hinzufügen
        </Button>
      </div>

      {(!systems || systems.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Noch keine Quellsysteme konfiguriert</p>
            <p className="text-sm mt-1">
              Verbinden Sie SharePoint oder andere Quellsysteme
            </p>
          </CardContent>
        </Card>
      )}

      {systems?.map((system) => {
        const purposeInfo = PURPOSE_LABELS[system.purpose ?? "knowledge_source"];
        const accessInfo = ACCESS_MODE_LABELS[system.accessMode ?? "read_only"];
        const PurposeIcon = purposeInfo?.icon ?? BookOpen;
        const AccessIcon = accessInfo?.icon ?? Lock;
        const connConfig = (system as unknown as Record<string, unknown>).connectionConfig as Record<string, string> | null;

        return (
          <Card key={system.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{system.name}</CardTitle>
                  <Badge variant={system.isActive ? "default" : "secondary"}>
                    {system.isActive ? "Aktiv" : "Inaktiv"}
                  </Badge>
                  <Badge variant="outline">{system.systemType}</Badge>
                  {purposeInfo && (
                    <Badge variant="outline" className={purposeInfo.color}>
                      <PurposeIcon className="w-3 h-3 mr-1" />
                      {purposeInfo.label}
                    </Badge>
                  )}
                  {accessInfo && (
                    <Badge variant="outline">
                      <AccessIcon className="w-3 h-3 mr-1" />
                      {accessInfo.label}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      validateSystem.mutate(
                        { systemId: system.id! },
                        {
                          onSuccess: (data) => {
                            const result = data as { valid: boolean; checks: Array<{ check: string; status: "ok" | "warning" | "error"; message: string }> };
                            setValidationResult({
                              systemId: system.id!,
                              valid: result.valid,
                              checks: result.checks,
                            });
                          },
                          onError: () => {
                            setValidationResult({
                              systemId: system.id!,
                              valid: false,
                              checks: [{ check: "connection", status: "error" as const, message: "Validierung fehlgeschlagen – bitte versuchen Sie es erneut." }],
                            });
                          },
                        },
                      );
                    }}
                    disabled={validateSystem.isPending}
                  >
                    {validateSystem.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 mr-1" />
                    )}
                    Prüfen
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      triggerSync.mutate(
                        { systemId: system.id! },
                        {
                          onSuccess: () => {
                            queryClient.invalidateQueries({
                              queryKey: getListSourceSystemsQueryKey(),
                            });
                            queryClient.invalidateQueries({
                              queryKey: getGetSyncStatusQueryKey(),
                            });
                          },
                        },
                      );
                    }}
                    disabled={triggerSync.isPending}
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-1 ${triggerSync.isPending ? "animate-spin" : ""}`}
                    />
                    Sync
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditingSystem(
                        system as unknown as Record<string, unknown>,
                      )
                    }
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Quellsystem wirklich löschen?")) {
                        deleteSystem.mutate(
                          { systemId: system.id! },
                          {
                            onSuccess: () => {
                              queryClient.invalidateQueries({
                                queryKey: getListSourceSystemsQueryKey(),
                              });
                            },
                          },
                        );
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                Slug: {system.slug} | Referenzen:{" "}
                {String(
                  (system as unknown as Record<string, unknown>).referenceCount ??
                    0,
                )}
                {connConfig?.siteName && ` | Site: ${connConfig.siteName}`}
                {connConfig?.driveName && ` | Bibliothek: ${connConfig.driveName}`}
                {connConfig?.folderName && ` | Ordner: ${connConfig.folderName}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Letzte Sync:{" "}
                  {system.lastSyncAt
                    ? new Date(system.lastSyncAt).toLocaleString("de-DE")
                    : "Nie"}
                </span>
                {system.syncEnabled && (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Alle {system.syncIntervalMinutes} Minuten
                  </span>
                )}
                {system.lastSyncError && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {system.lastSyncError}
                  </span>
                )}
              </div>
              {validationResult && validationResult.systemId === system.id && (
                <div className="mt-3 border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {validationResult.valid ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">
                        {validationResult.valid ? "Konfiguration gültig" : "Konfigurationsprobleme gefunden"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setValidationResult(null)}
                    >
                      Schließen
                    </Button>
                  </div>
                  {validationResult.checks.map((check, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      {check.status === "ok" && <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />}
                      {check.status === "error" && <XCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />}
                      {check.status === "warning" && <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />}
                      <span className={check.status === "error" ? "text-destructive" : check.status === "warning" ? "text-amber-600" : "text-muted-foreground"}>
                        {check.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {editingSystem && (
        <EditSourceSystemDialog
          system={editingSystem}
          onClose={() => setEditingSystem(null)}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

function EditSourceSystemDialog({
  system,
  onClose,
  queryClient,
}: {
  system: Record<string, unknown>;
  onClose: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const connConfig = (system.connectionConfig ?? {}) as Record<string, string>;

  const [name, setName] = useState(system.name as string);
  const [purpose, setPurpose] = useState((system.purpose as string) || "knowledge_source");
  const [accessMode, setAccessMode] = useState((system.accessMode as string) || "read_only");
  const [isActive, setIsActive] = useState(system.isActive as boolean);
  const [syncEnabled, setSyncEnabled] = useState(system.syncEnabled as boolean);
  const [syncInterval, setSyncInterval] = useState(
    String(system.syncIntervalMinutes ?? 60),
  );
  const initialSp: SharePointSelection | null =
    connConfig.siteId && connConfig.driveId
      ? {
          siteId: connConfig.siteId,
          siteName: connConfig.siteName ?? connConfig.siteId,
          driveId: connConfig.driveId,
          driveName: connConfig.driveName ?? connConfig.driveId,
          folderId: connConfig.folderId ?? undefined,
          folderName: connConfig.folderName ?? undefined,
          folderPath: connConfig.folderPath ?? undefined,
          itemId: connConfig.itemId ?? undefined,
          itemName: connConfig.itemName ?? undefined,
          isFolder: connConfig.isFolder != null ? Boolean(connConfig.isFolder) : undefined,
        }
      : null;
  const [spSelection, setSpSelection] = useState<SharePointSelection | null>(
    initialSp,
  );
  const updateSystem = useUpdateSourceSystem();

  const isSharePoint = system.systemType === "sharepoint";

  const handleSave = () => {
    const data: Record<string, unknown> = {
      name,
      purpose,
      accessMode,
      isActive,
      syncEnabled,
      syncIntervalMinutes: parseInt(syncInterval, 10),
    };

    if (isSharePoint && spSelection) {
      data.connectionConfig = {
        siteId: spSelection.siteId,
        siteName: spSelection.siteName,
        driveId: spSelection.driveId,
        driveName: spSelection.driveName,
        ...(spSelection.folderId && { folderId: spSelection.folderId }),
        ...(spSelection.folderName && { folderName: spSelection.folderName }),
        ...(spSelection.folderPath && { folderPath: spSelection.folderPath }),
        ...(spSelection.itemId && { itemId: spSelection.itemId }),
        ...(spSelection.itemName && { itemName: spSelection.itemName }),
        ...(spSelection.isFolder != null && { isFolder: spSelection.isFolder }),
      };
    }

    updateSystem.mutate(
      { systemId: system.id as string, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListSourceSystemsQueryKey(),
          });
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Quellsystem bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Zweck</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="knowledge_source">Wissensquelle</SelectItem>
                <SelectItem value="media_archive">Medienarchiv</SelectItem>
                <SelectItem value="backup_target">Backup-Ziel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Zugriffsmodus</Label>
            <Select value={accessMode} onValueChange={setAccessMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read_only">Nur Lesen</SelectItem>
                <SelectItem value="read_write">Lesen & Schreiben</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Aktiv</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
            <Label>Automatische Synchronisation</Label>
          </div>
          {syncEnabled && (
            <div>
              <Label>Sync-Intervall (Minuten)</Label>
              <Input
                type="number"
                value={syncInterval}
                onChange={(e) => setSyncInterval(e.target.value)}
                min={5}
              />
            </div>
          )}

          {isSharePoint && (
            <div>
              <Label className="mb-2 block">
                SharePoint Site, Bibliothek & Ordner/Datei auswählen
              </Label>
              <SharePointSiteDrivePicker
                value={spSelection}
                onChange={setSpSelection}
                mode="source"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name || updateSystem.isPending}
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StorageProvidersTab({
  onCreateClick,
  queryClient,
}: {
  onCreateClick: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const { data: providers, isLoading } = useListStorageProviders();
  const updateProvider = useUpdateStorageProvider();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onCreateClick}>
          <Plus className="w-4 h-4 mr-2" />
          Speicheranbieter hinzufügen
        </Button>
      </div>

      {(!providers || providers.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <HardDrive className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Noch keine Speicheranbieter konfiguriert</p>
            <p className="text-sm mt-1">
              Lokal-Speicher wird als Standard verwendet
            </p>
          </CardContent>
        </Card>
      )}

      {providers?.map((provider) => {
        const purposeInfo = PURPOSE_LABELS[provider.purpose ?? "media_archive"];
        const accessInfo = ACCESS_MODE_LABELS[provider.accessMode ?? "read_write"];
        const PurposeIcon = purposeInfo?.icon ?? Image;
        const AccessIcon = accessInfo?.icon ?? Unlock;

        return (
          <Card key={provider.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{provider.name}</CardTitle>
                  <Badge variant={provider.isActive ? "default" : "secondary"}>
                    {provider.isActive ? "Aktiv" : "Inaktiv"}
                  </Badge>
                  <Badge variant="outline">{provider.providerType}</Badge>
                  {purposeInfo && (
                    <Badge variant="outline" className={purposeInfo.color}>
                      <PurposeIcon className="w-3 h-3 mr-1" />
                      {purposeInfo.label}
                    </Badge>
                  )}
                  {accessInfo && (
                    <Badge variant="outline">
                      <AccessIcon className="w-3 h-3 mr-1" />
                      {accessInfo.label}
                    </Badge>
                  )}
                  {provider.isDefault && (
                    <Badge
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Standard
                    </Badge>
                  )}
                </div>
              <div className="flex items-center gap-2">
                {!provider.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateProvider.mutate(
                        {
                          providerId: provider.id!,
                          data: { isDefault: true },
                        },
                        {
                          onSuccess: () => {
                            queryClient.invalidateQueries({
                              queryKey: getListStorageProvidersQueryKey(),
                            });
                          },
                        },
                      );
                    }}
                  >
                    Als Standard setzen
                  </Button>
                )}
              </div>
            </div>
            <CardDescription>Slug: {provider.slug}</CardDescription>
          </CardHeader>
        </Card>
        );
      })}
    </div>
  );
}

function SyncStatusTab({
  queryClient,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const { data: statusList, isLoading } = useGetSyncStatus();
  const triggerSync = useTriggerSync();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            queryClient.invalidateQueries({
              queryKey: getGetSyncStatusQueryKey(),
            })
          }
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      {(!statusList || statusList.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Keine aktiven Quellsysteme</p>
          </CardContent>
        </Card>
      )}

      {statusList?.map((entry) => {
        const hasIssues =
          (entry.staleReferences ?? 0) > 0 ||
          (entry.errorReferences ?? 0) > 0 ||
          (entry.notFoundReferences ?? 0) > 0;

        return (
          <Card key={entry.systemId}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{entry.systemName}</CardTitle>
                  <Badge variant="outline">{entry.systemType}</Badge>
                  {entry.purpose && PURPOSE_LABELS[entry.purpose] && (
                    <Badge variant="outline" className={PURPOSE_LABELS[entry.purpose].color}>
                      {PURPOSE_LABELS[entry.purpose].label}
                    </Badge>
                  )}
                  {hasIssues ? (
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Probleme
                    </Badge>
                  ) : (
                    <Badge
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      OK
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    triggerSync.mutate(
                      { systemId: entry.systemId! },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({
                            queryKey: getGetSyncStatusQueryKey(),
                          });
                          queryClient.invalidateQueries({
                            queryKey: getListSourceSystemsQueryKey(),
                          });
                        },
                      },
                    );
                  }}
                  disabled={triggerSync.isPending}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-1 ${triggerSync.isPending ? "animate-spin" : ""}`}
                  />
                  Jetzt synchronisieren
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Referenzen</p>
                  <p className="text-2xl font-semibold">
                    {entry.totalReferences ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aktuell</p>
                  <p className="text-2xl font-semibold text-green-600">
                    {(entry.totalReferences ?? 0) -
                      (entry.staleReferences ?? 0) -
                      (entry.errorReferences ?? 0) -
                      (entry.notFoundReferences ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Veraltet</p>
                  <p className="text-2xl font-semibold text-amber-600">
                    {entry.staleReferences ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fehler</p>
                  <p className="text-2xl font-semibold text-red-600">
                    {entry.errorReferences ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Nicht gefunden
                  </p>
                  <p className="text-2xl font-semibold text-red-500">
                    {entry.notFoundReferences ?? 0}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                <span>
                  Letzte Sync:{" "}
                  {entry.lastSyncAt
                    ? new Date(entry.lastSyncAt).toLocaleString("de-DE")
                    : "Nie"}
                </span>
                {entry.syncEnabled && (
                  <span>Intervall: {entry.syncIntervalMinutes} Min</span>
                )}
                {entry.lastSyncError && (
                  <span className="text-destructive">
                    {entry.lastSyncError}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CreateSourceSystemDialog({
  onClose,
  queryClient,
}: {
  onClose: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [systemType, setSystemType] = useState("sharepoint");
  const [purpose, setPurpose] = useState("knowledge_source");
  const [accessMode, setAccessMode] = useState("read_only");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState("60");
  const [spSelection, setSpSelection] = useState<SharePointSelection | null>(
    null,
  );
  const createSystem = useCreateSourceSystem();

  const handleSpSelect = (sel: SharePointSelection | null) => {
    setSpSelection(sel);
    if (sel && !name) {
      const autoName = `SharePoint – ${sel.siteName}`;
      setName(autoName);
      setSlug(
        autoName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      );
    }
  };

  const handleCreate = () => {
    if (!name || !slug) return;
    const data: Record<string, unknown> = {
      name,
      slug,
      systemType,
      purpose,
      accessMode,
      syncEnabled,
      syncIntervalMinutes: parseInt(syncInterval, 10),
    };
    if (systemType === "sharepoint" && spSelection) {
      data.connectionConfig = {
        siteId: spSelection.siteId,
        siteName: spSelection.siteName,
        driveId: spSelection.driveId,
        driveName: spSelection.driveName,
        ...(spSelection.folderId && { folderId: spSelection.folderId }),
        ...(spSelection.folderName && { folderName: spSelection.folderName }),
        ...(spSelection.folderPath && { folderPath: spSelection.folderPath }),
        ...(spSelection.itemId && { itemId: spSelection.itemId }),
        ...(spSelection.itemName && { itemName: spSelection.itemName }),
        ...(spSelection.isFolder != null && { isFolder: spSelection.isFolder }),
      };
    }
    createSystem.mutate(
      {
        data: data as unknown as Parameters<
          typeof createSystem.mutate
        >[0]["data"],
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListSourceSystemsQueryKey(),
          });
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Neues Quellsystem</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Systemtyp</Label>
            <Select value={systemType} onValueChange={setSystemType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sharepoint">SharePoint</SelectItem>
                <SelectItem value="confluence">Confluence</SelectItem>
                <SelectItem value="file_share">Dateifreigabe</SelectItem>
                <SelectItem value="custom">Benutzerdefiniert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Zweck</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="knowledge_source">Wissensquelle</SelectItem>
                <SelectItem value="media_archive">Medienarchiv</SelectItem>
                <SelectItem value="backup_target">Backup-Ziel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Zugriffsmodus</Label>
            <Select value={accessMode} onValueChange={setAccessMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read_only">Nur Lesen</SelectItem>
                <SelectItem value="read_write">Lesen & Schreiben</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {systemType === "sharepoint" && (
            <div>
              <Label className="mb-2 block">
                SharePoint Site, Bibliothek & Ordner/Datei auswählen
              </Label>
              <SharePointSiteDrivePicker
                value={spSelection}
                onChange={handleSpSelect}
                mode="source"
              />
            </div>
          )}

          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) {
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, ""),
                  );
                }
              }}
              placeholder="z.B. SharePoint QM"
            />
          </div>
          <div>
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="z.B. sharepoint-qm"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
            <Label>Automatische Synchronisation</Label>
          </div>
          {syncEnabled && (
            <div>
              <Label>Sync-Intervall (Minuten)</Label>
              <Input
                type="number"
                value={syncInterval}
                onChange={(e) => setSyncInterval(e.target.value)}
                min={5}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name || !slug || createSystem.isPending}
          >
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateStorageProviderDialog({
  onClose,
  queryClient,
}: {
  onClose: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [providerType, setProviderType] = useState("local");
  const [purpose, setPurpose] = useState("media_archive");
  const [accessMode, setAccessMode] = useState("read_write");
  const [isDefault, setIsDefault] = useState(false);
  const [spSelection, setSpSelection] = useState<SharePointSelection | null>(
    null,
  );
  const createProvider = useCreateStorageProvider();

  const handleSpSelect = (sel: SharePointSelection | null) => {
    setSpSelection(sel);
    if (sel && !name) {
      const autoName = `SharePoint – ${sel.driveName}`;
      setName(autoName);
      setSlug(
        autoName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      );
    }
  };

  const handleCreate = () => {
    if (!name || !slug) return;
    const config =
      providerType === "sharepoint" && spSelection
        ? {
            siteId: spSelection.siteId,
            siteName: spSelection.siteName,
            driveId: spSelection.driveId,
            driveName: spSelection.driveName,
            ...(spSelection.folderId && { folderId: spSelection.folderId }),
            ...(spSelection.folderName && { folderName: spSelection.folderName }),
            ...(spSelection.folderPath && { folderPath: spSelection.folderPath }),
            ...(spSelection.isFolder != null && { isFolder: spSelection.isFolder }),
          }
        : undefined;
    createProvider.mutate(
      {
        data: {
          name,
          slug,
          providerType,
          purpose: purpose as "knowledge_source" | "media_archive" | "backup_target",
          accessMode: accessMode as "read_only" | "read_write",
          isDefault,
          config: config as Record<string, unknown> | undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListStorageProvidersQueryKey(),
          });
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Neuer Speicheranbieter</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Anbietertyp</Label>
            <Select value={providerType} onValueChange={setProviderType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Lokal</SelectItem>
                <SelectItem value="sharepoint">SharePoint</SelectItem>
                <SelectItem value="azure_blob">Azure Blob Storage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Zweck</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="knowledge_source">Wissensquelle</SelectItem>
                <SelectItem value="media_archive">Medienarchiv</SelectItem>
                <SelectItem value="backup_target">Backup-Ziel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Zugriffsmodus</Label>
            <Select value={accessMode} onValueChange={setAccessMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read_only">Nur Lesen</SelectItem>
                <SelectItem value="read_write">Lesen & Schreiben</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {providerType === "sharepoint" && (
            <div>
              <Label className="mb-2 block">
                SharePoint Site, Bibliothek & Ordner auswählen
              </Label>
              <SharePointSiteDrivePicker
                value={spSelection}
                onChange={handleSpSelect}
                mode="storage"
              />
            </div>
          )}

          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) {
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, ""),
                  );
                }
              }}
              placeholder="z.B. SharePoint Dokumente"
            />
          </div>
          <div>
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="z.B. sharepoint-docs"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            <Label>Als Standard setzen</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name || !slug || createProvider.isPending}
          >
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SharePointBrowserTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Library className="w-5 h-5" />
          SharePoint-Bibliotheken
        </CardTitle>
        <CardDescription>
          Durchsuchen Sie SharePoint-Sites, Dokumentbibliotheken und Dateien
          Ihrer Organisation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SharePointBrowser />
      </CardContent>
    </Card>
  );
}
