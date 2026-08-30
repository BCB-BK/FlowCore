import { Readable } from "node:stream";
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
  const tenantId = config.tenantId || process.env.ENTRA_TENANT_ID;
  const clientId = config.clientId || process.env.ENTRA_CLIENT_ID;
  const clientSecret = config.clientSecret || process.env.ENTRA_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "SharePoint credentials missing: tenantId, clientId and clientSecret must be set in the provider config or as ENTRA_TENANT_ID / ENTRA_CLIENT_ID / ENTRA_CLIENT_SECRET environment variables",
    );
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    logger.error(
      { status: resp.status, body, tenantId, clientId },
      "SharePoint app token request failed",
    );
    throw new Error(`Failed to acquire app token: ${resp.status} – ${body}`);
  }

  const data = (await resp.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Grenze, ab der Graph den einfachen PUT auf `/content` nicht mehr vorsieht.
 * Darueber verlangt Microsoft eine Upload-Session mit Stueckelung; ohne sie
 * scheiterten Dateien oberhalb dieser Groesse — genau der Fall, der beim
 * Anheben des Limits auf 100 MB auftrat.
 */
const EINFACHER_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

/**
 * Stueckgroesse der Upload-Session. Graph verlangt ein Vielfaches von
 * 320 KiB; 10 MiB (= 32 x 320 KiB) liegt in dem von Microsoft empfohlenen
 * Bereich von 5-10 MiB.
 */
const STUECK_BYTES = 10 * 1024 * 1024;

interface UploadSitzung {
  uploadUrl: string;
}

interface DriveItemAntwort {
  webUrl?: string;
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
      const reader = data.getReader();
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) chunks.push(result.value);
      }
      buffer = Buffer.concat(chunks);
    }

    const itemPath = this.getItemPath(key);

    let webUrl: string | undefined;
    if (buffer.length > EINFACHER_UPLOAD_MAX_BYTES) {
      webUrl = await this.uploadPerSitzung(client, itemPath, key, buffer);
    } else {
      const result = (await client
        .api(`${itemPath}/content`)
        .putStream(buffer)) as DriveItemAntwort;
      webUrl = result.webUrl;
    }

    logger.info({ key, size: buffer.length }, "Uploaded file to SharePoint");

    return {
      storageKey: key,
      url: webUrl || `sharepoint://${this.config.driveId}/${key}`,
      sizeBytes: buffer.length,
      mimeType: metadata.mimeType,
    };
  }

  /**
   * Grosse Dateien in Stuecken uebertragen (Microsoft-Graph-Upload-Session).
   *
   * Die von `createUploadSession` gelieferte `uploadUrl` traegt ihr eigenes
   * Zugangsmerkmal — die Stuecke gehen deshalb bewusst per `fetch` und ohne
   * Authorization-Kopfzeile raus, nicht ueber den Graph-Client.
   */
  private async uploadPerSitzung(
    client: Client,
    itemPath: string,
    key: string,
    buffer: Buffer,
  ): Promise<string | undefined> {
    const sitzung = (await client.api(`${itemPath}/createUploadSession`).post({
      item: { "@microsoft.graph.conflictBehavior": "replace" },
    })) as UploadSitzung;

    if (!sitzung?.uploadUrl) {
      throw new Error("SharePoint upload session did not return an uploadUrl");
    }

    const gesamt = buffer.length;
    try {
      for (let von = 0; von < gesamt; von += STUECK_BYTES) {
        const bis = Math.min(von + STUECK_BYTES, gesamt) - 1;
        const stueck = buffer.subarray(von, bis + 1);
        const antwort = await fetch(sitzung.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Length": String(stueck.length),
            "Content-Range": `bytes ${von}-${bis}/${gesamt}`,
          },
          body: new Uint8Array(stueck),
        });

        // 202 = Stueck angenommen, weiter. 200/201 = fertig, Rumpf ist das
        // fertige DriveItem.
        if (antwort.status === 200 || antwort.status === 201) {
          const fertig = (await antwort
            .json()
            .catch(() => ({}))) as DriveItemAntwort;
          return fertig.webUrl;
        }
        if (antwort.status !== 202) {
          const text = await antwort.text().catch(() => "");
          throw new Error(
            `Chunk upload failed (${antwort.status}): ${text.slice(0, 300)}`,
          );
        }
      }
    } catch (fehler) {
      // Angefangene Sitzung aufraeumen, sonst blockiert sie den Zielpfad.
      await fetch(sitzung.uploadUrl, { method: "DELETE" }).catch(() => {});
      logger.error(
        { key, size: gesamt, err: fehler },
        "Chunked SharePoint upload failed",
      );
      throw fehler;
    }

    // Alle Stuecke mit 202 quittiert, aber kein Abschluss-Rumpf: die Datei
    // liegt dann trotzdem, nur ohne webUrl aus der Antwort.
    return undefined;
  }

  async download(key: string): Promise<StorageDownloadResult> {
    const client = await this.getClient();
    const itemPath = this.getItemPath(key);

    const meta = await client.api(itemPath).select("size,file,name").get();
    const webStream = await client.api(`${itemPath}/content`).getStream();
    const nodeStream = Readable.fromWeb(
      webStream as Parameters<typeof Readable.fromWeb>[0],
    );

    return {
      stream: nodeStream,
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
