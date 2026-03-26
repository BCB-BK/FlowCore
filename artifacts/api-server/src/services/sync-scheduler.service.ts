import { db } from "@workspace/db";
import {
  sourceSystemsTable,
  sourceReferencesTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getDriveItemMeta, acquireSystemToken } from "./sharepoint.service";
import { logger } from "../lib/logger";

const POLL_INTERVAL_MS = 60_000;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;

async function syncSourceSystem(system: {
  id: string;
  systemType: string;
  connectionConfig: unknown;
}): Promise<{ checked: number; stale: number; errors: number }> {
  let accessToken = "";
  if (system.systemType === "sharepoint") {
    try {
      accessToken = await acquireSystemToken(system.connectionConfig);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Token acquisition failed";
      logger.error(
        { systemId: system.id, err },
        "Failed to acquire system token for sync",
      );
      const now = new Date();
      await db
        .update(sourceReferencesTable)
        .set({
          syncStatus: "error",
          lastCheckedAt: now,
          syncError: msg,
        })
        .where(eq(sourceReferencesTable.sourceSystemId, system.id));
      const refs = await db
        .select({ id: sourceReferencesTable.id })
        .from(sourceReferencesTable)
        .where(eq(sourceReferencesTable.sourceSystemId, system.id));
      return { checked: refs.length, stale: 0, errors: refs.length };
    }
  }

  const refs = await db
    .select()
    .from(sourceReferencesTable)
    .where(eq(sourceReferencesTable.sourceSystemId, system.id));

  const now = new Date();
  let checked = 0;
  let stale = 0;
  let errors = 0;

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
            errors++;
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

            if (isStale) stale++;
          }
          checked++;
        }
      } else {
        await db
          .update(sourceReferencesTable)
          .set({ lastCheckedAt: now })
          .where(eq(sourceReferencesTable.id, ref.id));
        checked++;
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
      errors++;
      checked++;
    }
  }

  return { checked, stale, errors };
}

async function runScheduledSync(): Promise<void> {
  try {
    const now = new Date();
    const systems = await db
      .select()
      .from(sourceSystemsTable)
      .where(
        and(
          eq(sourceSystemsTable.isActive, true),
          eq(sourceSystemsTable.syncEnabled, true),
        ),
      );

    for (const system of systems) {
      const intervalMs = (system.syncIntervalMinutes ?? 60) * 60_000;
      const lastSync = system.lastSyncAt;

      if (lastSync && now.getTime() - lastSync.getTime() < intervalMs) {
        continue;
      }

      logger.info(
        { systemId: system.id, systemName: system.name },
        "Running scheduled sync",
      );

      const result = await syncSourceSystem(system);

      await db
        .update(sourceSystemsTable)
        .set({
          lastSyncAt: now,
          lastSyncError: result.errors > 0 ? `${result.errors} errors` : null,
          updatedAt: now,
        })
        .where(eq(sourceSystemsTable.id, system.id));

      logger.info(
        {
          systemId: system.id,
          checked: result.checked,
          stale: result.stale,
          errors: result.errors,
        },
        "Scheduled sync completed",
      );
    }
  } catch (err) {
    logger.error({ err }, "Sync scheduler error");
  }
}

export function startSyncScheduler(): void {
  if (schedulerTimer) return;

  logger.info({ pollIntervalMs: POLL_INTERVAL_MS }, "Starting sync scheduler");

  schedulerTimer = setInterval(() => {
    runScheduledSync().catch((err) => {
      logger.error({ err }, "Sync scheduler unhandled error");
    });
  }, POLL_INTERVAL_MS);

  runScheduledSync().catch((err) => {
    logger.error({ err }, "Initial sync run error");
  });
}

export function stopSyncScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    logger.info("Sync scheduler stopped");
  }
}
