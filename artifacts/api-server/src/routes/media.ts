import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { randomUUID } from "crypto";
import * as path from "path";
import { db } from "@workspace/db";
import {
  mediaAssetsTable,
  mediaAssetUsagesTable,
  auditEventsTable,
} from "@workspace/db/schema";
import { eq, and, desc, ilike } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import {
  getDefaultStorageProvider,
  getDefaultProviderId,
  getStorageProviderById,
  getStorageProvider,
} from "../services/storage.service";
import { getDriveItemContent } from "../services/sharepoint.service";

const router: IRouter = Router();

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function parseMultipart(req: Request, _res: Response, next: NextFunction) {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    next();
    return;
  }

  const boundaryMatch = contentType.match(/boundary=(.+)/);
  if (!boundaryMatch) {
    next();
    return;
  }

  const chunks: Buffer[] = [];
  let totalSize = 0;

  req.on("data", (chunk: Buffer) => {
    totalSize += chunk.length;
    if (totalSize <= MAX_FILE_SIZE) {
      chunks.push(chunk);
    }
  });

  req.on("end", () => {
    if (totalSize > MAX_FILE_SIZE) {
      next(new Error("File too large"));
      return;
    }

    const body = Buffer.concat(chunks);
    const boundary = boundaryMatch[1];
    const parts = parseMultipartBody(body, boundary);

    const filePart = parts.find((p) => p.filename);
    if (filePart) {
      (req as unknown as Record<string, unknown>)._uploadedFile = {
        originalname: filePart.filename,
        mimetype: filePart.contentType || "application/octet-stream",
        buffer: filePart.data,
        size: filePart.data.length,
      };
    }

    const formFields: Record<string, string> = {};
    for (const part of parts) {
      if (!part.filename && part.name) {
        formFields[part.name] = part.data.toString("utf-8");
      }
    }
    req.body = { ...req.body, ...formFields };

    next();
  });

  req.on("error", next);
}

interface MultipartPart {
  name?: string;
  filename?: string;
  contentType?: string;
  data: Buffer;
}

function parseMultipartBody(body: Buffer, boundary: string): MultipartPart[] {
  const parts: MultipartPart[] = [];
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const bodyStr = body.toString("binary");
  const segments = bodyStr.split(boundaryBuf.toString("binary"));

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    if (segment.startsWith("--")) break;

    const headerEnd = segment.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headers = segment.substring(0, headerEnd);
    const dataStr = segment.substring(headerEnd + 4);
    const data = Buffer.from(
      dataStr.endsWith("\r\n") ? dataStr.slice(0, -2) : dataStr,
      "binary",
    );

    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const ctMatch = headers.match(/Content-Type:\s*(.+)/i);

    parts.push({
      name: nameMatch?.[1],
      filename: filenameMatch?.[1],
      contentType: ctMatch?.[1]?.trim(),
      data,
    });
  }

  return parts;
}

