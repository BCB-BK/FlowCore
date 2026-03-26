import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  sourceSystemsTable,
  storageProvidersTable,
  sourceReferencesTable,
  auditEventsTable,
} from "@workspace/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import {
  listSites,
  listDrives,
  listDriveItems,
  getDriveItemMeta,
  acquireSystemToken,
} from "../services/sharepoint.service";
import { invalidateProviderCache } from "../services/storage.service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const connectorsRouter: IRouter = Router();

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

function redactConnectionConfig(
  config: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!config) return null;
  const redacted = { ...config };
  const sensitiveKeys = [
    "clientSecret",
    "client_secret",
    "secret",
    "password",
    "apiKey",
    "api_key",
    "token",
    "accessToken",
    "refreshToken",
  ];
  for (const key of sensitiveKeys) {
    if (key in redacted) {
      redacted[key] = "***REDACTED***";
    }
  }
  return redacted;
}

function redactSystem<T extends { connectionConfig: unknown }>(
  system: T,
): T & { connectionConfig: Record<string, unknown> | null } {
  return {
    ...system,
    connectionConfig: redactConnectionConfig(
      system.connectionConfig as Record<string, unknown> | null,
    ),
  };
}

connectorsRouter.get(
  "/source-systems",
  requireAuth,
  requirePermission("manage_settings"),
  async (_req, res) => {
    const systems = await db
      .select()
      .from(sourceSystemsTable)
      .orderBy(desc(sourceSystemsTable.createdAt));

    const systemsWithCounts = await Promise.all(
      systems.map(async (s) => {
        const [refCount] = await db
          .select({ value: count() })
          .from(sourceReferencesTable)
          .where(eq(sourceReferencesTable.sourceSystemId, s.id));
        return redactSystem({ ...s, referenceCount: refCount?.value ?? 0 });
      }),
    );

    res.json(systemsWithCounts);
  },
);

connectorsRouter.get(
  "/source-systems/active",
  requireAuth,
  requirePermission("edit_content"),
  async (_req, res) => {
    const systems = await db
      .select({
        id: sourceSystemsTable.id,
        name: sourceSystemsTable.name,
        slug: sourceSystemsTable.slug,
        systemType: sourceSystemsTable.systemType,
        isActive: sourceSystemsTable.isActive,
      })
      .from(sourceSystemsTable)
      .where(eq(sourceSystemsTable.isActive, true))
      .orderBy(sourceSystemsTable.name);
    res.json(systems);
  },
);

connectorsRouter.get(
  "/source-systems/:id",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    const id = req.params.id as string;
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: "Invalid ID format" });
      return;
    }

    const [system] = await db
      .select()
      .from(sourceSystemsTable)
      .where(eq(sourceSystemsTable.id, id));

    if (!system) {
      res.status(404).json({ error: "Source system not found" });
      return;
    }

    const [refCount] = await db
      .select({ value: count() })
      .from(sourceReferencesTable)
      .where(eq(sourceReferencesTable.sourceSystemId, id));

    res.json(redactSystem({ ...system, referenceCount: refCount?.value ?? 0 }));
  },
);

connectorsRouter.post(
  "/source-systems",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    const {
      name,
      slug,
      systemType,
      connectionConfig,
      syncEnabled,
      syncIntervalMinutes,
    } = req.body;

    if (!name || !slug || !systemType) {
      res
        .status(400)
        .json({ error: "name, slug, and systemType are required" });
      return;
    }

    const existing = await db
      .select({ id: sourceSystemsTable.id })
      .from(sourceSystemsTable)
      .where(eq(sourceSystemsTable.slug, slug));

    if (existing.length > 0) {
      res
        .status(409)
        .json({ error: "A source system with this slug already exists" });
      return;
    }

    const [system] = await db
      .insert(sourceSystemsTable)
      .values({
        name,
        slug,
        systemType,
        connectionConfig: connectionConfig || null,
        syncEnabled: syncEnabled ?? false,
        syncIntervalMinutes: syncIntervalMinutes ?? 60,
      })
      .returning();

    await db.insert(auditEventsTable).values({
      eventType: "settings",
      action: "source_system_created",
      actorId: req.user!.principalId,
      resourceType: "source_system",
      resourceId: system.id,
      details: { name, systemType },
    });

    res.status(201).json(redactSystem(system));
  },
);

