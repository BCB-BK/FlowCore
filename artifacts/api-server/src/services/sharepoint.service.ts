import { Client } from "@microsoft/microsoft-graph-client";
import { appConfig } from "../lib/config";
import { getAppAccessToken } from "./auth.service";
import { logger } from "../lib/logger";

interface ConnectorConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * Identität, mit der ein Graph-Aufruf ausgeführt wird.
 *
 * - "user": das delegierte Token des angemeldeten Benutzers. Graph wendet die
 *   SharePoint-Berechtigungen dieser Person an — nur damit ist eine
 *   benutzerbezogene Zugriffsprüfung möglich.
 * - "app": das Anwendungstoken (Client Credentials). Es sieht alles, wofür der
 *   App-Registrierung Anwendungsberechtigungen erteilt wurden, und kennt keine
 *   Benutzerrechte.
 */
export type SharePointIdentity = "user" | "app";

export class SharePointAccessError extends Error {
  readonly status: number;
  readonly graphCode?: string;
  readonly triedIdentities: SharePointIdentity[];

  constructor(
    message: string,
    status: number,
    graphCode?: string,
    triedIdentities: SharePointIdentity[] = [],
  ) {
    super(message);
    this.name = "SharePointAccessError";
    this.status = status;
    this.graphCode = graphCode;
    this.triedIdentities = triedIdentities;
  }
}

interface GraphErrorLike {
  statusCode?: number;
  code?: string;
  message?: string;
}

function graphStatus(err: unknown): number | undefined {
  const e = err as GraphErrorLike | undefined;
  return typeof e?.statusCode === "number" ? e.statusCode : undefined;
}

function isAuthorizationFailure(err: unknown): boolean {
  const status = graphStatus(err);
  return status === 401 || status === 403;
}

/**
 * Führt einen Graph-Aufruf aus — zuerst mit dem Benutzertoken, bei fehlender
 * Berechtigung (401/403) optional mit dem Anwendungstoken.
 *
 * Der Rückfall auf das Anwendungstoken ist bewusst NICHT der Standard: Wo das
 * Ergebnis als Zugriffsprüfung dient (z. B. sichtbare Quellverweise), würde er
 * die Prüfung wertlos machen. Er ist nur dort erlaubt, wo FlowCore selbst als
 * Integration auftritt — also in der Konnektor-Verwaltung.
 */
async function runWithGraph<T>(
  userToken: string,
  allowAppFallback: boolean,
  operation: string,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const tried: SharePointIdentity[] = [];
  let lastError: unknown;

  if (userToken) {
    tried.push("user");
    try {
      return await fn(getGraphClient(userToken));
    } catch (err) {
      lastError = err;
      if (!isAuthorizationFailure(err) || !allowAppFallback) {
        throw toAccessError(err, operation, tried);
      }
      logger.warn(
        { operation, status: graphStatus(err) },
        "SharePoint: Benutzertoken ohne Berechtigung, weiche auf Anwendungstoken aus",
      );
    }
  }

  // Ohne Benutzertoken bleibt nur das Anwendungstoken. Das ist im Dev-Modus der
  // Normalfall; in Produktion darf es nur dort greifen, wo der Rückfall
  // ausdrücklich erlaubt ist.
  if (allowAppFallback || (!userToken && appConfig.authDevMode)) {
    const appToken = await getAppAccessToken();
    if (appToken) {
      tried.push("app");
      try {
        return await fn(getGraphClient(appToken));
      } catch (err) {
        lastError = err;
      }
    }
  }

  if (tried.length === 0) {
    throw new SharePointAccessError(
      "Kein Zugriffstoken verfügbar — bitte neu anmelden oder die Entra-Konfiguration prüfen.",
      401,
      "no_token",
      tried,
    );
  }

  throw toAccessError(lastError, operation, tried);
}

