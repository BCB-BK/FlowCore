import { Client } from "@microsoft/microsoft-graph-client";
import { appConfig } from "../lib/config";
import { logger } from "../lib/logger";

interface ConnectorConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
}

export async function acquireSystemToken(
  connectionConfig: unknown,
): Promise<string> {
  if (appConfig.authDevMode) return "";

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
  if (appConfig.authDevMode) {
    return getDevSites(query);
  }

  try {
    const client = getGraphClient(accessToken);
    let api = client.api("/sites");
    if (query) {
      api = client.api(`/sites?search=${encodeURIComponent(query)}`);
    } else {
      api = client.api("/sites?search=*");
    }
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
  if (appConfig.authDevMode) {
    return getDevDrives(siteId);
  }

  try {
    const client = getGraphClient(accessToken);
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
  if (appConfig.authDevMode) {
    return getDevDriveItems(driveId, folderId);
  }

  try {
    const client = getGraphClient(accessToken);
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
  if (appConfig.authDevMode) {
    return null;
  }

  try {
    const client = getGraphClient(accessToken);
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
  if (appConfig.authDevMode) {
    return getDevItemMeta(driveId, itemId);
  }

  try {
    const client = getGraphClient(accessToken);
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

function getDevSites(query?: string): SharePointSite[] {
  const sites: SharePointSite[] = [
    {
      id: "dev-site-qm",
      displayName: "QM Dokumente",
      webUrl: "https://bildungscampus.sharepoint.com/sites/qm",
      description: "Qualitätsmanagement Dokumentenbibliothek",
    },
    {
      id: "dev-site-hr",
      displayName: "HR Portal",
      webUrl: "https://bildungscampus.sharepoint.com/sites/hr",
      description: "Human Resources Dokumente",
    },
    {
      id: "dev-site-it",
      displayName: "IT Wiki",
      webUrl: "https://bildungscampus.sharepoint.com/sites/it",
      description: "IT Dokumentation und Anleitungen",
    },
  ];
  if (query) {
    const q = query.toLowerCase();
    return sites.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q),
    );
  }
  return sites;
}

function getDevDrives(siteId: string): SharePointDrive[] {
  const drivesMap: Record<string, SharePointDrive[]> = {
    "dev-site-qm": [
      {
        id: "dev-drive-qm-docs",
        name: "Dokumente",
        driveType: "documentLibrary",
        webUrl: "https://bildungscampus.sharepoint.com/sites/qm/Dokumente",
        siteId: "dev-site-qm",
      },
      {
        id: "dev-drive-qm-templates",
        name: "Vorlagen",
        driveType: "documentLibrary",
        webUrl: "https://bildungscampus.sharepoint.com/sites/qm/Vorlagen",
        siteId: "dev-site-qm",
      },
    ],
    "dev-site-hr": [
      {
        id: "dev-drive-hr-docs",
        name: "Personalunterlagen",
        driveType: "documentLibrary",
        webUrl: "https://bildungscampus.sharepoint.com/sites/hr/Dokumente",
        siteId: "dev-site-hr",
      },
    ],
    "dev-site-it": [
      {
        id: "dev-drive-it-docs",
        name: "Anleitungen",
        driveType: "documentLibrary",
        webUrl: "https://bildungscampus.sharepoint.com/sites/it/Anleitungen",
        siteId: "dev-site-it",
      },
    ],
  };
  return drivesMap[siteId] || [];
}

function getDevDriveItems(
  driveId: string,
  folderId?: string,
): SharePointItem[] {
  if (folderId === "dev-folder-policies") {
    return [
      {
        id: "dev-item-policy-001",
        name: "Datenschutzrichtlinie_v3.pdf",
        webUrl: "https://bildungscampus.sharepoint.com/doc/datenschutz",
        size: 245000,
        mimeType: "application/pdf",
        lastModifiedAt: "2025-12-15T10:30:00Z",
        lastModifiedBy: "Max Mustermann",
        isFolder: false,
        driveId,
      },
      {
        id: "dev-item-policy-002",
        name: "IT-Sicherheitskonzept_2025.docx",
        webUrl: "https://bildungscampus.sharepoint.com/doc/itsecurity",
        size: 180000,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        lastModifiedAt: "2025-11-20T14:00:00Z",
        lastModifiedBy: "Lisa Schmidt",
        isFolder: false,
        driveId,
      },
    ];
  }

  const itemsMap: Record<string, SharePointItem[]> = {
    "dev-drive-qm-docs": [
      {
        id: "dev-folder-policies",
        name: "Richtlinien",
        webUrl: "https://bildungscampus.sharepoint.com/sites/qm/Richtlinien",
        size: 0,
        mimeType: "application/octet-stream",
        lastModifiedAt: "2025-12-01T08:00:00Z",
        lastModifiedBy: "System",
        isFolder: true,
        childCount: 12,
        driveId,
      },
      {
        id: "dev-item-qm-001",
        name: "Qualitätshandbuch_2025.pdf",
        webUrl: "https://bildungscampus.sharepoint.com/doc/qm-handbook",
        size: 1500000,
        mimeType: "application/pdf",
        lastModifiedAt: "2026-01-10T09:15:00Z",
        lastModifiedBy: "Max Mustermann",
        isFolder: false,
        driveId,
      },
      {
        id: "dev-item-qm-002",
        name: "Prozesslandkarte.xlsx",
        webUrl: "https://bildungscampus.sharepoint.com/doc/process-map",
        size: 340000,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        lastModifiedAt: "2026-02-28T16:30:00Z",
        lastModifiedBy: "Lisa Schmidt",
        isFolder: false,
        driveId,
      },
      {
        id: "dev-item-qm-003",
        name: "Auditbericht_Q4_2025.pdf",
        webUrl: "https://bildungscampus.sharepoint.com/doc/audit-q4",
        size: 890000,
        mimeType: "application/pdf",
        lastModifiedAt: "2026-01-20T11:00:00Z",
        lastModifiedBy: "Thomas Weber",
        isFolder: false,
        driveId,
      },
    ],
    "dev-drive-qm-templates": [
      {
        id: "dev-item-tpl-001",
        name: "Prozessbeschreibung_Vorlage.docx",
        webUrl: "https://bildungscampus.sharepoint.com/doc/tpl-process",
        size: 78000,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        lastModifiedAt: "2025-09-15T10:00:00Z",
        lastModifiedBy: "Lisa Schmidt",
        isFolder: false,
        driveId,
      },
    ],
  };
  return itemsMap[driveId] || [];
}

function getDevItemMeta(
  driveId: string,
  itemId: string,
): SharePointItem | null {
  const allItems = [
    ...getDevDriveItems(driveId),
    ...getDevDriveItems(driveId, "dev-folder-policies"),
  ];
  return allItems.find((i) => i.id === itemId) || null;
}

logger.info("SharePoint service initialized");
