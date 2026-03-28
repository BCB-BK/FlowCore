import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/card";
import { Button } from "@workspace/ui/button";
import { Badge } from "@workspace/ui/badge";
import { Input } from "@workspace/ui/input";
import { ScrollArea } from "@workspace/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/select";
import {
  Shield,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  Clock,
  Filter,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

interface AuditEvent {
  id: number;
  eventType: string;
  action: string;
  actorId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  correlationId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditQueryResult {
  events: AuditEvent[];
  total: number;
}

interface AuditFilters {
  actions: string[];
  resourceTypes: string[];
}

const ACTION_LABELS: Record<string, string> = {
  working_copy_created: "Arbeitskopie erstellt",
  working_copy_updated: "Arbeitskopie bearbeitet",
  working_copy_submitted: "Arbeitskopie eingereicht",
  working_copy_returned: "Arbeitskopie zurückgegeben",
  working_copy_approved: "Arbeitskopie freigegeben",
  working_copy_published: "Arbeitskopie veröffentlicht",
  working_copy_cancelled: "Arbeitskopie abgebrochen",
  working_copy_unlocked: "Arbeitskopie entsperrt",
  working_copy_restored: "Arbeitskopie wiederhergestellt",
  working_copy_commented: "Kommentar hinzugefügt",
  working_copy_amended_by_reviewer: "Von Prüfer bearbeitet",
  revision_archived: "Revision archiviert",
  sod_violation_blocked: "Vier-Augen-Verletzung blockiert",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  content: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  rbac: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  auth: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  system: "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const PAGE_SIZE = 50;

export function AuditTrailTab() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AuditFilters>({ actions: [], resourceTypes: [] });
  const [page, setPage] = useState(0);
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedResourceType, setSelectedResourceType] = useState<string>("all");
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadFilters = useCallback(async () => {
    try {
      const data = await customFetch<AuditFilters>("/api/admin/audit-events/filters");
      setFilters(data);
    } catch {
      // ignore
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));
      if (selectedAction !== "all") params.set("action", selectedAction);
      if (selectedResourceType !== "all") params.set("resourceType", selectedResourceType);
      if (selectedEventType !== "all") params.set("eventType", selectedEventType);
      if (fromDate) params.set("from", new Date(fromDate).toISOString());
      if (toDate) params.set("to", new Date(toDate + "T23:59:59").toISOString());

      const data = await customFetch<AuditQueryResult>(
        `/api/admin/audit-events?${params.toString()}`,
      );
      setEvents(data.events);
      setTotal(data.total);
    } catch {
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, selectedAction, selectedResourceType, selectedEventType, fromDate, toDate]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleExport = async (format: "json" | "csv") => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (selectedAction !== "all") params.set("action", selectedAction);
    if (selectedResourceType !== "all") params.set("resourceType", selectedResourceType);
    if (selectedEventType !== "all") params.set("eventType", selectedEventType);
    if (fromDate) params.set("from", new Date(fromDate).toISOString());
    if (toDate) params.set("to", new Date(toDate + "T23:59:59").toISOString());

    const url = `/api/admin/audit-events/export?${params.toString()}`;
    window.open(url, "_blank");
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Audit-Trail
          </CardTitle>
          <CardDescription>
            Vollständige Nachweiskette aller sicherheitsrelevanten Ereignisse.
            Personenbezogene Daten werden bei Exporten ohne manage_settings-Berechtigung anonymisiert.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" /> Aktion
              </label>
              <Select value={selectedAction} onValueChange={(v) => { setSelectedAction(v); setPage(0); }}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Aktionen</SelectItem>
                  {filters.actions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {ACTION_LABELS[a] || a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ressource</label>
              <Select value={selectedResourceType} onValueChange={(v) => { setSelectedResourceType(v); setPage(0); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Ressourcen</SelectItem>
                  {filters.resourceTypes.map((rt) => (
                    <SelectItem key={rt} value={rt}>{rt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Typ</label>
              <Select value={selectedEventType} onValueChange={(v) => { setSelectedEventType(v); setPage(0); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  <SelectItem value="content">Inhalt</SelectItem>
                  <SelectItem value="rbac">RBAC</SelectItem>
                  <SelectItem value="auth">Auth</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Von</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
                className="w-[150px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Bis</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(0); }}
                className="w-[150px]"
              />
            </div>

            <Button variant="outline" size="sm" onClick={loadEvents} className="gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Aktualisieren
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total} Ereignis{total !== 1 ? "se" : ""} gefunden
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport("csv")} className="gap-1">
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("json")} className="gap-1">
                <FileText className="h-3.5 w-3.5" />
                JSON
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-[600px]">
            <div className="divide-y">
              {events.length === 0 && !loading && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Keine Audit-Ereignisse gefunden.
                </div>
              )}
              {loading && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Lade Audit-Ereignisse…
                </div>
              )}
              {events.map((evt) => (
                <div
                  key={evt.id}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandedId === evt.id}
                  className="py-3 px-2 hover:bg-accent/30 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={() => setExpandedId(expandedId === evt.id ? null : evt.id)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                      e.preventDefault();
                      setExpandedId(expandedId === evt.id ? null : evt.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={`text-[10px] ${EVENT_TYPE_COLORS[evt.eventType] || "bg-muted text-muted-foreground"}`}
                    >
                      {evt.eventType}
                    </Badge>
                    <span className="text-sm font-medium">
                      {ACTION_LABELS[evt.action] || evt.action}
                    </span>
                    {evt.resourceType && (
                      <Badge variant="outline" className="text-[10px]">
                        {evt.resourceType}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDate(evt.createdAt)}
                    </span>
                    {evt.actorId && (
                      <span className="flex items-center gap-1">
                        <User className="h-2.5 w-2.5" />
                        {evt.actorId.substring(0, 12)}…
                      </span>
                    )}
                    {evt.resourceId && (
                      <span className="font-mono text-[10px]">
                        {evt.resourceId.substring(0, 8)}…
                      </span>
                    )}
                  </div>
                  {expandedId === evt.id && evt.details && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(evt.details, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Zurück
              </Button>
              <span className="text-sm text-muted-foreground">
                Seite {page + 1} von {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Weiter
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