function toAccessError(
  err: unknown,
  operation: string,
  tried: SharePointIdentity[],
): SharePointAccessError {
  if (err instanceof SharePointAccessError) return err;
  const e = err as GraphErrorLike | undefined;
  const status = graphStatus(err) ?? 502;
  const detail = e?.message ? `: ${e.message}` : "";
  logger.error(
    { err, operation, status, graphCode: e?.code, tried },
    "SharePoint-Zugriff fehlgeschlagen",
  );
  return new SharePointAccessError(
    `SharePoint-Zugriff fehlgeschlagen (${operation}, HTTP ${status})${detail}`,
    status,
    e?.code,
    tried,
  );
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

export interface SharePointCallOptions {
  /**
   * Erlaubt den Rückfall auf das Anwendungstoken, wenn das Benutzertoken keine
   * SharePoint-Berechtigung trägt. Nur für die Konnektor-Verwaltung gedacht —
   * niemals dort, wo das Ergebnis als Zugriffsprüfung dient.
   */
  allowAppFallback?: boolean;
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
  options: SharePointCallOptions = {},
): Promise<SharePointSite[]> {
  const searchTerm = query || "*";
  const result = await runWithGraph(
    accessToken,
    options.allowAppFallback ?? false,
    "Sites suchen",
    (client) =>
      client
        .api(`/sites?search=${encodeURIComponent(searchTerm)}`)
        .select("id,displayName,webUrl,description")
        .top(50)
        .get(),
  );
  return (result.value ?? []).map(mapSite);
}

export async function listDrives(
  accessToken: string,
  siteId: string,
  options: SharePointCallOptions = {},
): Promise<SharePointDrive[]> {
  const result = await runWithGraph(
    accessToken,
    options.allowAppFallback ?? false,
    "Bibliotheken lesen",
    (client) =>
      client.api(`/sites/${siteId}/drives`).select("id,name,driveType,webUrl").get(),
  );
  return (result.value ?? []).map((d: Record<string, string>) => ({
      id: d.id,
      name: d.name,
      driveType: d.driveType,
      webUrl: d.webUrl,
      siteId,
    }));
}

export async function listDriveItems(
  accessToken: string,
  driveId: string,
  folderId?: string,
  options: SharePointCallOptions = {},
): Promise<SharePointItem[]> {
  const path = folderId
    ? `/drives/${driveId}/items/${folderId}/children`
    : `/drives/${driveId}/root/children`;
  const result = await runWithGraph(
    accessToken,
    options.allowAppFallback ?? false,
    "Ordnerinhalt lesen",
    (client) =>
      client
        .api(path)
        .select(
          "id,name,webUrl,size,file,folder,lastModifiedDateTime,lastModifiedBy,parentReference",
        )
        .top(200)
        .get(),
  );
  return (result.value ?? []).map((item: Record<string, unknown>) =>
    mapDriveItem(item, driveId),
  );
}

export async function getDriveItemContent(
  accessToken: string,
  driveId: string,
  itemId: string,
  options: SharePointCallOptions = {},
): Promise<{
  stream: NodeJS.ReadableStream;
  mimeType: string;
  size: number;
} | null> {
  try {
    return await runWithGraph(
      accessToken,
      options.allowAppFallback ?? false,
      "Datei lesen",
      async (client) => {
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
      },
    );
  } catch (err) {
    logger.error({ err, driveId, itemId }, "Failed to get drive item content");
    return null;
  }
}

export async function getDriveItemMeta(
  accessToken: string,
  driveId: string,
  itemId: string,
  options: SharePointCallOptions = {},
): Promise<SharePointItem | null> {
  try {
    const item = await runWithGraph(
      accessToken,
      options.allowAppFallback ?? false,
      "Dateiinfo lesen",
      (client) =>
        client
          .api(`/drives/${driveId}/items/${itemId}`)
          .select(
            "id,name,webUrl,size,file,folder,lastModifiedDateTime,lastModifiedBy,parentReference",
          )
          .get(),
    );
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
