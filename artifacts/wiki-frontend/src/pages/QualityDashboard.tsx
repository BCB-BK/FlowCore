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
import { Input } from "@/components/ui/input";
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
  FileEdit,
  Send,
  RotateCcw,
  UserX,
  Eye,
  UserCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import { PAGE_TYPE_LABELS } from "@/lib/types";
import {
  useGetQualityOverview,
  useGetQualityPages,
  useGetQualityDuplicates,
  useGetMaintenanceHints,
  useGetSearchInsights,
  useGetQualityByProcess,
  useGetReviewDashboard,
  useGetOwnershipMonitor,
} from "@workspace/api-client-react";
import type {
  GetQualityPagesFilter,
  MaintenanceHintSeverity,
  GetReviewDashboardParams,
  GetReviewDashboardStatus,
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
    missing_mandatory_fields: "Fehlende Pflichtfelder",
    broken_link: "Defekte Verknüpfung",
    unreferenced_media: "Ungenutzte Medien",
    stale_policy_reference: "Veraltete Richtlinie",
    missing_tags: "Fehlende Tags",
    violated_review_cycle: "Review-Zyklus verletzt",
    contradictory_roles: "Widersprüchliche Rollen",
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

function WcStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "outline" | "destructive";
    }
  > = {
    draft: { label: "Entwurf", variant: "secondary" },
    in_review: { label: "In Review", variant: "default" },
    submitted: { label: "Eingereicht", variant: "default" },
    changes_requested: { label: "Zurückgegeben", variant: "destructive" },
    approved_for_publish: { label: "Freigegeben", variant: "outline" },
  };
  const c = config[status] || { label: status, variant: "outline" as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function ChangeTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    editorial: "Redaktionell",
    structural: "Strukturell",
    content: "Inhaltlich",
    metadata: "Metadaten",
  };
  return (
    <span className="text-xs text-muted-foreground">
      {labels[type] || type}
    </span>
  );
}

function GapBadge({ gap }: { gap: string }) {
  const config: Record<
    string,
    { label: string; variant: "destructive" | "secondary" | "outline" }
  > = {
    no_owner: { label: "Kein Eigentümer", variant: "destructive" },
    no_reviewer: { label: "Kein Reviewer", variant: "secondary" },
    no_approver: { label: "Kein Genehmiger", variant: "outline" },
  };
  const c = config[gap] || { label: gap, variant: "outline" as const };
  return (
    <Badge variant={c.variant} className="text-xs">
      {c.label}
    </Badge>
  );
}

function filteredOwnershipItems<
  T extends { gapTypes: string[] },
>(items: T[], filter: string): T[] {
  if (filter === "all") return items;
  if (filter === "multiple") return items.filter((i) => i.gapTypes.length > 1);
  return items.filter((i) => i.gapTypes.includes(filter));
}

