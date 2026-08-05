import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  sourceReferencesTable,
  sourceSystemsTable,
  auditEventsTable,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import { hasPermission } from "../services/rbac.service";
import { getGraphToken, type TokenSitzung } from "../lib/session-crypto";
import {
  getDriveItemMeta,
  checkDriveItemAccess,
  type DriveItemAccess,
  acquireSystemToken,
} from "../services/sharepoint.service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export const sourceRefsRouter: IRouter = Router();

/**
 * Blendet SharePoint-Verweise aus, die die anfragende Person nicht öffnen darf.
 *
 * Verweise, deren Zugriff sich nicht prüfen ließ (kein Benutzertoken, Graph
 * nicht erreichbar), werden NICHT stillschweigend entfernt, sondern mit
 * `accessCheck: "unavailable"` markiert. Sonst sieht ein Ausfall aus wie eine
 * gelöschte Verknüpfung — und man sucht an der falschen Stelle.
 */
async function filterBySharePointAccess<
  T extends {
    externalId: string;
    metadata: unknown;
    systemType: string;
  },
>(refs: T[], userGraphToken: string): Promise<(T & { accessCheck?: string })[]> {
  const spRefs = refs.filter((r) => r.systemType === "sharepoint");
  if (spRefs.length === 0) return refs;

  const decisions = new Map<string, DriveItemAccess>();
  await Promise.all(
    spRefs.map(async (r) => {
      const meta = r.metadata as { driveId?: string } | null;
      if (!meta?.driveId) {
        // Ohne Ablageort lässt sich nichts prüfen; solche Verweise stammen
        // nicht aus dem Dateibrowser und bleiben sichtbar.
        decisions.set(r.externalId, "accessible");
        return;
      }
      decisions.set(
        r.externalId,
        await checkDriveItemAccess(userGraphToken, meta.driveId, r.externalId),
      );
    }),
  );

  return refs
    .filter(
      (r) =>
        r.systemType !== "sharepoint" ||
        decisions.get(r.externalId) !== "denied",
    )
    .map((r) => {
      const decision = decisions.get(r.externalId);
      return decision === "unavailable"
        ? { ...r, accessCheck: "unavailable" }
        : r;
    });
}

sourceRefsRouter.get(
  "/nodes/:nodeId/source-references",
  requireAuth,
  requirePermission("read_page", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;

    const refs = await db
      .select({
        id: sourceReferencesTable.id,
        nodeId: sourceReferencesTable.nodeId,
        sourceSystemId: sourceReferencesTable.sourceSystemId,
        externalId: sourceReferencesTable.externalId,
        externalUrl: sourceReferencesTable.externalUrl,
        externalTitle: sourceReferencesTable.externalTitle,
        externalMimeType: sourceReferencesTable.externalMimeType,
        externalModifiedAt: sourceReferencesTable.externalModifiedAt,
        syncStatus: sourceReferencesTable.syncStatus,
        lastCheckedAt: sourceReferencesTable.lastCheckedAt,
        lastSyncAt: sourceReferencesTable.lastSyncAt,
        syncError: sourceReferencesTable.syncError,
        metadata: sourceReferencesTable.metadata,
        createdBy: sourceReferencesTable.createdBy,
        createdAt: sourceReferencesTable.createdAt,
        systemName: sourceSystemsTable.name,
        systemType: sourceSystemsTable.systemType,
      })
      .from(sourceReferencesTable)
      .innerJoin(
        sourceSystemsTable,
        eq(sourceReferencesTable.sourceSystemId, sourceSystemsTable.id),
      )
      .where(eq(sourceReferencesTable.nodeId, nodeId))
      .orderBy(desc(sourceReferencesTable.createdAt));

    const userToken = resolveGraphToken(req);
    const filtered = await filterBySharePointAccess(refs, userToken);

    res.json(filtered);
  },
);

