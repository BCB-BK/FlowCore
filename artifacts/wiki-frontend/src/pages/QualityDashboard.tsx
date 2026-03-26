import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart3,
  FileWarning,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Link2Off,
  Copy,
  Shield,
  ChevronRight,
  FileX,
  Search,
  ImageOff,
  Tag,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  useGetQualityOverview,
  useGetQualityPages,
  useGetQualityDuplicates,
  useGetMaintenanceHints,
  useGetSearchInsights,
} from "@workspace/api-client-react";
import type {
  GetQualityPagesFilter,
  MaintenanceHintSeverity,
} from "@workspace/api-client-react";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  onClick,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={
        onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
      }
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CompletenessBar({ value }: { value: number }) {
  let color = "bg-red-500";
  if (value >= 75) color = "bg-green-500";
  else if (value >= 50) color = "bg-yellow-500";
  else if (value >= 25) color = "bg-orange-500";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-20">
            <Progress
              value={value}
              className="h-2"
              indicatorClassName={color}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>{value}% vollständig</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SeverityBadge({ severity }: { severity: MaintenanceHintSeverity }) {
  const config = {
    critical: { label: "Kritisch", variant: "destructive" as const },
    warning: { label: "Warnung", variant: "secondary" as const },
    info: { label: "Info", variant: "outline" as const },
  };
  const c = config[severity] || config.info;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function HintTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    missing_owner: "Kein Verantwortlicher",
    overdue_review: "Review überfällig",
    stale_content: "Veralteter Inhalt",
    orphan: "Verwaiste Seite",
    no_revision: "Keine Revision",
    archived_reference: "Archivierte Referenz",
    missing_mandatory_fields: "Fehlende Pflichtfelder",
    broken_link: "Defekte Verknüpfung",
    unreferenced_media: "Ungenutzte Medien",
    stale_policy_reference: "Veraltete Richtlinie",
    missing_tags: "Fehlende Tags",
    violated_review_cycle: "Review-Zyklus verletzt",
  };
  return <span className="text-xs">{labels[type] || type}</span>;
}

