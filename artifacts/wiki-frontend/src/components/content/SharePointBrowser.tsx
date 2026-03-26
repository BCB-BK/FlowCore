import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Folder,
  FileText,
  ArrowLeft,
  Search,
  Check,
  RefreshCw,
  Globe,
  HardDrive,
  File,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSharePointSites,
  useListSharePointDrives,
  useListSharePointDriveItems,
  useListActiveSourceSystems,
  useCreateSourceReference,
  getListSourceReferencesQueryKey,
} from "@workspace/api-client-react";

interface BreadcrumbItem {
  id: string;
  name: string;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "-";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(mimeType: string, isFolder: boolean) {
  if (isFolder) return Folder;
  if (mimeType.startsWith("image/")) return File;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("word") || mimeType.includes("document"))
    return FileText;
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return FileText;
  return File;
}

export function SharePointBrowser({
  nodeId,
  onClose,
}: {
  nodeId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"site" | "drive" | "items">("site");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedDriveId, setSelectedDriveId] = useState<string>("");
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<
    Array<{
      id: string;
      name: string;
      webUrl: string;
      mimeType: string;
      size: number;
      lastModifiedAt: string;
      driveId: string;
    }>
  >([]);

  const { data: systems } = useListActiveSourceSystems();
  const spSystem = systems?.find(
    (s) => s.systemType === "sharepoint" && s.isActive,
  );

  const sitesQuery = useListSharePointSites(
    { q: searchQuery || undefined },
    {
      query: {
        enabled: step === "site",
        queryKey: ["sharepoint", "sites", searchQuery],
      },
    },
  );
  const sites = sitesQuery.data;
  const sitesLoading = sitesQuery.isLoading;

  const drivesQuery = useListSharePointDrives(selectedSiteId || "_", {
    query: {
      enabled: !!selectedSiteId && step === "drive",
      queryKey: ["sharepoint", "drives", selectedSiteId],
    },
  });
  const drives = drivesQuery.data;
  const drivesLoading = drivesQuery.isLoading;

  const itemsQuery = useListSharePointDriveItems(
    selectedDriveId || "_",
    { folderId: currentFolderId },
    {
      query: {
        enabled: !!selectedDriveId && step === "items",
        queryKey: ["sharepoint", "items", selectedDriveId, currentFolderId],
      },
    },
  );
  const items = itemsQuery.data;
  const itemsLoading = itemsQuery.isLoading;

  const createRef = useCreateSourceReference();

  const handleSelectSite = (siteId: string) => {
    setSelectedSiteId(siteId);
    setStep("drive");
  };

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
    if (index < 0) {
      setBreadcrumbs([]);
      setCurrentFolderId(undefined);
    } else {
      const newCrumbs = breadcrumbs.slice(0, index + 1);
      setBreadcrumbs(newCrumbs);
      setCurrentFolderId(newCrumbs[newCrumbs.length - 1]?.id);
    }
  };

  const handleToggleItem = (item: {
    id: string;
    name: string;
    webUrl: string;
    mimeType: string;
    size: number;
    lastModifiedAt: string;
    driveId: string;
  }) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) return prev.filter((i) => i.id !== item.id);
      return [...prev, item];
    });
  };

  const handleImport = async () => {
    if (!spSystem?.id) return;

    for (const item of selectedItems) {
      await createRef.mutateAsync({
        nodeId,
        data: {
          sourceSystemId: spSystem.id,
          externalId: item.id,
          externalUrl: item.webUrl,
          externalTitle: item.name,
          externalMimeType: item.mimeType,
          externalModifiedAt: item.lastModifiedAt,
          metadata: {
            driveId: item.driveId,
            size: item.size,
          },
        },
      });
    }

    queryClient.invalidateQueries({
      queryKey: getListSourceReferencesQueryKey(nodeId),
    });
    onClose();
  };

  const handleBack = () => {
    if (step === "items" && breadcrumbs.length > 0) {
      const newCrumbs = breadcrumbs.slice(0, -1);
      setBreadcrumbs(newCrumbs);
      setCurrentFolderId(
        newCrumbs.length > 0 ? newCrumbs[newCrumbs.length - 1].id : undefined,
      );
    } else if (step === "items") {
      setStep("drive");
      setSelectedDriveId("");
    } else if (step === "drive") {
      setStep("site");
      setSelectedSiteId("");
    }
  };

  if (!spSystem) {
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
              Erstellen Sie zuerst ein SharePoint-Quellsystem unter
              &quot;Konnektoren&quot;
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            SharePoint-Dokument verknüpfen
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-3">
          {step !== "site" && (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}

          {step === "items" && (
            <div className="flex items-center gap-1 text-sm">
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => handleBreadcrumbClick(-1)}
              >
                Stammordner
              </button>
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.id} className="flex items-center gap-1">
                  <span className="text-muted-foreground">/</span>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => handleBreadcrumbClick(i)}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
          )}

          {step === "site" && (
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="SharePoint-Sites durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {step === "site" && (
            <div className="space-y-1">
              {sitesLoading && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {sites?.map((site) => (
                <button
                  key={site.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left"
                  onClick={() => handleSelectSite(site.id!)}
                >
                  <Globe className="w-5 h-5 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {site.displayName}
                    </p>
                    {site.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {site.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
              {!sitesLoading && (!sites || sites.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  Keine Sites gefunden
                </p>
              )}
            </div>
          )}

          {step === "drive" && (
            <div className="space-y-1">
              {drivesLoading && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {drives?.map((drive) => (
                <button
                  key={drive.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left"
                  onClick={() => handleSelectDrive(drive.id!)}
                >
                  <HardDrive className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{drive.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {drive.driveType}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === "items" && (
            <div className="space-y-1">
              {itemsLoading && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {items?.map((item) => {
                const isSelected = selectedItems.some((s) => s.id === item.id);
                const ItemIcon = getFileIcon(
                  item.mimeType ?? "",
                  item.isFolder ?? false,
                );

                if (item.isFolder) {
                  return (
                    <button
                      key={item.id}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left"
                      onClick={() => handleOpenFolder(item.id!, item.name!)}
                    >
                      <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.name}
                        </p>
                        {item.childCount != null && (
                          <p className="text-xs text-muted-foreground">
                            {item.childCount} Elemente
                          </p>
                        )}
                      </div>
                    </button>
                  );
                }

                return (
                  <button
                    key={item.id}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left ${
                      isSelected ? "bg-accent ring-2 ring-primary" : ""
                    }`}
                    onClick={() =>
                      handleToggleItem({
                        id: item.id!,
                        name: item.name!,
                        webUrl: item.webUrl!,
                        mimeType: item.mimeType ?? "application/octet-stream",
                        size: item.size ?? 0,
                        lastModifiedAt: item.lastModifiedAt ?? "",
                        driveId: item.driveId!,
                      })
                    }
                  >
                    <ItemIcon className="w-5 h-5 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatSize(item.size ?? 0)}</span>
                        {item.lastModifiedAt && (
                          <span>
                            {new Date(item.lastModifiedAt).toLocaleDateString(
                              "de-DE",
                            )}
                          </span>
                        )}
                        {item.lastModifiedBy && (
                          <span>{item.lastModifiedBy}</span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
              {!itemsLoading && (!items || items.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  Keine Dokumente in diesem Ordner
                </p>
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
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedItems.length === 0 || createRef.isPending}
          >
            {createRef.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Verknüpfen ({selectedItems.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
