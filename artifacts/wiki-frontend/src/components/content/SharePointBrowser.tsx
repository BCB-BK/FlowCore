import { useState } from "react";
import { Button } from "@workspace/ui/button";
import { Badge } from "@workspace/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/dialog";
import { Globe, Loader2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListActiveSourceSystems,
  useCreateSourceReference,
  getListSourceReferencesQueryKey,
} from "@workspace/api-client-react";
import {
  SharePointExplorer,
  type SharePointItem,
} from "@/components/sharepoint/SharePointExplorer";

interface PickedFile {
  id: string;
  name: string;
  webUrl: string;
  mimeType: string;
  size: number;
  lastModifiedAt: string;
  driveId: string;
}

/**
 * Auswahl eines SharePoint-Dokuments, das dauerhaft mit einer Wiki-Seite
 * verknüpft wird. Die Verknüpfung zeigt auf die Datei am Ablageort — sie
 * wird nicht kopiert, sondern referenziert, und FlowCore prüft später, ob
 * sie dort noch liegt.
 */
export function SharePointBrowser({
  nodeId,
  onClose,
}: {
  nodeId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: systems, isLoading: systemsLoading } =
    useListActiveSourceSystems();
  const spSystem = systems?.find(
    (s) => s.systemType === "sharepoint" && s.isActive,
  );

  const createRef = useCreateSourceReference();

  const toggle = (item: SharePointItem) => {
    setPicked((prev) =>
      prev.some((p) => p.id === item.id)
        ? prev.filter((p) => p.id !== item.id)
        : [
            ...prev,
            {
              id: item.id,
              name: item.name,
              webUrl: item.webUrl,
              mimeType: item.mimeType,
              size: item.size,
              lastModifiedAt: item.lastModifiedAt,
              driveId: item.driveId,
            },
          ],
    );
  };

  const handleSave = async () => {
    if (!spSystem?.id || picked.length === 0) return;
    setError(null);
    try {
      for (const item of picked) {
        await createRef.mutateAsync({
          nodeId,
          data: {
            sourceSystemId: spSystem.id,
            externalId: item.id,
            externalUrl: item.webUrl,
            externalTitle: item.name,
            externalMimeType: item.mimeType,
            externalModifiedAt: item.lastModifiedAt,
            metadata: { driveId: item.driveId, size: item.size },
          },
        });
      }
      await queryClient.invalidateQueries({
        queryKey: getListSourceReferencesQueryKey(nodeId),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Verknüpfung konnte nicht gespeichert werden",
      );
    }
  };

  if (!systemsLoading && !spSystem) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SharePoint-Dokument verknüpfen</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Kein aktives SharePoint-Quellsystem konfiguriert</p>
            <p className="text-sm mt-1">
              Legen Sie zuerst unter Einstellungen → Konnektoren → Quellsysteme
              ein SharePoint-Quellsystem an.
            </p>
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>SharePoint-Dokument verknüpfen</DialogTitle>
          <DialogDescription>
            Team auswählen, Bibliothek öffnen, Datei anklicken. Die Datei bleibt
            in SharePoint — FlowCore merkt sich die Verknüpfung.
          </DialogDescription>
        </DialogHeader>

        {systemsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <SharePointExplorer
            dense
            select="file"
            selectedFileIds={picked.map((p) => p.id)}
            onToggleFile={toggle}
          />
        )}

        {picked.length > 0 && (
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              {picked.length} Datei{picked.length !== 1 ? "en" : ""} ausgewählt
            </p>
            <div className="flex flex-wrap gap-1.5">
              {picked.map((p) => (
                <Badge key={p.id} variant="secondary" className="gap-1">
                  {p.name}
                  <button
                    type="button"
                    aria-label={`${p.name} entfernen`}
                    onClick={() =>
                      setPicked((prev) => prev.filter((x) => x.id !== p.id))
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={picked.length === 0 || createRef.isPending}
          >
            {createRef.isPending && (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            )}
            Verknüpfen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
