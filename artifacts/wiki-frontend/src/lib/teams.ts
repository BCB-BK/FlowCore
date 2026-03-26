export interface TeamsContext {
  inTeams: boolean;
  theme: "default" | "dark" | "contrast";
  locale: string;
  entityId?: string;
  subEntityId?: string;
  channelId?: string;
  teamId?: string;
  chatId?: string;
  userObjectId?: string;
  userPrincipalName?: string;
  tid?: string;
}

const TEAMS_QUERY_PARAM = "context";
const TEAMS_THEME_PARAM = "theme";

export function detectTeamsContext(): TeamsContext {
  const params = new URLSearchParams(window.location.search);
  const isTeams =
    params.get(TEAMS_QUERY_PARAM) === "teams" || isInTeamsIframe();

  const themeRaw = params.get(TEAMS_THEME_PARAM) || "default";
  const theme = (
    ["default", "dark", "contrast"].includes(themeRaw) ? themeRaw : "default"
  ) as TeamsContext["theme"];

  return {
    inTeams: isTeams,
    theme,
    locale: params.get("locale") || navigator.language || "de-DE",
    entityId: params.get("entityId") || undefined,
    subEntityId: params.get("subEntityId") || undefined,
    channelId: params.get("channelId") || undefined,
    teamId: params.get("teamId") || undefined,
    chatId: params.get("chatId") || undefined,
  };
}

function isInTeamsIframe(): boolean {
  try {
    if (window.self === window.top) return false;
    const ancestorOrigins = window.location.ancestorOrigins;
    if (ancestorOrigins && ancestorOrigins.length > 0) {
      const origin = ancestorOrigins[0];
      return (
        origin.includes("teams.microsoft.com") ||
        origin.includes("teams.live.com") ||
        origin.includes("teams.cloud.microsoft") ||
        origin.includes(".office.com")
      );
    }
    return (
      document.referrer.includes("teams.microsoft.com") ||
      document.referrer.includes("teams.live.com") ||
      document.referrer.includes("teams.cloud.microsoft")
    );
  } catch {
    return true;
  }
}

export function notifyTeamsAppLoaded(): void {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "teams-app-loaded" }, "*");
    }
  } catch {
    // Ignore cross-origin errors
  }
}

export function notifyTeamsAuthSuccess(): void {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "teams-auth-success" }, "*");
    }
  } catch {
    // Ignore cross-origin errors
  }
}

export interface TeamsDeepLinkParams {
  appId: string;
  entityId: string;
  subEntityId?: string;
  subEntityLabel?: string;
}

export function buildTeamsDeepLink(params: TeamsDeepLinkParams): string {
  const base = "https://teams.microsoft.com/l/entity";
  const url = new URL(
    `${base}/${encodeURIComponent(params.appId)}/${encodeURIComponent(params.entityId)}`,
  );
  if (params.subEntityId) {
    url.searchParams.set(
      "context",
      JSON.stringify({
        subEntityId: params.subEntityId,
        subEntityLabel: params.subEntityLabel || params.subEntityId,
      }),
    );
  }
  return url.toString();
}

export function buildPageDeepLink(
  appId: string,
  nodeId: string,
  pageTitle?: string,
): string {
  return buildTeamsDeepLink({
    appId,
    entityId: "wiki-home",
    subEntityId: `node/${nodeId}`,
    subEntityLabel: pageTitle || "Wiki-Seite",
  });
}

export function buildSearchDeepLink(appId: string, query: string): string {
  return buildTeamsDeepLink({
    appId,
    entityId: "wiki-search",
    subEntityId: `search?q=${encodeURIComponent(query)}`,
    subEntityLabel: `Suche: ${query}`,
  });
}

export function getTeamsAppId(): string {
  return (
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_TEAMS_APP_ID) ||
    ""
  );
}
