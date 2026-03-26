import { useAuth } from "@/hooks/use-auth";
import { useAuthLogout } from "@workspace/api-client-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

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

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent outline-none">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-sm font-medium"
              disabled
            >
              {user.displayName}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-muted-foreground text-xs"
              disabled
            >
              {user.email}
            </DropdownMenuItem>
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