connectorsRouter.patch(
  "/source-systems/:id",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    const id = req.params.id as string;
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: "Invalid ID format" });
      return;
    }

    const updates: Record<string, unknown> = {};
    const allowed = [
      "name",
      "connectionConfig",
      "isActive",
      "syncEnabled",
      "syncIntervalMinutes",
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.connectionConfig) {
      const [existing] = await db
        .select({ connectionConfig: sourceSystemsTable.connectionConfig })
        .from(sourceSystemsTable)
        .where(eq(sourceSystemsTable.id, id));

      const existingConfig =
        (existing?.connectionConfig as Record<string, unknown>) ?? {};
      const incoming = updates.connectionConfig as Record<string, unknown>;
      const merged = { ...existingConfig };

      for (const [k, v] of Object.entries(incoming)) {
        if (v === "***REDACTED***") continue;
        merged[k] = v;
      }
      updates.connectionConfig = merged;
    }

    updates.updatedAt = new Date();

    const [system] = await db
      .update(sourceSystemsTable)
      .set(updates)
      .where(eq(sourceSystemsTable.id, id))
      .returning();

    if (!system) {
      res.status(404).json({ error: "Source system not found" });
      return;
    }

    await db.insert(auditEventsTable).values({
      eventType: "settings",
      action: "source_system_updated",
      actorId: req.user!.principalId,
      resourceType: "source_system",
      resourceId: id,
      details: { updatedFields: Object.keys(updates) },
    });

    res.json(redactSystem(system));
  },
);

connectorsRouter.delete(
  "/source-systems/:id",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    const id = req.params.id as string;
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: "Invalid ID format" });
      return;
    }

    const [refCount] = await db
      .select({ value: count() })
      .from(sourceReferencesTable)
      .where(eq(sourceReferencesTable.sourceSystemId, id));

    if ((refCount?.value ?? 0) > 0) {
      res
        .status(409)
        .json({ error: "Cannot delete system with active references" });
      return;
    }

    await db.delete(sourceSystemsTable).where(eq(sourceSystemsTable.id, id));

    await db.insert(auditEventsTable).values({
      eventType: "settings",
      action: "source_system_deleted",
      actorId: req.user!.principalId,
      resourceType: "source_system",
      resourceId: id,
    });

    res.status(204).send();
  },
);

function redactProviderConfig(
  config: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!config) return null;
  const redacted = { ...config };
  const sensitiveKeys = [
    "clientSecret",
    "client_secret",
    "secret",
    "password",
    "apiKey",
    "api_key",
    "token",
    "accessToken",
    "refreshToken",
  ];
  for (const key of sensitiveKeys) {
    if (key in redacted) {
      redacted[key] = "***REDACTED***";
    }
  }
  return redacted;
}

connectorsRouter.get(
  "/storage-providers",
  requireAuth,
  requirePermission("manage_settings"),
  async (_req, res) => {
    const providers = await db
      .select()
      .from(storageProvidersTable)
      .orderBy(desc(storageProvidersTable.createdAt));
    res.json(
      providers.map((p) => ({
        ...p,
        config: redactProviderConfig(
          p.config as Record<string, unknown> | null,
        ),
      })),
    );
  },
);

connectorsRouter.post(
  "/storage-providers",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    const { name, slug, providerType, config, isDefault } = req.body;

    if (!name || !slug || !providerType) {
      res
        .status(400)
        .json({ error: "name, slug, and providerType are required" });
      return;
    }

    if (isDefault) {
      await db
        .update(storageProvidersTable)
        .set({ isDefault: false })
        .where(eq(storageProvidersTable.isDefault, true));
    }

    const [provider] = await db
      .insert(storageProvidersTable)
      .values({
        name,
        slug,
        providerType,
        config: config || null,
        isDefault: isDefault ?? false,
      })
      .returning();

    await db.insert(auditEventsTable).values({
      eventType: "settings",
      action: "storage_provider_created",
      actorId: req.user!.principalId,
      resourceType: "storage_provider",
      resourceId: provider.id,
      details: { name, providerType },
    });

    res.status(201).json({
      ...provider,
      config: redactProviderConfig(
        provider.config as Record<string, unknown> | null,
      ),
    });
  },
);

