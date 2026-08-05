import { useState } from "react";
import { Button } from "@workspace/ui/button";
import { CheckCircle } from "lucide-react";
import {
  SharePointExplorer,
  type SharePointItem,
  type SharePointLocation,
} from "@/components/sharepoint/SharePointExplorer";

export interface SharePointSelection {
  siteId: string;
  siteName: string;
  driveId: string;
  driveName: string;
  folderId?: string;
  folderName?: string;
  folderPath?: string;
  itemId?: string;
  itemName?: string;
  isFolder?: boolean;
}

interface SharePointSiteDrivePickerProps {
  value: SharePointSelection | null;
  onChange: (selection: SharePointSelection | null) => void;
  mode?: "source" | "storage";
}

export function SharePointSiteDrivePicker({
  value,
  onChange,
  mode = "source",
}: SharePointSiteDrivePickerProps) {
  const [browsing, setBrowsing] = useState(!value);

  const handleConfirmFolder = (loc: SharePointLocation) => {
    if (!loc.drive) return;
    const currentFolder =
      loc.folderStack.length > 0
        ? loc.folderStack[loc.folderStack.length - 1]
        : null;
    onChange({
      siteId: loc.drive.siteId,
      siteName:
        loc.team?.displayName ??
        loc.site?.displayName ??
        loc.drive.siteName ??
        loc.drive.name,
      driveId: loc.drive.id,
      driveName: loc.drive.name,
      folderId: currentFolder?.id,
      folderName: currentFolder?.name ?? loc.drive.name,
      folderPath: loc.folderStack.map((f) => f.name).join("/") || "/",
      isFolder: true,
    });
    setBrowsing(false);
  };

  const handleSelectFile = (item: SharePointItem, loc: SharePointLocation) => {
    // Ablageziele zeigen auf einen Ordner, nicht auf eine einzelne Datei.
    if (mode === "storage" || !loc.drive) return;
    onChange({
      siteId: loc.drive.siteId,
      siteName:
        loc.team?.displayName ??
        loc.site?.displayName ??
        loc.drive.siteName ??
        loc.drive.name,
      driveId: loc.drive.id,
      driveName: loc.drive.name,
      itemId: item.id,
      itemName: item.name,
      folderPath: loc.folderStack.map((f) => f.name).join("/") || "/",
      isFolder: false,
    });
    setBrowsing(false);
  };

  if (!browsing && value) {
    const displayPath =
      value.folderPath && value.folderPath !== "/"
        ? ` / ${value.folderPath}`
        : "";
    const itemLabel = value.itemName
      ? value.itemName
      : value.folderName && value.folderName !== value.driveName
        ? value.folderName
        : null;
    return (
      <div className="border rounded-lg p-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
            <div>
              <p className="font-medium">{value.siteName}</p>
              <p className="text-xs text-muted-foreground">
                {value.driveName}
                {displayPath}
                {itemLabel ? ` \u2192 ${itemLabel}` : ""}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(null);
              setBrowsing(true);
            }}
          >
            Ändern
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 max-h-[420px] overflow-y-auto">
      <SharePointExplorer
        dense
        select={mode === "storage" ? "folder" : "folder"}
        onConfirmFolder={handleConfirmFolder}
        onToggleFile={handleSelectFile}
      />
    </div>
  );
}
