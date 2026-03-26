import { useState, useEffect, type ReactNode } from "react";
import { TeamsCtx } from "@/hooks/useTeamsContext";
import {
  initializeTeamsSDK,
  getTeamsContextFromSDK,
  authenticateWithTeamsSso,
  navigateToSubEntity,
  type TeamsContext,
} from "@/lib/teams";
import { queryClient } from "@/lib/api";
import { getAuthMeQueryKey } from "@workspace/api-client-react";

interface TeamsProviderProps {
  children: ReactNode;
}

export function TeamsProvider({ children }: TeamsProviderProps) {
  const [ctx, setCtx] = useState<TeamsContext>({
    inTeams: false,
    initialized: false,
    theme: "default",
    locale: "de-DE",
  });

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const inTeams = await initializeTeamsSDK();

      if (cancelled) return;

      const teamsCtx = await getTeamsContextFromSDK();
      setCtx(teamsCtx);

      if (teamsCtx.theme === "dark" || teamsCtx.theme === "contrast") {
        document.documentElement.classList.add("dark");
      }

      if (teamsCtx.theme === "contrast") {
        document.documentElement.classList.add("high-contrast");
      }

      if (inTeams) {
        const apiBase =
          import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/[^/]+$/, "") +
          "/api";
        const authResult = await authenticateWithTeamsSso(apiBase);
        if (authResult && !cancelled) {
          queryClient.invalidateQueries({
            queryKey: getAuthMeQueryKey(),
          });
        }

        if (teamsCtx.subEntityId && !cancelled) {
          navigateToSubEntity(teamsCtx.subEntityId);
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  return <TeamsCtx.Provider value={ctx}>{children}</TeamsCtx.Provider>;
}
