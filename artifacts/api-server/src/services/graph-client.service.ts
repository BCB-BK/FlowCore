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

async function resolveAccessToken(sessionToken: string): Promise<string | null> {
  if (sessionToken) return sessionToken;
  if (isAuthConfigured()) {
    const appToken = await getAppAccessToken();
    if (appToken) return appToken;
  }
  return null;
}

export async function searchPeople(
  accessToken: string,
  query: string,
  top = 10,
): Promise<GraphPerson[]> {
  const token = await resolveAccessToken(accessToken);
  if (!token) {
    if (appConfig.authDevMode) return getDevPeople(query);
    logger.warn("searchPeople called without access token and no app token available");
    return [];
  }

  try {
    const safe = sanitizeODataValue(query);
    const client = getGraphClient(token);
    const result = await client
      .api("/users")
      .filter(`startswith(displayName,'${safe}') or startswith(mail,'${safe}')`)
      .top(top)
      .select("id,displayName,mail,userPrincipalName,jobTitle,department")
      .get();

    return (result.value ?? []).map(mapGraphUser);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 429) {
      logger.warn("Graph API rate limited on searchPeople");
    } else {
      logger.error({ err }, "Graph searchPeople failed");
    }
    if (appConfig.authDevMode) return getDevPeople(query);
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
    if (appConfig.authDevMode) return getDevPersonById(userId);
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
    if (appConfig.authDevMode) return getDevPersonById(userId);
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
    if (appConfig.authDevMode) return getDevGroups(query);
    logger.warn("searchGroups called without access token and no app token available");
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
    if (appConfig.authDevMode) return getDevGroups(query);
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

function getDevPeople(query: string): GraphPerson[] {
  const all: GraphPerson[] = [
    {
      id: "dev-admin-001",
      displayName: "Thomas Müller",
      mail: "t.mueller@bildungscampus-backnang.de",
      userPrincipalName: "t.mueller@bildungscampus-backnang.de",
      jobTitle: "System Administrator",
      department: "IT",
    },
    {
      id: "dev-editor-001",
      displayName: "Sarah Weber",
      mail: "s.weber@bildungscampus-backnang.de",
      userPrincipalName: "s.weber@bildungscampus-backnang.de",
      jobTitle: "Content Editor",
      department: "QM",
    },
    {
      id: "dev-viewer-001",
      displayName: "Michael Schmidt",
      mail: "m.schmidt@bildungscampus-backnang.de",
      userPrincipalName: "m.schmidt@bildungscampus-backnang.de",
      jobTitle: "Dozent",
      department: "Lehre",
    },
    {
      id: "dev-reviewer-001",
      displayName: "Lisa Ecker",
      mail: "l.ecker@bildungscampus-backnang.de",
      userPrincipalName: "l.ecker@bildungscampus-backnang.de",
      jobTitle: "Qualitätsmanagerin",
      department: "QM",
    },
    {
      id: "dev-pm-001",
      displayName: "Markus Hoffmann",
      mail: "m.hoffmann@bildungscampus-backnang.de",
      userPrincipalName: "m.hoffmann@bildungscampus-backnang.de",
      jobTitle: "Prozessmanager",
      department: "QM",
    },
    {
      id: "dev-user-006",
      displayName: "Anna Eckergerf",
      mail: "a.eckergerf@bildungscampus-backnang.de",
      userPrincipalName: "a.eckergerf@bildungscampus-backnang.de",
      jobTitle: "Verwaltungsangestellte",
      department: "Verwaltung",
    },
    {
      id: "dev-user-007",
      displayName: "Julia Fischer",
      mail: "j.fischer@bildungscampus-backnang.de",
      userPrincipalName: "j.fischer@bildungscampus-backnang.de",
      jobTitle: "Studiengangkoordinatorin",
      department: "Studienberatung",
    },
    {
      id: "dev-user-008",
      displayName: "Stefan Bauer",
      mail: "s.bauer@bildungscampus-backnang.de",
      userPrincipalName: "s.bauer@bildungscampus-backnang.de",
      jobTitle: "IT-Techniker",
      department: "IT",
    },
    {
      id: "dev-user-009",
      displayName: "Petra Zimmermann",
      mail: "p.zimmermann@bildungscampus-backnang.de",
      userPrincipalName: "p.zimmermann@bildungscampus-backnang.de",
      jobTitle: "Compliance-Managerin",
      department: "Recht & Compliance",
    },
    {
      id: "dev-user-010",
      displayName: "Klaus Wagner",
      mail: "k.wagner@bildungscampus-backnang.de",
      userPrincipalName: "k.wagner@bildungscampus-backnang.de",
      jobTitle: "Campusleiter",
      department: "Leitung",
    },
  ];
  const q = query.toLowerCase();
  return all.filter(
    (p) =>
      p.displayName.toLowerCase().includes(q) ||
      p.mail.toLowerCase().includes(q),
  );
}

function getDevPersonById(userId: string): GraphPerson | null {
  const people = getDevPeople("");
  return people.find((p) => p.id === userId) ?? null;
}

function getDevGroups(query: string): GraphGroup[] {
  const all: GraphGroup[] = [
    {
      id: "dev-group-qm",
      displayName: "Qualitätsmanagement",
      description: "Team Qualitätsmanagement",
      mail: "qm@bildungscampus-backnang.de",
    },
    {
      id: "dev-group-it",
      displayName: "IT & Digitalisierung",
      description: "IT-Abteilung und Digitalisierungsteam",
      mail: "it@bildungscampus-backnang.de",
    },
    {
      id: "dev-group-leitung",
      displayName: "Campusleitung",
      description: "Leitungsgremium Bildungscampus",
      mail: "leitung@bildungscampus-backnang.de",
    },
    {
      id: "dev-group-dozenten",
      displayName: "Dozentenkollegium",
      description: "Alle Dozentinnen und Dozenten",
      mail: "dozenten@bildungscampus-backnang.de",
    },
    {
      id: "dev-group-verwaltung",
      displayName: "Verwaltung",
      description: "Campus-Verwaltung",
      mail: "verwaltung@bildungscampus-backnang.de",
    },
    {
      id: "dev-group-alle",
      displayName: "Bildungscampus Alle",
      description: "Alle Mitarbeitenden",
      mail: "alle@bildungscampus-backnang.de",
    },
  ];
  const q = query.toLowerCase();
  return all.filter(
    (g) =>
      g.displayName.toLowerCase().includes(q) ||
      (g.description ?? "").toLowerCase().includes(q),
  );
}

logger.info("Graph client service initialized");
