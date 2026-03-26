import * as microsoftTeams from "@microsoft/teams-js";

export interface TeamsContext {
  inTeams: boolean;
  initialized: boolean;
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

let _initialized = false;
let _inTeams = false;

export async function initializeTeamsSDK(): Promise<boolean> {
  if (_initialized) return _inTeams;
  try {
    await microsoftTeams.app.initialize();
    _initialized = true;
    _inTeams = true;
    await microsoftTeams.app.notifyAppLoaded();
    await microsoftTeams.app.notifySuccess();
    return true;
  } catch {
    _initialized = true;
    _inTeams = false;
    return false;
  }
}

export function isTeamsInitialized(): boolean {
  return _initialized;
}

export function isInTeamsRuntime(): boolean {
  return _inTeams;
}

export async function getTeamsContextFromSDK(): Promise<TeamsContext> {
  const base: TeamsContext = {
    inTeams: false,
    initialized: false,
    theme: "default",
    locale: "de-DE",
  };

  if (!_inTeams) {
    const params = new URLSearchParams(window.location.search);
    if (params.get("context") === "teams") {
      base.inTeams = true;
      const themeRaw = params.get("theme") || "default";
      base.theme = (
        ["default", "dark", "contrast"].includes(themeRaw)
          ? themeRaw
          : "default"
      ) as TeamsContext["theme"];
    }
    return base;
  }

  try {
    const ctx = await microsoftTeams.app.getContext();
    const page = ctx.page;
    const user = ctx.user;
    const team = ctx.team;
    const chat = ctx.chat;

    const themeRaw = ctx.app?.theme || "default";
    const theme = (
      ["default", "dark", "contrast"].includes(themeRaw) ? themeRaw : "default"
    ) as TeamsContext["theme"];

    return {
      inTeams: true,
      initialized: true,
      theme,
      locale: ctx.app?.locale || "de-DE",
      entityId: page?.id || undefined,
      subEntityId: page?.subPageId || undefined,
      channelId: (page as unknown as Record<string, unknown>)?.channelId as
        | string
        | undefined,
      teamId: team?.internalId || undefined,
      chatId: chat?.id || undefined,
      userObjectId: user?.id || undefined,
      userPrincipalName: user?.userPrincipalName || undefined,
      tid: user?.tenant?.id || undefined,
    };
  } catch {
    return base;
  }
}

export async function acquireTeamsSsoToken(): Promise<string | null> {
  if (!_inTeams) return null;
  try {
    const result = await microsoftTeams.authentication.getAuthToken();
    return result;
  } catch {
    return null;
  }
}

export async function authenticateWithTeamsSso(apiBase: string): Promise<{
  principalId: string;
  displayName: string;
  email: string;
} | null> {
  const ssoToken = await acquireTeamsSsoToken();
  if (!ssoToken) return null;

  try {
    const res = await fetch(`${apiBase}/teams/sso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ssoToken }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      principalId: string;
      displayName: string;
      email: string;
    };
    return data;
  } catch {
    return null;
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

export async function configureTab(settings: {
  entityId: string;
  contentUrl: string;
  suggestedDisplayName: string;
  websiteUrl: string;
}): Promise<void> {
  if (!_inTeams) return;

  microsoftTeams.pages.config.registerOnSaveHandler(
    (saveEvent: microsoftTeams.pages.config.SaveEvent) => {
      microsoftTeams.pages.config.setConfig({
        entityId: settings.entityId,
        contentUrl: settings.contentUrl,
        suggestedDisplayName: settings.suggestedDisplayName,
        websiteUrl: settings.websiteUrl,
      });
      saveEvent.notifySuccess();
    },
  );

  await microsoftTeams.pages.config.setValidityState(true);
}

export function navigateToSubEntity(subEntityId: string): void {
  const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  const targetPath = `${basePath}/${subEntityId}`;
  window.history.replaceState(null, "", targetPath);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
