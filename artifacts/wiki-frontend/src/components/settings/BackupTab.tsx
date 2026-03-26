import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  HardDrive,
  Play,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  RotateCcw,
  Loader2,
  Settings,
  History,
  Shield,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  SharePointSiteDrivePicker,
  type SharePointSelection,
} from "@/components/settings/SharePointSiteDrivePicker";
import {
  useGetBackupConfig,
  useUpdateBackupConfig,
  useTriggerBackup,
  useListBackupRuns,
  useRestoreBackup,
  useValidateBackupTarget,
  getGetBackupConfigQueryKey,
  getListBackupRunsQueryKey,
} from "@workspace/api-client-react";

interface BackupRunEntry {
  id: string;
  configId?: string | null;
  backupType: string;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  sizeBytes?: number | null;
  durationMs?: number | null;
  fileName?: string | null;
  driveItemId?: string | null;
  driveId?: string | null;
  manifest?: Record<string, unknown> | null;
  errorMessage?: string | null;
  log?: string | null;
  triggeredBy?: string | null;
  createdAt: string;
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "–";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return "–";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleString("de-DE");
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }
> = {
  completed: { label: "Erfolgreich", variant: "default", icon: CheckCircle },
  running: { label: "Läuft", variant: "secondary", icon: RefreshCw },
  pending: { label: "Wartend", variant: "outline", icon: Clock },
  failed: { label: "Fehlgeschlagen", variant: "destructive", icon: XCircle },
  cancelled: { label: "Abgebrochen", variant: "secondary", icon: XCircle },
};

const TYPE_LABELS: Record<string, string> = {
  manual: "Manuell",
  daily: "Täglich",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
};

function extractErrorMessage(err: unknown): string {
  if (!err) return "";
  if (err instanceof Error) {
    const axiosData = (err as Record<string, unknown>).response;
    if (axiosData && typeof axiosData === "object") {
      const data = (axiosData as Record<string, unknown>).data;
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        if (d.error && typeof d.error === "string") {
          const details = Array.isArray(d.details) ? `: ${(d.details as string[]).join(", ")}` : "";
          return `${d.error}${details}`;
        }
      }
    }
    return err.message;
  }
  return String(err);
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2 mb-4">
      <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-destructive">Fehler</p>
        <p className="text-sm text-destructive/80">{message}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onDismiss} className="shrink-0 h-6 w-6 p-0">
        <XCircle className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export function BackupTab() {
  const [activeSection, setActiveSection] = useState<"config" | "history">("config");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeSection === "config" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveSection("config")}
        >
          <Settings className="w-4 h-4 mr-2" />
          Konfiguration
        </Button>
        <Button
          variant={activeSection === "history" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveSection("history")}
        >
          <History className="w-4 h-4 mr-2" />
          Backup-Historie
        </Button>
      </div>

      {activeSection === "config" && <BackupConfigSection />}
      {activeSection === "history" && <BackupHistorySection />}
    </div>
  );
}

