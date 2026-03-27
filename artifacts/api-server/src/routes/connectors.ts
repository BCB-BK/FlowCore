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
  requirePermission("manage_connectors"),
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
        purpose: sourceSystemsTable.purpose,
        accessMode: sourceSystemsTable.accessMode,
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
  requirePermission("manage_connectors"),
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
  requirePermission("manage_connectors"),
  async (req, res) => {
    const {
      name,
      slug,
      systemType,
      purpose,
      accessMode,
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

    const validPurposes = ["knowledge_source", "media_archive", "backup_target"];
    if (purpose && !validPurposes.includes(purpose)) {
      res.status(400).json({ error: `Invalid purpose. Must be one of: ${validPurposes.join(", ")}` });
      return;
    }

    const validAccessModes = ["read_only", "read_write"];
    if (accessMode && !validAccessModes.includes(accessMode)) {
      res.status(400).json({ error: `Invalid accessMode. Must be one of: ${validAccessModes.join(", ")}` });
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

    const system = await db.transaction(async (tx) => {
      const [s] = await tx
        .insert(sourceSystemsTable)
        .values({
          name,
          slug,
          systemType,
          purpose: purpose || "knowledge_source",
          accessMode: accessMode || "read_only",
          connectionConfig: connectionConfig || null,
          syncEnabled: syncEnabled ?? false,
          syncIntervalMinutes: syncIntervalMinutes ?? 60,
        })
        .returning();

      await tx.insert(auditEventsTable).values({
        eventType: "connector",
        action: "source_system_created",
        actorId: req.user!.principalId,
        resourceType: "source_system",
        resourceId: s.id,
        details: { name, systemType },
      });

      return s;
    });

    res.status(201).json(redactSystem(system));
  },
);

connectorsRouter.patch(
  "/source-systems/:id",
  requireAuth,
  requirePermission("manage_connectors"),
  async (req, res) => {
    const id = req.params.id as string;
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: "Invalid ID format" });
      return;
    }

    const updates: Record<string, unknown> = {};
    const allowed = [
      "name",
      "purpose",
      "accessMode",
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

    const validPurposes = ["knowledge_source", "media_archive", "backup_target"];
    if (updates.purpose && !validPurposes.includes(updates.purpose as string)) {
      res.status(400).json({ error: `Invalid purpose. Must be one of: ${validPurposes.join(", ")}` });
      return;
    }

    const validAccessModes = ["read_only", "read_write"];
    if (updates.accessMode && !validAccessModes.includes(updates.accessMode as string)) {
      res.status(400).json({ error: `Invalid accessMode. Must be one of: ${validAccessModes.join(", ")}` });
      return;
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

    const system = await db.transaction(async (tx) => {
      const [s] = await tx
        .update(sourceSystemsTable)
        .set(updates)
        .where(eq(sourceSystemsTable.id, id))
        .returning();

      if (!s) return null;

      await tx.insert(auditEventsTable).values({
        eventType: "connector",
        action: "source_system_updated",
        actorId: req.user!.principalId,
        resourceType: "source_system",
        resourceId: id,
        details: { updatedFields: Object.keys(updates) },
      });

      return s;
    });

    if (!system) {
      res.status(404).json({ error: "Source system not found" });
      return;
    }

    res.json(redactSystem(system));
  },
);

