import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Separator } from "@workspace/ui/separator";
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
import {
  Plug,
  Trash2,
  Copy,
  Check,
  PlusCircle,
  ChevronRight,
  ChevronDown,
  Eye,
  RefreshCw,
  Loader2,
  AlertTriangle,
  FileText,
  BookOpen,
  FileJson,
  ExternalLink,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { PAGE_TYPE_REGISTRY, type TemplateType } from "@/lib/types";
import { useRootNodes, useNodeChildren } from "@/hooks/use-nodes";

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

const BRAND_SCOPES = [
  "OneCampus",
  "AoS",
  "DeLSt",
  "EHiP",
  "EHiP Academy",
  "CareerUp",
  "BCB",
] as const;

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

interface NodeSelection {
  nodeId: string;
  mode: "include" | "exclude";
  includeDescendants: boolean;
  title?: string | null;
  displayCode?: string | null;
}

interface IntegrationKey {
  id: string;
  name: string;
  description: string | null;
  targetSystem: string | null;
  keyPrefix: string;
  maxConfidentialityLevel: string;
  templateTypes: string[];
  brandScopes: string[];
  agentScopes: string[];
  ipAllowlist: string[];
  rateLimitPerMinute: number;
  revoked: boolean;
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  requestCount: number;
  nodeSelections: NodeSelection[];
}

interface ScopePreview {
  totalPublished: number;
  accessible: number;
  byTemplateType: { templateType: string; count: number }[];
  byConfidentiality: { level: string; count: number }[];
  sample: { displayCode: string; title: string; templateType: string }[];
}

function pageTypeLabel(templateType: string): string {
  const def = PAGE_TYPE_REGISTRY[templateType as TemplateType];
  return def?.labelDe ?? templateType;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Ein Ast der Wissensstruktur. Kernprozesse stehen ganz oben; ein Häkchen gibt
 * den Ast frei, der Schalter daneben entscheidet, ob nur diese Seite oder der
 * ganze Teilbaum gemeint ist.
 */
function StructureNode({
  nodeId,
  title,
  displayCode,
  depth,
  selections,
  onToggle,
  onToggleDescendants,
}: {
  nodeId: string;
  title: string;
  displayCode: string | null;
  depth: number;
  selections: NodeSelection[];
  onToggle: (node: {
    nodeId: string;
    title: string;
    displayCode: string | null;
  }) => void;
  onToggleDescendants: (nodeId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: children } = useNodeChildren(expanded ? nodeId : undefined);
  const selection = selections.find((s) => s.nodeId === nodeId);

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label={expanded ? "Zuklappen" : "Aufklappen"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <Checkbox
          checked={!!selection}
          onCheckedChange={() => onToggle({ nodeId, title, displayCode })}
        />
        <span className="text-sm truncate flex-1">
          {displayCode && (
            <span className="text-muted-foreground mr-1.5 font-mono text-xs">
              {displayCode}
            </span>
          )}
          {title}
        </span>
        {selection && (
          <button
            type="button"
            onClick={() => onToggleDescendants(nodeId)}
            className="text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            {selection.includeDescendants
              ? "mit Unterseiten"
              : "nur diese Seite"}
          </button>
        )}
      </div>
      {expanded &&
        (children ?? []).map((child) => (
          <StructureNode
            key={child.id}
            nodeId={child.id}
            title={child.title}
            displayCode={child.displayCode}
            depth={depth + 1}
            selections={selections}
            onToggle={onToggle}
            onToggleDescendants={onToggleDescendants}
          />
        ))}
    </div>
  );
}

/**
 * Ein kopierbarer Wert. Adressen und Header werden abgetippt, wenn man sie
 * nicht kopieren kann — und abgetippt wird falsch.
 */
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="w-40 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs font-mono">
        {value}
      </code>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        title="Kopieren"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

function ScopeCheckboxGrid({
  options,
  selected,
  onToggle,
  labelFor,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  labelFor?: (value: string) => string;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex items-center gap-2 text-sm cursor-pointer"
        >
          <Checkbox
            checked={selected.includes(opt)}
            onCheckedChange={() => onToggle(opt)}
          />
          <span className="truncate">{labelFor ? labelFor(opt) : opt}</span>
        </label>
      ))}
    </div>
  );
}

