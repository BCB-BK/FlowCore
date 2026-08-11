import { sanitizeInternalError } from "../lib/safe-error";
import { TrackMediaUsageBody } from "@workspace/api-zod";
import { validateBody } from "../middlewares/validate-body";
import { z } from "zod";
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
import { hasPermission } from "../services/rbac.service";
import { checkConfidentialityAccess } from "../services/confidentiality.service";
import {
  getDefaultStorageProvider,
  getDefaultProviderId,
  getStorageProviderById,
  getStorageProvider,
} from "../services/storage.service";
import { getDriveItemContent } from "../services/sharepoint.service";
import { logger } from "../lib/logger";
import { envInt } from "../lib/env";
import busboy from "busboy";
import { getGraphToken, type TokenSitzung } from "../lib/session-crypto";

const router: IRouter = Router();

// Per MAX_UPLOAD_MB übersteuerbar (Default 50 MB)
const MAX_UPLOAD_MB = envInt("MAX_UPLOAD_MB", 50);
const MAX_FILE_SIZE = MAX_UPLOAD_MB * 1024 * 1024;

/**
 * Rumpfprüfung des Uploads — nur die Textfelder des Multipart-Formulars.
 *
 * Hier steht bewusst **nicht** das generierte `UploadMediaBody`. Jenes Schema
 * verlangt zusätzlich `file` als `File`-Instanz und beschreibt damit korrekt,
 * was der *Browser* absendet. Auf dem Server landet der Datei-Teil aber bei
 * busboy in `_uploadedFile` und niemals in `req.body`. Gegen `req.body`
 * geprüft konnte `file` deshalb nie erfüllt sein: jeder Bild-Upload endete
 * mit 400 "Validierungsfehler", für jeden Benutzer und jede Datei.
 *
 * Die Datei selbst bleibt geprüft — nur an den Stellen, die sie tatsächlich
 * sehen: busboy erzwingt das Größenlimit (413), die Route weiter unten das
 * Vorhandensein (400 "No file provided").
 */
const UploadMediaFormularfelder = z.object({
  altText: z.string().optional(),
  caption: z.string().optional(),
  nodeId: z.string().uuid().optional(),
});

/**
 * Multipart-Parsing über busboy (Streaming, mit hartem Größenlimit) statt der
 * früheren Eigenimplementierung, die den gesamten Request puffer­te und per
 * Binary-String-Splitting parste.
 */
function parseMultipart(req: Request, res: Response, next: NextFunction) {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    next();
    return;
  }

  let bb: ReturnType<typeof busboy>;
  try {
    bb = busboy({
      headers: req.headers,
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    });
  } catch (err) {
    next(err);
    return;
  }

  const formFields: Record<string, string> = {};
  let uploadedFile:
    | { originalname: string; mimetype: string; buffer: Buffer; size: number }
    | undefined;
  let fileTooLarge = false;
  let finished = false;

  bb.on("file", (_name, fileStream, info) => {
    const chunks: Buffer[] = [];
    fileStream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    fileStream.on("limit", () => {
      fileTooLarge = true;
      fileStream.resume();
    });
    fileStream.on("close", () => {
      if (fileTooLarge) return;
      const buffer = Buffer.concat(chunks);
      uploadedFile = {
        originalname: info.filename,
        mimetype: info.mimeType || "application/octet-stream",
        buffer,
        size: buffer.length,
      };
    });
  });

  bb.on("field", (name, value) => {
    formFields[name] = value;
  });

  bb.on("error", (err: unknown) => {
    if (finished) return;
    finished = true;
    next(err instanceof Error ? err : new Error("Multipart parsing failed"));
  });

  bb.on("close", () => {
    if (finished) return;
    finished = true;
    if (fileTooLarge) {
      res.status(413).json({
        error: `Datei zu groß (maximal ${MAX_UPLOAD_MB} MB)`,
      });
      return;
    }
    if (uploadedFile) {
      (req as unknown as Record<string, unknown>)._uploadedFile = uploadedFile;
    }
    req.body = { ...req.body, ...formFields };
    next();
  });

  req.pipe(bb);
}

router.post(
  "/upload",
  requireAuth,
  requirePermission("edit_content"),
  parseMultipart,
  validateBody(UploadMediaFormularfelder),
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

      const asset = await db.transaction(async (tx) => {
        const [a] = await tx
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

        await tx.insert(auditEventsTable).values({
          eventType: "content",
          action: "media_uploaded",
          actorId: req.user!.principalId,
          resourceType: "media_asset",
          resourceId: a.id,
          details: { filename: file.originalname, mimeType: file.mimetype },
        });

        return a;
      });

      res.status(201).json({
        ...asset,
        url: `/api/media/files/${asset.storageKey}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error({ err }, `Media upload failed: ${message}`);
      res.status(500).json({ error: sanitizeInternalError(message) });
    }
  },
);

function resolveGraphToken(req: {
  headers: Record<string, string | string[] | undefined>;
  session?: TokenSitzung;
}): string {
  // Sitzungstoken liegt verschluesselt (Audit A3); der Header-Weg bleibt fuer
  // Aufrufer, die ihr eigenes Graph-Token mitbringen.
  return (
    (req.headers["x-graph-token"] as string) || getGraphToken(req.session) || ""
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
        res
          .status(400)
          .json({ error: "driveId, itemId and filename are required" });
        return;
      }

      const accessToken = resolveGraphToken(req);
      const content = await getDriveItemContent(accessToken, driveId, itemId);
      if (!content) {
        res
          .status(404)
          .json({ error: "SharePoint file not found or inaccessible" });
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

      const asset = await db.transaction(async (tx) => {
        const [a] = await tx
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

        await tx.insert(auditEventsTable).values({
          eventType: "content",
          action: "media_imported_sharepoint",
          actorId: req.user!.principalId,
          resourceType: "media_asset",
          resourceId: a.id,
          details: { filename, driveId, itemId, mimeType: content.mimeType },
        });

        return a;
      });

      res.status(201).json({
        ...asset,
        url: `/api/media/files/${asset.storageKey}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error({ err }, `SharePoint import failed: ${message}`);
      res.status(500).json({ error: sanitizeInternalError(message) });
    }
  },
);