export function QualityDashboard() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>("all");
  const [reviewOwnerFilter, setReviewOwnerFilter] = useState<string>("");
  const [reviewMinAge, setReviewMinAge] = useState<string>("");
  const [reviewTemplateFilter, setReviewTemplateFilter] = useState<string>("all");
  const [ownershipGapFilter, setOwnershipGapFilter] = useState<string>("all");
  const [escalationThreshold, setEscalationThreshold] = useState<string>("30");

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
  const { data: processByType, isLoading: processLoading } =
    useGetQualityByProcess();
  const reviewParams: GetReviewDashboardParams = {};
  if (reviewStatusFilter !== "all") {
    reviewParams.status = reviewStatusFilter as GetReviewDashboardStatus;
  }
  if (reviewTemplateFilter !== "all") {
    reviewParams.template = reviewTemplateFilter;
  }
  if (reviewOwnerFilter.trim()) {
    reviewParams.owner = reviewOwnerFilter.trim();
  }
  if (reviewMinAge && parseInt(reviewMinAge, 10) > 0) {
    reviewParams.minAge = parseInt(reviewMinAge, 10);
  }
  const { data: reviewDashboard, isLoading: reviewLoading } =
    useGetReviewDashboard(reviewParams);
  const parsedThreshold = parseInt(escalationThreshold, 10) || 30;
  const { data: ownershipMonitor, isLoading: ownershipLoading } =
    useGetOwnershipMonitor({
      escalationThreshold: Math.max(1, Math.min(parsedThreshold, 365)),
    });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 shrink-0" />
            Prozessmanagement Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Qualitätsmetriken und Wartungsübersicht
          </p>
        </div>
        <Button variant="outline" className="self-start sm:self-auto shrink-0" onClick={() => navigate("/my-work")}>
          Meine Aufgaben
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {overviewLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <TabsList className="inline-flex w-max">
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
          <TabsTrigger value="reviews">
            Arbeitskopien
            {reviewDashboard && reviewDashboard.totalWorkingCopies > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs px-1.5">
                {reviewDashboard.totalWorkingCopies}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ownership">
            Verantwortlichkeit
            {ownershipMonitor && ownershipMonitor.pagesWithoutOwner > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs px-1.5">
                {ownershipMonitor.pagesWithoutOwner}
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
        </div>

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
                          className="w-24 sm:w-40 h-3"
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Qualität nach Prozess-/Seitentyp
              </CardTitle>
              <CardDescription>
                Aufschlüsselung der Metriken pro Seitentyp
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {processLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : processByType && processByType.length > 0 ? (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Typ</TableHead>
                      <TableHead className="text-right">Gesamt</TableHead>
                      <TableHead className="text-right">Veröff.</TableHead>
                      <TableHead className="text-right">Entwurf</TableHead>
                      <TableHead className="text-right">Ohne Verantw.</TableHead>
                      <TableHead className="text-right">Ohne Tags</TableHead>
                      <TableHead className="text-right">Ø Vollst.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processByType.map((row) => (
                      <TableRow key={row.templateType}>
                        <TableCell className="font-medium text-sm">
                          {PAGE_TYPE_LABELS[row.templateType] || row.templateType.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.totalPages}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.publishedPages}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.draftPages}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.pagesWithoutOwner}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.pagesWithoutTags}
                        </TableCell>
                        <TableCell className="text-right">
                          <CompletenessBar value={row.avgCompleteness} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Keine Daten verfügbar
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Select value={pageFilter} onValueChange={setPageFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
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
                <div className="overflow-x-auto">
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
                        <TableCell className="font-medium max-w-[200px] lg:max-w-[300px] truncate">
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
                </div>
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
                <div className="overflow-x-auto">
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
                        className={
                          hint.targetType === "media"
                            ? ""
                            : "cursor-pointer hover:bg-muted/50"
                        }
                        onClick={() => {
                          if (hint.targetType !== "media") {
                            navigate(`/node/${hint.nodeId}`);
                          }
                        }}
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
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] lg:max-w-[300px] truncate">
                          {hint.detail}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
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
                              {PAGE_TYPE_LABELS[node.templateType] || node.templateType}
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

        <TabsContent value="reviews" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {reviewLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))
            ) : reviewDashboard ? (
              <>
                <StatCard
                  title="Gesamt"
                  value={reviewDashboard.totalWorkingCopies}
                  icon={FileEdit}
                  color="bg-primary/10 text-primary"
                />
                <StatCard
                  title="Entwürfe"
                  value={reviewDashboard.draftCount}
                  icon={FileEdit}
                  color="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  onClick={() => {
                    setReviewStatusFilter("draft");
                  }}
                />
                <StatCard
                  title="In Review"
                  value={reviewDashboard.inReviewCount}
                  icon={Search}
                  color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  onClick={() => {
                    setReviewStatusFilter("in_review");
                  }}
                />
                <StatCard
                  title="Eingereicht"
                  value={reviewDashboard.submittedCount}
                  icon={Send}
                  color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  onClick={() => {
                    setReviewStatusFilter("submitted");
                  }}
                />
                <StatCard
                  title="Zurückgegeben"
                  value={reviewDashboard.changesRequestedCount}
                  icon={RotateCcw}
                  color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  onClick={() => {
                    setReviewStatusFilter("changes_requested");
                  }}
                />
                <StatCard
                  title="Zur Freigabe"
                  value={reviewDashboard.approvedForPublishCount}
                  icon={CheckCircle}
                  color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  onClick={() => {
                    setReviewStatusFilter("approved_for_publish");
                  }}
                />
                <StatCard
                  title="Überfällig (>7d)"
                  value={reviewDashboard.overdueCount}
                  icon={Clock}
                  color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                />
              </>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
            <Select value={reviewStatusFilter} onValueChange={setReviewStatusFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Status wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="draft">Entwürfe</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="submitted">Eingereicht</SelectItem>
                <SelectItem value="changes_requested">Zurückgegeben</SelectItem>
                <SelectItem value="approved_for_publish">Zur Freigabe</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reviewTemplateFilter} onValueChange={setReviewTemplateFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Seitentyp wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Seitentypen</SelectItem>
                <SelectItem value="process_page_text">Prozessseite (Text)</SelectItem>
                <SelectItem value="process_page_graphic">Prozessseite (Grafik)</SelectItem>
                <SelectItem value="area_overview">Bereichsübersicht</SelectItem>
                <SelectItem value="core_process_overview">Kernprozess-Übersicht</SelectItem>
                <SelectItem value="work_instruction">Arbeitsanweisung</SelectItem>
                <SelectItem value="procedure_instruction">Verfahrensanweisung</SelectItem>
                <SelectItem value="policy">Richtlinie / Policy</SelectItem>
                <SelectItem value="checklist">Checkliste / Formularvorlage</SelectItem>
                <SelectItem value="faq">FAQ / Wissensartikel</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Autor-ID filtern…"
              value={reviewOwnerFilter}
              onChange={(e) => setReviewOwnerFilter(e.target.value)}
              className="w-full sm:w-[200px]"
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min. Alter (Tage)"
                value={reviewMinAge}
                onChange={(e) => setReviewMinAge(e.target.value)}
                className="w-full sm:w-[160px]"
                min={0}
              />
            </div>
            {reviewDashboard && (
              <span className="text-sm text-muted-foreground">
                {reviewDashboard.items.length} Arbeitskopien
              </span>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {reviewLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : reviewDashboard && reviewDashboard.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kennung</TableHead>
                        <TableHead>Titel</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Änderungstyp</TableHead>
                        <TableHead>Autor</TableHead>
                        <TableHead>Reviewer</TableHead>
                        <TableHead className="text-right">Alter</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviewDashboard.items.map((item) => (
                        <TableRow
                          key={item.workingCopyId}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/nodes/${item.nodeId}/review`)}
                        >
                          <TableCell className="font-mono text-xs">
                            {item.displayCode}
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] lg:max-w-[300px] truncate">
                            {item.title}
                          </TableCell>
                          <TableCell>
                            <WcStatusBadge status={item.wcStatus} />
                          </TableCell>
                          <TableCell className="text-sm">
                            <ChangeTypeBadge type={item.changeType} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {item.authorId.substring(0, 8)}…
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {item.reviewerId ? `${item.reviewerId.substring(0, 8)}…` : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <span className={item.ageDays > 7 ? "text-red-600 font-medium" : ""}>
                              {item.ageDays === 0
                                ? "Heute"
                                : item.ageDays === 1
                                  ? "1 Tag"
                                  : `${item.ageDays} Tage`}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <p>Keine offenen Arbeitskopien</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ownership" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {ownershipLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))
            ) : ownershipMonitor ? (
              <>
                <StatCard
                  title="Seiten gesamt"
                  value={ownershipMonitor.totalPages}
                  icon={BarChart3}
                  color="bg-primary/10 text-primary"
                />
                <StatCard
                  title="Ohne Verantwortlichen"
                  value={ownershipMonitor.pagesWithoutOwner}
                  icon={UserX}
                  color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  onClick={() => setOwnershipGapFilter("no_owner")}
                />
                <StatCard
                  title="Ohne Reviewer"
                  value={ownershipMonitor.pagesWithoutReviewer}
                  icon={Eye}
                  color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  onClick={() => setOwnershipGapFilter("no_reviewer")}
                />
                <StatCard
                  title="Ohne Genehmiger"
                  value={ownershipMonitor.pagesWithoutApprover}
                  icon={UserCheck}
                  color="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  onClick={() => setOwnershipGapFilter("no_approver")}
                />
                <StatCard
                  title="Mehrfache Lücken"
                  value={ownershipMonitor.pagesWithMultipleGaps}
                  icon={AlertTriangle}
                  color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  onClick={() => setOwnershipGapFilter("multiple")}
                />
              </>
            ) : null}
          </div>

          {ownershipMonitor &&
            (ownershipMonitor.escalatedCount > 0 ||
              ownershipMonitor.pagesWithoutOwner > 0) && (
              <Card
                className={
                  ownershipMonitor.escalatedCount > 0
                    ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                    : "border-orange-200 dark:border-orange-900"
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`h-5 w-5 mt-0.5 shrink-0 ${ownershipMonitor.escalatedCount > 0 ? "text-red-600" : "text-orange-600"}`}
                    />
                    <div>
                      <p className="font-medium text-sm">
                        {ownershipMonitor.escalatedCount > 0
                          ? "Eskalation aktiv"
                          : "Eskalationshinweis"}
                      </p>
                      {ownershipMonitor.escalatedCount > 0 && (
                        <p className="text-sm text-red-600 font-medium mt-1">
                          {ownershipMonitor.escalatedCount} Seiten sind seit
                          über {parsedThreshold} Tagen ohne Verantwortlichen und wurden zur
                          Eskalation vorgemerkt.
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {ownershipMonitor.pagesWithoutOwner} Seiten ohne
                        Eigentümer, {ownershipMonitor.pagesWithoutReviewer} ohne
                        Reviewer, {ownershipMonitor.pagesWithoutApprover} ohne
                        Genehmiger. Gemäß Governance-Richtlinien sollte jede
                        Seite einen Eigentümer, einen Reviewer und einen
                        Genehmiger haben.
                      </p>
                      {ownershipMonitor.pagesWithMultipleGaps > 0 && (
                        <p className="text-sm text-orange-600 mt-1 font-medium">
                          {ownershipMonitor.pagesWithMultipleGaps} Seiten haben
                          mehrere Verantwortlichkeitslücken.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
            <Select value={ownershipGapFilter} onValueChange={setOwnershipGapFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filter wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Lücken</SelectItem>
                <SelectItem value="no_owner">Ohne Verantwortlichen</SelectItem>
                <SelectItem value="no_reviewer">Ohne Reviewer</SelectItem>
                <SelectItem value="no_approver">Ohne Genehmiger</SelectItem>
                <SelectItem value="multiple">Mehrfache Lücken</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">
                Eskalation nach
              </label>
              <Input
                type="number"
                value={escalationThreshold}
                onChange={(e) => setEscalationThreshold(e.target.value)}
                className="w-[80px]"
                min={1}
                max={365}
              />
              <span className="text-sm text-muted-foreground">Tagen</span>
            </div>
            {ownershipMonitor && (
              <span className="text-sm text-muted-foreground">
                {filteredOwnershipItems(ownershipMonitor.items, ownershipGapFilter).length} Seiten
              </span>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Verantwortlichkeitslücken
              </CardTitle>
              <CardDescription>
                Seiten mit fehlenden Eigentümern, Reviewern oder Genehmigern
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {ownershipLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : ownershipMonitor &&
                filteredOwnershipItems(ownershipMonitor.items, ownershipGapFilter).length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kennung</TableHead>
                        <TableHead>Titel</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Lücken</TableHead>
                        <TableHead className="text-right">Inaktiv</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOwnershipItems(ownershipMonitor.items, ownershipGapFilter).map(
                        (item) => (
                          <TableRow
                            key={item.nodeId}
                            className={`cursor-pointer hover:bg-muted/50 ${item.isEscalated ? "bg-red-50/50 dark:bg-red-950/10" : ""}`}
                            onClick={() => navigate(`/node/${item.nodeId}`)}
                          >
                            <TableCell className="font-mono text-xs">
                              <div className="flex items-center gap-1">
                                {item.isEscalated && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Eskaliert: &gt;{parsedThreshold} Tage ohne Verantwortlichen
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {item.displayCode}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px] lg:max-w-[300px] truncate">
                              {item.title}
                            </TableCell>
                            <TableCell>
                              <StatusLabel status={item.status} />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {item.gapTypes.map((gap) => (
                                  <GapBadge key={gap} gap={gap} />
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              <span
                                className={
                                  item.daysSinceUpdate > parsedThreshold
                                    ? "text-red-600 font-medium"
                                    : ""
                                }
                              >
                                {item.daysSinceUpdate === 0
                                  ? "Heute"
                                  : item.daysSinceUpdate === 1
                                    ? "1 Tag"
                                    : `${item.daysSinceUpdate} Tage`}
                              </span>
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <p>Keine Verantwortlichkeitslücken gefunden</p>
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
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">
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