function BackupConfigSection() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useGetBackupConfig();
  const updateConfig = useUpdateBackupConfig();
  const triggerBackup = useTriggerBackup();
  const validateTarget = useValidateBackupTarget();

  const [enabled, setEnabled] = useState(false);
  const [interval, setInterval] = useState("daily");
  const [retainDaily, setRetainDaily] = useState("7");
  const [retainWeekly, setRetainWeekly] = useState("4");
  const [retainMonthly, setRetainMonthly] = useState("12");
  const [includeTemplates, setIncludeTemplates] = useState(true);
  const [includeConnectors, setIncludeConnectors] = useState(true);
  const [spSelection, setSpSelection] = useState<SharePointSelection | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (config && !initialized) {
      setEnabled(!!config.enabled);
      setInterval(config.interval || "daily");
      setRetainDaily(String(config.retainDaily ?? 7));
      setRetainWeekly(String(config.retainWeekly ?? 4));
      setRetainMonthly(String(config.retainMonthly ?? 12));
      setIncludeTemplates(config.includeTemplates !== false);
      setIncludeConnectors(config.includeConnectors !== false);
      if (config.targetSiteId && config.targetDriveId) {
        setSpSelection({
          siteId: config.targetSiteId,
          siteName: config.targetSiteName || config.targetSiteId,
          driveId: config.targetDriveId,
          driveName: config.targetDriveName || config.targetDriveId,
          folderId: config.targetFolderId || undefined,
          folderName: config.targetFolderName || undefined,
          folderPath: config.targetFolderPath || undefined,
          isFolder: true,
        });
      }
      setInitialized(true);
    }
  }, [config, initialized]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (spSelection?.driveId) {
        const validation = await validateTarget.mutateAsync({
          data: {
            driveId: spSelection.driveId,
            folderId: spSelection.folderId || undefined,
          },
        });
        const result = validation as unknown as { valid: boolean; error?: string };
        if (!result.valid) {
          setError(`Ungültiger SharePoint-Zielordner: ${result.error || "Ordner nicht erreichbar"}`);
          setSaving(false);
          return;
        }
      }
      await updateConfig.mutateAsync({
        data: {
          enabled,
          interval,
          retainDaily: parseInt(retainDaily, 10),
          retainWeekly: parseInt(retainWeekly, 10),
          retainMonthly: parseInt(retainMonthly, 10),
          includeTemplates,
          includeConnectors,
          targetSiteId: spSelection?.siteId || null,
          targetSiteName: spSelection?.siteName || null,
          targetDriveId: spSelection?.driveId || null,
          targetDriveName: spSelection?.driveName || null,
          targetFolderId: spSelection?.folderId || null,
          targetFolderName: spSelection?.folderName || null,
          targetFolderPath: spSelection?.folderPath || null,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetBackupConfigQueryKey() });
      setSuccess("Konfiguration gespeichert");
    } catch (err: unknown) {
      const msg = extractErrorMessage(err) || "Konfiguration konnte nicht gespeichert werden";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleManualBackup = async () => {
    setError(null);
    setSuccess(null);
    try {
      await triggerBackup.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getListBackupRunsQueryKey() });
      setSuccess("Backup wurde gestartet");
    } catch (err: unknown) {
      const msg = extractErrorMessage(err) || "Backup konnte nicht gestartet werden";
      setError(msg);
    }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {success && (
        <div className="p-3 bg-green-500/10 rounded-lg flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Backup-Konfiguration
              </CardTitle>
              <CardDescription>
                Automatische und manuelle Sicherung der Datenbank und Konfiguration
              </CardDescription>
            </div>
            <Button
              onClick={handleManualBackup}
              disabled={triggerBackup.isPending}
            >
              {triggerBackup.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Backup jetzt erstellen
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <div>
              <Label className="text-sm font-medium">Automatisches Backup</Label>
              <p className="text-xs text-muted-foreground">
                Erstellt regelmäßig automatische Sicherungen
              </p>
            </div>
          </div>

          {enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Intervall</Label>
                <Select value={interval} onValueChange={setInterval}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Täglich</SelectItem>
                    <SelectItem value="weekly">Wöchentlich</SelectItem>
                    <SelectItem value="monthly">Monatlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label className="mb-2 block">SharePoint-Zielordner</Label>
            <SharePointSiteDrivePicker
              value={spSelection}
              onChange={setSpSelection}
              mode="storage"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">Aufbewahrungsregeln</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Tägliche behalten</Label>
                <Input
                  type="number"
                  value={retainDaily}
                  onChange={(e) => setRetainDaily(e.target.value)}
                  min={1}
                  max={90}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Wöchentliche behalten</Label>
                <Input
                  type="number"
                  value={retainWeekly}
                  onChange={(e) => setRetainWeekly(e.target.value)}
                  min={1}
                  max={52}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Monatliche behalten</Label>
                <Input
                  type="number"
                  value={retainMonthly}
                  onChange={(e) => setRetainMonthly(e.target.value)}
                  min={1}
                  max={60}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Backup-Inhalte</Label>
            <div className="flex items-center gap-3">
              <Switch checked={includeTemplates} onCheckedChange={setIncludeTemplates} />
              <Label className="text-sm">Template-Definitionen einschließen</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={includeConnectors} onCheckedChange={setIncludeConnectors} />
              <Label className="text-sm">Konnektoren-Konfiguration einschließen (ohne Secrets)</Label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Konfiguration speichern
            </Button>
          </div>

          {config?.lastRunAt && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Letztes Backup: {formatDate(config.lastRunAt)}
              {config.nextRunAt && (
                <span className="ml-4">
                  Nächstes: {formatDate(config.nextRunAt)}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BackupHistorySection() {
  const queryClient = useQueryClient();
  const { data: runs, isLoading } = useListBackupRuns();
  const [logRun, setLogRun] = useState<BackupRunEntry | null>(null);
  const [restoreRun, setRestoreRun] = useState<BackupRunEntry | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const backupRuns = (runs as unknown as BackupRunEntry[]) ?? [];

  if (backupRuns.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <HardDrive className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Noch keine Backups erstellt</p>
          <p className="text-sm mt-1">
            Erstellen Sie ein manuelles Backup oder aktivieren Sie die automatische Sicherung
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Backup-Historie
          </CardTitle>
          <CardDescription>
            Übersicht aller durchgeführten Sicherungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">Datum</th>
                  <th className="py-2 pr-4 font-medium">Typ</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Größe</th>
                  <th className="py-2 pr-4 font-medium">Dauer</th>
                  <th className="py-2 pr-4 font-medium">Dateiname</th>
                  <th className="py-2 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {backupRuns.map((run) => {
                  const status = run.status || "pending";
                  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <tr key={run.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        {formatDate(run.createdAt)}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline">
                          {TYPE_LABELS[run.backupType] || run.backupType}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={statusCfg.variant}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusCfg.label}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        {formatBytes(run.sizeBytes)}
                      </td>
                      <td className="py-2 pr-4">
                        {formatDuration(run.durationMs)}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {run.fileName || "–"}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLogRun(run)}
                            title="Protokoll anzeigen"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                          {status === "completed" && run.driveItemId && (
                            (() => {
                              const manifest = run.manifest as Record<string, unknown> | null;
                              const dbFormat = (manifest?.database as Record<string, string> | undefined)?.format;
                              const isJsonFallback = dbFormat === "json_export";
                              return isJsonFallback ? (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Nur Export
                                </Badge>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRestoreRun(run)}
                                  title="Wiederherstellen"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                              );
                            })()
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {logRun && (
        <BackupLogDialog
          run={logRun}
          onClose={() => setLogRun(null)}
        />
      )}

      {restoreRun && (
        <RestoreDialog
          run={restoreRun}
          onClose={() => setRestoreRun(null)}
          queryClient={queryClient}
        />
      )}
    </>
  );
}

function BackupLogDialog({
  run,
  onClose,
}: {
  run: BackupRunEntry;
  onClose: () => void;
}) {
  const logText = run.log || "Kein Protokoll verfügbar";
  const errorMsg = run.errorMessage;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Backup-Protokoll</DialogTitle>
          <DialogDescription>
            {formatDate(run.createdAt)} – {run.fileName || "Unbenannt"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {errorMsg && (
            <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Fehler</p>
                <p className="text-sm text-destructive/80">{errorMsg}</p>
              </div>
            </div>
          )}
          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap font-mono">
            {logText}
          </pre>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RestoreDialog({
  run,
  onClose,
  queryClient,
}: {
  run: BackupRunEntry;
  onClose: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const restore = useRestoreBackup();
  const [confirmed, setConfirmed] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const handleRestore = async () => {
    setRestoreError(null);
    try {
      await restore.mutateAsync({ id: run.id });
      queryClient.invalidateQueries({ queryKey: getListBackupRunsQueryKey() });
      onClose();
    } catch (err: unknown) {
      const msg = extractErrorMessage(err) || "Wiederherstellung fehlgeschlagen";
      setRestoreError(msg);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Shield className="w-5 h-5" />
            Backup wiederherstellen
          </DialogTitle>
          <DialogDescription>
            Diese Aktion überschreibt die aktuelle Datenbank mit dem Backup-Stand.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  Warnung: Datenverlust möglich
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Alle Änderungen seit dem Backup-Zeitpunkt (
                  {formatDate(run.createdAt)}) gehen verloren.
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm space-y-1">
            <p><span className="font-medium">Datei:</span> {run.fileName || "–"}</p>
            <p><span className="font-medium">Erstellt:</span> {formatDate(run.createdAt)}</p>
            <p><span className="font-medium">Größe:</span> {formatBytes(run.sizeBytes)}</p>
          </div>

          {restoreError && (
            <ErrorBanner message={restoreError} onDismiss={() => setRestoreError(null)} />
          )}

          <div className="flex items-center gap-3">
            <Switch checked={confirmed} onCheckedChange={setConfirmed} />
            <Label className="text-sm">
              Ich verstehe die Konsequenzen und möchte fortfahren
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            onClick={handleRestore}
            disabled={!confirmed || restore.isPending}
          >
            {restore.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}
            Wiederherstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
