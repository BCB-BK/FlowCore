import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  ChevronRight,
  ArrowRight,
  Tag,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

interface Release {
  id: string;
  title: string;
  description: string | null;
  version: string;
  status: string;
  clusterRef: string | null;
  changedFiles: string[] | null;
  auditNotes: string | null;
  auditedBy: string | null;
  auditedAt: string | null;
  syncedAt: string | null;
  syncRef: string | null;
  syncNotes: string | null;
  releasedBy: string | null;
  releasedAt: string | null;
  releaseNotes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Arbeit",
  audit_pending: "Audit ausstehend",
  audit_passed: "Audit bestanden",
  sync_pending: "Sync ausstehend",
  released: "Veröffentlicht",
  revoked: "Zurückgezogen",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  in_progress: "secondary",
  audit_pending: "outline",
  audit_passed: "default",
  sync_pending: "outline",
  released: "default",
  revoked: "destructive",
};

const NEXT_TRANSITIONS: Record<string, { label: string; status: string }[]> = {
  in_progress: [{ label: "Zur Prüfung einreichen", status: "audit_pending" }],
  audit_pending: [
    { label: "Audit bestanden", status: "audit_passed" },
    { label: "Zurück zur Arbeit", status: "in_progress" },
  ],
  audit_passed: [
    { label: "GitHub-Sync starten", status: "sync_pending" },
    { label: "Zurück zur Arbeit", status: "in_progress" },
  ],
  sync_pending: [
    { label: "Release freigeben", status: "released" },
    { label: "Zurück zur Arbeit", status: "in_progress" },
  ],
  released: [{ label: "Zurückziehen", status: "revoked" }],
  revoked: [{ label: "Neu bearbeiten", status: "in_progress" }],
};

