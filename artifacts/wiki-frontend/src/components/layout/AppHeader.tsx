import { useAuth } from "@/hooks/use-auth";
import { useAuthLogout } from "@workspace/api-client-react";
import { SidebarTrigger } from "@workspace/ui/sidebar";
import { Separator } from "@workspace/ui/separator";
import { Avatar, AvatarFallback } from "@workspace/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/dropdown-menu";
import { LogOut, Search, Shield } from "lucide-react";
import { Input } from "@workspace/ui/input";
import { useLocation } from "wouter";
import { NotificationBell } from "@/components/NotificationBell";
import { Badge } from "@workspace/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  system_admin: "System-Admin",
  process_manager: "Prozess-Manager",
  editor: "Redakteur",
  reviewer: "Prüfer",
  approver: "Genehmiger",
  viewer: "Betrachter",
  compliance_manager: "Compliance-Manager",
};

export function AppHeader() {
  const { data: user } = useAuth();
  const [, navigate] = useLocation();
  const logout = useAuthLogout();

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = import.meta.env.BASE_URL;
      },
    });
  };

  return (
    <header className="flex h-14 items-center gap-3 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />

      <div className="flex-1 flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Suchen..."
            className="pl-9 h-9"
            onFocus={() => navigate("/search")}
            readOnly
          />
        </div>
      </div>

      {user && <NotificationBell />}

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent outline-none">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.displayName}</p>
              {user.email && (
                <p className="text-xs text-muted-foreground">{user.email}</p>
              )}
              {user.roles && user.roles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {user.roles.map((r) => (
                    <Badge key={r.role} variant="secondary" className="text-[10px] px-1.5 py-0">
                      <Shield className="mr-0.5 h-2.5 w-2.5" />
                      {ROLE_LABELS[r.role ?? ""] ?? r.role}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
