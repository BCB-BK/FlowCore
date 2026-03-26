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
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSourceSystems,
  useCreateSourceSystem,
  useUpdateSourceSystem,
  useDeleteSourceSystem,
  useTriggerSync,
  useListStorageProviders,
  useCreateStorageProvider,
  useUpdateStorageProvider,
  useGetSyncStatus,
  getListSourceSystemsQueryKey,
  getListStorageProvidersQueryKey,
  getGetSyncStatusQueryKey,
} from "@workspace/api-client-react";

export function ConnectorsPage() {
  const queryClient = useQueryClient();
  const [showCreateSystem, setShowCreateSystem] = useState(false);
  const [showCreateProvider, setShowCreateProvider] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "systems" | "providers" | "status"
  >("systems");

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
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
  const updateSystem = useUpdateSourceSystem();
  const deleteSystem = useDeleteSourceSystem();

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

      {systems?.map((system) => (
        <Card key={system.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">{system.name}</CardTitle>
                <Badge variant={system.isActive ? "default" : "secondary"}>
                  {system.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
                <Badge variant="outline">{system.systemType}</Badge>
              </div>
              <div className="flex items-center gap-2">
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
                  onClick={() => {
                    updateSystem.mutate(
                      {
                        systemId: system.id!,
                        data: { isActive: !system.isActive },
                      },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({
                            queryKey: getListSourceSystemsQueryKey(),
                          });
                        },
                      },
                    );
                  }}
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
          </CardContent>
        </Card>
      ))}
    </div>
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

      {providers?.map((provider) => (
        <Card key={provider.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">{provider.name}</CardTitle>
                <Badge variant={provider.isActive ? "default" : "secondary"}>
                  {provider.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
                <Badge variant="outline">{provider.providerType}</Badge>
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
      ))}
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
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState("60");
  const createSystem = useCreateSourceSystem();

  const handleCreate = () => {
    if (!name || !slug) return;
    createSystem.mutate(
      {
        data: {
          name,
          slug,
          systemType,
          syncEnabled,
          syncIntervalMinutes: parseInt(syncInterval, 10),
        },
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Quellsystem</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
  const [isDefault, setIsDefault] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [spDriveId, setSpDriveId] = useState("");
  const createProvider = useCreateStorageProvider();

  const handleCreate = () => {
    if (!name || !slug) return;
    const config =
      providerType === "sharepoint"
        ? { tenantId, clientId, clientSecret, driveId: spDriveId }
        : undefined;
    createProvider.mutate(
      {
        data: {
          name,
          slug,
          providerType,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuer Speicheranbieter</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
          {providerType === "sharepoint" && (
            <>
              <div>
                <Label>Tenant ID</Label>
                <Input
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="Azure AD Tenant ID"
                />
              </div>
              <div>
                <Label>Client ID</Label>
                <Input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="App Registration Client ID"
                />
              </div>
              <div>
                <Label>Client Secret</Label>
                <Input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="App Registration Client Secret"
                />
              </div>
              <div>
                <Label>Drive ID</Label>
                <Input
                  value={spDriveId}
                  onChange={(e) => setSpDriveId(e.target.value)}
                  placeholder="SharePoint Drive ID"
                />
              </div>
            </>
          )}
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