router.post(
  "/upload",
  requireAuth,
  requirePermission("edit_content"),
  parseMultipart,
  async (req, res) => {
    try {
      const file = (req as unknown as Record<string, unknown>)._uploadedFile as
        | {
            originalname: string;
            mimetype: string;
            buffer: Buffer;
            size: number;
          }
        | undefined;
      if (!file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const ext = path.extname(file.originalname).toLowerCase();
      const storageKey = `${randomUUID()}${ext}`;
      const provider = await getDefaultStorageProvider();
      const defaultProviderId = await getDefaultProviderId();

      const result = await provider.upload(storageKey, file.buffer, {
        mimeType: file.mimetype,
        originalFilename: file.originalname,
      });

      const classification = getClassification(file.mimetype);

      const [asset] = await db
        .insert(mediaAssetsTable)
        .values({
          filename: storageKey,
          originalFilename: (req.body.title as string) || file.originalname,
          mimeType: file.mimetype,
          sizeBytes: result.sizeBytes,
          storageKey: result.storageKey,
          storageProviderId: defaultProviderId,
          altText: (req.body.altText as string) || null,
          caption: (req.body.caption as string) || null,
          classification,
          nodeId: (req.body.nodeId as string) || null,
          sourceUrl: (req.body.sourceUrl as string) || null,
          sourceLibrary: (req.body.copyright as string) || null,
          sourcePath: (req.body.source as string) || null,
          uploadedBy: req.user!.principalId,
        })
        .returning();

      await db.insert(auditEventsTable).values({
        eventType: "content",
        action: "media_uploaded",
        actorId: req.user!.principalId,
        resourceType: "media_asset",
        resourceId: asset.id,
        details: { filename: file.originalname, mimeType: file.mimetype },
      });

      res.status(201).json({
        ...asset,
        url: result.url,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  },
);

function resolveGraphToken(req: {
  headers: Record<string, string | string[] | undefined>;
  session?: { graphAccessToken?: string };
}): string {
  return (
    (req.headers["x-graph-token"] as string) ||
    req.session?.graphAccessToken ||
    ""
  );
}

router.post(
  "/import-sharepoint",
  requireAuth,
  requirePermission("edit_content"),
  async (req, res) => {
    try {
      const { driveId, itemId, filename, nodeId } = req.body as {
        driveId: string;
        itemId: string;
        filename: string;
        nodeId?: string;
      };

      if (!driveId || !itemId || !filename) {
        res.status(400).json({ error: "driveId, itemId and filename are required" });
        return;
      }

      const accessToken = resolveGraphToken(req);
      const content = await getDriveItemContent(accessToken, driveId, itemId);
      if (!content) {
        res.status(404).json({ error: "SharePoint file not found or inaccessible" });
        return;
      }

      const chunks: Buffer[] = [];
      let totalSize = 0;
      for await (const chunk of content.stream) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        totalSize += buf.length;
        if (totalSize > MAX_FILE_SIZE) {
          res.status(413).json({ error: "File too large (max 50 MB)" });
          return;
        }
        chunks.push(buf);
      }
      const buffer = Buffer.concat(chunks);

      const ext = path.extname(filename).toLowerCase();
      const storageKey = `${randomUUID()}${ext}`;
      const provider = await getDefaultStorageProvider();
      const defaultProviderId = await getDefaultProviderId();

      const result = await provider.upload(storageKey, buffer, {
        mimeType: content.mimeType,
        originalFilename: filename,
      });

      const classification = getClassification(content.mimeType);

      const [asset] = await db
        .insert(mediaAssetsTable)
        .values({
          filename: storageKey,
          originalFilename: filename,
          mimeType: content.mimeType,
          sizeBytes: result.sizeBytes,
          storageKey: result.storageKey,
          storageProviderId: defaultProviderId,
          classification,
          nodeId: nodeId || null,
          uploadedBy: req.user!.principalId,
        })
        .returning();

      await db.insert(auditEventsTable).values({
        eventType: "content",
        action: "media_imported_sharepoint",
        actorId: req.user!.principalId,
        resourceType: "media_asset",
        resourceId: asset.id,
        details: { filename, driveId, itemId, mimeType: content.mimeType },
      });

      res.status(201).json({
        ...asset,
        url: result.url,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  },
);

router.get("/assets", requireAuth, async (req, res) => {
  const q = req.query.q as string | undefined;
  const classification = req.query.classification as string | undefined;
  const limit = Math.min(
    parseInt((req.query.limit as string) || "50", 10),
    100,
  );
  const offset = parseInt((req.query.offset as string) || "0", 10);

  const conditions = [eq(mediaAssetsTable.isDeleted, false)];

  if (q) {
    conditions.push(ilike(mediaAssetsTable.originalFilename, `%${q}%`));
  }

  if (classification) {
    conditions.push(
      eq(
        mediaAssetsTable.classification,
        classification as
          | "document"
          | "image"
          | "video"
          | "audio"
          | "spreadsheet"
          | "presentation"
          | "template"
          | "form"
          | "archive"
          | "other",
      ),
    );
  }

  const assets = await db
    .select()
    .from(mediaAssetsTable)
    .where(and(...conditions))
    .orderBy(desc(mediaAssetsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const assetsWithUrls = assets.map((a) => ({
    ...a,
    url: `/api/media/files/${a.storageKey}`,
  }));

  res.json(assetsWithUrls);
});

router.get("/assets/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const [asset] = await db
    .select()
    .from(mediaAssetsTable)
    .where(
      and(eq(mediaAssetsTable.id, id), eq(mediaAssetsTable.isDeleted, false)),
    );

  if (!asset) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  res.json({ ...asset, url: `/api/media/files/${asset.storageKey}` });
});

router.delete(
  "/assets/:id",
  requireAuth,
  requirePermission("manage_media"),
  async (req, res) => {
    const id = req.params.id as string;
    await db
      .update(mediaAssetsTable)
      .set({ isDeleted: true })
      .where(eq(mediaAssetsTable.id, id));

    await db.insert(auditEventsTable).values({
      eventType: "content",
      action: "media_deleted",
      actorId: req.user!.principalId,
      resourceType: "media_asset",
      resourceId: id,
    });

    res.status(204).send();
  },
);

router.get("/files/:key", requireAuth, async (req, res) => {
  try {
    const key = req.params.key as string;

    if (!key || key.includes("..") || key.includes("/") || key.includes("\\")) {
      res.status(400).json({ error: "Invalid file key" });
      return;
    }

    const [asset] = await db
      .select()
      .from(mediaAssetsTable)
      .where(
        and(
          eq(mediaAssetsTable.storageKey, key),
          eq(mediaAssetsTable.isDeleted, false),
        ),
      );

    if (!asset) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const provider = asset.storageProviderId
      ? await getStorageProviderById(asset.storageProviderId)
      : getStorageProvider();
    const result = await provider.download(key);
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Content-Length", result.sizeBytes);
    res.setHeader("Cache-Control", "private, max-age=3600");
    (result.stream as NodeJS.ReadableStream).pipe(res);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

router.post("/assets/:id/usages", requireAuth, async (req, res) => {
  const assetId = req.params.id as string;
  const { nodeId, revisionId, usageContext } = req.body;

  const [usage] = await db
    .insert(mediaAssetUsagesTable)
    .values({ assetId, nodeId, revisionId, usageContext })
    .returning();

  res.status(201).json(usage);
});

router.get("/assets/:id/usages", requireAuth, async (req, res) => {
  const assetId = req.params.id as string;
  const usages = await db
    .select()
    .from(mediaAssetUsagesTable)
    .where(eq(mediaAssetUsagesTable.assetId, assetId));
  res.json(usages);
});

function getClassification(
  mimeType: string,
):
  | "document"
  | "image"
  | "video"
  | "audio"
  | "spreadsheet"
  | "presentation"
  | "template"
  | "form"
  | "archive"
  | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "spreadsheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "presentation";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("document")
  )
    return "document";
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("rar")
  )
    return "archive";
  return "other";
}

const ALLOWED_EMBED_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "microsoft.com",
  "sharepoint.com",
  "office.com",
  "teams.microsoft.com",
  "miro.com",
  "figma.com",
  "lucid.app",
  "draw.io",
  "diagrams.net",
  "loom.com",
  "sway.office.com",
  "stream.microsoft.com",
];

function isAllowedEmbedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_EMBED_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

router.post("/validate-embed", requireAuth, (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    res.status(400).json({ allowed: false, reason: "URL is required" });
    return;
  }
  const allowed = isAllowedEmbedDomain(url);
  res.json({
    allowed,
    reason: allowed ? null : "Domain is not in the allowlist",
    allowedDomains: ALLOWED_EMBED_DOMAINS,
  });
});

export default router;