connectorsRouter.patch(
  "/storage-providers/:id",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    const id = req.params.id as string;
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: "Invalid ID format" });
      return;
    }

    const updates: Record<string, unknown> = {};
    const allowed = ["name", "config", "isActive", "isDefault"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.config) {
      const [existing] = await db
        .select({ config: storageProvidersTable.config })
        .from(storageProvidersTable)
        .where(eq(storageProvidersTable.id, id));

      const existingConfig =
        (existing?.config as Record<string, unknown>) ?? {};
      const incoming = updates.config as Record<string, unknown>;
      const merged = { ...existingConfig };

      for (const [k, v] of Object.entries(incoming)) {
        if (v === "***REDACTED***") continue;
        merged[k] = v;
      }
      updates.config = merged;
    }

    if (req.body.isDefault === true) {
      await db
        .update(storageProvidersTable)
        .set({ isDefault: false })
        .where(eq(storageProvidersTable.isDefault, true));
    }

    updates.updatedAt = new Date();

    const [provider] = await db
      .update(storageProvidersTable)
      .set(updates)
      .where(eq(storageProvidersTable.id, id))
      .returning();

    if (!provider) {
      res.status(404).json({ error: "Storage provider not found" });
      return;
    }

    invalidateProviderCache(id);

    res.json({
      ...provider,
      config: redactProviderConfig(
        provider.config as Record<string, unknown> | null,
      ),
    });
  },
);

connectorsRouter.get(
  "/sharepoint/sites",
  requireAuth,
  requirePermission("edit_content"),
  async (req, res) => {
    const query = req.query.q as string | undefined;
    const accessToken = resolveGraphToken(req);
    const sites = await listSites(accessToken, query);
    res.json(sites);
  },
);

connectorsRouter.get(
  "/sharepoint/sites/:siteId/drives",
  requireAuth,
  requirePermission("read_page"),
  async (req, res) => {
    const siteId = req.params.siteId as string;
    const accessToken = resolveGraphToken(req);
    const drives = await listDrives(accessToken, siteId);
    res.json(drives);
  },
);

connectorsRouter.get(
  "/sharepoint/drives/:driveId/items",
  requireAuth,
  requirePermission("read_page"),
  async (req, res) => {
    const driveId = req.params.driveId as string;
    const folderId = req.query.folderId as string | undefined;
    const accessToken = resolveGraphToken(req);
    const items = await listDriveItems(accessToken, driveId, folderId);
    res.json(items);
  },
);

connectorsRouter.get(
  "/sharepoint/drives/:driveId/items/:itemId",
  requireAuth,
  requirePermission("read_page"),
  async (req, res) => {
    const driveId = req.params.driveId as string;
    const itemId = req.params.itemId as string;
    const accessToken = resolveGraphToken(req);
    const item = await getDriveItemMeta(accessToken, driveId, itemId);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  },
);

