import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Globe,
  Library,
  Folder,
  FileText,
  ChevronRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  FolderCheck,
} from "lucide-react";
import {
  useListSharePointSites,
  getListSharePointSitesQueryKey,
  useListSharePointDrives,
  getListSharePointDrivesQueryKey,
  useListSharePointDriveItems,
  getListSharePointDriveItemsQueryKey,
} from "@workspace/api-client-react";
import type {
  SharePointSite,
  SharePointDrive,
  SharePointItem,
} from "@workspace/api-client-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSite, setSelectedSite] = useState<SharePointSite | null>(null);
  const [selectedDrive, setSelectedDrive] = useState<{
    site: SharePointSite;
    drive: SharePointDrive;
  } | null>(null);
  const [folderStack, setFolderStack] = useState<
    { id: string; name: string }[]
  >([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(q), 400);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const resetBrowser = () => {
    setSelectedSite(null);
    setSelectedDrive(null);
    setFolderStack([]);
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const handleSelectDrive = (site: SharePointSite, drive: SharePointDrive) => {
    setSelectedDrive({ site, drive });
    setFolderStack([]);
  };

  const handleSelectFolder = () => {
    if (!selectedDrive) return;
    const currentFolder =
      folderStack.length > 0 ? folderStack[folderStack.length - 1] : null;
    const folderPath = folderStack.map((f) => f.name).join("/") || "/";
    onChange({
      siteId: selectedDrive.site.id,
      siteName: selectedDrive.site.displayName,
      driveId: selectedDrive.drive.id,
      driveName: selectedDrive.drive.name,
      folderId: currentFolder?.id,
      folderName: currentFolder?.name || selectedDrive.drive.name,
      folderPath,
      isFolder: true,
    });
    setBrowsing(false);
    resetBrowser();
  };

  const handleSelectItem = (item: SharePointItem) => {
    if (!selectedDrive) return;
    if (item.isFolder) {
      setFolderStack([...folderStack, { id: item.id, name: item.name }]);
      return;
    }
    if (mode === "storage") return;
    const folderPath = folderStack.map((f) => f.name).join("/") || "/";
    onChange({
      siteId: selectedDrive.site.id,
      siteName: selectedDrive.site.displayName,
      driveId: selectedDrive.drive.id,
      driveName: selectedDrive.drive.name,
      itemId: item.id,
      itemName: item.name,
      folderPath,
      isFolder: false,
    });
    setBrowsing(false);
    resetBrowser();
  };

  const handleBack = () => {
    if (folderStack.length > 0) {
      setFolderStack(folderStack.slice(0, -1));
    } else if (selectedDrive) {
      setSelectedDrive(null);
    } else if (selectedSite) {
      setSelectedSite(null);
    }
  };

  if (!browsing && value) {
    const displayPath = value.folderPath && value.folderPath !== "/" ? ` / ${value.folderPath}` : "";
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
                {itemLabel ? ` → ${itemLabel}` : ""}
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

  const currentFolderId =
    folderStack.length > 0 ? folderStack[folderStack.length - 1].id : undefined;

  const breadcrumbParts: { label: string; onClick: () => void }[] = [];
  breadcrumbParts.push({
    label: "Sites",
    onClick: () => {
      setSelectedSite(null);
      setSelectedDrive(null);
      setFolderStack([]);
    },
  });
  if (selectedSite) {
    breadcrumbParts.push({
      label: selectedSite.displayName,
      onClick: () => {
        setSelectedDrive(null);
        setFolderStack([]);
      },
    });
  }
  if (selectedDrive) {
    breadcrumbParts.push({
      label: selectedDrive.drive.name,
      onClick: () => setFolderStack([]),
    });
    folderStack.forEach((f, i) => {
      breadcrumbParts.push({
        label: f.name,
        onClick: () => setFolderStack(folderStack.slice(0, i + 1)),
      });
    });
  }

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        {(selectedSite || selectedDrive || folderStack.length > 0) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleBack}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
          {breadcrumbParts.map((bp, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <button
                type="button"
                className={`hover:text-foreground ${i === breadcrumbParts.length - 1 ? "text-foreground font-medium" : ""}`}
                onClick={bp.onClick}
              >
                {bp.label}
              </button>
            </span>
          ))}
        </div>
      </div>

      {!selectedSite && (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Site suchen..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <SitesList searchQuery={debouncedQuery} onSelect={setSelectedSite} />
        </>
      )}

      {selectedSite && !selectedDrive && (
        <DrivesList
          site={selectedSite}
          onSelect={(site, drive) => handleSelectDrive(site, drive)}
        />
      )}

      {selectedDrive && (
        <>
          <ItemsBrowser
            driveId={selectedDrive.drive.id}
            folderId={currentFolderId}
            mode={mode}
            onOpenFolder={(item) =>
              setFolderStack([...folderStack, { id: item.id, name: item.name }])
            }
            onSelectFile={mode === "source" ? handleSelectItem : undefined}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleSelectFolder}
          >
            <FolderCheck className="h-3.5 w-3.5 mr-1.5" />
            {folderStack.length > 0
              ? `"${folderStack[folderStack.length - 1].name}" auswählen`
              : `Stammverzeichnis "${selectedDrive.drive.name}" auswählen`}
          </Button>
        </>
      )}
    </div>
  );
}

