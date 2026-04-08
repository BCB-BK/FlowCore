import { Client } from "@microsoft/microsoft-graph-client";
import { appConfig } from "../lib/config";
import { logger } from "../lib/logger";
import { getAppAccessToken, isAuthConfigured } from "./auth.service";

export interface GraphPerson {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
}

export interface GraphGroup {
  id: string;
  displayName: string;
  description?: string;
  mail?: string;
}

const personCache = new Map<string, { data: GraphPerson; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

function sanitizeODataValue(input: string): string {
  return input.replace(/'/g, "''");
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString(),
    );
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now() - 60_000;
  } catch {
    return false;
  }
}

async function resolveAccessToken(
  sessionToken: string,
): Promise<string | null> {
  if (sessionToken && !isTokenExpired(sessionToken)) return sessionToken;
  if (isAuthConfigured()) {
    const appToken = await getAppAccessToken();
    if (appToken) return appToken;
  }
  if (sessionToken) return sessionToken;
  return null;
}

export async function searchPeople(
  accessToken: string,
  query: string,
  top = 10,
): Promise<GraphPerson[]> {
  const token = await resolveAccessToken(accessToken);
  if (!token) {
    logger.warn(
      "searchPeople called without access token and no app token available",
    );
    return [];
  }

  try {
    const safe = sanitizeODataValue(query);
    const client = getGraphClient(token);
    const result = await client
      .api("/users")
      .header("ConsistencyLevel", "eventual")
      .filter(
        `(startswith(displayName,'${safe}') or startswith(surname,'${safe}') or startswith(givenName,'${safe}') or startswith(mail,'${safe}')) and accountEnabled eq true`,
      )
      .count(true)
      .top(top)
      .select(
        "id,displayName,mail,userPrincipalName,jobTitle,department,surname,givenName",
      )
      .get();

    return (result.value ?? []).map(mapGraphUser);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 429) {
      logger.warn("Graph API rate limited on searchPeople");
    } else {
      logger.error({ err }, "Graph searchPeople failed");
    }
    return [];
  }
}

export async function getPersonById(
  accessToken: string,
  userId: string,
): Promise<GraphPerson | null> {
  const cached = personCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const token = await resolveAccessToken(accessToken);
  if (!token) {
    return null;
  }

  try {
    const client = getGraphClient(token);
    const user = await client
      .api(`/users/${userId}`)
      .select("id,displayName,mail,userPrincipalName,jobTitle,department")
      .get();

    const person = mapGraphUser(user);
    personCache.set(userId, {
      data: person,
      expires: Date.now() + CACHE_TTL_MS,
    });
    return person;
  } catch (err) {
    logger.warn({ userId, err }, "Failed to fetch person from Graph");
    return null;
  }
}

export async function searchGroups(
  accessToken: string,
  query: string,
  top = 10,
): Promise<GraphGroup[]> {
  const token = await resolveAccessToken(accessToken);
  if (!token) {
    logger.warn(
      "searchGroups called without access token and no app token available",
    );
    return [];
  }

  try {
    const safe = sanitizeODataValue(query);
    const client = getGraphClient(token);
    const result = await client
      .api("/groups")
      .filter(`startswith(displayName,'${safe}')`)
      .top(top)
      .select("id,displayName,description,mail")
      .get();

    return (result.value ?? []).map(mapGraphGroup);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 429) {
      logger.warn("Graph API rate limited on searchGroups");
    } else {
      logger.error({ err }, "Graph searchGroups failed");
    }
    return [];
  }
}

export async function getGroupMembers(
  accessToken: string,
  groupId: string,
): Promise<GraphPerson[]> {
  if (appConfig.authDevMode) {
    return [];
  }

  const client = getGraphClient(accessToken);
  const result = await client
    .api(`/groups/${groupId}/members`)
    .select("id,displayName,mail,userPrincipalName")
    .get();

  return (result.value ?? [])
    .filter(
      (m: Record<string, string>) =>
        m["@odata.type"] === "#microsoft.graph.user",
    )
    .map(mapGraphUser);
}

export async function checkGroupMembership(
  accessToken: string,
  userId: string,
  groupId: string,
): Promise<boolean> {
  const token = await resolveAccessToken(accessToken);
  if (!token) {
    logger.warn("checkGroupMembership: no access token available");
    return false;
  }

  try {
    const client = getGraphClient(token);
    const result = await client
      .api(`/users/${userId}/checkMemberGroups`)
      .post({ groupIds: [groupId] });

    const matchedIds: string[] = result.value ?? [];
    return matchedIds.includes(groupId);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 403 || status === 401) {
      logger.warn(
        { userId, groupId, status },
        "checkGroupMembership: user token insufficient, retrying with app token",
      );
      try {
        const appToken = await getAppAccessToken();
        if (!appToken) return false;
        const appClient = getGraphClient(appToken);
        const appResult = await appClient
          .api(`/users/${userId}/checkMemberGroups`)
          .post({ groupIds: [groupId] });
        const appMatchedIds: string[] = appResult.value ?? [];
        return appMatchedIds.includes(groupId);
      } catch (fallbackErr) {
        logger.error({ fallbackErr, userId, groupId }, "checkGroupMembership fallback also failed");
        return false;
      }
    }
    logger.error({ err, userId, groupId }, "checkGroupMembership failed");
    return false;
  }
}

export async function getPersonPhoto(
  accessToken: string,
  userId: string,
  size: string = "48x48",
): Promise<Buffer | null> {
  const token = await resolveAccessToken(accessToken);
  if (!token) return null;

  try {
    const client = getGraphClient(token);
    const photo = await client
      .api(`/users/${userId}/photos/${size}/$value`)
      .responseType("arraybuffer" as any)
      .get();
    return Buffer.from(photo);
  } catch {
    return null;
  }
}

function mapGraphUser(u: Record<string, string>): GraphPerson {
  return {
    id: u.id,
    displayName: u.displayName,
    mail: u.mail ?? "",
    userPrincipalName: u.userPrincipalName ?? "",
    jobTitle: u.jobTitle,
    department: u.department,
  };
}

function mapGraphGroup(g: Record<string, string>): GraphGroup {
  return {
    id: g.id,
    displayName: g.displayName,
    description: g.description,
    mail: g.mail,
  };
}

logger.info("Graph client service initialized");
