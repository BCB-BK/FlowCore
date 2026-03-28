import { useState, type ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { WikiSidebar } from "../sidebar/WikiSidebar";
import { SidebarProvider } from "@workspace/ui/sidebar";
import { useTeamsContext } from "@/hooks/useTeamsContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { inTeams } = useTeamsContext();
  const [sidebarOpen, setSidebarOpen] = useState(!inTeams);

  if (inTeams) {
    return (
      <SidebarProvider defaultOpen={false} onOpenChange={setSidebarOpen}>
        <div className="flex h-screen w-full overflow-hidden teams-embedded">
          {sidebarOpen && (
            <ErrorBoundary compact fallbackTitle="Sidebar-Fehler" fallbackMessage="Die Seitenleiste konnte nicht geladen werden.">
              <WikiSidebar />
            </ErrorBoundary>
          )}
          <div className="flex flex-1 flex-col overflow-hidden">
            <header className="flex h-10 items-center gap-2 border-b px-3 bg-background">
              <button
                onClick={() => setSidebarOpen((s) => !s)}
                className="p-1 rounded hover:bg-accent text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Seitenleiste ein-/ausblenden"
                aria-expanded={sidebarOpen}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 3v18" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-foreground">
                FlowCore
              </span>
            </header>
            <main className="flex-1 overflow-auto p-4 [scrollbar-gutter:stable]">
              <ErrorBoundary fallbackTitle="Inhaltsfehler" fallbackMessage="Der Seiteninhalt konnte nicht angezeigt werden.">
                {children}
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex h-screen w-full overflow-hidden">
        <ErrorBoundary compact fallbackTitle="Sidebar-Fehler" fallbackMessage="Die Seitenleiste konnte nicht geladen werden.">
          <WikiSidebar />
        </ErrorBoundary>
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4 sm:p-6 [scrollbar-gutter:stable]">
            <ErrorBoundary fallbackTitle="Inhaltsfehler" fallbackMessage="Der Seiteninhalt konnte nicht angezeigt werden.">
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
