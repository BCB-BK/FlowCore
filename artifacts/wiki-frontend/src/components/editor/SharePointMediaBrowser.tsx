import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Folder,
  FileText,
  ArrowLeft,
  Search,
  RefreshCw,
  Globe,
  HardDrive,
  File,
  Image,
  Video,
  Loader2,
} from "lucide-react";
import {
  useListSharePointSites,
  useListSharePointDrives,
  useListSharePointDriveItems,
  useListActiveSourceSystems,
} from "@workspace/api-client-react";

interface MediaAsset {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  classification: string;
  altText?: string | null;
  caption?: string | null;
  createdAt: string;
}

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

function classifyMimeType(mimeType: string): "image" | "video" | "file" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "file";
}

function getFileIcon(mimeType: string, isFolder: boolean) {
  if (isFolder) return Folder;
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.includes("pdf")) return FileText;
  return File;
}

interface SharePointMediaBrowserProps {
  nodeId?: string;
  filterType?: "image" | "video" | "file" | null;
  onSelect: (asset: MediaAsset) => void;
}

export function SharePointMediaBrowser({
  nodeId,
  filterType,
  onSelect,
}: SharePointMediaBrowserProps) {
  const [step, setStep] = useState<"site" | "drive" | "items">("site");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedDriveId, setSelectedDriveId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const apiBase = import.meta.env.BASE_URL + "api";
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

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

  const handleSelectItem = useCallback(
    async (item: {
      id: string;
      name: string;
      mimeType: string;
      size: number;
      driveId: string;
    }) => {
      const classification = classifyMimeType(item.mimeType);
      if (filterType && classification !== filterType) return;

      setIsImporting(true);
      try {
        const res = await fetch(`${apiBase}/media/import-sharepoint`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driveId: item.driveId,
            itemId: item.id,
            filename: item.name,
            nodeId: nodeId || undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Import fehlgeschlagen" }));
          throw new Error(err.error || "Import fehlgeschlagen");
        }

        const asset = await res.json();
        toast({ title: "Datei aus SharePoint importiert" });
        onSelect(asset);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "SharePoint-Import fehlgeschlagen",
          description: err instanceof Error ? err.message : "Unbekannter Fehler",
        });
      } finally {
        setIsImporting(false);
      }
    },
    [apiBase, filterType, nodeId, onSelect, toast],
  );

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
      <div className="py-8 text-center text-muted-foreground">
        <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Kein aktives SharePoint-Quellsystem konfiguriert</p>
        <p className="text-sm mt-1">
          Erstellen Sie zuerst ein SharePoint-Quellsystem unter
          &quot;Konnektoren&quot;
        </p>
      </div>
    );
  }

  const filteredItems = items?.filter((item) => {
    if (item.isFolder) return true;
    if (!filterType) return true;
    const cls = classifyMimeType(item.mimeType ?? "");
    return cls === filterType;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {step !== "site" && (
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}

        {step === "items" && (
          <div className="flex items-center gap-1 text-sm flex-1 min-w-0">
            <button
              className="text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => handleBreadcrumbClick(-1)}
            >
              Stammordner
            </button>
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1 min-w-0">
                <span className="text-muted-foreground shrink-0">/</span>
                <button
                  className="text-muted-foreground hover:text-foreground truncate"
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

      <div className="max-h-[40vh] overflow-y-auto min-h-[200px]">
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
            {filteredItems?.map((item) => {
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
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left"
                  disabled={isImporting}
                  onClick={() =>
                    handleSelectItem({
                      id: item.id!,
                      name: item.name!,
                      mimeType: item.mimeType ?? "application/octet-stream",
                      size: item.size ?? 0,
                      driveId: item.driveId!,
                    })
                  }
                >
                  <ItemIcon className="w-5 h-5 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
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
                </button>
              );
            })}
            {!itemsLoading &&
              (!filteredItems || filteredItems.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  {filterType
                    ? `Keine ${filterType === "image" ? "Bilder" : filterType === "video" ? "Videos" : "Dateien"} in diesem Ordner`
                    : "Keine Dokumente in diesem Ordner"}
                </p>
              )}
          </div>
        )}
      </div>

      {isImporting && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Datei wird aus SharePoint importiert...</span>
        </div>
      )}
    </div>
  );
}
