import { useEffect, useState } from "react";
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
import { Checkbox } from "@workspace/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/table";
import { KeyRound, Trash2, Copy, Check, PlusCircle } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

const AGENT_SCOPES = [
  "global",
  "management",
  "marketing",
  "sales",
  "product",
  "ehip",
  "es",
  "ops",
  "qm",
  "hr",
  "finance",
  "tech",
] as const;

const BRAND_SCOPES = [
  "OneCampus",
  "AoS",
  "DeLSt",
  "EHiP",
  "EHiP Academy",
  "CareerUp",
  "BCB",
] as const;

const CONFIDENTIALITY_LEVELS = [
  "public",
  "internal",
  "confidential",
  "strictly_confidential",
] as const;

const CONFIDENTIALITY_LABELS: Record<string, string> = {
  public: "Öffentlich",
  internal: "Intern",
  confidential: "Vertraulich",
  strictly_confidential: "Streng vertraulich",
};

interface ConnectorKey {
  id: string;
  name: string;
  keyPrefix: string;
  agentScopes: string[];
  brandScopes: string[];
  maxConfidentialityLevel: string;
  revoked: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

function ScopeCheckboxGrid({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={selected.includes(opt)}
            onCheckedChange={() => onToggle(opt)}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

interface ConnectorSearchResult {
  nodeId: string;
  displayCode: string;
  title: string;
  summary: string;
}

export function CopilotConnectorKeysTab() {
  const [keys, setKeys] = useState<ConnectorKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [agentScopes, setAgentScopes] = useState<string[]>([]);
  const [brandScopes, setBrandScopes] = useState<string[]>([]);
  const [maxConfidentiality, setMaxConfidentiality] = useState<string>("internal");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ id: string; apiKey: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const [testApiKey, setTestApiKey] = useState("");
  const [testQuery, setTestQuery] = useState("");
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<ConnectorSearchResult[] | null>(null);

  const loadKeys = () => {
    setLoading(true);
    customFetch<{ keys: ConnectorKey[] }>("/api/copilot/admin/keys")
      .then((data) => setKeys(data.keys))
      .catch((err) => setError(err instanceof Error ? err.message : "Keys konnten nicht geladen werden"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const toggleScope = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    setNewKey(null);
    try {
      const result = await customFetch<{ id: string; apiKey: string }>("/api/copilot/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          agentScopes,
          brandScopes,
          maxConfidentialityLevel: maxConfidentiality,
        }),
      });
      setNewKey(result);
      setName("");
      setAgentScopes([]);
      setBrandScopes([]);
      setMaxConfidentiality("internal");
      loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Key konnte nicht erstellt werden");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await customFetch(`/api/copilot/admin/keys/${id}`, { method: "DELETE" });
      loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Key konnte nicht widerrufen werden");
    } finally {
      setRevoking(null);
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    if (!testApiKey.trim() || !testQuery.trim()) return;
    setTesting(true);
    setTestError(null);
    setTestResults(null);
    try {
      const result = await customFetch<{ results: ConnectorSearchResult[] }>(
        "/api/copilot/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-FlowCore-Api-Key": testApiKey.trim(),
          },
          body: JSON.stringify({ query: testQuery.trim() }),
        },
      );
      setTestResults(result.results);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Test fehlgeschlagen");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            FlowCore Custom Connector – API-Keys
          </CardTitle>
          <CardDescription>
            Diese Keys erlauben Copilot-Studio-Spezialagenten den direkten Live-Zugriff auf
            FlowCore-Inhalte über den Custom Connector (nicht die Microsoft-Graph-Knowledge-Source,
            siehe Tab „Copilot Studio / Graph"). Jeder Key ist fest auf einen Agenten/Themenbereich,
            eine oder mehrere Marken und eine maximale Vertraulichkeitsstufe beschränkt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="connector-key-name">Name (z.B. „Spezialagent QM")</Label>
            <Input
              id="connector-key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spezialagent QM"
            />
          </div>

          <div className="grid gap-2">
            <Label>Agent-Scope (leer = unbeschränkt)</Label>
            <ScopeCheckboxGrid
              options={AGENT_SCOPES}
              selected={agentScopes}
              onToggle={(v) => toggleScope(agentScopes, setAgentScopes, v)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Marken-Scope (leer = unbeschränkt)</Label>
            <ScopeCheckboxGrid
              options={BRAND_SCOPES}
              selected={brandScopes}
              onToggle={(v) => toggleScope(brandScopes, setBrandScopes, v)}
            />
          </div>

          <div className="grid gap-2 max-w-xs">
            <Label>Maximale Vertraulichkeitsstufe</Label>
            <Select value={maxConfidentiality} onValueChange={setMaxConfidentiality}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONFIDENTIALITY_LEVELS.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>
                    {CONFIDENTIALITY_LABELS[lvl]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleCreate} disabled={creating || !name.trim()} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            {creating ? "Wird erstellt…" : "Key erstellen"}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {newKey && (
            <div className="rounded-md border bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-medium">
                Key erstellt — dieses Secret wird nur jetzt einmalig angezeigt. Bitte sicher
                hinterlegen, bevor Sie diese Seite verlassen.
              </p>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-background rounded px-2 py-1 break-all flex-1">
                  {newKey.apiKey}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1 shrink-0">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Kopiert" : "Kopieren"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Header-Name für Copilot Studio / Power Apps: <code>X-FlowCore-Api-Key</code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Verbindung testen</CardTitle>
          <CardDescription>
            Testet den Custom Connector direkt hier — unabhängig von Power Apps/Copilot Studio und
            unabhängig vom Tab „Copilot Studio / Graph". Füge einen erstellten API-Key ein (das
            Secret wird nur einmalig angezeigt, ggf. vorher sicher notiert) und stelle eine Test-Suchanfrage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="test-api-key">API-Key</Label>
            <Input
              id="test-api-key"
              value={testApiKey}
              onChange={(e) => setTestApiKey(e.target.value)}
              placeholder="fc_conn_…"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="test-query">Suchanfrage</Label>
            <Input
              id="test-query"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="z.B. Urlaubsantrag"
            />
          </div>
          <Button
            onClick={handleTest}
            disabled={testing || !testApiKey.trim() || !testQuery.trim()}
          >
            {testing ? "Teste…" : "Test ausführen"}
          </Button>

          {testError && <p className="text-sm text-destructive">{testError}</p>}

          {testResults && (
            <div className="rounded-md border p-4 space-y-2">
              {testResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Verbindung erfolgreich — aber keine passenden Treffer für diese Anfrage
                  (ggf. Scopes des Keys prüfen).
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium text-green-700 dark:text-green-500">
                    Verbindung erfolgreich — {testResults.length} Treffer
                  </p>
                  <ul className="space-y-2">
                    {testResults.map((r) => (
                      <li key={r.nodeId} className="text-sm border-b pb-2 last:border-b-0">
                        <div className="font-medium">
                          {r.title} <span className="text-muted-foreground">({r.displayCode})</span>
                        </div>
                        <div className="text-muted-foreground text-xs">{r.summary}</div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bestehende Keys</CardTitle>
          <CardDescription>Das Secret selbst wird nach der Erstellung nie wieder angezeigt.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Lädt…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Keys erstellt.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key-Präfix</TableHead>
                  <TableHead>Agent-Scope</TableHead>
                  <TableHead>Marken-Scope</TableHead>
                  <TableHead>Max. Vertraulichkeit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>
                      <code className="text-xs">{k.keyPrefix}…</code>
                    </TableCell>
                    <TableCell className="text-xs">
                      {k.agentScopes.length === 0 ? "alle" : k.agentScopes.join(", ")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {k.brandScopes.length === 0 ? "alle" : k.brandScopes.join(", ")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {CONFIDENTIALITY_LABELS[k.maxConfidentialityLevel] ?? k.maxConfidentialityLevel}
                    </TableCell>
                    <TableCell>
                      <Badge variant={k.revoked ? "destructive" : "default"}>
                        {k.revoked ? "Widerrufen" : "Aktiv"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!k.revoked && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-destructive"
                          disabled={revoking === k.id}
                          onClick={() => handleRevoke(k.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Widerrufen
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
