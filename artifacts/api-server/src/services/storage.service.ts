import * as fs from "fs";
import * as path from "path";
import { db } from "@workspace/db";
import { storageProvidersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type {
  IStorageProvider,
  StorageUploadResult,
  StorageDownloadResult,
} from "@workspace/shared/providers";
import {
  SharePointStorageProvider,
  type SharePointStorageConfig,
} from "./sharepoint-storage.service";
import { logger } from "../lib/logger";

const UPLOAD_DIR = path.join(process.cwd(), ".uploads");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export class LocalStorageProvider implements IStorageProvider {
  constructor() {
    ensureUploadDir();
  }

  async upload(
    key: string,
    data: Buffer | ReadableStream,
    metadata: { mimeType: string; originalFilename: string },
  ): Promise<StorageUploadResult> {
    ensureUploadDir();
    const filePath = path.join(UPLOAD_DIR, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

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

    fs.writeFileSync(filePath, buffer);

    return {
      storageKey: key,
      url: `/api/media/files/${key}`,
      sizeBytes: buffer.length,
      mimeType: metadata.mimeType,
    };
  }

  async download(key: string): Promise<StorageDownloadResult> {
    const filePath = path.join(UPLOAD_DIR, key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }

    const stats = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);
    const ext = path.extname(key).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".pptx":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    };

    return {
      stream: stream as unknown as NodeJS.ReadableStream,
      mimeType: mimeMap[ext] || "application/octet-stream",
      sizeBytes: stats.size,
      filename: path.basename(key),
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(UPLOAD_DIR, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(path.join(UPLOAD_DIR, key));
  }

  async getSignedUrl(key: string, _expiresInSeconds: number): Promise<string> {
    return `/api/media/files/${key}`;
  }
}

let localProvider: IStorageProvider | null = null;
const providerCache = new Map<string, IStorageProvider>();

export function getStorageProvider(): IStorageProvider {
  if (!localProvider) {
    localProvider = new LocalStorageProvider();
  }
  return localProvider;
}

export async function getDefaultStorageProvider(): Promise<IStorageProvider> {
  const [defaultRow] = await db
    .select()
    .from(storageProvidersTable)
    .where(
      and(
        eq(storageProvidersTable.isDefault, true),
        eq(storageProvidersTable.isActive, true),
      ),
    );

  if (!defaultRow) {
    return getStorageProvider();
  }

  return getStorageProviderById(defaultRow.id);
}

export async function getStorageProviderById(
  providerId: string,
): Promise<IStorageProvider> {
  const cached = providerCache.get(providerId);
  if (cached) return cached;

  const [row] = await db
    .select()
    .from(storageProvidersTable)
    .where(
      and(
        eq(storageProvidersTable.id, providerId),
        eq(storageProvidersTable.isActive, true),
      ),
    );

  if (!row) {
    logger.warn({ providerId }, "Storage provider not found, using local");
    return getStorageProvider();
  }

  let provider: IStorageProvider;
  if (row.providerType === "sharepoint") {
    const config = row.config as SharePointStorageConfig;
    provider = new SharePointStorageProvider(config);
  } else {
    provider = getStorageProvider();
  }

  providerCache.set(providerId, provider);
  return provider;
}

export function invalidateProviderCache(providerId?: string): void {
  if (providerId) {
    providerCache.delete(providerId);
  } else {
    providerCache.clear();
  }
}
