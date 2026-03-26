import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  FileEdit,
  Eye,
  CheckSquare,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Inbox,
  ShieldCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import { useGetMyWork } from "@workspace/api-client-react";
import type { PersonalWorkItem } from "@workspace/api-client-react";

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  my_draft: {
    label: "Mein Entwurf",
    icon: FileEdit,
    color: "text-yellow-600",
  },
  pending_review: {
    label: "Review ausstehend",
    icon: Eye,
    color: "text-blue-600",
  },
  pending_approval: {
    label: "Genehmigung ausstehend",
    icon: CheckSquare,
    color: "text-purple-600",
  },
  pending_pm_review: {
    label: "Zur Freigabe",
    icon: ShieldCheck,
    color: "text-teal-600",
  },
  owned_unhealthy: {
    label: "Benötigt Aufmerksamkeit",
    icon: AlertTriangle,
    color: "text-orange-600",
  },
  my_page_overdue: {
    label: "Überfällig",
    icon: AlertTriangle,
    color: "text-red-600",
  },
};

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<
    string,
    { label: string; variant: "destructive" | "secondary" | "outline" }
  > = {
    high: { label: "Hoch", variant: "destructive" },
    medium: { label: "Mittel", variant: "secondary" },
    low: { label: "Niedrig", variant: "outline" },
  };
  const c = config[priority] || config.low;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export function MyWorkPage() {
  const [, navigate] = useLocation();
  const { data: items, isLoading } = useGetMyWork();

  const grouped = items
    ? {
        reviews: items.filter(
          (i) => i.type === "pending_review" || i.type === "pending_approval",
        ),
        pmReviews: items.filter((i) => i.type === "pending_pm_review"),
        drafts: items.filter((i) => i.type === "my_draft"),
        attention: items.filter(
          (i) => i.type === "owned_unhealthy" || i.type === "my_page_overdue",
        ),
      }
    : { reviews: [], pmReviews: [], drafts: [], attention: [] };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Meine Aufgaben
          </h1>
          <p className="text-muted-foreground mt-1">
            Persönliches Cockpit für Ihre aktuellen Aufgaben
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${grouped.pmReviews.length > 0 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        {grouped.pmReviews.length > 0 && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <ShieldCheck className="h-8 w-8 text-teal-600" />
              <div>
                <p className="text-2xl font-bold">{grouped.pmReviews.length}</p>
                <p className="text-sm text-muted-foreground">Zur Freigabe</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Eye className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{grouped.reviews.length}</p>
              <p className="text-sm text-muted-foreground">
                Reviews & Genehmigungen
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileEdit className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{grouped.drafts.length}</p>
              <p className="text-sm text-muted-foreground">Offene Entwürfe</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">{grouped.attention.length}</p>
              <p className="text-sm text-muted-foreground">
                Benötigt Aufmerksamkeit
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <div className="space-y-6">
          {grouped.pmReviews.length > 0 && (
            <WorkSection
              title="Zur Freigabe"
              description="Eingereichte Seiten, die auf Freigabe durch einen Prozessmanager warten"
              items={grouped.pmReviews}
              navigate={navigate}
            />
          )}
          {grouped.reviews.length > 0 && (
            <WorkSection
              title="Reviews & Genehmigungen"
              description="Seiten, die auf Ihre Überprüfung oder Genehmigung warten"
              items={grouped.reviews}
              navigate={navigate}
            />
          )}
          {grouped.drafts.length > 0 && (
            <WorkSection
              title="Offene Entwürfe"
              description="Ihre Entwürfe, die noch nicht eingereicht wurden"
              items={grouped.drafts}
              navigate={navigate}
            />
          )}
          {grouped.attention.length > 0 && (
            <WorkSection
              title="Benötigt Aufmerksamkeit"
              description="Seiten in Ihrem Verantwortungsbereich mit Qualitätsproblemen"
              items={grouped.attention}
              navigate={navigate}
            />
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Keine offenen Aufgaben</h3>
            <p className="text-muted-foreground mt-1">
              Alle Ihre Seiten sind in einem guten Zustand
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WorkSection({
  title,
  description,
  items,
  navigate,
}: {
  title: string;
  description: string;
  items: PersonalWorkItem[];
  navigate: (path: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Priorität</TableHead>
              <TableHead className="w-48">Typ</TableHead>
              <TableHead>Seite</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.my_draft;
              const Icon = cfg.icon;
              return (
                <TableRow
                  key={`${item.nodeId}-${item.type}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    item.type === "my_draft"
                      ? navigate(`/nodes/${item.nodeId}/edit`)
                      : item.type === "pending_approval" ||
                          item.type === "pending_review" ||
                          item.type === "pending_pm_review"
                        ? navigate(`/nodes/${item.nodeId}/review`)
                        : navigate(`/node/${item.nodeId}`)
                  }
                >
                  <TableCell>
                    <PriorityBadge priority={item.priority} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                      <span className="text-sm">{cfg.label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-mono text-xs text-muted-foreground mr-2">
                        {item.displayCode}
                      </span>
                      <span className="font-medium">{item.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                    {item.detail}
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
  );
}
