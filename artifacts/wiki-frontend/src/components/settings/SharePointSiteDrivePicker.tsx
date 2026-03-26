import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Globe,
  Library,
  ChevronRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
} from "lucide-react";
import {
  useListSharePointSites,
  getListSharePointSitesQueryKey,
  useListSharePointDrives,
  getListSharePointDrivesQueryKey,
} from "@workspace/api-client-react";
import type {
  SharePointSite,
  SharePointDrive,
} from "@workspace/api-client-react";

export interface SharePointSelection {
  siteId: string;
  siteName: string;
  driveId: string;
  driveName: string;
}

interface SharePointSiteDrivePickerProps {
  value: SharePointSelection | null;
  onChange: (selection: SharePointSelection | null) => void;
}

export function SharePointSiteDrivePicker({
  value,
  onChange,
}: SharePointSiteDrivePickerProps) {
  const [browsing, setBrowsing] = useState(!value);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSite, setSelectedSite] = useState<SharePointSite | null>(null);
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

  const handleSelectDrive = (site: SharePointSite, drive: SharePointDrive) => {
    onChange({
      siteId: site.id,
      siteName: site.displayName,
      driveId: drive.id,
      driveName: drive.name,
    });
    setBrowsing(false);
    setSelectedSite(null);
    setSearchQuery("");
    setDebouncedQuery("");
  };

  if (!browsing && value) {
    return (
      <div className="border rounded-lg p-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
            <div>
              <p className="font-medium">{value.siteName}</p>
              <p className="text-xs text-muted-foreground">{value.driveName}</p>
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
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        {selectedSite && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSelectedSite(null)}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <button
            type="button"
            className={`hover:text-foreground ${!selectedSite ? "text-foreground font-medium" : ""}`}
            onClick={() => setSelectedSite(null)}
          >
            Sites
          </button>
          {selectedSite && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">
                {selectedSite.displayName}
              </span>
            </>
          )}
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

      {selectedSite && (
        <DrivesList site={selectedSite} onSelect={handleSelectDrive} />
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
          <CheckCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}