connectorsRouter.post(
  "/source-systems/:id/sync",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    const id = req.params.id as string;
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: "Invalid ID format" });
      return;
    }

    const [system] = await db
      .select()
      .from(sourceSystemsTable)
      .where(eq(sourceSystemsTable.id, id));

    if (!system) {
      res.status(404).json({ error: "Source system not found" });
      return;
    }

    let accessToken = "";
    if (system.systemType === "sharepoint") {
      const connConfig = system.connectionConfig as Record<
        string,
        string
      > | null;
      if (connConfig) {
        try {
          accessToken = await acquireSystemToken(connConfig);
        } catch {
          res.status(500).json({
            error:
              "Failed to acquire system token – check connector credentials",
          });
          return;
        }
      }
    }

    const refs = await db
      .select()
      .from(sourceReferencesTable)
      .where(eq(sourceReferencesTable.sourceSystemId, id));

    const now = new Date();
    let checkedCount = 0;
    let staleCount = 0;
    let errorCount = 0;

    for (const ref of refs) {
      try {
        if (system.systemType === "sharepoint" && ref.metadata) {
          const meta = ref.metadata as { driveId?: string };
          if (meta.driveId) {
            const itemMeta = await getDriveItemMeta(
              accessToken,
              meta.driveId,
              ref.externalId,
            );

            if (!itemMeta) {
              await db
                .update(sourceReferencesTable)
                .set({
                  syncStatus: "not_found",
                  lastCheckedAt: now,
                  syncError: "Item no longer found in source",
                })
                .where(eq(sourceReferencesTable.id, ref.id));
              errorCount++;
            } else {
              const externalModified = new Date(itemMeta.lastModifiedAt);
              const isStale =
                ref.externalModifiedAt &&
                externalModified > ref.externalModifiedAt;

              await db
                .update(sourceReferencesTable)
                .set({
                  syncStatus: isStale ? "stale" : "active",
                  lastCheckedAt: now,
                  externalModifiedAt: externalModified,
                  externalTitle: itemMeta.name,
                  externalMimeType: itemMeta.mimeType,
                  syncError: null,
                })
                .where(eq(sourceReferencesTable.id, ref.id));

              if (isStale) staleCount++;
            }
            checkedCount++;
          }
        } else {
          await db
            .update(sourceReferencesTable)
            .set({ lastCheckedAt: now })
            .where(eq(sourceReferencesTable.id, ref.id));
          checkedCount++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await db
          .update(sourceReferencesTable)
          .set({
            syncStatus: "error",
            lastCheckedAt: now,
            syncError: message,
          })
          .where(eq(sourceReferencesTable.id, ref.id));
        errorCount++;
        checkedCount++;
      }
    }

    await db
      .update(sourceSystemsTable)
      .set({
        lastSyncAt: now,
        lastSyncError: errorCount > 0 ? `${errorCount} errors` : null,
        updatedAt: now,
      })
      .where(eq(sourceSystemsTable.id, id));

    res.json({
      systemId: id,
      checkedCount,
      staleCount,
      errorCount,
      syncedAt: now.toISOString(),
    });
  },
);

connectorsRouter.get(
  "/sync/status",
  requireAuth,
  requirePermission("manage_settings"),
  async (_req, res) => {
    const systems = await db
      .select()
      .from(sourceSystemsTable)
      .where(eq(sourceSystemsTable.isActive, true));

    const statusList = await Promise.all(
      systems.map(async (s) => {
        const [total] = await db
          .select({ value: count() })
          .from(sourceReferencesTable)
          .where(eq(sourceReferencesTable.sourceSystemId, s.id));

        const [stale] = await db
          .select({ value: count() })
          .from(sourceReferencesTable)
          .where(
            and(
              eq(sourceReferencesTable.sourceSystemId, s.id),
              eq(sourceReferencesTable.syncStatus, "stale"),
            ),
          );

        const [errored] = await db
          .select({ value: count() })
          .from(sourceReferencesTable)
          .where(
            and(
              eq(sourceReferencesTable.sourceSystemId, s.id),
              eq(sourceReferencesTable.syncStatus, "error"),
            ),
          );

        const [notFound] = await db
          .select({ value: count() })
          .from(sourceReferencesTable)
          .where(
            and(
              eq(sourceReferencesTable.sourceSystemId, s.id),
              eq(sourceReferencesTable.syncStatus, "not_found"),
            ),
          );

        return {
          systemId: s.id,
          systemName: s.name,
          systemType: s.systemType,
          syncEnabled: s.syncEnabled,
          syncIntervalMinutes: s.syncIntervalMinutes,
          lastSyncAt: s.lastSyncAt,
          lastSyncError: s.lastSyncError,
          totalReferences: total?.value ?? 0,
          staleReferences: stale?.value ?? 0,
          errorReferences: errored?.value ?? 0,
          notFoundReferences: notFound?.value ?? 0,
        };
      }),
    );

    res.json(statusList);
  },
);
