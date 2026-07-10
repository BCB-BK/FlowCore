import { useEffect, useState, type ReactElement } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/card";
import { Button } from "@workspace/ui/button";
import { Badge } from "@workspace/ui/badge";
import { Input } from "@workspace/ui/input";
import { Label } from "@workspace/ui/label";
import { Switch } from "@workspace/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/table";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  PlayCircle,
  Download,
  ShieldCheck,
  Database,
  History,
  FileSearch,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

interface ConnectionPayload {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

interface TestConnectionResult {
  success: boolean;
  message: string;
  tokenAcquired: boolean;
  connectionExists: boolean | null;
  connection: ConnectionPayload;
}

interface ReadinessCheckItem {
  key: string;
  label: string;
  status: "ok" | "warning" | "failed" | "not_checkable";
  message: string;
}

interface ReadinessCheckResult {
  overall: "ready" | "not_ready" | "partial";
  checks: ReadinessCheckItem[];
}

interface IndexStatusPage {
  nodeId: string;
  immutableId: string;
  title: string;
  displayCode: string;
  itemId: string;
  indexStatus: string;
  lastError: string | null;
  lastSyncedAt: string | null;
}

interface IndexStatusGlossary {
  termId: string;
  term: string;
  itemId: string;
  indexStatus: string;
  lastError: string | null;
  lastSyncedAt: string | null;
}

interface SyncLogEntry {
  id: string;
  itemId: string;
  itemType: string;
  operation: string;
  result: string;
  reason: string | null;
  dryRun: boolean;
  createdAt: string;
}

interface GroupMapping {
  tier: string;
  entraGroupId: string | null;
  label: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: ReactElement; variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
    ok: { icon: <CheckCircle className="h-3 w-3" />, variant: "default", label: "OK" },
    ready: { icon: <CheckCircle className="h-3 w-3" />, variant: "default", label: "Bereit" },
    success: { icon: <CheckCircle className="h-3 w-3" />, variant: "default", label: "Erfolgreich" },
    synced: { icon: <CheckCircle className="h-3 w-3" />, variant: "default", label: "Synchronisiert" },
    warning: { icon: <AlertTriangle className="h-3 w-3" />, variant: "secondary", label: "Warnung" },
    partial: { icon: <AlertTriangle className="h-3 w-3" />, variant: "secondary", label: "Teilweise" },
    skipped: { icon: <AlertTriangle className="h-3 w-3" />, variant: "secondary", label: "Übersprungen" },
    failed: { icon: <XCircle className="h-3 w-3" />, variant: "destructive", label: "Fehlgeschlagen" },
    not_ready: { icon: <XCircle className="h-3 w-3" />, variant: "destructive", label: "Nicht bereit" },
    not_indexed: { icon: <HelpCircle className="h-3 w-3" />, variant: "outline", label: "Nicht indexiert" },
    not_checkable: { icon: <HelpCircle className="h-3 w-3" />, variant: "outline", label: "Nicht prüfbar" },
  };
  const cfg = map[status] ?? { icon: <HelpCircle className="h-3 w-3" />, variant: "outline" as const, label: status };
  return (
    <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("de-DE");
}

export function GraphConnectorTab() {
  const [connection, setConnection] = useState<ConnectionPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);

