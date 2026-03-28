import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@workspace/ui/input";
import { Button } from "@workspace/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { Separator } from "@workspace/ui/separator";
import {
  Search,
  Globe,
  Library,
  Folder,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  Loader2,
  HardDrive,
  Clock,
  User,
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

interface BreadcrumbEntry {
  label: string;
  type: "root" | "site" | "drive" | "folder";
  id?: string;
}

function getFileIcon(mimeType: string, isFolder: boolean) {
  if (isFolder) return Folder;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return FileSpreadsheet;
  if (mimeType.startsWith("image/")) return FileImage;
  if (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("text")
  )
    return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SharePointBrowser() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [selectedSite, setSelectedSite] = useState<SharePointSite | null>(null);
  const [selectedDrive, setSelectedDrive] = useState<SharePointDrive | null>(
    null,
  );
  const [folderStack, setFolderStack] = useState<
    { id: string; name: string }[]
  >([]);

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

  const currentFolderId =
    folderStack.length > 0 ? folderStack[folderStack.length - 1].id : undefined;

  const breadcrumbs: BreadcrumbEntry[] = [
    { label: "SharePoint", type: "root" },
  ];
  if (selectedSite) {
    breadcrumbs.push({
      label: selectedSite.displayName,
      type: "site",
      id: selectedSite.id,
    });
  }
  if (selectedDrive) {
    breadcrumbs.push({
      label: selectedDrive.name,
      type: "drive",
      id: selectedDrive.id,
    });
  }
  for (const f of folderStack) {
    breadcrumbs.push({ label: f.name, type: "folder", id: f.id });
  }

  const handleBreadcrumbClick = (index: number) => {
    const entry = breadcrumbs[index];
    if (entry.type === "root") {
      setSelectedSite(null);
      setSelectedDrive(null);
      setFolderStack([]);
    } else if (entry.type === "site") {
      setSelectedDrive(null);
      setFolderStack([]);
    } else if (entry.type === "drive") {
      setFolderStack([]);
    } else if (entry.type === "folder") {
      const folderIndex = folderStack.findIndex((f) => f.id === entry.id);
      setFolderStack(folderStack.slice(0, folderIndex + 1));
    }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {(selectedSite || selectedDrive || folderStack.length > 0) && (
          <Button variant="ghost" size="icon" aria-label="Zur vorherigen Ebene" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        {!selectedSite && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="SharePoint-Sites suchen..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="flex items-center gap-1 shrink-0">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            <button
              className={`hover:text-foreground transition-colors ${
                i === breadcrumbs.length - 1
                  ? "text-foreground font-medium"
                  : ""
              }`}
              onClick={() => handleBreadcrumbClick(i)}
            >
              {b.label}
            </button>
          </span>
        ))}
      </div>

      <Separator />

      {!selectedSite && (
        <SitesList
          searchQuery={debouncedQuery}
          onSelectSite={(site) => {
            setSelectedSite(site);
            setSearchQuery("");
            setDebouncedQuery("");
          }}
        />
      )}

      {selectedSite && !selectedDrive && (
        <DrivesList
          siteId={selectedSite.id}
          onSelectDrive={(drive) => {
            setSelectedDrive(drive);
            setSearchQuery("");
            setDebouncedQuery("");
          }}
        />
      )}

      {selectedDrive && (
        <ItemsList
          driveId={selectedDrive.id}
          folderId={currentFolderId}
          onOpenFolder={(item) => {
            setFolderStack([...folderStack, { id: item.id, name: item.name }]);
          }}
        />
      )}
    </div>
  );
}

function SitesList({
  searchQuery,
  onSelectSite,
}: {
  searchQuery: string;
  onSelectSite: (site: SharePointSite) => void;
}) {
  const params = searchQuery ? { q: searchQuery } : undefined;
  const { data: sites, isLoading } = useListSharePointSites(params, {
    query: {
      queryKey: getListSharePointSitesQueryKey(params),
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          SharePoint-Sites werden geladen...
        </span>
      </div>
    );
  }

  if (!sites || sites.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Keine SharePoint-Sites gefunden</p>
          <p className="text-sm mt-1">
            {searchQuery
              ? "Versuchen Sie einen anderen Suchbegriff"
              : "Stellen Sie sicher, dass Sites.Read.All Berechtigung erteilt ist"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground mb-2">
        {sites.length} Site{sites.length !== 1 ? "s" : ""} gefunden
      </p>
      {sites.map((site) => (
        <div
          key={site.id}
          role="button"
          tabIndex={0}
          className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onSelectSite(site)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
              e.preventDefault();
              onSelectSite(site);
            }
          }}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 shrink-0">
            <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{site.displayName}</p>
            {site.description && (
              <p className="text-xs text-muted-foreground truncate">
                {site.description}
              </p>
            )}
          </div>
          <a
            href={site.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      ))}
    </div>
  );
}

function DrivesList({
  siteId,
  onSelectDrive,
}: {
  siteId: string;
  onSelectDrive: (drive: SharePointDrive) => void;
}) {
  const { data: drives, isLoading } = useListSharePointDrives(siteId, {
    query: {
      queryKey: getListSharePointDrivesQueryKey(siteId),
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          Bibliotheken werden geladen...
        </span>
      </div>
    );
  }

  if (!drives || drives.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Library className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Keine Dokumentbibliotheken gefunden</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground mb-2">
        {drives.length} Bibliothek{drives.length !== 1 ? "en" : ""}
      </p>
      {drives.map((drive) => (
        <div
          key={drive.id}
          role="button"
          tabIndex={0}
          className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onSelectDrive(drive)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
              e.preventDefault();
              onSelectDrive(drive);
            }
          }}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 shrink-0">
            <HardDrive className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{drive.name}</p>
            <p className="text-xs text-muted-foreground">
              {drive.driveType === "documentLibrary"
                ? "Dokumentbibliothek"
                : drive.driveType}
            </p>
          </div>
          <a
            href={drive.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      ))}
    </div>
  );
}

