import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck,
  Eye,
  ArrowLeft,
  Inbox,
  Clock,
  ArrowUpDown,
  Search,
  Filter,
  ChevronRight,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useLocation } from "wouter";
import { useGetMyWork } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

type SortField = "priority" | "age" | "title" | "area";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "submitted" | "in_review" | "approved_for_publish";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  submitted: { label: "Eingereicht", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  in_review: { label: "In Prüfung", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  approved_for_publish: { label: "Freigegeben", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

const TEMPLATE_LABELS: Record<string, string> = {
  process_page_text: "Prozess",
  guideline_page: "Richtlinie",
  checklist_page: "Checkliste",
  form_page: "Formular",
  reference_page: "Referenz",
  glossary_entry: "Glossar",
  sop_page: "SOP",
  policy_page: "Policy",
  work_instruction: "Arbeitsanweisung",
};

function getAge(dateStr: string): { label: string; days: number } {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return { label: "Heute", days: 0 };
  if (days === 1) return { label: "1 Tag", days: 1 };
  if (days < 7) return { label: `${days} Tage`, days };
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return { label: `${weeks} Woche${weeks > 1 ? "n" : ""}`, days };
  }
  const months = Math.floor(days / 30);
  return { label: `${months} Monat${months > 1 ? "e" : ""}`, days };
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { label: string; className: string }> = {
    high: { label: "Hoch", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800" },
    medium: { label: "Mittel", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800" },
    low: { label: "Niedrig", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700" },
  };
  const c = config[priority] || config.low;
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

function truncateId(id?: string): string {
  if (!id) return "—";
  return id.substring(0, 8) + "…";
}

export function ReviewInboxPage() {
  const [, navigate] = useLocation();
  const { data: currentUser } = useAuth();
  const { data: allItems, isLoading } = useGetMyWork();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const hasReviewPermission = currentUser?.permissions?.includes("review_working_copy") ?? false;

  if (!isLoading && !hasReviewPermission) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">Kein Zugriff</h2>
        <p className="text-muted-foreground">
          Sie benötigen die Berechtigung zum Prüfen von Arbeitskopien, um auf den Review-Inbox zuzugreifen.
        </p>
        <Button variant="outline" onClick={() => navigate("/my-work")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zu Meine Aufgaben
        </Button>
      </div>
    );
  }

  const reviewItems = useMemo(() => {
    if (!allItems) return [];
    return allItems.filter(
      (i) =>
        i.type === "pending_review" ||
        i.type === "pending_approval" ||
        i.type === "pending_pm_review",
    );
  }, [allItems]);

  const templateTypes = useMemo(() => {
    const types = new Set(reviewItems.map((i) => i.templateType));
    return Array.from(types).sort();
  }, [reviewItems]);

  const filteredItems = useMemo(() => {
    let items = [...reviewItems];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.displayCode.toLowerCase().includes(q) ||
          (i.detail && i.detail.toLowerCase().includes(q)),
      );
    }

    if (statusFilter !== "all") {
      items = items.filter((i) => i.status === statusFilter);
    }

    if (areaFilter !== "all") {
      items = items.filter((i) => i.templateType === areaFilter);
    }

    items.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "priority":
          cmp = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
          break;
        case "age":
          cmp = new Date(a.submittedAt || a.updatedAt).getTime() - new Date(b.submittedAt || b.updatedAt).getTime();
          break;
        case "title":
          cmp = a.title.localeCompare(b.title, "de");
          break;
        case "area":
          cmp = a.templateType.localeCompare(b.templateType, "de");
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return items;
  }, [reviewItems, searchQuery, statusFilter, areaFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const stats = useMemo(() => ({
    total: reviewItems.length,
    submitted: reviewItems.filter((i) => i.status === "submitted").length,
    inReview: reviewItems.filter((i) => i.status === "in_review").length,
    approved: reviewItems.filter((i) => i.status === "approved_for_publish").length,
    highPriority: reviewItems.filter((i) => i.priority === "high").length,
  }), [reviewItems]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Review-Inbox
          </h1>
          <p className="text-muted-foreground mt-1">
            Eingereichte Arbeitskopien zur Prüfung und Freigabe
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/my-work")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Meine Aufgaben
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Inbox className="h-7 w-7 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Send className="h-7 w-7 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{stats.submitted}</p>
              <p className="text-xs text-muted-foreground">Eingereicht</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Eye className="h-7 w-7 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{stats.inReview}</p>
              <p className="text-xs text-muted-foreground">In Prüfung</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-xs text-muted-foreground">Freigegeben</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter & Sortierung
            </CardTitle>
            {stats.highPriority > 0 && (
              <Badge variant="destructive" className="text-xs">
                {stats.highPriority} mit hoher Priorität
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Titel oder Kennung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="submitted">Eingereicht</SelectItem>
                <SelectItem value="in_review">In Prüfung</SelectItem>
                <SelectItem value="approved_for_publish">Freigegeben</SelectItem>
              </SelectContent>
            </Select>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Bereich" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Bereiche</SelectItem>
                {templateTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TEMPLATE_LABELS[t] || t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">
              {reviewItems.length === 0
                ? "Keine offenen Reviews"
                : "Keine Ergebnisse"}
            </h3>
            <p className="text-muted-foreground mt-1">
              {reviewItems.length === 0
                ? "Derzeit stehen keine Arbeitskopien zur Prüfung an."
                : "Versuchen Sie eine andere Filtereinstellung."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium gap-1"
                      onClick={() => toggleSort("priority")}
                    >
                      Priorität
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium gap-1"
                      onClick={() => toggleSort("title")}
                    >
                      Seite
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium gap-1"
                      onClick={() => toggleSort("area")}
                    >
                      Bereich
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium gap-1"
                      onClick={() => toggleSort("age")}
                    >
                      Alter
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Prüfer</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const age = getAge(item.submittedAt || item.updatedAt);
                  const statusConfig = STATUS_LABELS[item.status];
                  return (
                    <TableRow
                      key={`${item.nodeId}-${item.type}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/nodes/${item.nodeId}/review`)}
                    >
                      <TableCell>
                        <PriorityBadge priority={item.priority} />
                      </TableCell>
                      <TableCell>
                        {statusConfig ? (
                          <Badge className={`text-xs ${statusConfig.color}`}>
                            {statusConfig.label}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {item.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-mono text-xs text-muted-foreground mr-2">
                            {item.displayCode}
                          </span>
                          <span className="font-medium">{item.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {TEMPLATE_LABELS[item.templateType] || item.templateType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className={age.days > 14 ? "text-red-600 font-medium" : age.days > 7 ? "text-orange-600 font-medium" : ""}>
                            {age.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-mono" title={item.authorId || ""}>
                          {truncateId(item.authorId)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-mono" title={item.reviewerId || ""}>
                          {truncateId(item.reviewerId)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
