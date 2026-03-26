import { Client } from "@microsoft/microsoft-graph-client";
import type {
  IStorageProvider,
  StorageUploadResult,
  StorageDownloadResult,
} from "@workspace/shared/providers";
import { logger } from "../lib/logger";

export interface SharePointStorageConfig {
  siteId: string;
  driveId: string;
  basePath?: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

async function getAppToken(config: SharePointStorageConfig): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    throw new Error(`Failed to acquire app token: ${resp.status}`);
  }

  const data = (await resp.json()) as { access_token: string };
  return data.access_token;
}

export class SharePointStorageProvider implements IStorageProvider {
  private config: SharePointStorageConfig;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(config: SharePointStorageConfig) {
    this.config = config;
  }

  private async getClient(): Promise<Client> {
    let token: string;
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      token = this.tokenCache.token;
    } else {
      token = await getAppToken(this.config);
      this.tokenCache = { token, expiresAt: Date.now() + 50 * 60 * 1000 };
    }

    return Client.init({
      authProvider: (done) => {
        done(null, token);
      },
    });
  }

  private getItemPath(key: string): string {
    const base = this.config.basePath || "";
    const fullPath = base ? `${base}/${key}` : key;
    return `/drives/${this.config.driveId}/root:/${fullPath}:`;
  }

  async upload(
    key: string,
    data: Buffer | ReadableStream,
    metadata: { mimeType: string; originalFilename: string },
  ): Promise<StorageUploadResult> {
    const client = await this.getClient();
    let buffer: Buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else {
      const chunks: Uint8Array[] = [];
      const reader = (data as ReadableStream).getReader();
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) chunks.push(result.value);
      }
      buffer = Buffer.concat(chunks);
    }

    const itemPath = this.getItemPath(key);
    const result = await client.api(`${itemPath}/content`).putStream(buffer);

    logger.info({ key, size: buffer.length }, "Uploaded file to SharePoint");

    return {
      storageKey: key,
      url: result.webUrl || `sharepoint://${this.config.driveId}/${key}`,
      sizeBytes: buffer.length,
      mimeType: metadata.mimeType,
    };
  }

  async download(key: string): Promise<StorageDownloadResult> {
    const client = await this.getClient();
    const itemPath = this.getItemPath(key);

    const meta = await client.api(itemPath).select("size,file,name").get();
    const stream = await client.api(`${itemPath}/content`).getStream();

    return {
      stream: stream as unknown as NodeJS.ReadableStream,
      mimeType: meta.file?.mimeType || "application/octet-stream",
      sizeBytes: meta.size || 0,
      filename: meta.name || key,
    };
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient();
    const itemPath = this.getItemPath(key);
    await client.api(itemPath).delete();
    logger.info({ key }, "Deleted file from SharePoint");
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const itemPath = this.getItemPath(key);
      await client.api(itemPath).select("id").get();
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string, _expiresInSeconds: number): Promise<string> {
    try {
      const client = await this.getClient();
      const itemPath = this.getItemPath(key);
      const result = await client
        .api(`${itemPath}/createLink`)
        .post({ type: "view", scope: "organization" });
      return result.link?.webUrl || "";
    } catch (err) {
      logger.error({ err, key }, "Failed to create SharePoint sharing link");
      return "";
    }
  }
}
