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
  RefreshCw,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  useGetQualityOverview,
  useGetQualityPages,
  useGetQualityDuplicates,
  useGetMaintenanceHints,
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
  };
  return <span className="text-xs">{labels[type] || type}</span>;
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
          {Array.from({ length: 8 }).map((_, i) => (
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
            title="Ø Vollständigkeit"
            value={`${overview.avgCompleteness}%`}
            icon={Shield}
            color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Veröffentlicht</span>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          overview.totalPages > 0
                            ? (overview.publishedPages / overview.totalPages) *
                              100
                            : 0
                        }
                        className="w-40 h-3"
                        indicatorClassName="bg-green-500"
                      />
                      <span className="text-sm font-medium w-12 text-right">
                        {overview.publishedPages}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Entwürfe</span>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          overview.totalPages > 0
                            ? (overview.draftPages / overview.totalPages) * 100
                            : 0
                        }
                        className="w-40 h-3"
                        indicatorClassName="bg-yellow-500"
                      />
                      <span className="text-sm font-medium w-12 text-right">
                        {overview.draftPages}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Ohne Verantwortlichen</span>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          overview.totalPages > 0
                            ? (overview.pagesWithoutOwner /
                                overview.totalPages) *
                              100
                            : 0
                        }
                        className="w-40 h-3"
                        indicatorClassName="bg-orange-500"
                      />
                      <span className="text-sm font-medium w-12 text-right">
                        {overview.pagesWithoutOwner}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Review überfällig</span>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          overview.totalPages > 0
                            ? (overview.overdueReviews / overview.totalPages) *
                              100
                            : 0
                        }
                        className="w-40 h-3"
                        indicatorClassName="bg-red-500"
                      />
                      <span className="text-sm font-medium w-12 text-right">
                        {overview.overdueReviews}
                      </span>
                    </div>
                  </div>
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
              <SelectTrigger className="w-[200px]">
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
                Duplikat-Analyse
              </CardTitle>
              <CardDescription>
                Seiten mit identischen Titeln, die möglicherweise
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
                  {duplicates.map((group) => (
                    <div
                      key={group.title}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <h4 className="font-medium">{group.title}</h4>
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
      </Tabs>
    </div>
  );
}

function StatusLabel({ status }: { status: string }) {
  const config: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    draft: { label: "Entwurf", variant: "secondary" },
    in_review: { label: "Im Review", variant: "outline" },
    approved: { label: "Genehmigt", variant: "default" },
    published: { label: "Veröffentlicht", variant: "default" },
    archived: { label: "Archiviert", variant: "secondary" },
    deleted: { label: "Gelöscht", variant: "destructive" },
  };
  const c = config[status] || { label: status, variant: "outline" as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