sourceRefsRouter.post(
  "/nodes/:nodeId/source-references",
  requireAuth,
  requirePermission("edit_content", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const {
      sourceSystemId,
      externalId,
      externalUrl,
      externalTitle,
      externalMimeType,
      externalModifiedAt,
      metadata,
    } = req.body;

    if (!sourceSystemId || !UUID_RE.test(sourceSystemId)) {
      res.status(400).json({ error: "Valid sourceSystemId is required" });
      return;
    }
    if (!externalId) {
      res.status(400).json({ error: "externalId is required" });
      return;
    }

    const [system] = await db
      .select({ id: sourceSystemsTable.id })
      .from(sourceSystemsTable)
      .where(
        and(
          eq(sourceSystemsTable.id, sourceSystemId),
          eq(sourceSystemsTable.isActive, true),
        ),
      );

    if (!system) {
      res.status(404).json({ error: "Source system not found or inactive" });
      return;
    }

    const existing = await db
      .select({ id: sourceReferencesTable.id })
      .from(sourceReferencesTable)
      .where(
        and(
          eq(sourceReferencesTable.nodeId, nodeId),
          eq(sourceReferencesTable.sourceSystemId, sourceSystemId),
          eq(sourceReferencesTable.externalId, externalId),
        ),
      );

    if (existing.length > 0) {
      res
        .status(409)
        .json({ error: "This external document is already referenced" });
      return;
    }

    const ref = await db.transaction(async (tx) => {
      const [r] = await tx
        .insert(sourceReferencesTable)
        .values({
          nodeId,
          sourceSystemId,
          externalId,
          externalUrl: externalUrl || null,
          externalTitle: externalTitle || null,
          externalMimeType: externalMimeType || null,
          externalModifiedAt: externalModifiedAt
            ? new Date(externalModifiedAt)
            : null,
          metadata: metadata || null,
          createdBy: req.user!.principalId,
        })
        .returning();

      await tx.insert(auditEventsTable).values({
        eventType: "content",
        action: "source_reference_created",
        actorId: req.user!.principalId,
        resourceType: "source_reference",
        resourceId: r.id,
        details: { nodeId, sourceSystemId, externalId, externalTitle },
      });

      return r;
    });

    res.status(201).json(ref);
  },
);

sourceRefsRouter.delete(
  "/source-references/:refId",
  requireAuth,
  async (req, res) => {
    const refId = req.params.refId as string;
    if (!UUID_RE.test(refId)) {
      res.status(400).json({ error: "Invalid ID format" });
      return;
    }

    const [ref] = await db
      .select()
      .from(sourceReferencesTable)
      .where(eq(sourceReferencesTable.id, refId));

    if (!ref) {
      res.status(404).json({ error: "Source reference not found" });
      return;
    }

    const canEdit = await hasPermission(
      req.user!.principalId,
      "edit_content",
      ref.nodeId,
    );
    if (!canEdit) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(sourceReferencesTable)
        .where(eq(sourceReferencesTable.id, refId));

      await tx.insert(auditEventsTable).values({
        eventType: "content",
        action: "source_reference_deleted",
        actorId: req.user!.principalId,
        resourceType: "source_reference",
        resourceId: refId,
        details: { nodeId: ref.nodeId, externalId: ref.externalId },
      });
    });

    res.status(204).send();
  },
);

sourceRefsRouter.post(
  "/source-references/:refId/check",
  requireAuth,
  async (req, res) => {
    const refId = req.params.refId as string;
    if (!UUID_RE.test(refId)) {
      res.status(400).json({ error: "Invalid ID format" });
      return;
    }

    const [ref] = await db
      .select()
      .from(sourceReferencesTable)
      .where(eq(sourceReferencesTable.id, refId));

    if (!ref) {
      res.status(404).json({ error: "Source reference not found" });
      return;
    }

    const canRead = await hasPermission(
      req.user!.principalId,
      "read_page",
      ref.nodeId,
    );
    if (!canRead) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    const [system] = await db
      .select()
      .from(sourceSystemsTable)
      .where(eq(sourceSystemsTable.id, ref.sourceSystemId));

    const now = new Date();
    let newSyncStatus = ref.syncStatus;
    let syncError: string | null = null;
    let externalModifiedAt = ref.externalModifiedAt;
    let externalTitle = ref.externalTitle;
    let externalMimeType = ref.externalMimeType;

    if (system?.systemType === "sharepoint") {
      const meta = ref.metadata as { driveId?: string } | null;
      if (meta?.driveId) {
        try {
          let accessToken = "";
          const connConfig = system.connectionConfig as Record<
            string,
            string
          > | null;
          if (connConfig) {
            accessToken = await acquireSystemToken(connConfig);
          } else {
            accessToken = resolveGraphToken(req);
          }
          const itemMeta = await getDriveItemMeta(
            accessToken,
            meta.driveId,
            ref.externalId,
          );

          if (!itemMeta) {
            newSyncStatus = "not_found";
            syncError = "Item no longer found in source";
          } else {
            const remoteModified = new Date(itemMeta.lastModifiedAt);
            const isStale =
              ref.externalModifiedAt && remoteModified > ref.externalModifiedAt;
            newSyncStatus = isStale ? "stale" : "active";
            externalModifiedAt = remoteModified;
            externalTitle = itemMeta.name;
            externalMimeType = itemMeta.mimeType;
            syncError = null;
          }
        } catch (err) {
          newSyncStatus = "error";
          syncError = err instanceof Error ? err.message : "Unknown error";
        }
      }
    }

    await db
      .update(sourceReferencesTable)
      .set({
        lastCheckedAt: now,
        syncStatus: newSyncStatus,
        externalModifiedAt,
        externalTitle,
        externalMimeType,
        syncError,
      })
      .where(eq(sourceReferencesTable.id, refId));

    res.json({
      id: ref.id,
      syncStatus: newSyncStatus,
      lastCheckedAt: now.toISOString(),
      externalModifiedAt,
      externalTitle,
      syncError,
    });
  },
);
