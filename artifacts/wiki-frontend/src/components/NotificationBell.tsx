import { useState } from "react";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@workspace/ui/button";
import { Badge } from "@workspace/ui/badge";
import { ScrollArea } from "@workspace/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/popover";
import {
  useGetNotifications,
  useGetUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  getGetNotificationsQueryKey,
  getGetUnreadNotificationCountQueryKey,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

const TYPE_LABELS: Record<string, string> = {
  working_copy_submitted: "Review angefordert",
  working_copy_approved: "Freigegeben",
  working_copy_returned: "Überarbeitung nötig",
  working_copy_published: "Veröffentlicht",
  review_overdue: "Review überfällig",
  review_overdue_escalation: "Eskalation",
  page_updated: "Seite aktualisiert",
};

const TYPE_COLORS: Record<string, string> = {
  working_copy_submitted: "bg-blue-100 text-blue-700",
  working_copy_approved: "bg-green-100 text-green-700",
  working_copy_returned: "bg-orange-100 text-orange-700",
  working_copy_published: "bg-emerald-100 text-emerald-700",
  review_overdue: "bg-red-100 text-red-700",
  review_overdue_escalation: "bg-red-200 text-red-800",
  page_updated: "bg-gray-100 text-gray-700",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "gestern";
  return `vor ${diffD} Tagen`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: countData } = useGetUnreadNotificationCount({
    query: {
      queryKey: getGetUnreadNotificationCountQueryKey(),
      refetchInterval: 30000,
    },
  });
  const { data: notifData, refetch } = useGetNotifications(
    { limit: 20, offset: 0 },
    {
      query: {
        queryKey: getGetNotificationsQueryKey({ limit: 20, offset: 0 }),
        enabled: open,
      },
    },
  );

  const markRead = useMarkNotificationAsRead();
  const markAllRead = useMarkAllNotificationsAsRead();

  const unreadCount = countData?.count ?? 0;
  const notifications = notifData?.items ?? [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getGetUnreadNotificationCountQueryKey(),
    });
    refetch();
  };

  const handleMarkRead = (id: string) => {
    markRead.mutate({ id }, { onSuccess: invalidateAll });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, { onSuccess: invalidateAll });
  };

  const handleClick = (link: string | null | undefined, id: string, status: string) => {
    if (status === "unread") {
      handleMarkRead(id);
    }
    if (link) {
      setOpen(false);
      navigate(link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Benachrichtigungen öffnen">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Benachrichtigungen</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Alle gelesen
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Keine Benachrichtigungen
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${TYPE_LABELS[n.type] || n.type}: ${n.title}`}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                    n.status === "unread" ? "bg-blue-50/50" : ""
                  }`}
                  onClick={() => handleClick(n.link, n.id, n.status)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                      e.preventDefault();
                      handleClick(n.link, n.id, n.status);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          TYPE_COLORS[n.type] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {TYPE_LABELS[n.type] || n.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </span>
                      {n.status === "unread" && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.body}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    {n.link && (
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    )}
                    {n.status === "unread" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        aria-label="Als gelesen markieren"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(n.id);
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
