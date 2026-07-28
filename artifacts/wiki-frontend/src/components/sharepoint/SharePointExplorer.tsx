import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@workspace/ui/input";
import { Button } from "@workspace/ui/button";
import { Card, CardContent } from "@workspace/ui/card";
import {
  Search,
  Users,
  Globe,
  Library,
  Folder,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Check,
  FolderCheck,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { getSharePointFileIcon, formatFileSize } from "@/lib/sharepoint-ui";

/**
 * Ein Explorer für SharePoint — gemeinsam genutzt von der Konnektor-Ansicht,
 * der Quellsystem-Einrichtung und der Dokumentverknüpfung auf einer Seite.
 *
 * Vorher hatte jede dieser Stellen ihre eigene Navigation. Sie liefen
 * auseinander: Eine zeigte Teams, die anderen rohe Site-Collections. Ein
 * gemeinsamer Baustein hält sie zusammen.
 *
 * Navigation: Team → Bibliothek → Ordner → Datei. Für Ablagen ohne Team gibt
 * es den zweiten Einstieg über alle SharePoint-Sites.
 */

export interface SharePointTeam {
  groupId: string;
  displayName: string;
  description: string | null;
  mail: string | null;
}

export interface SharePointSite {
  id: string;
  displayName: string;
  webUrl: string;
  description?: string;
}

export interface SharePointDrive {
  id: string;
  name: string;
  driveType: string;
  webUrl: string;
  siteId: string;
  siteName?: string;
}

export interface SharePointItem {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  mimeType: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
  isFolder: boolean;
  childCount?: number;
  driveId: string;
  parentPath?: string;
}

/** Wo im Explorer man gerade steht — Grundlage jeder Auswahl. */
export interface SharePointLocation {
  team: SharePointTeam | null;
  site: SharePointSite | null;
  drive: SharePointDrive | null;
  folderStack: { id: string; name: string }[];
}

export type SelectionMode = "none" | "file" | "folder";

interface SharePointExplorerProps {
  /**
   * "none": nur ansehen. "file": Dateien lassen sich auswählen.
   * "folder": zusätzlich lässt sich der aktuelle Ordner bzw. die Bibliothek
   * bestätigen (für Quellsysteme und Ablageziele).
   */
  select?: SelectionMode;
  selectedFileIds?: string[];
  onToggleFile?: (item: SharePointItem, location: SharePointLocation) => void;
  onConfirmFolder?: (location: SharePointLocation) => void;
  /** Kompaktere Darstellung für Dialoge. */
  dense?: boolean;
}

type BrowseMode = "teams" | "sites";

function ErrorCard({ error }: { error: unknown }) {
  const detail =
    error && typeof error === "object" && "data" in error
      ? ((error as { data?: { error?: string; graphStatus?: number } }).data ??
        null)
      : null;
  const graphStatus = detail?.graphStatus;
  const hint =
    graphStatus === 401 || graphStatus === 403
      ? "SharePoint hat den Zugriff abgelehnt. Prüfen Sie in Entra, ob die Berechtigungen Sites.Read.All und Group.Read.All erteilt sind — und melden Sie sich einmal neu an."
      : "Der Zugriff auf Microsoft Graph ist fehlgeschlagen. Details stehen im Serverprotokoll.";

  return (
    <Card className="border-destructive/40">
      <CardContent className="py-8 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-destructive/70" />
        <p className="font-medium">SharePoint konnte nicht abgefragt werden</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
          {hint}
        </p>
        {detail?.error && (
          <p className="text-xs text-muted-foreground mt-3 font-mono">
            {detail.error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function EmptyCard({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-muted-foreground">
        <div className="mx-auto mb-3 opacity-50 w-fit">{icon}</div>
        <p className="font-medium">{title}</p>
        {hint && <p className="text-sm mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Row({
  icon,
  title,
  subtitle,
  meta,
  selected,
  externalUrl,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  selected?: boolean;
  externalUrl?: string;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (
          (e.key === "Enter" || e.key === " ") &&
          e.target === e.currentTarget
        ) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {meta && (
        <span className="text-xs text-muted-foreground shrink-0">{meta}</span>
      )}
      {externalUrl && (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground p-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
          aria-label="In SharePoint öffnen"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
      {selected ? (
        <Check className="h-4 w-4 text-primary shrink-0" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
    </div>
  );
}

export function SharePointExplorer({
  select = "none",
  selectedFileIds = [],
  onToggleFile,
  onConfirmFolder,
  dense = false,
}: SharePointExplorerProps) {
  const [mode, setMode] = useState<BrowseMode>("teams");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [team, setTeam] = useState<SharePointTeam | null>(null);
  const [site, setSite] = useState<SharePointSite | null>(null);
  const [drive, setDrive] = useState<SharePointDrive | null>(null);
  const [folderStack, setFolderStack] = useState<
    { id: string; name: string }[]
  >([]);

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(q), 400);
  }, []);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const location: SharePointLocation = { team, site, drive, folderStack };
  const currentFolderId =
    folderStack.length > 0 ? folderStack[folderStack.length - 1].id : undefined;

  const teamsQuery = useQuery<SharePointTeam[]>({
    queryKey: ["sharepoint-teams", debouncedQuery],
    queryFn: () =>
      customFetch<SharePointTeam[]>(
        `/api/connectors/sharepoint/teams${
          debouncedQuery ? `?q=${encodeURIComponent(debouncedQuery)}` : ""
        }`,
      ),
    enabled: mode === "teams" && !team && !site,
  });

  const sitesQuery = useQuery<SharePointSite[]>({
    queryKey: ["sharepoint-sites", debouncedQuery],
    queryFn: () =>
      customFetch<SharePointSite[]>(
        `/api/connectors/sharepoint/sites${
          debouncedQuery ? `?q=${encodeURIComponent(debouncedQuery)}` : ""
        }`,
      ),
    enabled: mode === "sites" && !team && !site,
  });

  const drivesQuery = useQuery<SharePointDrive[]>({
    queryKey: ["sharepoint-drives", team?.groupId ?? site?.id],
    queryFn: () =>
      customFetch<SharePointDrive[]>(
        team
          ? `/api/connectors/sharepoint/teams/${team.groupId}/drives`
          : `/api/connectors/sharepoint/sites/${site!.id}/drives`,
      ),
    enabled: !!(team || site) && !drive,
  });

  const itemsQuery = useQuery<SharePointItem[]>({
    queryKey: ["sharepoint-items", drive?.id, currentFolderId],
    queryFn: () =>
      customFetch<SharePointItem[]>(
        `/api/connectors/sharepoint/drives/${drive!.id}/items${
          currentFolderId
            ? `?folderId=${encodeURIComponent(currentFolderId)}`
            : ""
        }`,
      ),
    enabled: !!drive,
  });

  const switchMode = (next: BrowseMode) => {
    setMode(next);
    setTeam(null);
    setSite(null);
    setDrive(null);
    setFolderStack([]);
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const goBack = () => {
    if (folderStack.length > 0) setFolderStack(folderStack.slice(0, -1));
    else if (drive) setDrive(null);
    else if (site) setSite(null);
    else if (team) setTeam(null);
  };

  const atRoot = !team && !site;

  const crumbs: { label: string; onClick: () => void }[] = [
    {
      label: mode === "teams" ? "Teams" : "SharePoint",
      onClick: () => {
        setTeam(null);
        setSite(null);
        setDrive(null);
        setFolderStack([]);
      },
    },
  ];
  if (team) {
    crumbs.push({
      label: team.displayName,
      onClick: () => {
        setDrive(null);
        setFolderStack([]);
      },
    });
  }
  if (site) {
    crumbs.push({
      label: site.displayName,
      onClick: () => {
        setDrive(null);
        setFolderStack([]);
      },
    });
  }
  if (drive) {
    crumbs.push({
      label: drive.name,
      onClick: () => setFolderStack([]),
    });
  }
  folderStack.forEach((f, i) => {
    crumbs.push({
      label: f.name,
      onClick: () => setFolderStack(folderStack.slice(0, i + 1)),
    });
  });

  return (
    <div className={dense ? "space-y-3" : "space-y-4"}>
      <div className="flex items-center gap-3">
        {!atRoot && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zur vorherigen Ebene"
            onClick={goBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        {atRoot && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={
                mode === "teams"
                  ? "Team suchen..."
                  : "SharePoint-Sites suchen..."
              }
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        )}
      </div>

      {atRoot && (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={mode === "teams" ? "secondary" : "ghost"}
            onClick={() => switchMode("teams")}
          >
            <Users className="h-4 w-4 mr-1.5" />
            Teams
          </Button>
          <Button
            size="sm"
            variant={mode === "sites" ? "secondary" : "ghost"}
            onClick={() => switchMode("sites")}
          >
            <Globe className="h-4 w-4 mr-1.5" />
            Alle SharePoint-Sites
          </Button>
        </div>
      )}

      <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1 shrink-0">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            <button
              type="button"
              className={`hover:text-foreground transition-colors ${
                i === crumbs.length - 1 ? "text-foreground font-medium" : ""
              }`}
              onClick={c.onClick}
            >
              {c.label}
            </button>
          </span>
        ))}
      </div>

      {/* Teams */}
      {mode === "teams" && atRoot && (
        <>
          {teamsQuery.isLoading ? (
            <Loading label="Teams werden geladen..." />
          ) : teamsQuery.error ? (
            <ErrorCard error={teamsQuery.error} />
          ) : !teamsQuery.data || teamsQuery.data.length === 0 ? (
            <EmptyCard
              icon={<Users className="h-10 w-10" />}
              title="Keine Teams gefunden"
              hint={
                debouncedQuery
                  ? "Versuchen Sie einen anderen Suchbegriff"
                  : "Stellen Sie sicher, dass die Berechtigung Group.Read.All erteilt ist"
              }
            />
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground mb-2">
                {teamsQuery.data.length} Team
                {teamsQuery.data.length !== 1 ? "s" : ""}
              </p>
              {teamsQuery.data.map((t) => (
                <Row
                  key={t.groupId}
                  icon={
                    <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  }
                  title={t.displayName}
                  subtitle={t.description}
                  onClick={() => {
                    setTeam(t);
                    setSearchQuery("");
                    setDebouncedQuery("");
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Sites */}
      {mode === "sites" && atRoot && (
        <>
          {sitesQuery.isLoading ? (
            <Loading label="SharePoint-Sites werden geladen..." />
          ) : sitesQuery.error ? (
            <ErrorCard error={sitesQuery.error} />
          ) : !sitesQuery.data || sitesQuery.data.length === 0 ? (
            <EmptyCard
              icon={<Globe className="h-10 w-10" />}
              title="Keine SharePoint-Sites gefunden"
              hint={
                debouncedQuery
                  ? "Versuchen Sie einen anderen Suchbegriff"
                  : "Stellen Sie sicher, dass die Berechtigung Sites.Read.All erteilt ist"
              }
            />
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground mb-2">
                {sitesQuery.data.length} Site
                {sitesQuery.data.length !== 1 ? "s" : ""}
              </p>
              {sitesQuery.data.map((s) => (
                <Row
                  key={s.id}
                  icon={
                    <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  }
                  title={s.displayName}
                  subtitle={s.description}
                  externalUrl={s.webUrl}
                  onClick={() => {
                    setSite(s);
                    setSearchQuery("");
                    setDebouncedQuery("");
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Bibliotheken */}
      {!atRoot && !drive && (
        <>
          {drivesQuery.isLoading ? (
            <Loading label="Bibliotheken werden geladen..." />
          ) : drivesQuery.error ? (
            <ErrorCard error={drivesQuery.error} />
          ) : !drivesQuery.data || drivesQuery.data.length === 0 ? (
            <EmptyCard
              icon={<Library className="h-10 w-10" />}
              title="Keine Dokumentbibliotheken gefunden"
            />
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground mb-2">
                {drivesQuery.data.length} Bibliothek
                {drivesQuery.data.length !== 1 ? "en" : ""}
              </p>
              {drivesQuery.data.map((d) => (
                <Row
                  key={d.id}
                  icon={
                    <Library className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  }
                  title={d.name}
                  subtitle={d.driveType}
                  externalUrl={d.webUrl}
                  onClick={() => {
                    setDrive(d);
                    setFolderStack([]);
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Ordner und Dateien */}
      {drive && (
        <>
          {select === "folder" && onConfirmFolder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConfirmFolder(location)}
            >
              <FolderCheck className="h-4 w-4 mr-1.5" />
              {folderStack.length > 0
                ? `Ordner „${folderStack[folderStack.length - 1].name}" wählen`
                : `Bibliothek „${drive.name}" wählen`}
            </Button>
          )}

          {itemsQuery.isLoading ? (
            <Loading label="Inhalte werden geladen..." />
          ) : itemsQuery.error ? (
            <ErrorCard error={itemsQuery.error} />
          ) : !itemsQuery.data || itemsQuery.data.length === 0 ? (
            <EmptyCard
              icon={<Folder className="h-10 w-10" />}
              title="Dieser Ordner ist leer"
            />
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground mb-2">
                {itemsQuery.data.length} Eintr
                {itemsQuery.data.length !== 1 ? "äge" : "ag"}
              </p>
              {itemsQuery.data.map((item) => {
                const Icon = getSharePointFileIcon(
                  item.mimeType,
                  item.isFolder,
                );
                const selected = selectedFileIds.includes(item.id);
                return (
                  <Row
                    key={item.id}
                    icon={<Icon className="h-5 w-5 text-muted-foreground" />}
                    title={item.name}
                    subtitle={
                      item.isFolder
                        ? `${item.childCount ?? 0} Element${item.childCount === 1 ? "" : "e"}`
                        : `${formatFileSize(item.size)} · ${item.lastModifiedBy}`
                    }
                    selected={select === "file" && !item.isFolder && selected}
                    externalUrl={item.isFolder ? undefined : item.webUrl}
                    onClick={() => {
                      if (item.isFolder) {
                        setFolderStack([
                          ...folderStack,
                          { id: item.id, name: item.name },
                        ]);
                        return;
                      }
                      if (select !== "none") onToggleFile?.(item, location);
                    }}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
