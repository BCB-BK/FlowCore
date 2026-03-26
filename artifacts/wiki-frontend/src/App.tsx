import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
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
import { ConnectorsPage } from "@/pages/ConnectorsPage";
import { AISettingsPage } from "@/pages/AISettingsPage";
import { QualityDashboard } from "@/pages/QualityDashboard";
import { MyWorkPage } from "@/pages/MyWorkPage";
import { ReviewInboxPage } from "@/pages/ReviewInboxPage";
import { WorkingCopyEditorPage } from "@/pages/WorkingCopyEditorPage";
import { WorkingCopyReviewPage } from "@/pages/WorkingCopyReviewPage";
import { TeamsTabConfig } from "@/pages/TeamsTabConfig";
import { SettingsPage } from "@/pages/SettingsPage";
import { GlobalAssistant } from "@/components/ai/GlobalAssistant";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Hub} />
        <Route path="/node/:id" component={NodeDetail} />
        <Route path="/nodes/:id/edit" component={WorkingCopyEditorPage} />
        <Route path="/nodes/:id/review" component={WorkingCopyReviewPage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/glossary" component={GlossaryPage} />
        <Route path="/broken-links">
          <Redirect to="/dashboard" />
        </Route>
        <Route path="/settings" component={SettingsPage} />
        <Route path="/connectors">{() => <ConnectorsPage />}</Route>
        <Route path="/ai-settings" component={AISettingsPage} />
        <Route path="/dashboard" component={QualityDashboard} />
        <Route path="/my-work" component={MyWorkPage} />
        <Route path="/review-inbox" component={ReviewInboxPage} />
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