  const [readiness, setReadiness] = useState<ReadinessCheckResult | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);

  const [schemaRegistering, setSchemaRegistering] = useState(false);
  const [schemaResult, setSchemaResult] = useState<{ dryRun: boolean; message?: string } | null>(null);

  const [syncBusy, setSyncBusy] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ label: string; data: unknown } | null>(null);

  const [pageStatus, setPageStatus] = useState<IndexStatusPage[]>([]);
  const [glossaryStatus, setGlossaryStatus] = useState<IndexStatusGlossary[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);

  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const [groupMappings, setGroupMappings] = useState<GroupMapping[]>([]);
  const [glossarySyncEnabled, setGlossarySyncEnabled] = useState(true);
  const [glossarySyncLoading, setGlossarySyncLoading] = useState(false);
  const [singleItemId, setSingleItemId] = useState("");
  const [singleItemType, setSingleItemType] = useState<"page" | "glossary">("page");
  const [aclPreview, setAclPreview] = useState<unknown>(null);
  const [aclPreviewLoading, setAclPreviewLoading] = useState(false);

  const loadConnection = () => {
    setLoading(true);
    customFetch<ConnectionPayload>("/api/graph-connector/connection")
      .then(setConnection)
      .catch(() => setConnection(null))
      .finally(() => setLoading(false));
  };

  const loadIndexStatus = () => {
    setStatusLoading(true);
    Promise.all([
      customFetch<{ entries: IndexStatusPage[] }>("/api/graph-connector/index-status/pages"),
      customFetch<{ entries: IndexStatusGlossary[] }>("/api/graph-connector/index-status/glossary"),
    ])
      .then(([pages, glossary]) => {
        setPageStatus(pages.entries);
        setGlossaryStatus(glossary.entries);
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  };

  const loadSyncLog = () => {
    setLogLoading(true);
    customFetch<{ entries: SyncLogEntry[] }>("/api/graph-connector/sync/log?limit=50")
      .then((res) => setSyncLog(res.entries))
      .catch(() => {})
      .finally(() => setLogLoading(false));
  };

  const loadGroupMappings = () => {
    customFetch<{ mappings: GroupMapping[] }>("/api/graph-connector/group-mappings")
      .then((res) => setGroupMappings(res.mappings))
      .catch(() => {});
  };

  const loadGlossarySyncSetting = () => {
    customFetch<{ settings: Record<string, string> }>("/api/admin/system-settings")
      .then((res) => setGlossarySyncEnabled(res.settings.glossary_sync_enabled !== "false"))
      .catch(() => {});
  };

  useEffect(() => {
    loadConnection();
    loadIndexStatus();
    loadSyncLog();
    loadGroupMappings();
    loadGlossarySyncSetting();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await customFetch<TestConnectionResult>("/api/graph-connector/test-connection", {
        method: "POST",
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Verbindungstest fehlgeschlagen",
        tokenAcquired: false,
        connectionExists: null,
        connection: connection ?? { id: "", name: "" },
      });
    } finally {
      setTesting(false);
    }
  };

  const handleReadinessCheck = async () => {
    setReadinessLoading(true);
    try {
      const result = await customFetch<ReadinessCheckResult>("/api/graph-connector/readiness-check");
      setReadiness(result);
    } catch {
      setReadiness(null);
    } finally {
      setReadinessLoading(false);
    }
  };

  const handleSchemaAction = async (dryRun: boolean) => {
    setSchemaRegistering(true);
    setSchemaResult(null);
    try {
      const result = await customFetch<{ dryRun: boolean; message?: string }>(
        "/api/graph-connector/schema/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dryRun }),
        },
      );
      setSchemaResult(result);
    } catch (err) {
      setSchemaResult({ dryRun, message: err instanceof Error ? err.message : "Fehler bei Schema-Registrierung" });
    } finally {
      setSchemaRegistering(false);
    }
  };

  const handleSync = async (kind: "full" | "delta", dryRun: boolean) => {
    const key = `${kind}-${dryRun ? "dry" : "live"}`;
    setSyncBusy(key);
    setSyncResult(null);
    try {
      const path =
        kind === "full"
          ? "/api/graph-connector/sync/full"
          : "/api/graph-connector/sync/delta";
      const result = await customFetch<unknown>(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: kind === "full" ? JSON.stringify({ dryRun }) : undefined,
      });
      setSyncResult({ label: `${kind === "full" ? "Vollsynchronisation" : "Delta-Synchronisation"}${dryRun ? " (Probelauf)" : ""}`, data: result });
      loadIndexStatus();
      loadSyncLog();
    } catch (err) {
      setSyncResult({ label: "Fehler", data: { error: err instanceof Error ? err.message : String(err) } });
    } finally {
      setSyncBusy(null);
    }
  };

  const handleSingleItemSync = async (dryRun: boolean) => {
    if (!singleItemId.trim()) return;
    const key = `single-${dryRun ? "dry" : "live"}`;
    setSyncBusy(key);
    setSyncResult(null);
    try {
      const path =
        singleItemType === "page"
          ? `/api/graph-connector/sync/pages/${singleItemId.trim()}`
          : `/api/graph-connector/sync/glossary/${singleItemId.trim()}`;
      const result = await customFetch<unknown>(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      setSyncResult({
        label: `Einzelsynchronisation (${singleItemType === "page" ? "Seite" : "Glossar"})${dryRun ? " (Probelauf)" : ""}`,
        data: result,
      });
      loadIndexStatus();
      loadSyncLog();
    } catch (err) {
      setSyncResult({ label: "Fehler", data: { error: err instanceof Error ? err.message : String(err) } });
    } finally {
      setSyncBusy(null);
    }
  };

  const handleAclPreview = async () => {
    if (!singleItemId.trim() || singleItemType !== "page") return;
    setAclPreviewLoading(true);
    setAclPreview(null);
    try {
      const result = await customFetch<unknown>(`/api/graph-connector/acl-preview/${singleItemId.trim()}`);
      setAclPreview(result);
    } catch (err) {
      setAclPreview({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setAclPreviewLoading(false);
    }
  };

  const handleExportLog = () => {
    const url = "/api/graph-connector/sync/log/export?limit=1000";
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Microsoft Graph Connection
              <Badge variant="secondary">Vorschau · nicht abgeschlossen</Badge>
            </CardTitle>
            {connection && <Badge variant="outline">{connection.id}</Badge>}
          </div>
          <CardDescription>
            Copilot Studio / Microsoft Search Enterprise-Data-Connector für FlowCore-Inhalte.
            Optionale, separate Funktion für die passive Hintergrund-Indexierung — erfordert eine
            externe Verbindungs-ID aus dem Microsoft-365-Tenant, die noch nicht hinterlegt ist. Dies
            betrifft nicht den API-Key-Custom-Connector (siehe Tab „Copilot Connector-Keys").
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Lade Konfiguration…</div>
          ) : connection ? (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span>{connection.name}</span>
              </div>
              {connection.description ? (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Beschreibung</span>
                  <span className="text-right">{String(connection.description)}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-amber-600">Verbindungskonfiguration konnte nicht geladen werden.</div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={handleTestConnection} disabled={testing}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${testing ? "animate-spin" : ""}`} />
              Verbindung testen
            </Button>
            <Button size="sm" variant="outline" onClick={handleReadinessCheck} disabled={readinessLoading}>
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              Copilot-Studio-Bereitschaft prüfen
            </Button>
          </div>

          {testResult && (
            <div
              className={`rounded-md border p-3 text-sm ${
                testResult.success
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                  : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
              }`}
            >
              <p className="font-medium flex items-center gap-1.5">
                {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {testResult.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Token bezogen: {testResult.tokenAcquired ? "ja" : "nein"} · Verbindung vorhanden:{" "}
                {testResult.connectionExists === null ? "unbekannt" : testResult.connectionExists ? "ja" : "nein"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 italic">
                Dieser Test synchronisiert keine Inhalte.
              </p>
            </div>
          )}

          {readiness && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Gesamtstatus</span>
                <StatusBadge status={readiness.overall} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prüfung</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hinweis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readiness.checks.map((check) => (
                    <TableRow key={check.key}>
                      <TableCell className="font-medium">{check.label}</TableCell>
                      <TableCell>
                        <StatusBadge status={check.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{check.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Schema</CardTitle>
          <CardDescription>Externes Schema für die Connection prüfen und registrieren</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => handleSchemaAction(true)} disabled={schemaRegistering}>
              Schema-Check (Probelauf)
            </Button>
            <Button size="sm" onClick={() => handleSchemaAction(false)} disabled={schemaRegistering}>
              Schema registrieren
            </Button>
          </div>
          {schemaResult && (
            <div className="rounded-md border p-3 text-sm bg-muted/40">
              <p>{schemaResult.dryRun ? "Probelauf abgeschlossen." : "Schema registriert."}</p>
              {schemaResult.message && <p className="text-xs text-muted-foreground mt-1">{schemaResult.message}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Synchronisation</CardTitle>
          <CardDescription>
            Vollsynchronisation, Delta-Synchronisation und Einzelitem-Synchronisation. Probeläufe schreiben nichts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => handleSync("full", true)} disabled={!!syncBusy}>
              Vollsync (Probelauf)
            </Button>
            <Button size="sm" onClick={() => handleSync("full", false)} disabled={!!syncBusy}>
              <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
              Vollsync starten
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleSync("delta", false)} disabled={!!syncBusy}>
              Delta-Sync ausführen
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Glossar</p>
              <p className="text-xs text-muted-foreground">
                Glossarbegriffe werden bei Voll- und Delta-Synchronisation sowie in der Copilot-Suche
                und im Copilot-Export ber{"ü"}cksichtigt
              </p>
            </div>
            <Switch
              checked={glossarySyncEnabled}
              disabled={glossarySyncLoading}
              onCheckedChange={async (checked) => {
                setGlossarySyncLoading(true);
                try {
                  await customFetch("/api/admin/system-settings/glossary_sync_enabled", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ value: checked ? "true" : "false" }),
                  });
                  setGlossarySyncEnabled(checked);
                } catch {
                }
                setGlossarySyncLoading(false);
              }}
            />
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <Label className="text-xs text-muted-foreground">Einzelitem-Synchronisation</Label>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={singleItemType}
                onChange={(e) => setSingleItemType(e.target.value as "page" | "glossary")}
              >
                <option value="page">Seite (Node-ID)</option>
                <option value="glossary">Glossarbegriff (Term-ID)</option>
              </select>
              <Input
                className="max-w-xs"
                placeholder="ID einfügen"
                value={singleItemId}
                onChange={(e) => setSingleItemId(e.target.value)}
              />
              <Button size="sm" variant="outline" disabled={!singleItemId.trim() || !!syncBusy} onClick={() => handleSingleItemSync(true)}>
                Probelauf
              </Button>
              <Button size="sm" disabled={!singleItemId.trim() || !!syncBusy} onClick={() => handleSingleItemSync(false)}>
                Synchronisieren
              </Button>
              {singleItemType === "page" && (
                <Button size="sm" variant="ghost" disabled={!singleItemId.trim() || aclPreviewLoading} onClick={handleAclPreview}>
                  <FileSearch className="h-3.5 w-3.5 mr-1.5" />
                  ACL/Payload-Vorschau
                </Button>
              )}
            </div>
          </div>

          {aclPreview !== null && (
            <pre className="rounded-md border bg-muted/40 p-3 text-xs overflow-auto max-h-64">
              {JSON.stringify(aclPreview, null, 2)}
            </pre>
          )}

          {syncResult && (
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-sm font-medium">{syncResult.label}</p>
              <pre className="text-xs overflow-auto max-h-64 bg-muted/40 rounded p-2">
                {JSON.stringify(syncResult.data, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">ACL-Gruppenzuordnung</CardTitle>
          <CardDescription>Vertraulichkeitsstufen auf Entra-Gruppen abgebildet</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stufe</TableHead>
                <TableHead>Entra-Gruppe</TableHead>
                <TableHead>Bezeichnung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupMappings.map((m) => (
                <TableRow key={m.tier}>
                  <TableCell className="font-medium">{m.tier}</TableCell>
                  <TableCell className="font-mono text-xs">{m.entraGroupId ?? "—"}</TableCell>
                  <TableCell>{m.label ?? "—"}</TableCell>
                </TableRow>
              ))}
              {groupMappings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-4">
                    Keine Gruppenzuordnung konfiguriert
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Indexstatus
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={loadIndexStatus} disabled={statusLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${statusLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <CardDescription>Indexstatus pro Seite und Glossarbegriff</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Seiten ({pageStatus.length})</p>
            <div className="max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Zuletzt synchronisiert</TableHead>
                    <TableHead>Fehler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageStatus.map((p) => (
                    <TableRow key={p.nodeId}>
                      <TableCell className="text-sm">
                        {p.title}
                        <span className="block text-xs text-muted-foreground">{p.displayCode}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.indexStatus} />
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(p.lastSyncedAt)}</TableCell>
                      <TableCell className="text-xs text-destructive">{p.lastError ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {pageStatus.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">
                        Keine Seiten gefunden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Glossarbegriffe ({glossaryStatus.length})</p>
            <div className="max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Begriff</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Zuletzt synchronisiert</TableHead>
                    <TableHead>Fehler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {glossaryStatus.map((g) => (
                    <TableRow key={g.termId}>
                      <TableCell className="text-sm">{g.term}</TableCell>
                      <TableCell>
                        <StatusBadge status={g.indexStatus} />
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(g.lastSyncedAt)}</TableCell>
                      <TableCell className="text-xs text-destructive">{g.lastError ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {glossaryStatus.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">
                        Keine Glossarbegriffe gefunden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              Sync-Historie &amp; Fehlerprotokoll
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={loadSyncLog} disabled={logLoading}>
                <RefreshCw className={`h-3.5 w-3.5 ${logLoading ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportLog}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Exportieren (CSV)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zeit</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Ergebnis</TableHead>
                  <TableHead>Grund</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs">{formatDate(entry.createdAt)}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.itemId}</TableCell>
                    <TableCell className="text-xs">
                      {entry.operation}
                      {entry.dryRun && <span className="text-muted-foreground"> (Probelauf)</span>}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entry.result} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{entry.reason ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {syncLog.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-4">
                      Kein Protokoll vorhanden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
