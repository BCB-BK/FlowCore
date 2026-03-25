import { Client } from "@microsoft/microsoft-graph-client";
import { appConfig } from "../lib/config";
import { logger } from "../lib/logger";

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

export async function searchPeople(
  accessToken: string,
  query: string,
  top = 10,
): Promise<GraphPerson[]> {
  if (appConfig.authDevMode) {
    return getDevPeople(query);
  }

  const client = getGraphClient(accessToken);
  const result = await client
    .api("/users")
    .filter(`startswith(displayName,'${query}') or startswith(mail,'${query}')`)
    .top(top)
    .select("id,displayName,mail,userPrincipalName,jobTitle,department")
    .get();

  return (result.value ?? []).map(mapGraphUser);
}

export async function getPersonById(
  accessToken: string,
  userId: string,
): Promise<GraphPerson | null> {
  if (appConfig.authDevMode) {
    return getDevPersonById(userId);
  }

  const cached = personCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const client = getGraphClient(accessToken);
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
  if (appConfig.authDevMode) {
    return getDevGroups(query);
  }

  const client = getGraphClient(accessToken);
  const result = await client
    .api("/groups")
    .filter(`startswith(displayName,'${query}')`)
    .top(top)
    .select("id,displayName,description,mail")
    .get();

  return (result.value ?? []).map(mapGraphGroup);
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
      displayName: "Dev Admin",
      mail: "admin@dev.local",
      userPrincipalName: "admin@dev.local",
      jobTitle: "System Administrator",
      department: "IT",
    },
    {
      id: "dev-editor-001",
      displayName: "Dev Editor",
      mail: "editor@dev.local",
      userPrincipalName: "editor@dev.local",
      jobTitle: "Content Editor",
      department: "QM",
    },
    {
      id: "dev-viewer-001",
      displayName: "Dev Viewer",
      mail: "viewer@dev.local",
      userPrincipalName: "viewer@dev.local",
      jobTitle: "Staff",
      department: "Operations",
    },
    {
      id: "dev-reviewer-001",
      displayName: "Dev Reviewer",
      mail: "reviewer@dev.local",
      userPrincipalName: "reviewer@dev.local",
      jobTitle: "Quality Manager",
      department: "QM",
    },
    {
      id: "dev-pm-001",
      displayName: "Dev Process Manager",
      mail: "pm@dev.local",
      userPrincipalName: "pm@dev.local",
      jobTitle: "Process Manager",
      department: "QM",
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
      displayName: "QM Team",
      description: "Quality Management Team",
    },
    {
      id: "dev-group-it",
      displayName: "IT Team",
      description: "IT Department",
    },
  ];
  const q = query.toLowerCase();
  return all.filter((g) => g.displayName.toLowerCase().includes(q));
}

logger.info("Graph client service initialized");
