import { createContext, useContext } from "react";
import type { TeamsContext } from "@/lib/teams";

const defaultContext: TeamsContext = {
  inTeams: false,
  theme: "default",
  locale: "de-DE",
};

export const TeamsCtx = createContext<TeamsContext>(defaultContext);

export function useTeamsContext(): TeamsContext {
  return useContext(TeamsCtx);
}