connectorsRouter.delete(
  "/source-systems/:id",
  requireAuth,
  requirePermission("manage_connectors"),
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

    await db.transaction(async (tx) => {
      await tx.delete(sourceSystemsTable).where(eq(sourceSystemsTable.id, id));

      await tx.insert(auditEventsTable).values({
        eventType: "connector",
        action: "source_system_deleted",
        actorId: req.user!.principalId,
        resourceType: "source_system",
        resourceId: id,
      });
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
  requirePermission("manage_connectors"),
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
  requirePermission("manage_connectors"),
  async (req, res) => {
    const { name, slug, providerType, purpose, accessMode, config, isDefault } = req.body;

    if (!name || !slug || !providerType) {
      res
        .status(400)
        .json({ error: "name, slug, and providerType are required" });
      return;
    }

    const validPurposes = ["knowledge_source", "media_archive", "backup_target"];
    if (purpose && !validPurposes.includes(purpose)) {
      res.status(400).json({ error: `Invalid purpose. Must be one of: ${validPurposes.join(", ")}` });
      return;
    }

    const validAccessModes = ["read_only", "read_write"];
    if (accessMode && !validAccessModes.includes(accessMode)) {
      res.status(400).json({ error: `Invalid accessMode. Must be one of: ${validAccessModes.join(", ")}` });
      return;
    }

    const provider = await db.transaction(async (tx) => {
      if (isDefault) {
        await tx
          .update(storageProvidersTable)
          .set({ isDefault: false })
          .where(eq(storageProvidersTable.isDefault, true));
      }

      const [p] = await tx
        .insert(storageProvidersTable)
        .values({
          name,
          slug,
          providerType,
          purpose: purpose || "media_archive",
          accessMode: accessMode || "read_write",
          config: config || null,
          isDefault: isDefault ?? false,
        })
        .returning();

      await tx.insert(auditEventsTable).values({
        eventType: "connector",
        action: "storage_provider_created",
        actorId: req.user!.principalId,
        resourceType: "storage_provider",
        resourceId: p.id,
        details: { name, providerType },
      });

      return p;
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
  requirePermission("manage_connectors"),
  async (req, res) => {
    const id = req.params.id as string;
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: "Invalid ID format" });
      return;
    }

    const updates: Record<string, unknown> = {};
    const allowed = ["name", "purpose", "accessMode", "config", "isActive", "isDefault"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const validPurposes = ["knowledge_source", "media_archive", "backup_target"];
    if (updates.purpose && !validPurposes.includes(updates.purpose as string)) {
      res.status(400).json({ error: `Invalid purpose. Must be one of: ${validPurposes.join(", ")}` });
      return;
    }

    const validAccessModes = ["read_only", "read_write"];
    if (updates.accessMode && !validAccessModes.includes(updates.accessMode as string)) {
      res.status(400).json({ error: `Invalid accessMode. Must be one of: ${validAccessModes.join(", ")}` });
      return;
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

connectorsRouter.post(
  "/source-systems/:id/validate",
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

    const checks: Array<{ check: string; status: "ok" | "warning" | "error"; message: string }> = [];

    const connConfig = system.connectionConfig as Record<string, string> | null;

    if (!connConfig) {
      checks.push({ check: "connection_config", status: "error", message: "Keine Verbindungskonfiguration hinterlegt" });
      res.json({ valid: false, checks });
      return;
    }

    if (system.systemType === "sharepoint") {
      if (!connConfig.siteId) {
        checks.push({ check: "site_id", status: "error", message: "Keine SharePoint-Site konfiguriert" });
      } else {
        checks.push({ check: "site_id", status: "ok", message: `Site konfiguriert: ${connConfig.siteName || connConfig.siteId}` });
      }

      if (!connConfig.driveId) {
        checks.push({ check: "drive_id", status: "error", message: "Keine Dokumentbibliothek (Drive) konfiguriert" });
      } else {
        checks.push({ check: "drive_id", status: "ok", message: `Bibliothek konfiguriert: ${connConfig.driveName || connConfig.driveId}` });
      }

      let accessToken = "";
      try {
        accessToken = await acquireSystemToken(connConfig);
        checks.push({ check: "token", status: "ok", message: "Token erfolgreich bezogen" });
      } catch (err) {
        const internalMsg = err instanceof Error ? err.message : "Unbekannter Fehler";
        console.error(`[validate] Token acquisition failed for system ${system.id}:`, internalMsg);
        checks.push({ check: "token", status: "error", message: "Token konnte nicht bezogen werden – prüfen Sie die Verbindungskonfiguration." });
        res.json({ valid: false, checks });
        return;
      }

      if (connConfig.driveId && accessToken) {
        try {
          const drives = await listDrives(accessToken, connConfig.siteId);
          const driveExists = drives.some((d) => d.id === connConfig.driveId);
          if (driveExists) {
            checks.push({ check: "drive_access", status: "ok", message: "Zugriff auf Bibliothek erfolgreich" });
          } else {
            checks.push({ check: "drive_access", status: "error", message: "Bibliothek nicht gefunden oder kein Zugriff – wurde sie verschoben oder gelöscht?" });
          }
        } catch {
          checks.push({ check: "drive_access", status: "error", message: "Zugriff auf Bibliothek fehlgeschlagen – Berechtigungen prüfen" });
        }
      }

      if (connConfig.folderId && accessToken && connConfig.driveId) {
        try {
          const folderMeta = await getDriveItemMeta(accessToken, connConfig.driveId, connConfig.folderId);
          if (folderMeta) {
            checks.push({ check: "folder_access", status: "ok", message: `Zielordner erreichbar: ${folderMeta.name}` });
          } else {
            checks.push({ check: "folder_access", status: "error", message: "Zielordner nicht gefunden – wurde er verschoben oder gelöscht?" });
          }
        } catch {
          checks.push({ check: "folder_access", status: "error", message: "Zugriff auf Zielordner fehlgeschlagen" });
        }
      }

      if (system.accessMode === "read_write" || system.purpose === "backup_target") {
        checks.push({ check: "write_permission", status: "warning", message: "Schreibberechtigung kann erst beim ersten Schreibvorgang verifiziert werden" });
      }
    } else {
      checks.push({ check: "system_type", status: "ok", message: `Systemtyp: ${system.systemType}` });
    }

    const valid = checks.every((c) => c.status !== "error");
    res.json({ valid, checks });
  },
);

connectorsRouter.get(
  "/sharepoint/sites",
  requireAuth,
  requirePermission("manage_connectors"),
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
  requirePermission("manage_connectors"),
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
  requirePermission("manage_connectors"),
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
  requirePermission("manage_connectors"),
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
  requirePermission("manage_connectors"),
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
  requirePermission("manage_connectors"),
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
          purpose: s.purpose,
          accessMode: s.accessMode,
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
