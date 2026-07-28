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
import { Globe, X } from "lucide-react";
import {
  SharePointExplorer,
  type SharePointItem,
} from "@/components/sharepoint/SharePointExplorer";

export interface SharePointPickedFile {
  name: string;
  webUrl: string;
  isFolder?: boolean;
}

interface PickedEntry extends SharePointPickedFile {
  id: string;
}

interface SharePointFilePickerProps {
  onSelect: (files: SharePointPickedFile[]) => void;
  onClose: () => void;
}

/**
 * Auswahl von Dokumenten oder Ordnern aus SharePoint für die mitgeltenden
 * Unterlagen einer Seite.
 *
 * Gespeichert wird ausschließlich der SharePoint-Link. Beim Anklicken öffnet
 * ihn der Browser direkt in SharePoint — es gibt keinen Umweg über FlowCore
 * und keine übergestülpte Berechtigung: Es gelten die Rechte, die die
 * jeweilige Person in SharePoint auf diese Datei ohnehin hat.
 *
 * Der Aufbau der Auswahl ist derselbe wie überall sonst im System:
 * Team → Bibliothek → Ordner → Datei.
 */
export function SharePointFilePicker({
  onSelect,
  onClose,
}: SharePointFilePickerProps) {
  const [picked, setPicked] = useState<PickedEntry[]>([]);

  const toggle = (item: SharePointItem) => {
    setPicked((prev) =>
      prev.some((p) => p.webUrl === item.webUrl)
        ? prev.filter((p) => p.webUrl !== item.webUrl)
        : [
            ...prev,
            {
              id: item.id,
              name: item.name,
              webUrl: item.webUrl,
              isFolder: item.isFolder,
            },
          ],
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Aus SharePoint verknüpfen
          </DialogTitle>
          <DialogDescription>
            Team auswählen, Bibliothek öffnen, Datei anklicken — oder einen
            ganzen Ordner übernehmen. Verknüpft wird nur der Link; geöffnet wird
            er später mit den SharePoint-Rechten der jeweiligen Person.
          </DialogDescription>
        </DialogHeader>

        <SharePointExplorer
          dense
          select="file"
          allowFolderSelection
          selectedFileIds={picked.map((p) => p.id)}
          onToggleFile={toggle}
        />

        {picked.length > 0 && (
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              {picked.length === 1 ? "1 Eintrag" : `${picked.length} Einträge`}{" "}
              ausgewählt
            </p>
            <div className="flex flex-wrap gap-1.5">
              {picked.map((p) => (
                <Badge key={p.webUrl} variant="secondary" className="gap-1">
                  {p.isFolder ? "📁 " : ""}
                  {p.name}
                  <button
                    type="button"
                    aria-label={`${p.name} entfernen`}
                    onClick={() =>
                      setPicked((prev) =>
                        prev.filter((x) => x.webUrl !== p.webUrl),
                      )
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={() => {
              onSelect(
                picked.map(({ name, webUrl, isFolder }) => ({
                  name,
                  webUrl,
                  isFolder,
                })),
              );
              onClose();
            }}
            disabled={picked.length === 0}
          >
            Übernehmen ({picked.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