export function ReleaseTab() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReleases = useCallback(async () => {
    setError(null);
    try {
      const data = await customFetch<{ releases: Release[] }>(
        "/api/admin/releases",
      );
      setReleases(data.releases);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Releases konnten nicht geladen werden";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  const [transitionMeta, setTransitionMeta] = useState<Record<string, string>>({});

  const handleTransition = async (releaseId: string, newStatus: string) => {
    setTransitioning(true);
    setError(null);
    try {
      await customFetch(`/api/admin/releases/${releaseId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...transitionMeta,
        }),
      });
      setTransitionMeta({});
      await loadReleases();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Statusübergang fehlgeschlagen";
      setError(msg);
    } finally {
      setTransitioning(false);
    }
  };

  const selectedRelease = releases.find((r) => r.id === selectedId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Release-Verwaltung
              </CardTitle>
              <CardDescription>
                Verbindlicher Release-Pfad: Implementierung → Audit →
                GitHub-Sync → Release
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadReleases}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setShowCreate(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Neuer Release
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {showCreate && (
        <CreateReleaseForm
          onCreated={() => {
            setShowCreate(false);
            loadReleases();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-1 px-1">
        <span className="font-medium">Release-Pfad:</span>
        <Badge variant="secondary" className="text-[10px]">
          In Arbeit
        </Badge>
        <ArrowRight className="h-3 w-3" />
        <Badge variant="outline" className="text-[10px]">
          Audit
        </Badge>
        <ArrowRight className="h-3 w-3" />
        <Badge variant="outline" className="text-[10px]">
          Sync
        </Badge>
        <ArrowRight className="h-3 w-3" />
        <Badge variant="default" className="text-[10px]">
          Release
        </Badge>
      </div>

      {releases.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Noch keine Releases registriert. Erstellen Sie einen neuen
            Release, um den Abnahmepfad zu starten.
          </CardContent>
        </Card>
      )}

      {releases.map((rel) => (
        <Card
          key={rel.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedId === rel.id ? "ring-2 ring-primary" : ""
          }`}
          onClick={() =>
            setSelectedId(selectedId === rel.id ? null : rel.id)
          }
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    selectedId === rel.id ? "rotate-90" : ""
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{rel.title}</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {rel.version}
                    </Badge>
                    {rel.clusterRef && (
                      <Badge variant="secondary" className="text-[10px]">
                        {rel.clusterRef}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Erstellt:{" "}
                    {new Date(rel.createdAt).toLocaleDateString("de-DE")}
                    {rel.createdBy && ` von ${rel.createdBy}`}
                  </p>
                </div>
              </div>
              <Badge variant={STATUS_VARIANTS[rel.status] || "secondary"}>
                {STATUS_LABELS[rel.status] || rel.status}
              </Badge>
            </div>

            {selectedId === rel.id && selectedRelease && (
              <div
                className="mt-4 pt-4 border-t space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                {selectedRelease.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedRelease.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Status-Timeline
                    </p>
                    <div className="space-y-1.5">
                      <TimelineItem
                        label="Erstellt"
                        date={selectedRelease.createdAt}
                        done
                      />
                      <TimelineItem
                        label="Audit"
                        date={selectedRelease.auditedAt}
                        done={!!selectedRelease.auditedAt}
                        note={selectedRelease.auditNotes}
                        by={selectedRelease.auditedBy}
                      />
                      <TimelineItem
                        label="Sync"
                        date={selectedRelease.syncedAt}
                        done={!!selectedRelease.syncedAt}
                        note={[selectedRelease.syncRef ? `Ref: ${selectedRelease.syncRef}` : null, selectedRelease.syncNotes].filter(Boolean).join(" — ") || null}
                      />
                      <TimelineItem
                        label="Release"
                        date={selectedRelease.releasedAt}
                        done={!!selectedRelease.releasedAt}
                        note={selectedRelease.releaseNotes}
                        by={selectedRelease.releasedBy}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Aktionen
                    </p>
                    <div className="space-y-3">
                      {selectedRelease.status === "in_progress" && (
                        <textarea
                          className="w-full text-xs border rounded px-2 py-1.5 bg-background resize-none"
                          rows={2}
                          placeholder="Audit-Notizen (optional)"
                          value={transitionMeta.auditNotes || ""}
                          onChange={(e) =>
                            setTransitionMeta((m) => ({
                              ...m,
                              auditNotes: e.target.value,
                            }))
                          }
                        />
                      )}
                      {selectedRelease.status === "audit_passed" && (
                        <div className="space-y-1.5">
                          <input
                            className="w-full text-xs border rounded px-2 py-1.5 bg-background font-mono"
                            placeholder="Sync-Referenz / Commit SHA (optional)"
                            value={transitionMeta.syncRef || ""}
                            onChange={(e) =>
                              setTransitionMeta((m) => ({
                                ...m,
                                syncRef: e.target.value,
                              }))
                            }
                          />
                          <textarea
                            className="w-full text-xs border rounded px-2 py-1.5 bg-background resize-none"
                            rows={2}
                            placeholder="Sync-Notizen (optional)"
                            value={transitionMeta.syncNotes || ""}
                            onChange={(e) =>
                              setTransitionMeta((m) => ({
                                ...m,
                                syncNotes: e.target.value,
                              }))
                            }
                          />
                        </div>
                      )}
                      {selectedRelease.status === "sync_pending" && (
                        <textarea
                          className="w-full text-xs border rounded px-2 py-1.5 bg-background resize-none"
                          rows={2}
                          placeholder="Release-Notizen (optional)"
                          value={transitionMeta.releaseNotes || ""}
                          onChange={(e) =>
                            setTransitionMeta((m) => ({
                              ...m,
                              releaseNotes: e.target.value,
                            }))
                          }
                        />
                      )}
                      <div className="space-y-1.5">
                        {(NEXT_TRANSITIONS[selectedRelease.status] || []).map(
                          (t) => (
                            <Button
                              key={t.status}
                              variant={
                                t.status === "in_progress"
                                  ? "outline"
                                  : "default"
                              }
                              size="sm"
                              className="w-full justify-start"
                              disabled={transitioning}
                              onClick={() =>
                                handleTransition(selectedRelease.id, t.status)
                              }
                            >
                              <ArrowRight className="h-3 w-3 mr-1.5" />
                              {t.label}
                            </Button>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TimelineItem({
  label,
  date,
  done,
  note,
  by,
}: {
  label: string;
  date: string | null;
  done: boolean;
  note?: string | null;
  by?: string | null;
}) {
  return (
    <div className="flex items-start gap-2">
      {done ? (
        <CheckCircle className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
      ) : (
        <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <div>
        <span className="text-xs font-medium">{label}</span>
        {date && (
          <span className="text-[10px] text-muted-foreground ml-1.5">
            {new Date(date).toLocaleString("de-DE")}
          </span>
        )}
        {by && (
          <span className="text-[10px] text-muted-foreground ml-1">
            ({by})
          </span>
        )}
        {note && (
          <p className="text-[10px] text-muted-foreground">{note}</p>
        )}
      </div>
    </div>
  );
}

function CreateReleaseForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [clusterRef, setClusterRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim() || !version.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await customFetch("/api/admin/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          version: version.trim(),
          description: description.trim() || null,
          clusterRef: clusterRef.trim() || null,
        }),
      });
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erstellen fehlgeschlagen",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Neuer Release</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Titel *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Cluster 14 Release"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Version *
            </label>
            <Input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="z.B. 0.5.0"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Cluster-Referenz
          </label>
          <Input
            value={clusterRef}
            onChange={(e) => setClusterRef(e.target.value)}
            placeholder="z.B. Cluster 14"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Beschreibung
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Was ist in diesem Release enthalten?"
            rows={3}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !version.trim()}
          >
            {saving ? "Wird erstellt..." : "Release erstellen"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
