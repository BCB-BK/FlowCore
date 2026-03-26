import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { TeamsProvider } from "@/components/teams/TeamsProvider";
import { Hub } from "@/pages/Hub";
import { NodeDetail } from "@/pages/NodeDetail";
import { SearchPage } from "@/pages/SearchPage";
import { GlossaryPage } from "@/pages/GlossaryPage";
import { BrokenLinksPage } from "@/pages/BrokenLinksPage";
import { ConnectorsPage } from "@/pages/ConnectorsPage";
import { AISettingsPage } from "@/pages/AISettingsPage";
import { QualityDashboard } from "@/pages/QualityDashboard";
import { MyWorkPage } from "@/pages/MyWorkPage";
import { TeamsTabConfig } from "@/pages/TeamsTabConfig";
import { GlobalAssistant } from "@/components/ai/GlobalAssistant";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Hub} />
        <Route path="/node/:id" component={NodeDetail} />
        <Route path="/search" component={SearchPage} />
        <Route path="/glossary" component={GlossaryPage} />
        <Route path="/broken-links" component={BrokenLinksPage} />
        <Route path="/connectors" component={ConnectorsPage} />
        <Route path="/ai-settings" component={AISettingsPage} />
        <Route path="/dashboard" component={QualityDashboard} />
        <Route path="/my-work" component={MyWorkPage} />
        <Route path="/teams/tab-config" component={TeamsTabConfig} />
        <Route component={NotFound} />
      </Switch>
      <GlobalAssistant />
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TeamsProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </TeamsProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
