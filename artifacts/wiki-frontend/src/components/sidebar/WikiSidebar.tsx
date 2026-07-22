import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarFooter,
} from "@workspace/ui/sidebar";
import { useRootNodes } from "@/hooks/use-nodes";
import { useAuth } from "@/hooks/use-auth";
import { TreeNode } from "./TreeNode";
import {
  Home,
  BookOpen,
  Search,
  BarChart3,
  ClipboardList,
  Settings,
  ShieldCheck,
  Library,
} from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem } from "@workspace/ui/sidebar";
import { useLocation } from "wouter";
import { Skeleton } from "@workspace/ui/skeleton";
import { useSafeLinkProps } from "@/hooks/use-unsaved-changes";

export function WikiSidebar() {
  const { data: roots, isLoading } = useRootNodes();
  const { data: user } = useAuth();
  const [location] = useLocation();
  const getLinkProps = useSafeLinkProps();
  const permissions = new Set(user?.permissions ?? []);

  return (
    <Sidebar>
      <SidebarHeader className="border-b bg-white px-5 py-4">
        <a
          {...getLinkProps("/")}
          className="flex items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Zur Startseite"
        >
          {/* OneCampus Group Logo — 1:1, unverändert (Brand Manual 5.2) */}
          <img
            src={`${import.meta.env.BASE_URL}onecampus-group-logo.png`}
            alt="OneCampus Group"
            className="h-11 w-auto shrink-0"
          />
        </a>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location === "/"}>
                <a {...getLinkProps("/")}>
                  <Home className="h-4 w-4" />
                  <span>Startseite</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location === "/search"}>
                <a {...getLinkProps("/search")}>
                  <Search className="h-4 w-4" />
                  <span>Suche</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location === "/glossary"}>
                <a {...getLinkProps("/glossary")}>
                  <BookOpen className="h-4 w-4" />
                  <span>Glossar</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {permissions.has("view_dashboard") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                  <a {...getLinkProps("/dashboard")}>
                    <BarChart3 className="h-4 w-4" />
                    <span>Dashboard</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {permissions.has("view_tasks") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/my-work"}>
                  <a {...getLinkProps("/my-work")}>
                    <ClipboardList className="h-4 w-4" />
                    <span>Meine Aufgaben</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {permissions.has("review_working_copy") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/review-inbox"}>
                  <a {...getLinkProps("/review-inbox")}>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Review-Inbox</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {permissions.has("view_settings") && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    location === "/settings" ||
                    location === "/connectors" ||
                    location === "/ai-settings"
                  }
                >
                  <a {...getLinkProps("/settings")}>
                    <Settings className="h-4 w-4" />
                    <span>Einstellungen</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location === "/docs"}>
                <a {...getLinkProps("/docs")}>
                  <Library className="h-4 w-4" />
                  <span>Doku / Handbuch</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Wissensstruktur</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu role="tree" aria-label="Wissensstruktur" aria-busy={isLoading}>
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
          FlowCore v0.4 · OneCampus Group
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