function StatusLabel({ status }: { status: string }) {
  const config: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "outline" | "destructive";
    }
  > = {
    published: { label: "Veröffentlicht", variant: "default" },
    draft: { label: "Entwurf", variant: "secondary" },
    in_review: { label: "In Prüfung", variant: "outline" },
    approved: { label: "Genehmigt", variant: "default" },
    archived: { label: "Archiviert", variant: "destructive" },
  };
  const c = config[status] || { label: status, variant: "outline" as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export function QualityDashboard() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [pageFilter, setPageFilter] = useState<string>("all");

  const { data: overview, isLoading: overviewLoading } =
    useGetQualityOverview();
  const { data: pages, isLoading: pagesLoading } = useGetQualityPages(
    pageFilter === "all" ? {} : { filter: pageFilter as GetQualityPagesFilter },
  );
  const { data: duplicates, isLoading: duplicatesLoading } =
    useGetQualityDuplicates();
  const { data: hints, isLoading: hintsLoading } = useGetMaintenanceHints();
  const { data: searchInsights, isLoading: searchLoading } =
    useGetSearchInsights();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Prozessmanagement Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Qualitätsmetriken und Wartungsübersicht
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/my-work")}>
          Meine Aufgaben
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {overviewLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Seiten gesamt"
            value={overview.totalPages}
            icon={BarChart3}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            title="Veröffentlicht"
            value={overview.publishedPages}
            icon={CheckCircle}
            color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          />
          <StatCard
            title="Entwürfe"
            value={overview.draftPages}
            icon={FileWarning}
            color="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            onClick={() => {
              setPageFilter("draft");
              setActiveTab("pages");
            }}
          />
          <StatCard
            title="Archiviert"
            value={overview.archivedPages}
            icon={FileX}
            color="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          />
          <StatCard
            title="Ohne Verantwortlichen"
            value={overview.pagesWithoutOwner}
            icon={Users}
            color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
            onClick={() => {
              setPageFilter("no_owner");
              setActiveTab("pages");
            }}
          />
          <StatCard
            title="Review überfällig"
            value={overview.overdueReviews}
            icon={Clock}
            color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            onClick={() => {
              setPageFilter("overdue_review");
              setActiveTab("pages");
            }}
          />
          <StatCard
            title="Verwaiste Seiten"
            value={overview.orphanedPages}
            icon={Link2Off}
            color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
            onClick={() => {
              setPageFilter("orphan");
              setActiveTab("pages");
            }}
          />
          <StatCard
            title="Unvollständig"
            value={overview.incompletePagesCount}
            icon={Shield}
            color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            onClick={() => {
              setPageFilter("incomplete");
              setActiveTab("pages");
            }}
          />
          <StatCard
            title="Defekte Verknüpfungen"
            value={overview.brokenLinks}
            icon={Link2Off}
            color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            onClick={() => {
              setPageFilter("broken_refs");
              setActiveTab("pages");
            }}
          />
          <StatCard
            title="Ungenutzte Medien"
            value={overview.unreferencedMedia}
            icon={ImageOff}
            color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          />
          <StatCard
            title="Ohne Tags"
            value={overview.pagesWithoutTags}
            icon={Tag}
            color="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
            onClick={() => {
              setPageFilter("no_tags");
              setActiveTab("pages");
            }}
          />
          <StatCard
            title="Ø Vollständigkeit"
            value={`${overview.avgCompleteness}%`}
            icon={Shield}
            color="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
          />
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Seitenqualität</TabsTrigger>
          <TabsTrigger value="pages">Seitenliste</TabsTrigger>
          <TabsTrigger value="hints">
            Wartungshinweise
            {hints && hints.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs px-1.5">
                {hints.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="duplicates">
            Duplikate
            {duplicates && duplicates.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs px-1.5">
                {duplicates.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="search">
            Suche
            {overview && overview.zeroResultSearches > 0 && (
              <Badge variant="outline" className="ml-2 text-xs px-1.5">
                {overview.zeroResultSearches}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Qualitätsverteilung</CardTitle>
              <CardDescription>
                Übersicht der Seitenqualität nach Status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview ? (
                <div className="space-y-4">
                  {[
                    {
                      label: "Veröffentlicht",
                      count: overview.publishedPages,
                      color: "bg-green-500",
                    },
                    {
                      label: "Entwürfe",
                      count: overview.draftPages,
                      color: "bg-yellow-500",
                    },
                    {
                      label: "Ohne Verantwortlichen",
                      count: overview.pagesWithoutOwner,
                      color: "bg-orange-500",
                    },
                    {
                      label: "Review überfällig",
                      count: overview.overdueReviews,
                      color: "bg-red-500",
                    },
                    {
                      label: "Defekte Verknüpfungen",
                      count: overview.brokenLinks,
                      color: "bg-red-400",
                    },
                    {
                      label: "Ohne Tags",
                      count: overview.pagesWithoutTags,
                      color: "bg-indigo-500",
                    },
                    {
                      label: "Ungenutzte Medien",
                      count: overview.unreferencedMedia,
                      color: "bg-amber-500",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={
                            overview.totalPages > 0
                              ? (item.count / overview.totalPages) * 100
                              : 0
                          }
                          className="w-40 h-3"
                          indicatorClassName={item.color}
                        />
                        <span className="text-sm font-medium w-12 text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Skeleton className="h-40" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={pageFilter} onValueChange={setPageFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Seiten</SelectItem>
                <SelectItem value="no_owner">Ohne Verantwortlichen</SelectItem>
                <SelectItem value="overdue_review">
                  Review überfällig
                </SelectItem>
                <SelectItem value="orphan">Verwaiste Seiten</SelectItem>
                <SelectItem value="draft">Entwürfe</SelectItem>
                <SelectItem value="stale">Veraltet (&gt;180 Tage)</SelectItem>
                <SelectItem value="no_tags">Ohne Tags</SelectItem>
                <SelectItem value="broken_refs">
                  Defekte Verknüpfungen
                </SelectItem>
                <SelectItem value="incomplete">Unvollständig</SelectItem>
              </SelectContent>
            </Select>
            {pages && (
              <span className="text-sm text-muted-foreground">
                {pages.total} Seiten
              </span>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {pagesLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : pages && pages.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kennung</TableHead>
                      <TableHead>Titel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vollst.</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead className="text-right">Kinder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.items.map((page) => (
                      <TableRow
                        key={page.nodeId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/node/${page.nodeId}`)}
                      >
                        <TableCell className="font-mono text-xs">
                          {page.displayCode}
                        </TableCell>
                        <TableCell className="font-medium max-w-[300px] truncate">
                          {page.title}
                        </TableCell>
                        <TableCell>
                          <StatusLabel status={page.status} />
                        </TableCell>
                        <TableCell>
                          <CompletenessBar value={page.completeness} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {page.tagCount}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {page.isOrphan && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Link2Off className="h-4 w-4 text-purple-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>Verwaist</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {page.reviewOverdue && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Clock className="h-4 w-4 text-red-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Review überfällig
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {!page.ownerId && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Users className="h-4 w-4 text-orange-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Kein Verantwortlicher
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {page.tagCount === 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Tag className="h-4 w-4 text-indigo-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>Keine Tags</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {page.childCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Keine Seiten mit diesem Filter gefunden
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Wartungshinweise
              </CardTitle>
              <CardDescription>
                Handlungsempfehlungen für die Qualitätssicherung
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {hintsLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : hints && hints.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Priorität</TableHead>
                      <TableHead className="w-40">Typ</TableHead>
                      <TableHead>Seite</TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hints.map((hint, idx) => (
                      <TableRow
                        key={`${hint.nodeId}-${hint.type}-${idx}`}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/node/${hint.nodeId}`)}
                      >
                        <TableCell>
                          <SeverityBadge severity={hint.severity} />
                        </TableCell>
                        <TableCell>
                          <HintTypeLabel type={hint.type} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-mono text-xs text-muted-foreground mr-2">
                              {hint.displayCode}
                            </span>
                            <span className="font-medium">{hint.title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                          {hint.detail}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <p>Keine Wartungshinweise — alles sieht gut aus!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Duplikat- und Ähnlichkeitsanalyse
              </CardTitle>
              <CardDescription>
                Seiten mit identischen oder ähnlichen Titeln, die möglicherweise
                zusammengeführt werden sollten
              </CardDescription>
            </CardHeader>
            <CardContent>
              {duplicatesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : duplicates && duplicates.length > 0 ? (
                <div className="space-y-4">
                  {duplicates.map((group, gi) => (
                    <div
                      key={`${group.title}-${gi}`}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{group.title}</h4>
                        <Badge
                          variant={
                            group.matchType === "exact"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {group.matchType === "exact"
                            ? "Exakt"
                            : `Ähnlich ${Math.round(group.similarityScore * 100)}%`}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {group.nodes.map((node) => (
                          <div
                            key={node.nodeId}
                            className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                            onClick={() => navigate(`/node/${node.nodeId}`)}
                          >
                            <span className="font-mono text-xs text-muted-foreground">
                              {node.displayCode}
                            </span>
                            <StatusLabel status={node.status} />
                            <span className="text-muted-foreground">
                              {node.templateType}
                            </span>
                            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <p>Keine Duplikate gefunden</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Suchstatistiken (30 Tage)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchLoading ? (
                  <Skeleton className="h-24" />
                ) : searchInsights ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">
                          {searchInsights.totalSearches}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Suchanfragen gesamt
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold text-red-600">
                          {searchInsights.zeroResultSearches}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ohne Ergebnis
                        </p>
                      </div>
                    </div>
                    {searchInsights.totalSearches > 0 && (
                      <div>
                        <Progress
                          value={
                            searchInsights.totalSearches > 0
                              ? ((searchInsights.totalSearches -
                                  searchInsights.zeroResultSearches) /
                                  searchInsights.totalSearches) *
                                100
                              : 0
                          }
                          className="h-3"
                          indicatorClassName="bg-green-500"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Erfolgsquote:{" "}
                          {searchInsights.totalSearches > 0
                            ? Math.round(
                                ((searchInsights.totalSearches -
                                  searchInsights.zeroResultSearches) /
                                  searchInsights.totalSearches) *
                                  100,
                              )
                            : 0}
                          %
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Keine Daten verfügbar
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Häufigste Suchanfragen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchLoading ? (
                  <Skeleton className="h-24" />
                ) : searchInsights && searchInsights.topQueries.length > 0 ? (
                  <div className="space-y-2">
                    {searchInsights.topQueries.slice(0, 10).map((q) => (
                      <div
                        key={q.query}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="truncate max-w-[200px]">
                          {q.query}
                        </span>
                        <Badge variant="outline">{q.count}x</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Keine Suchanfragen vorhanden
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