// Medienbibliothek: nur für Benutzer mit Bearbeitungsrechten (die Dialoge
// existieren ausschließlich im Editor-Kontext). Ohne Gate konnte jeder
// Authentifizierte Metadaten und URLs aller Assets auflisten.
router.get(
  "/assets",
  requireAuth,
  requirePermission("edit_content"),
  async (req, res) => {
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
  },
);

router.get(
  "/assets/:id",
  requireAuth,
  requirePermission("edit_content"),
  async (req, res) => {
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
  },
);

router.delete(
  "/assets/:id",
  requireAuth,
  requirePermission("manage_media"),
  async (req, res) => {
    const id = req.params.id as string;
    await db.transaction(async (tx) => {
      await tx
        .update(mediaAssetsTable)
        .set({ isDeleted: true })
        .where(eq(mediaAssetsTable.id, id));

      await tx.insert(auditEventsTable).values({
        eventType: "content",
        action: "media_deleted",
        actorId: req.user!.principalId,
        resourceType: "media_asset",
        resourceId: id,
      });
    });

    res.status(204).send();
  },
);

router.get("/files/:key", requireAuth, async (req, res) => {
  const key = req.params.key as string;
  try {
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

    if (asset.nodeId) {
      let canRead = false;
      try {
        canRead = await hasPermission(
          req.user!.principalId,
          "read_page",
          asset.nodeId,
        );
        // Medien vertraulicher Seiten unterliegen derselben
        // Vertraulichkeitsprüfung wie die Seite selbst.
        if (canRead) {
          const confidentiality = await checkConfidentialityAccess(
            req.user!.principalId,
            asset.nodeId,
          );
          canRead = confidentiality.allowed;
        }
      } catch (permErr) {
        logger.error(
          { permErr, principalId: req.user?.principalId, nodeId: asset.nodeId },
          "hasPermission failed for media file",
        );
        res.status(500).json({ error: "Permission check failed" });
        return;
      }
      if (!canRead) {
        res.status(403).json({ error: "Keine Berechtigung" });
        return;
      }
    } else {
      // Asset ohne Seitenbezug: Zugriff, wenn der Benutzer eine der Seiten
      // lesen darf, auf denen das Asset verwendet wird — sonst nur mit
      // Bearbeitungsrechten (Medienbibliothek).
      let canRead = false;
      try {
        const usages = await db
          .selectDistinct({ nodeId: mediaAssetUsagesTable.nodeId })
          .from(mediaAssetUsagesTable)
          .where(eq(mediaAssetUsagesTable.assetId, asset.id))
          .limit(20);
        for (const usage of usages) {
          if (!usage.nodeId) continue;
          if (
            await hasPermission(
              req.user!.principalId,
              "read_page",
              usage.nodeId,
            )
          ) {
            const confidentiality = await checkConfidentialityAccess(
              req.user!.principalId,
              usage.nodeId,
            );
            if (confidentiality.allowed) {
              canRead = true;
              break;
            }
          }
        }
        if (!canRead) {
          canRead = await hasPermission(req.user!.principalId, "edit_content");
        }
      } catch (permErr) {
        logger.error(
          { permErr, principalId: req.user?.principalId, assetId: asset.id },
          "Permission check failed for node-less media file",
        );
        res.status(500).json({ error: "Permission check failed" });
        return;
      }
      if (!canRead) {
        res.status(403).json({ error: "Keine Berechtigung" });
        return;
      }
    }

    const provider = asset.storageProviderId
      ? await getStorageProviderById(asset.storageProviderId)
      : getStorageProvider();
    const result = await provider.download(key);
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Content-Length", result.sizeBytes);
    res.setHeader("Cache-Control", "private, max-age=3600");
    (result.stream as NodeJS.ReadableStream).pipe(res);
  } catch (err) {
    logger.error({ err, key }, "Failed to serve media file");
    res.status(500).json({ error: "Failed to serve file" });
  }
});

router.post(
  "/assets/:id/usages",
  requireAuth,
  requirePermission("edit_content"),
  validateBody(TrackMediaUsageBody),
  async (req, res) => {
    const assetId = req.params.id as string;
    const { nodeId, revisionId, usageContext } = req.body as {
      nodeId?: unknown;
      revisionId?: unknown;
      usageContext?: unknown;
    };

    const isOptionalString = (v: unknown) => v == null || typeof v === "string";
    if (
      typeof nodeId !== "string" ||
      nodeId.length === 0 ||
      !isOptionalString(revisionId) ||
      !isOptionalString(usageContext)
    ) {
      res.status(400).json({ error: "Ungültige Nutzungsdaten" });
      return;
    }

    const [asset] = await db
      .select({ id: mediaAssetsTable.id })
      .from(mediaAssetsTable)
      .where(
        and(
          eq(mediaAssetsTable.id, assetId),
          eq(mediaAssetsTable.isDeleted, false),
        ),
      );
    if (!asset) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }

    const [usage] = await db
      .insert(mediaAssetUsagesTable)
      .values({
        assetId,
        nodeId,
        revisionId: (revisionId as string | undefined) ?? null,
        usageContext: (usageContext as string | undefined) ?? null,
      })
      .returning();

    res.status(201).json(usage);
  },
);

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