function SitesList({
  searchQuery,
  onSelect,
}: {
  searchQuery: string;
  onSelect: (site: SharePointSite) => void;
}) {
  const params = { q: searchQuery || undefined };
  const { data, isLoading, error } = useListSharePointSites(params, {
    query: { queryKey: getListSharePointSitesQueryKey(params) },
  });
  const sites = (data as unknown as SharePointSite[]) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">
          Sites laden...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-destructive py-2">
        Fehler beim Laden der Sites
      </p>
    );
  }

  if (sites.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">Keine Sites gefunden</p>
    );
  }

  return (
    <div className="max-h-48 overflow-y-auto space-y-1">
      {sites.map((site) => (
        <button
          key={site.id}
          type="button"
          className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left transition-colors"
          onClick={() => onSelect(site)}
        >
          <Globe className="h-4 w-4 text-blue-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{site.displayName}</p>
            {site.description && (
              <p className="text-xs text-muted-foreground truncate">
                {site.description}
              </p>
            )}
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}

function DrivesList({
  site,
  onSelect,
}: {
  site: SharePointSite;
  onSelect: (site: SharePointSite, drive: SharePointDrive) => void;
}) {
  const { data, isLoading, error } = useListSharePointDrives(site.id, {
    query: { queryKey: getListSharePointDrivesQueryKey(site.id) },
  });
  const drives = (data as unknown as SharePointDrive[]) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">
          Bibliotheken laden...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-destructive py-2">
        Fehler beim Laden der Bibliotheken
      </p>
    );
  }

  if (drives.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        Keine Bibliotheken gefunden
      </p>
    );
  }

  return (
    <div className="max-h-48 overflow-y-auto space-y-1">
      {drives.map((drive) => (
        <button
          key={drive.id}
          type="button"
          className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left transition-colors"
          onClick={() => onSelect(site, drive)}
        >
          <Library className="h-4 w-4 text-green-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{drive.name}</p>
            <p className="text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] mr-1">
                {drive.driveType}
              </Badge>
            </p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}

function ItemsBrowser({
  driveId,
  folderId,
  mode,
  onOpenFolder,
  onSelectFile,
}: {
  driveId: string;
  folderId?: string;
  mode: "source" | "storage";
  onOpenFolder: (item: SharePointItem) => void;
  onSelectFile?: (item: SharePointItem) => void;
}) {
  const params = folderId ? { folderId } : undefined;
  const { data, isLoading, error } = useListSharePointDriveItems(
    driveId,
    params,
    {
      query: {
        queryKey: getListSharePointDriveItemsQueryKey(driveId, params),
      },
    },
  );
  const items = (data as unknown as SharePointItem[]) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">
          Inhalte laden...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-destructive py-2">
        Fehler beim Laden der Inhalte
      </p>
    );
  }

  const folders = items.filter((i) => i.isFolder);
  const files = mode === "source" ? items.filter((i) => !i.isFolder) : [];

  if (folders.length === 0 && files.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-3 text-center">
        {mode === "storage" ? "Keine Unterordner vorhanden" : "Dieser Ordner ist leer"}
      </p>
    );
  }

  return (
    <div className="max-h-48 overflow-y-auto space-y-0.5">
      {folders.map((item) => (
        <button
          key={item.id}
          type="button"
          className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left transition-colors"
          onClick={() => onOpenFolder(item)}
        >
          <Folder className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{item.name}</p>
          </div>
          {item.childCount != null && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {item.childCount}
            </Badge>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      ))}
      {files.map((item) => (
        <button
          key={item.id}
          type="button"
          className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left transition-colors"
          onClick={() => onSelectFile?.(item)}
        >
          <FileText className="h-4 w-4 text-blue-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm truncate">{item.name}</p>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {item.size > 0 ? formatSize(item.size) : ""}
          </span>
        </button>
      ))}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
