import { Client } from "@microsoft/microsoft-graph-client";
import { appConfig } from "../lib/config";
import { getAppAccessToken } from "./auth.service";
import { logger } from "../lib/logger";

interface ConnectorConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
}

async function resolveSharePointToken(
  accessToken: string,
): Promise<string | null> {
  if (accessToken) return accessToken;
  const appToken = await getAppAccessToken();
  if (appToken) return appToken;
  return null;
}

export async function acquireSystemToken(
  connectionConfig: unknown,
): Promise<string> {
  if (appConfig.authDevMode) {
    const appToken = await getAppAccessToken();
    if (appToken) return appToken;
    return "";
  }

  const cfg = connectionConfig as ConnectorConfig | null;
  if (!cfg?.tenantId || !cfg?.clientId || !cfg?.clientSecret) {
    throw new Error(
      "Missing SharePoint connector credentials (tenantId, clientId, clientSecret)",
    );
  }

  const tokenUrl = `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token acquisition failed (${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as { access_token: string };
  return data.access_token;
}

export interface SharePointSite {
  id: string;
  displayName: string;
  webUrl: string;
  description?: string;
}

export interface SharePointDrive {
  id: string;
  name: string;
  driveType: string;
  webUrl: string;
  siteId: string;
}

export interface SharePointItem {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  mimeType: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
  isFolder: boolean;
  childCount?: number;
  driveId: string;
  parentPath?: string;
}

function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

export async function listSites(
  accessToken: string,
  query?: string,
): Promise<SharePointSite[]> {
  const token = await resolveSharePointToken(accessToken);
  if (!token) {
    logger.warn("listSites: no access token available");
    return [];
  }

  try {
    const client = getGraphClient(token);
    const searchTerm = query || "*";
    const api = client.api(`/sites?search=${encodeURIComponent(searchTerm)}`);
    const result = await api
      .select("id,displayName,webUrl,description")
      .top(50)
      .get();
    return (result.value ?? []).map(mapSite);
  } catch (err) {
    logger.error({ err }, "Failed to list SharePoint sites");
    return [];
  }
}

export async function listDrives(
  accessToken: string,
  siteId: string,
): Promise<SharePointDrive[]> {
  const token = await resolveSharePointToken(accessToken);
  if (!token) {
    logger.warn("listDrives: no access token available");
    return [];
  }

  try {
    const client = getGraphClient(token);
    const result = await client
      .api(`/sites/${siteId}/drives`)
      .select("id,name,driveType,webUrl")
      .get();
    return (result.value ?? []).map((d: Record<string, string>) => ({
      id: d.id,
      name: d.name,
      driveType: d.driveType,
      webUrl: d.webUrl,
      siteId,
    }));
  } catch (err) {
    logger.error({ err, siteId }, "Failed to list SharePoint drives");
    return [];
  }
}

export async function listDriveItems(
  accessToken: string,
  driveId: string,
  folderId?: string,
): Promise<SharePointItem[]> {
  const token = await resolveSharePointToken(accessToken);
  if (!token) {
    logger.warn("listDriveItems: no access token available");
    return [];
  }

  try {
    const client = getGraphClient(token);
    const path = folderId
      ? `/drives/${driveId}/items/${folderId}/children`
      : `/drives/${driveId}/root/children`;
    const result = await client
      .api(path)
      .select(
        "id,name,webUrl,size,file,folder,lastModifiedDateTime,lastModifiedBy,parentReference",
      )
      .top(200)
      .get();
    return (result.value ?? []).map((item: Record<string, unknown>) =>
      mapDriveItem(item, driveId),
    );
  } catch (err) {
    logger.error({ err, driveId, folderId }, "Failed to list drive items");
    return [];
  }
}

export async function getDriveItemContent(
  accessToken: string,
  driveId: string,
  itemId: string,
): Promise<{
  stream: NodeJS.ReadableStream;
  mimeType: string;
  size: number;
} | null> {
  const token = await resolveSharePointToken(accessToken);
  if (!token) return null;

  try {
    const client = getGraphClient(token);
    const stream = await client
      .api(`/drives/${driveId}/items/${itemId}/content`)
      .getStream();

    const metaResult = await client
      .api(`/drives/${driveId}/items/${itemId}`)
      .select("size,file")
      .get();

    return {
      stream: stream as unknown as NodeJS.ReadableStream,
      mimeType: metaResult.file?.mimeType || "application/octet-stream",
      size: metaResult.size || 0,
    };
  } catch (err) {
    logger.error({ err, driveId, itemId }, "Failed to get drive item content");
    return null;
  }
}

export async function getDriveItemMeta(
  accessToken: string,
  driveId: string,
  itemId: string,
): Promise<SharePointItem | null> {
  const token = await resolveSharePointToken(accessToken);
  if (!token) return null;

  try {
    const client = getGraphClient(token);
    const item = await client
      .api(`/drives/${driveId}/items/${itemId}`)
      .select(
        "id,name,webUrl,size,file,folder,lastModifiedDateTime,lastModifiedBy,parentReference",
      )
      .get();
    return mapDriveItem(item, driveId);
  } catch (err) {
    logger.error({ err, driveId, itemId }, "Failed to get drive item meta");
    return null;
  }
}

function mapSite(s: Record<string, string>): SharePointSite {
  return {
    id: s.id,
    displayName: s.displayName,
    webUrl: s.webUrl,
    description: s.description,
  };
}

function mapDriveItem(
  item: Record<string, unknown>,
  driveId: string,
): SharePointItem {
  const file = item.file as Record<string, string> | undefined;
  const folder = item.folder as Record<string, number> | undefined;
  const lastModifiedBy = item.lastModifiedBy as
    | { user?: { displayName?: string } }
    | undefined;
  const parentRef = item.parentReference as { path?: string } | undefined;

  return {
    id: item.id as string,
    name: item.name as string,
    webUrl: item.webUrl as string,
    size: (item.size as number) || 0,
    mimeType: file?.mimeType || "application/octet-stream",
    lastModifiedAt: item.lastModifiedDateTime as string,
    lastModifiedBy: lastModifiedBy?.user?.displayName || "Unknown",
    isFolder: !!folder,
    childCount: folder?.childCount,
    driveId,
    parentPath: parentRef?.path,
  };
}

logger.info("SharePoint service initialized");
