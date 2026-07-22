import { useState } from "react";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { Badge } from "@workspace/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/dialog";
import {
  Folder,
  ArrowLeft,
  Search,
  Check,
  RefreshCw,
  Globe,
  HardDrive,
} from "lucide-react";
import {
  getSharePointFileIcon,
  formatFileSize,
} from "@/lib/sharepoint-ui";
import {
  useListSharePointSites,
  useListSharePointDrives,
  useListSharePointDriveItems,
  useListActiveSourceSystems,
} from "@workspace/api-client-react";

interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface SharePointPickedFile {
  name: string;
  webUrl: string;
}

interface SharePointFilePickerProps {
  onSelect: (files: SharePointPickedFile[]) => void;
  onClose: () => void;
}

export function SharePointFilePicker({ onSelect, onClose }: SharePointFilePickerProps) {
  const [step, setStep] = useState<"site" | "drive" | "items">("site");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedDriveId, setSelectedDriveId] = useState<string>("");
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SharePointPickedFile[]>([]);

  const { data: systems } = useListActiveSourceSystems();
  const spSystem = systems?.find((s) => s.systemType === "sharepoint" && s.isActive);

  const sitesQuery = useListSharePointSites(
    { q: searchQuery || undefined },
    { query: { enabled: step === "site", queryKey: ["sp-picker", "sites", searchQuery] } },
  );
  const drivesQuery = useListSharePointDrives(selectedSiteId || "_", {
    query: { enabled: !!selectedSiteId && step === "drive", queryKey: ["sp-picker", "drives", selectedSiteId] },
  });
  const itemsQuery = useListSharePointDriveItems(
    selectedDriveId || "_",
    { folderId: currentFolderId },
    { query: { enabled: !!selectedDriveId && step === "items", queryKey: ["sp-picker", "items", selectedDriveId, currentFolderId] } },
  );

  const sites = sitesQuery.data;
  const drives = drivesQuery.data;
  const items = itemsQuery.data;

  const handleSelectSite = (siteId: string) => { setSelectedSiteId(siteId); setStep("drive"); };
  const handleSelectDrive = (driveId: string) => {
    setSelectedDriveId(driveId);
    setBreadcrumbs([]);
    setCurrentFolderId(undefined);
    setStep("items");
  };
  const handleOpenFolder = (folderId: string, folderName: string) => {
    setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
    setCurrentFolderId(folderId);
  };
  const handleBreadcrumbClick = (index: number) => {
    if (index < 0) { setBreadcrumbs([]); setCurrentFolderId(undefined); }
    else {
      const next = breadcrumbs.slice(0, index + 1);
      setBreadcrumbs(next);
      setCurrentFolderId(next[next.length - 1]?.id);
    }
  };
  const handleBack = () => {
    if (step === "items" && breadcrumbs.length > 0) {
      const next = breadcrumbs.slice(0, -1);
      setBreadcrumbs(next);
      setCurrentFolderId(next.length > 0 ? next[next.length - 1].id : undefined);
    } else if (step === "items") { setStep("drive"); setSelectedDriveId(""); }
    else if (step === "drive") { setStep("site"); setSelectedSiteId(""); }
  };
  const handleToggleItem = (file: SharePointPickedFile) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.webUrl === file.webUrl);
      return exists ? prev.filter((i) => i.webUrl !== file.webUrl) : [...prev, file];
    });
  };

  if (!spSystem) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader><DialogTitle>SharePoint-Datei auswählen</DialogTitle></DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Kein aktives SharePoint-Quellsystem konfiguriert.</p>
            <p className="text-sm mt-1">Bitte unter „Konnektoren" ein SharePoint-System einrichten.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            SharePoint-Datei auswählen
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-1">
          {step !== "site" && (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          {step === "items" && (
            <div className="flex items-center gap-1 text-sm flex-1 min-w-0">
              <button className="text-muted-foreground hover:text-foreground" onClick={() => handleBreadcrumbClick(-1)}>
                Stammordner
              </button>
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.id} className="flex items-center gap-1">
                  <span className="text-muted-foreground">/</span>
                  <button className="text-muted-foreground hover:text-foreground truncate" onClick={() => handleBreadcrumbClick(i)}>
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
          )}
          {step === "site" && (
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="SharePoint-Sites durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {step === "site" && (
            <div className="space-y-1">
              {sitesQuery.isLoading && <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
              {sites?.map((site) => (
                <button
                  key={site.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left"
                  onClick={() => handleSelectSite(site.id!)}
                >
                  <Globe className="w-5 h-5 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{site.displayName}</p>
                    {site.description && <p className="text-xs text-muted-foreground truncate">{site.description}</p>}
                  </div>
                </button>
              ))}
              {!sitesQuery.isLoading && (!sites || sites.length === 0) && (
                <p className="text-center text-muted-foreground py-8">Keine Sites gefunden</p>
              )}
            </div>
          )}

          {step === "drive" && (
            <div className="space-y-1">
              {drivesQuery.isLoading && <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
              {drives?.map((drive) => (
                <button
                  key={drive.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left"
                  onClick={() => handleSelectDrive(drive.id!)}
                >
                  <HardDrive className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{drive.name}</p>
                    <p className="text-xs text-muted-foreground">{drive.driveType}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === "items" && (
            <div className="space-y-1">
              {itemsQuery.isLoading && <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
              {items?.map((item) => {
                const isSelected = selectedItems.some((s) => s.webUrl === item.webUrl);
                const ItemIcon = getSharePointFileIcon(item.mimeType ?? "", item.isFolder ?? false);

                if (item.isFolder) {
                  return (
                    <button
                      key={item.id}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left"
                      onClick={() => handleOpenFolder(item.id!, item.name!)}
                    >
                      <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        {item.childCount != null && <p className="text-xs text-muted-foreground">{item.childCount} Elemente</p>}
                      </div>
                    </button>
                  );
                }

                return (
                  <button
                    key={item.id}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left transition-colors ${isSelected ? "bg-accent ring-2 ring-primary" : ""}`}
                    onClick={() => handleToggleItem({ name: item.name!, webUrl: item.webUrl! })}
                  >
                    <ItemIcon className="w-5 h-5 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(item.size ?? 0)}</span>
                        {item.lastModifiedAt && <span>{new Date(item.lastModifiedAt).toLocaleDateString("de-DE")}</span>}
                        {item.lastModifiedBy && <span>{item.lastModifiedBy}</span>}
                      </div>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-primary shrink-0" />}
                  </button>
                );
              })}
              {!itemsQuery.isLoading && (!items || items.length === 0) && (
                <p className="text-center text-muted-foreground py-8">Keine Dokumente in diesem Ordner</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <div className="flex items-center gap-2 flex-1">
            {selectedItems.length > 0 && (
              <Badge variant="outline">{selectedItems.length} ausgewählt</Badge>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button
            onClick={() => { onSelect(selectedItems); onClose(); }}
            disabled={selectedItems.length === 0}
          >
            Übernehmen ({selectedItems.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