export function IntegrationKeysTab() {
  const [keys, setKeys] = useState<IntegrationKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [targetSystem, setTargetSystem] = useState("");
  const [description, setDescription] = useState("");
  const [maxConfidentiality, setMaxConfidentiality] = useState("internal");
  const [templateTypes, setTemplateTypes] = useState<string[]>([]);
  const [brandScopes, setBrandScopes] = useState<string[]>([]);
  const [agentScopes, setAgentScopes] = useState<string[]>([]);
  const [nodeSelections, setNodeSelections] = useState<NodeSelection[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [rateLimit, setRateLimit] = useState("60");
  const [ipAllowlist, setIpAllowlist] = useState("");

  const [preview, setPreview] = useState<ScopePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ id: string; apiKey: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const { data: roots } = useRootNodes();

  // Die Basis-Adresse ist installationsabhängig — sie aus dem Browser zu
  // nehmen erspart es, sie irgendwo zu pflegen.
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://<host>";

  const allPageTypes = useMemo(
    () =>
      Object.keys(PAGE_TYPE_REGISTRY).sort((a, b) =>
        pageTypeLabel(a).localeCompare(pageTypeLabel(b), "de"),
      ),
    [],
  );

  const loadKeys = useCallback(() => {
    setLoading(true);
    customFetch<{ keys: IntegrationKey[] }>("/api/integration-keys")
      .then((data) => setKeys(data.keys))
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Schlüssel konnten nicht geladen werden",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const scopeBody = useMemo(
    () => ({
      maxConfidentialityLevel: maxConfidentiality,
      templateTypes,
      brandScopes,
      agentScopes,
      nodeSelections: nodeSelections.map((s) => ({
        nodeId: s.nodeId,
        mode: s.mode,
        includeDescendants: s.includeDescendants,
      })),
    }),
    [
      maxConfidentiality,
      templateTypes,
      brandScopes,
      agentScopes,
      nodeSelections,
    ],
  );

  // Die Vorschau läuft mit jeder Änderung der Freigabe mit — der Sinn der
  // Sache ist, das Ergebnis zu sehen, bevor der Schlüssel existiert.
  useEffect(() => {
    if (!showForm) return;
    let cancelled = false;
    setPreviewLoading(true);
    const timer = setTimeout(() => {
      customFetch<ScopePreview>("/api/integration-keys/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scopeBody),
      })
        .then((data) => {
          if (!cancelled) setPreview(data);
        })
        .catch(() => {
          if (!cancelled) setPreview(null);
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [scopeBody, showForm]);

  const toggleIn = (
    list: string[],
    setList: (v: string[]) => void,
    value: string,
  ) => {
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    );
  };

  const toggleNode = (node: {
    nodeId: string;
    title: string;
    displayCode: string | null;
  }) => {
    setNodeSelections((prev) =>
      prev.some((s) => s.nodeId === node.nodeId)
        ? prev.filter((s) => s.nodeId !== node.nodeId)
        : [
            ...prev,
            {
              nodeId: node.nodeId,
              mode: "include",
              includeDescendants: true,
              title: node.title,
              displayCode: node.displayCode,
            },
          ],
    );
  };

  const toggleDescendants = (nodeId: string) => {
    setNodeSelections((prev) =>
      prev.map((s) =>
        s.nodeId === nodeId
          ? { ...s, includeDescendants: !s.includeDescendants }
          : s,
      ),
    );
  };

  const resetForm = () => {
    setName("");
    setTargetSystem("");
    setDescription("");
    setMaxConfidentiality("internal");
    setTemplateTypes([]);
    setBrandScopes([]);
    setAgentScopes([]);
    setNodeSelections([]);
    setExpiresAt("");
    setRateLimit("60");
    setIpAllowlist("");
    setPreview(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const result = await customFetch<{ id: string; apiKey: string }>(
        "/api/integration-keys",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            targetSystem: targetSystem.trim() || null,
            ...scopeBody,
            ipAllowlist: ipAllowlist
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
            rateLimitPerMinute: Number(rateLimit) || 60,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          }),
        },
      );
      setNewKey(result);
      setShowForm(false);
      resetForm();
      loadKeys();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Schlüssel konnte nicht angelegt werden",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await customFetch(`/api/integration-keys/${id}`, { method: "DELETE" });
      loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Widerruf fehlgeschlagen");
    }
  };

  const handleRotate = async (id: string) => {
    try {
      const result = await customFetch<{ apiKey: string }>(
        `/api/integration-keys/${id}/rotate`,
        { method: "POST" },
      );
      setNewKey({ id, apiKey: result.apiKey });
      loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tausch fehlgeschlagen");
    }
  };

  const copyKey = () => {
    if (!newKey) return;
    void navigator.clipboard.writeText(newKey.apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plug className="w-5 h-5" />
                Integrationsschlüssel
              </CardTitle>
              <CardDescription>
                Zugänge für Fremdsysteme wie Salesforce oder das Intranet. Jeder
                Schlüssel liest ausschließlich veröffentlichte Inhalte und nur
                den Ausschnitt, den Sie ihm hier freigeben.
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm((v) => !v)} size="sm">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Neuer Schlüssel
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {newKey && (
            <div className="rounded-md border border-primary/40 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-medium">
                Schlüssel erzeugt — jetzt kopieren
              </p>
              <p className="text-xs text-muted-foreground">
                Der Wert wird nur dieses eine Mal angezeigt. FlowCore speichert
                ihn ausschließlich als Prüfsumme und kann ihn nicht erneut
                ausgeben.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-2 py-1.5 text-xs font-mono break-all">
                  {newKey.apiKey}
                </code>
                <Button size="sm" variant="outline" onClick={copyKey}>
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>
                Ausblenden
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Schlüssel werden geladen…
            </div>
          ) : keys.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Noch keine Integrationsschlüssel angelegt.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Zielsystem</TableHead>
                  <TableHead>Freigabe</TableHead>
                  <TableHead>Zuletzt genutzt</TableHead>
                  <TableHead>Gültig bis</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow
                    key={key.id}
                    className={key.revoked ? "opacity-50" : ""}
                  >
                    <TableCell>
                      <div className="font-medium text-sm">{key.name}</div>
                      <code className="text-xs text-muted-foreground">
                        {key.keyPrefix}…
                      </code>
                      {key.revoked && (
                        <Badge
                          variant="destructive"
                          className="ml-2 text-[10px]"
                        >
                          widerrufen
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {key.targetSystem ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-[10px]">
                          bis{" "}
                          {CONFIDENTIALITY_LABELS[key.maxConfidentialityLevel]}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {key.templateTypes.length > 0
                            ? `${key.templateTypes.length} Seitentypen`
                            : "alle Seitentypen"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {key.nodeSelections.length > 0
                            ? `${key.nodeSelections.length} Bereiche`
                            : "gesamte Struktur"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(key.lastUsedAt)}
                      <div className="text-xs text-muted-foreground">
                        {key.requestCount} Abrufe
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(key.expiresAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Schlüssel tauschen"
                          onClick={() => handleRotate(key.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        {!key.revoked && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Widerrufen"
                            onClick={() => handleRevoke(key.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Neuen Schlüssel anlegen</CardTitle>
            <CardDescription>
              Die Freigabe wirkt einschränkend: Ein Inhalt wird nur
              ausgeliefert, wenn er allen gesetzten Kriterien entspricht.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="int-name">Name</Label>
                <Input
                  id="int-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z. B. Salesforce Produktion"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="int-target">Zielsystem</Label>
                <Input
                  id="int-target"
                  value={targetSystem}
                  onChange={(e) => setTargetSystem(e.target.value)}
                  placeholder="z. B. Salesforce"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="int-desc">Zweck (optional)</Label>
              <Input
                id="int-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Wofür wird dieser Zugang verwendet?"
              />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="int-confidentiality">
                Höchste Vertraulichkeitsstufe
              </Label>
              <Select
                value={maxConfidentiality}
                onValueChange={setMaxConfidentiality}
              >
                <SelectTrigger
                  id="int-confidentiality"
                  className="w-full sm:w-72"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONFIDENTIALITY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {CONFIDENTIALITY_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Seiten oberhalb dieser Stufe werden nie ausgeliefert.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Seitentypen</Label>
              <p className="text-xs text-muted-foreground">
                Keine Auswahl bedeutet: alle Seitentypen.
              </p>
              <div className="max-h-56 overflow-y-auto rounded-md border p-3">
                <ScopeCheckboxGrid
                  options={allPageTypes}
                  selected={templateTypes}
                  onToggle={(v) => toggleIn(templateTypes, setTemplateTypes, v)}
                  labelFor={pageTypeLabel}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Struktur</Label>
              <p className="text-xs text-muted-foreground">
                Kernprozesse und einzelne Seiten auswählen. Ohne Auswahl gilt
                die gesamte Wissensstruktur.
              </p>
              <div className="max-h-72 overflow-y-auto rounded-md border p-2">
                {(roots ?? []).map((root) => (
                  <StructureNode
                    key={root.id}
                    nodeId={root.id}
                    title={root.title}
                    displayCode={root.displayCode}
                    depth={0}
                    selections={nodeSelections}
                    onToggle={toggleNode}
                    onToggleDescendants={toggleDescendants}
                  />
                ))}
              </div>
              {nodeSelections.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {nodeSelections.map((s) => (
                    <Badge
                      key={s.nodeId}
                      variant="secondary"
                      className="text-[10px]"
                    >
                      {s.displayCode ?? s.title ?? s.nodeId.slice(0, 8)}
                      {s.includeDescendants ? " + Unterseiten" : ""}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Marken</Label>
                <ScopeCheckboxGrid
                  options={BRAND_SCOPES}
                  selected={brandScopes}
                  onToggle={(v) => toggleIn(brandScopes, setBrandScopes, v)}
                />
              </div>
              <div className="space-y-2">
                <Label>Bereiche</Label>
                <ScopeCheckboxGrid
                  options={AGENT_SCOPES}
                  selected={agentScopes}
                  onToggle={(v) => toggleIn(agentScopes, setAgentScopes, v)}
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="int-expires">Gültig bis</Label>
                <Input
                  id="int-expires"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="int-rate">Anfragen pro Minute</Label>
                <Input
                  id="int-rate"
                  type="number"
                  min={1}
                  value={rateLimit}
                  onChange={(e) => setRateLimit(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="int-ips">IP-Freigabe (optional)</Label>
                <Input
                  id="int-ips"
                  value={ipAllowlist}
                  onChange={(e) => setIpAllowlist(e.target.value)}
                  placeholder="kommagetrennt"
                />
              </div>
            </div>

            <Separator />

            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Freigabe-Vorschau</span>
                {previewLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>

              {preview ? (
                <>
                  <p className="text-sm">
                    <span className="text-2xl font-semibold">
                      {preview.accessible}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      von {preview.totalPublished} veröffentlichten Seiten
                      werden über diesen Schlüssel lesbar.
                    </span>
                  </p>

                  {preview.accessible === 0 ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Diese Freigabe gibt aktuell nichts frei — bitte prüfen Sie
                      Vertraulichkeitsstufe, Seitentypen und Strukturauswahl.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {preview.byConfidentiality.map((c) => (
                          <Badge
                            key={c.level}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {CONFIDENTIALITY_LABELS[c.level] ?? c.level}:{" "}
                            {c.count}
                          </Badge>
                        ))}
                        {preview.byTemplateType.slice(0, 6).map((t) => (
                          <Badge
                            key={t.templateType}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {pageTypeLabel(t.templateType)}: {t.count}
                          </Badge>
                        ))}
                      </div>
                      <div className="space-y-1">
                        {preview.sample.map((s) => (
                          <div
                            key={s.displayCode}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="font-mono">{s.displayCode}</span>
                            <span className="truncate">{s.title}</span>
                          </div>
                        ))}
                        {preview.accessible > preview.sample.length && (
                          <p className="text-xs text-muted-foreground pl-5">
                            … und {preview.accessible - preview.sample.length}{" "}
                            weitere
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Vorschau wird berechnet …
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
              >
                {creating && (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                )}
                Schlüssel erstellen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anbindung</CardTitle>
          <CardDescription>
            Alles, was das Zielsystem braucht — Basis-Adresse, Header und die
            Schnittstellenbeschreibung zum Import.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <CopyRow label="Basis-Adresse" value={`${origin}/api/content`} />
            <CopyRow label="Header" value="X-FlowCore-Api-Key: <Schlüssel>" />
            <CopyRow
              label="Erster Testaufruf"
              value={`curl -H "X-FlowCore-Api-Key: <Schlüssel>" ${origin}/api/content/v1/scope`}
            />
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/docs?doc=30-CONTENT-API.md">
                <BookOpen className="h-4 w-4 mr-1.5" />
                Dokumentation öffnen
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href="/api/content/v1/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileJson className="h-4 w-4 mr-1.5" />
                Schnittstellenbeschreibung (OpenAPI)
                <ExternalLink className="h-3 w-3 ml-1.5" />
              </a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Die Schnittstellenbeschreibung lässt sich direkt in Salesforce
            (External Services), Postman, die Power Platform oder einen
            Codegenerator importieren. Sie ist ohne Schlüssel abrufbar und
            enthält keine Inhalte, nur die Form der Endpunkte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
