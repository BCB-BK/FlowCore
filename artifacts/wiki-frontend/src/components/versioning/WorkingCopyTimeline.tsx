import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  FilePen,
  Send,
  Eye,
  RotateCcw,
  Pencil,
  CheckCircle2,
  Upload,
  XCircle,
  Unlock,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

interface WcEvent {
  id: string;
  workingCopyId: string;
  eventType: string;
  actorId: string | null;
  comment: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const EVENT_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; color: string }
> = {
  created: { label: "Erstellt", icon: FilePen, color: "text-blue-500" },
  updated: { label: "Aktualisiert", icon: Pencil, color: "text-gray-500" },
  submitted: { label: "Eingereicht", icon: Send, color: "text-indigo-500" },
  review_started: {
    label: "Prüfung begonnen",
    icon: Eye,
    color: "text-purple-500",
  },
  returned_for_changes: {
    label: "Zurückgegeben",
    icon: RotateCcw,
    color: "text-orange-500",
  },
  amended_by_reviewer: {
    label: "Vom Prüfer geändert",
    icon: Pencil,
    color: "text-amber-500",
  },
  approved: {
    label: "Freigegeben",
    icon: CheckCircle2,
    color: "text-green-500",
  },
  published: {
    label: "Veröffentlicht",
    icon: Upload,
    color: "text-green-600",
  },
  cancelled: { label: "Abgebrochen", icon: XCircle, color: "text-red-500" },
  unlocked: { label: "Entsperrt", icon: Unlock, color: "text-gray-600" },
};

interface WorkingCopyTimelineProps {
  workingCopyId: string;
}

export function WorkingCopyTimeline({
  workingCopyId,
}: WorkingCopyTimelineProps) {
  const [events, setEvents] = useState<WcEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const apiBase = import.meta.env.BASE_URL + "api";

  useEffect(() => {
    customFetch<WcEvent[]>(
      `${apiBase}/content/working-copies/${workingCopyId}/events`,
    )
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [workingCopyId, apiBase]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Verlauf
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[300px]">
          <div className="px-4 pb-4 space-y-0">
            {events.map((event, index) => {
              const config = EVENT_CONFIG[event.eventType] || {
                label: event.eventType,
                icon: Clock,
                color: "text-gray-400",
              };
              const Icon = config.icon;
              return (
                <div key={event.id} className="flex gap-3 relative">
                  <div className="flex flex-col items-center">
                    <div
                      className={`rounded-full p-1 bg-background border z-10 ${config.color}`}
                    >
                      <Icon className="h-3 w-3" />
                    </div>
                    {index < events.length - 1 && (
                      <div className="w-px flex-1 bg-border min-h-[16px]" />
                    )}
                  </div>
                  <div className="pb-3 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {config.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {event.actorId && (
                      <p className="text-xs text-muted-foreground">
                        {event.actorId.substring(0, 8)}…
                      </p>
                    )}
                    {event.comment && (
                      <p className="text-xs mt-0.5 text-muted-foreground italic">
                        „{event.comment}"
                      </p>
                    )}
                    {event.metadata &&
                      Object.keys(event.metadata).length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {Object.entries(event.metadata).map(([k, v]) => (
                            <Badge
                              key={k}
                              variant="outline"
                              className="text-[10px] h-4"
                            >
                              {k}: {String(v).substring(0, 20)}
                            </Badge>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