function ItemsList({
  driveId,
  folderId,
  onOpenFolder,
}: {
  driveId: string;
  folderId?: string;
  onOpenFolder: (item: SharePointItem) => void;
}) {
  const params = folderId ? { folderId } : undefined;
  const { data: items, isLoading } = useListSharePointDriveItems(
    driveId,
    params,
    {
      query: {
        queryKey: getListSharePointDriveItemsQueryKey(driveId, params),
      },
    },
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Wird geladen...</span>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Dieser Ordner ist leer</p>
        </CardContent>
      </Card>
    );
  }

  const folders = items.filter((i) => i.isFolder);
  const files = items.filter((i) => !i.isFolder);

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground mb-2">
        {folders.length > 0 && (
          <span>
            {folders.length} Ordner
            {files.length > 0 ? ", " : ""}
          </span>
        )}
        {files.length > 0 && (
          <span>
            {files.length} Datei{files.length !== 1 ? "en" : ""}
          </span>
        )}
      </p>

      <Card>
        <CardHeader className="py-2 px-4">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-5">Name</div>
            <div className="col-span-2">Geändert</div>
            <div className="col-span-2">Von</div>
            <div className="col-span-2 text-right">Größe</div>
            <div className="col-span-1" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {folders.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onClick={() => onOpenFolder(item)}
            />
          ))}
          {folders.length > 0 && files.length > 0 && <Separator />}
          {files.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ItemRow({
  item,
  onClick,
}: {
  item: SharePointItem;
  onClick?: () => void;
}) {
  const Icon = getFileIcon(item.mimeType, item.isFolder);
  const iconColor = item.isFolder
    ? "text-amber-500"
    : item.mimeType.includes("pdf")
      ? "text-red-500"
      : item.mimeType.includes("spreadsheet") || item.mimeType.includes("excel")
        ? "text-green-600"
        : item.mimeType.includes("word") || item.mimeType.includes("document")
          ? "text-blue-600"
          : item.mimeType.startsWith("image/")
            ? "text-purple-500"
            : "text-gray-500";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`grid grid-cols-12 gap-2 items-center px-4 py-2.5 text-sm border-b last:border-b-0 hover:bg-muted/50 transition-colors ${
        onClick ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" : ""
      }`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div className="col-span-5 flex items-center gap-2 min-w-0">
        <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
        <span className="truncate font-medium">{item.name}</span>
        {item.isFolder && item.childCount != null && (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {item.childCount}
          </Badge>
        )}
      </div>
      <div className="col-span-2 text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3 shrink-0" />
        <span className="truncate">
          {item.lastModifiedAt ? formatDate(item.lastModifiedAt) : "—"}
        </span>
      </div>
      <div className="col-span-2 text-xs text-muted-foreground flex items-center gap-1 min-w-0">
        <User className="h-3 w-3 shrink-0" />
        <span className="truncate">{item.lastModifiedBy}</span>
      </div>
      <div className="col-span-2 text-xs text-muted-foreground text-right">
        {formatFileSize(item.size)}
      </div>
      <div className="col-span-1 flex justify-end">
        {item.isFolder ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <a
            href={item.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
