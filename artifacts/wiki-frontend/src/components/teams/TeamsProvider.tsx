import { useState, useEffect, type ReactNode } from "react";
import { TeamsCtx } from "@/hooks/useTeamsContext";
import {
  detectTeamsContext,
  notifyTeamsAppLoaded,
  type TeamsContext,
} from "@/lib/teams";

interface TeamsProviderProps {
  children: ReactNode;
}

export function TeamsProvider({ children }: TeamsProviderProps) {
  const [ctx, setCtx] = useState<TeamsContext>(() => detectTeamsContext());

  useEffect(() => {
    const detected = detectTeamsContext();
    setCtx(detected);

    if (detected.inTeams) {
      notifyTeamsAppLoaded();

      if (detected.subEntityId) {
        const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
        const target = `${basePath}/${detected.subEntityId}`;
        if (window.location.pathname !== target) {
          window.history.replaceState(null, "", target);
        }
      }

      if (detected.theme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (detected.theme === "contrast") {
        document.documentElement.classList.add("dark", "high-contrast");
      }
    }
  }, []);

  return <TeamsCtx.Provider value={ctx}>{children}</TeamsCtx.Provider>;
}
