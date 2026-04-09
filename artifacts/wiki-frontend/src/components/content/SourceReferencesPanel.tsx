import { useState } from "react";
import { Button } from "@workspace/ui/button";
import { Badge } from "@workspace/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import {
  ExternalLink,
  FileText,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSourceReferences,
  useDeleteSourceReference,
  useCheckSourceReference,
  getListSourceReferencesQueryKey,
} from "@workspace/api-client-react";
import { SharePointBrowser } from "./SharePointBrowser";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof CheckCircle;
  }
> = {
  active: { label: "Aktuell", variant: "default", icon: CheckCircle },
  stale: { label: "Veraltet", variant: "secondary", icon: AlertTriangle },
  error: { label: "Fehler", variant: "destructive", icon: XCircle },
  not_found: { label: "Nicht gefunden", variant: "destructive", icon: XCircle },
  pending: { label: "Ausstehend", variant: "outline", icon: Clock },
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function SourceReferencesPanel({ nodeId }: { nodeId: string }) {
  const queryClient = useQueryClient();
  const [showBrowser, setShowBrowser] = useState(false);
  const { data: refs, isLoading } = useListSourceReferences(nodeId);
  const deleteRef = useDeleteSourceReference();
  const checkRef = useCheckSourceReference();

  if (isLoading) {
    return null;
  }

  if (!refs || refs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Externe Quellen
            {refs && refs.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {refs.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBrowser(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Verknüpfen
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {refs?.map((ref) => {
            const statusCfg =
              STATUS_CONFIG[ref.syncStatus ?? "active"] ?? STATUS_CONFIG.active;
            const StatusIcon = statusCfg.icon;
            const meta = ref.metadata as Record<string, unknown> | null;

            return (
              <div
                key={ref.id}
                className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {ref.externalTitle || ref.externalId}
                    </span>
                    <Badge variant={statusCfg.variant} className="text-xs">
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusCfg.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>
                      {String(ref.systemName ?? "")} (
                      {String(ref.systemType ?? "")})
                    </span>
                    {ref.externalMimeType && (
                      <span>{ref.externalMimeType.split("/").pop()}</span>
                    )}
                    {meta && typeof meta.size === "number" && (
                      <span>{formatFileSize(meta.size)}</span>
                    )}
                    {ref.lastCheckedAt && (
                      <span>
                        Geprüft:{" "}
                        {new Date(ref.lastCheckedAt).toLocaleDateString(
                          "de-DE",
                        )}
                      </span>
                    )}
                  </div>
                  {ref.syncError && (
                    <p className="text-xs text-destructive mt-1">
                      {ref.syncError}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {ref.externalUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-7 w-7 p-0"
                    >
                      <a
                        href={ref.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      checkRef.mutate(
                        { refId: ref.id! },
                        {
                          onSuccess: () => {
                            queryClient.invalidateQueries({
                              queryKey: getListSourceReferencesQueryKey(nodeId),
                            });
                          },
                        },
                      );
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      if (confirm("Verknüpfung entfernen?")) {
                        deleteRef.mutate(
                          { refId: ref.id! },
                          {
                            onSuccess: () => {
                              queryClient.invalidateQueries({
                                queryKey:
                                  getListSourceReferencesQueryKey(nodeId),
                              });
                            },
                          },
                        );
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {showBrowser && (
        <SharePointBrowser
          nodeId={nodeId}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </Card>
  );
}
