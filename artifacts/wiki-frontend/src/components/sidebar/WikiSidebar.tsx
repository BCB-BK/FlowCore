import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useRootNodes } from "@/hooks/use-nodes";
import { useAuth } from "@/hooks/use-auth";
import { TreeNode } from "./TreeNode";
import {
  Home,
  BookOpen,
  Search,
  Database,
  Bot,
  BarChart3,
  ClipboardList,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export function WikiSidebar() {
  const { data: roots, isLoading } = useRootNodes();
  const { data: user } = useAuth();
  const [location, navigate] = useLocation();
  const permissions = new Set(user?.permissions ?? []);

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div
          className="flex items-center cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img
            src={`${import.meta.env.BASE_URL}bildungscampus-logo.png`}
            alt="BildungsCampus"
            className="h-7 w-auto shrink-0"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={location === "/"}
                onClick={() => navigate("/")}
              >
                <Home className="h-4 w-4" />
                <span>Startseite</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={location === "/search"}
                onClick={() => navigate("/search")}
              >
                <Search className="h-4 w-4" />
                <span>Suche</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={location === "/glossary"}
                onClick={() => navigate("/glossary")}
              >
                <BookOpen className="h-4 w-4" />
                <span>Glossar</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {permissions.has("view_dashboard") && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location === "/dashboard"}
                  onClick={() => navigate("/dashboard")}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {permissions.has("view_tasks") && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location === "/my-work"}
                  onClick={() => navigate("/my-work")}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>Meine Aufgaben</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {permissions.has("review_working_copy") && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location === "/review-inbox"}
                  onClick={() => navigate("/review-inbox")}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Review-Inbox</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {permissions.has("view_settings") && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={
                    location === "/settings" ||
                    location === "/connectors" ||
                    location === "/ai-settings"
                  }
                  onClick={() => navigate("/settings")}
                >
                  <Settings className="h-4 w-4" />
                  <span>Einstellungen</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Wissensstruktur</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <div className="space-y-2 px-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-5/6" />
                </div>
              ) : roots && roots.length > 0 ? (
                roots.map((node) => (
                  <TreeNode key={node.id} node={node} level={0} />
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Noch keine Inhalte vorhanden
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <p className="text-xs text-muted-foreground text-center">
          FlowCore v0.4
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
