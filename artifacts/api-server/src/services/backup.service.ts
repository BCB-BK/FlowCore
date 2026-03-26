import type { PoolClient } from "pg";
import { db, pool } from "@workspace/db";
import {
  backupConfigsTable,
  backupRunsTable,
  sourceSystemsTable,
  storageProvidersTable,
  contentTemplatesTable,
} from "@workspace/db/schema";
import { eq, desc, and, lt, asc, sql } from "drizzle-orm";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { logger } from "../lib/logger";
import { auditService } from "../lib/audit";
import { acquireSystemToken } from "./sharepoint.service";
import { Client } from "@microsoft/microsoft-graph-client";

const execFileAsync = promisify(execFile);

const VALID_INTERVALS = ["daily", "weekly", "monthly"] as const;

let lockClient: PoolClient | null = null;

async function acquireBackupLock(): Promise<boolean> {
  if (lockClient) return false;
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    const result = await client.query("SELECT pg_try_advisory_lock(42424242) as acquired");
    if ((result.rows[0] as Record<string, boolean>)?.acquired === true) {
      lockClient = client;
      return true;
    }
    client.release();
    return false;
  } catch {
    if (client) try { client.release(); } catch { /* ignore */ }
    return false;
  }
}

async function releaseBackupLock(): Promise<void> {
  if (!lockClient) return;
  try {
    await lockClient.query("SELECT pg_advisory_unlock(42424242)");
    lockClient.release();
  } catch {
    try { lockClient.release(); } catch { /* ignore */ }
    logger.warn("Failed to release backup advisory lock");
  } finally {
    lockClient = null;
  }
}

export async function validateBackupConfigInput(
  data: Record<string, unknown>,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (data.enabled !== undefined && typeof data.enabled !== "boolean") {
    errors.push("enabled muss ein Boolean sein");
  }

  if (data.interval !== undefined) {
    if (!VALID_INTERVALS.includes(data.interval as typeof VALID_INTERVALS[number])) {
      errors.push("interval muss 'daily', 'weekly' oder 'monthly' sein");
    }
  }

  for (const field of ["retainDaily", "retainWeekly", "retainMonthly"] as const) {
    if (data[field] !== undefined) {
      const val = Number(data[field]);
      if (!Number.isInteger(val) || val < 1 || val > 365) {
        errors.push(`${field} muss eine Ganzzahl zwischen 1 und 365 sein`);
      }
    }
  }

  if (data.enabled === true) {
    if ("targetDriveId" in data) {
      if (!data.targetDriveId) {
        errors.push(
          "targetDriveId darf nicht leer sein wenn Backup aktiviert wird",
        );
      }
    } else {
      const existing = await getBackupConfig();
      if (!existing?.targetDriveId) {
        errors.push(
          "targetDriveId ist erforderlich wenn Backup aktiviert wird",
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

export async function getBackupConfig() {
  const [config] = await db.select().from(backupConfigsTable).limit(1);
  return config ?? null;
}

export async function upsertBackupConfig(data: Record<string, unknown>) {
  const existing = await getBackupConfig();

  const values = {
    enabled: data.enabled as boolean | undefined,
    interval: data.interval as string | undefined,
    targetDriveId: data.targetDriveId as string | undefined,
    targetSiteId: data.targetSiteId as string | undefined,
    targetSiteName: data.targetSiteName as string | undefined,
    targetDriveName: data.targetDriveName as string | undefined,
    targetFolderId: data.targetFolderId as string | undefined,
    targetFolderName: data.targetFolderName as string | undefined,
    targetFolderPath: data.targetFolderPath as string | undefined,
    retainDaily: data.retainDaily as number | undefined,
    retainWeekly: data.retainWeekly as number | undefined,
    retainMonthly: data.retainMonthly as number | undefined,
    includeTemplates: data.includeTemplates as boolean | undefined,
    includeConnectors: data.includeConnectors as boolean | undefined,
  };

  if (existing) {
    const [updated] = await db
      .update(backupConfigsTable)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(backupConfigsTable.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(backupConfigsTable)
    .values(values as typeof backupConfigsTable.$inferInsert)
    .returning();
  return created;
}

export async function listBackupRuns(limit = 50) {
  return db
    .select()
    .from(backupRunsTable)
    .orderBy(desc(backupRunsTable.createdAt))
    .limit(limit);
}

export async function getBackupRun(id: string) {
  const [run] = await db
    .select()
    .from(backupRunsTable)
    .where(eq(backupRunsTable.id, id));
  return run ?? null;
}

export async function validateBackupTarget(
  driveId: string,
  folderId?: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const config = await getBackupConfig();
    const connConfig = await getConnectorConfig();
    const token = await acquireSystemToken(connConfig);
    if (!token) {
      return { valid: false, error: "Kein SharePoint-Token verfügbar" };
    }

    const client = getGraphClient(token);
    const apiPath = folderId
      ? `/drives/${driveId}/items/${folderId}`
      : `/drives/${driveId}/root`;
    await client.api(apiPath).select("id,name").get();
    return { valid: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
    return { valid: false, error: msg };
  }
}

async function getConnectorConfig(): Promise<Record<string, string> | null> {
  const [system] = await db
    .select()
    .from(sourceSystemsTable)
    .where(eq(sourceSystemsTable.systemType, "sharepoint"))
    .limit(1);
  return (system?.connectionConfig as Record<string, string>) ?? null;
}

export async function runBackup(
  triggeredBy: string,
  backupType: "manual" | "daily" | "weekly" | "monthly" = "manual",
): Promise<string> {
  const config = await getBackupConfig();
  if (!config?.targetDriveId) {
    throw new Error("Kein SharePoint-Zielordner konfiguriert");
  }

  const connConfig = await getConnectorConfig();
  const token = await acquireSystemToken(connConfig);
  if (!token) {
    throw new Error("Kein SharePoint-Token verfügbar. Bitte prüfen Sie die Konnektoren-Konfiguration.");
  }

  const targetCheck = await validateBackupTarget(config.targetDriveId, config.targetFolderId ?? undefined);
  if (!targetCheck.valid) {
    throw new Error(`SharePoint-Zielordner nicht erreichbar: ${targetCheck.error}`);
  }

  const locked = await acquireBackupLock();
  if (!locked) {
    throw new Error("Ein Backup läuft bereits");
  }

  let run: { id: string };
  try {
    const [inserted] = await db
      .insert(backupRunsTable)
      .values({
        configId: config.id,
        backupType,
        status: "pending",
        triggeredBy,
        startedAt: new Date(),
      })
      .returning();
    run = inserted;

    executeBackup(run.id, config, triggeredBy, backupType).catch((err) => {
      logger.error({ err, runId: run.id }, "Background backup failed");
    });
  } catch (err) {
    await releaseBackupLock();
    throw err;
  }

  return run.id;
}

async function executeBackup(
  runId: string,
  config: typeof backupConfigsTable.$inferSelect | null,
  triggeredBy: string,
  backupType: string,
) {
  const startTime = Date.now();
  const logLines: string[] = [];
  const addLog = (msg: string) => {
    const ts = new Date().toISOString();
    logLines.push(`[${ts}] ${msg}`);
    logger.info({ runId }, msg);
  };

  try {
    await db
      .update(backupRunsTable)
      .set({ status: "running" })
      .where(eq(backupRunsTable.id, runId));

    addLog("Backup gestartet");

    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "backup-"),
    );
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const dumpFile = path.join(tmpDir, `db-${timestamp}.dump`);

    addLog("PostgreSQL-Dump wird erstellt...");
    const databaseUrl = process.env["DATABASE_URL"] || "";
    let backupFormat = "pg_dump_custom";
    try {
      await execFileAsync("pg_dump", ["-Fc", "--no-owner", "--no-privileges", "-f", dumpFile, databaseUrl]);
    } catch (pgErr) {
      backupFormat = "json_export";
      addLog("pg_dump nicht verfügbar, verwende SQL-Export als Fallback...");
      const sqlResult = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' ORDER BY table_name
      `);
      const tables = sqlResult.rows.map((r: Record<string, string>) => r.table_name);
      const sqlDump: string[] = [];
      for (const table of tables) {
        try {
          const rows = await pool.query(`SELECT * FROM "${table}"`);
          sqlDump.push(`-- Table: ${table} (${rows.rows.length} rows)`);
          if (rows.rows.length > 0) {
            sqlDump.push(JSON.stringify(rows.rows));
          }
        } catch {
          sqlDump.push(`-- Table: ${table} (export failed)`);
        }
      }
      await fs.promises.writeFile(
        dumpFile.replace(".dump", ".json"),
        sqlDump.join("\n"),
        "utf-8",
      );
    }
    addLog("Datenbank-Export abgeschlossen");

    const manifest: Record<string, unknown> = {
      version: "1.0",
      createdAt: new Date().toISOString(),
      backupType,
      triggeredBy,
      database: { format: backupFormat },
      components: ["database"],
    };

    if (config?.includeTemplates) {
      const templates = await db.select().from(contentTemplatesTable);
      const templatesFile = path.join(tmpDir, "templates.json");
      await fs.promises.writeFile(
        templatesFile,
        JSON.stringify(templates, null, 2),
        "utf-8",
      );
      manifest.templates = { count: templates.length };
      manifest.components = [
        ...(manifest.components as string[]),
        "templates",
      ];
      addLog(`${templates.length} Template-Definitionen exportiert`);
    }

    if (config?.includeConnectors) {
      const systems = await db
        .select({
          name: sourceSystemsTable.name,
          slug: sourceSystemsTable.slug,
          systemType: sourceSystemsTable.systemType,
          syncEnabled: sourceSystemsTable.syncEnabled,
        })
        .from(sourceSystemsTable);
      const providers = await db
        .select({
          name: storageProvidersTable.name,
          slug: storageProvidersTable.slug,
          providerType: storageProvidersTable.providerType,
          isDefault: storageProvidersTable.isDefault,
        })
        .from(storageProvidersTable);

      const connectorData = { sourceSystems: systems, storageProviders: providers };
      const connectorsFile = path.join(tmpDir, "connectors.json");
      await fs.promises.writeFile(
        connectorsFile,
        JSON.stringify(connectorData, null, 2),
        "utf-8",
      );
      manifest.connectors = { sourceSystemCount: systems.length, storageProviderCount: providers.length };
      manifest.components = [
        ...(manifest.components as string[]),
        "connectors",
      ];
      addLog(`${systems.length} Quellsysteme und ${providers.length} Speicheranbieter exportiert (ohne Secrets)`);
    }

    const backupConfig = await getBackupConfig();
    const systemConfigData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      backupConfig: backupConfig ? {
        enabled: backupConfig.enabled,
        interval: backupConfig.interval,
        retainDaily: backupConfig.retainDaily,
        retainWeekly: backupConfig.retainWeekly,
        retainMonthly: backupConfig.retainMonthly,
        includeTemplates: backupConfig.includeTemplates,
        includeConnectors: backupConfig.includeConnectors,
      } : null,
    };
    const sysConfigFile = path.join(tmpDir, "system-config.json");
    await fs.promises.writeFile(sysConfigFile, JSON.stringify(systemConfigData, null, 2), "utf-8");
    manifest.systemConfig = { included: true };
    manifest.components = [...(manifest.components as string[]), "system-config"];
    addLog("System-Konfiguration exportiert");

    const manifestFile = path.join(tmpDir, "manifest.json");
    await fs.promises.writeFile(
      manifestFile,
      JSON.stringify(manifest, null, 2),
      "utf-8",
    );

    const dumpExists = await fs.promises
      .access(dumpFile)
      .then(() => true)
      .catch(() => false);
    const jsonDumpFile = dumpFile.replace(".dump", ".json");
    const jsonExists = await fs.promises
      .access(jsonDumpFile)
      .then(() => true)
      .catch(() => false);
    const actualDumpFile = dumpExists ? dumpFile : jsonExists ? jsonDumpFile : null;

    let totalSize = 0;
    if (actualDumpFile) {
      const stat = await fs.promises.stat(actualDumpFile);
      totalSize += stat.size;
    }
    const manifestStat = await fs.promises.stat(manifestFile);
    totalSize += manifestStat.size;

    let driveItemId: string | undefined;
    let driveId: string | undefined;
    const sidecarItemIds: string[] = [];
    const backupFileName = `flowcore-backup-${timestamp}.dump`;

    if (config?.targetDriveId) {
      addLog("Upload nach SharePoint wird gestartet...");
      const connConfig = await getConnectorConfig();
      const token = await acquireSystemToken(connConfig);
      if (!token) throw new Error("Kein SharePoint-Token verfügbar");

      const client = getGraphClient(token);
      driveId = config.targetDriveId;
      const folderPath = config.targetFolderPath || "";

      const uploadFile = async (localPath: string, remoteName: string) => {
        const uploadPath = folderPath && folderPath !== "/"
          ? `${folderPath}/${remoteName}`
          : remoteName;
        const apiPath = `/drives/${driveId}/root:/${uploadPath}:/content`;
        const buf = await fs.promises.readFile(localPath);
        return client.api(apiPath).putStream(buf);
      };

      if (actualDumpFile) {
        const result = await uploadFile(actualDumpFile, backupFileName);
        driveItemId = result.id;
        addLog(`Datenbank-Backup hochgeladen: ${backupFileName}`);
      }

      const manifestResult = await uploadFile(manifestFile, `manifest-${timestamp}.json`);
      if (manifestResult.id) sidecarItemIds.push(manifestResult.id);
      addLog("Manifest hochgeladen");

      const sidecarFiles = [
        { local: path.join(tmpDir, "templates.json"), remote: `templates-${timestamp}.json`, label: "Template-Export" },
        { local: path.join(tmpDir, "connectors.json"), remote: `connectors-${timestamp}.json`, label: "Konnektoren-Export" },
        { local: path.join(tmpDir, "system-config.json"), remote: `system-config-${timestamp}.json`, label: "System-Konfiguration" },
      ];
      for (const sf of sidecarFiles) {
        const exists = await fs.promises.access(sf.local).then(() => true).catch(() => false);
        if (exists) {
          const r = await uploadFile(sf.local, sf.remote);
          if (r.id) sidecarItemIds.push(r.id);
          addLog(`${sf.label} hochgeladen`);
        }
      }
    } else {
      throw new Error("Kein SharePoint-Zielordner konfiguriert");
    }

    const durationMs = Date.now() - startTime;
    addLog(`Backup abgeschlossen in ${durationMs}ms, Größe: ${totalSize} Bytes`);

    await db
      .update(backupRunsTable)
      .set({
        status: "completed",
        completedAt: new Date(),
        sizeBytes: totalSize,
        durationMs,
        fileName: backupFileName,
        driveItemId,
        driveId,
        sidecarItemIds: sidecarItemIds.length > 0 ? sidecarItemIds : null,
        manifest,
        log: logLines.join("\n"),
      })
      .where(eq(backupRunsTable.id, runId));

    if (config) {
      await db
        .update(backupConfigsTable)
        .set({ lastRunAt: new Date(), updatedAt: new Date() })
        .where(eq(backupConfigsTable.id, config.id));
    }

    await auditService.log({
      eventType: "backup",
      action: "backup_completed",
      actorId: triggeredBy,
      resourceType: "backup_run",
      resourceId: runId,
      details: { backupType, sizeBytes: totalSize, durationMs, fileName: backupFileName },
    });

    await fs.promises.rm(tmpDir, { recursive: true, force: true });

    if (config) {
      await applyRetention(config);
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unbekannter Fehler";
    addLog(`Backup fehlgeschlagen: ${errorMessage}`);

    await db
      .update(backupRunsTable)
      .set({
        status: "failed",
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        errorMessage,
        log: logLines.join("\n"),
      })
      .where(eq(backupRunsTable.id, runId));

    await auditService.log({
      eventType: "backup",
      action: "backup_failed",
      actorId: triggeredBy,
      resourceType: "backup_run",
      resourceId: runId,
      details: { error: errorMessage },
    });
  } finally {
    await releaseBackupLock();
  }
}

async function applyRetention(
  config: typeof backupConfigsTable.$inferSelect,
) {
  try {
    const runs = await db
      .select()
      .from(backupRunsTable)
      .where(eq(backupRunsTable.status, "completed"))
      .orderBy(asc(backupRunsTable.createdAt));

    const daily = runs.filter((r) => r.backupType === "daily");
    const weekly = runs.filter((r) => r.backupType === "weekly");
    const monthly = runs.filter((r) => r.backupType === "monthly");
    const manual = runs.filter((r) => r.backupType === "manual");

    const MANUAL_RETAIN_LIMIT = 30;
    const toDelete: string[] = [];

    if (daily.length > config.retainDaily) {
      const excess = daily.slice(0, daily.length - config.retainDaily);
      toDelete.push(...excess.map((r) => r.id));
    }
    if (weekly.length > config.retainWeekly) {
      const excess = weekly.slice(0, weekly.length - config.retainWeekly);
      toDelete.push(...excess.map((r) => r.id));
    }
    if (monthly.length > config.retainMonthly) {
      const excess = monthly.slice(0, monthly.length - config.retainMonthly);
      toDelete.push(...excess.map((r) => r.id));
    }
    if (manual.length > MANUAL_RETAIN_LIMIT) {
      const excess = manual.slice(0, manual.length - MANUAL_RETAIN_LIMIT);
      toDelete.push(...excess.map((r) => r.id));
    }

    for (const id of toDelete) {
      const run = runs.find((r) => r.id === id);
      if (run?.driveId) {
        try {
          const connConfig = await getConnectorConfig();
          const token = await acquireSystemToken(connConfig);
          if (token) {
            const client = getGraphClient(token);
            const itemsToDelete: string[] = [];
            if (run.driveItemId) itemsToDelete.push(run.driveItemId);
            const sidecars = run.sidecarItemIds as string[] | null;
            if (sidecars?.length) itemsToDelete.push(...sidecars);
            for (const itemId of itemsToDelete) {
              try {
                await client.api(`/drives/${run.driveId}/items/${itemId}`).delete();
              } catch {
                logger.warn({ runId: id, itemId }, "Failed to delete backup artifact from SharePoint");
              }
            }
          }
        } catch {
          logger.warn({ runId: id }, "Failed to delete backup files from SharePoint");
        }
      }
      await db.delete(backupRunsTable).where(eq(backupRunsTable.id, id));
    }

    if (toDelete.length > 0) {
      logger.info(
        { deleted: toDelete.length },
        "Retention applied, old backups removed",
      );
    }
  } catch (err) {
    logger.error({ err }, "Failed to apply retention rules");
  }
}

export async function restoreBackup(
  runId: string,
  triggeredBy: string,
): Promise<{ success: boolean; error?: string }> {
  const run = await getBackupRun(runId);
  if (!run) {
    return { success: false, error: "Backup-Run nicht gefunden" };
  }
  if (run.status !== "completed") {
    return { success: false, error: "Nur abgeschlossene Backups können wiederhergestellt werden" };
  }

  const manifest = run.manifest as Record<string, unknown> | null;
  const dbFormat = (manifest?.database as Record<string, string>)?.format;
  if (dbFormat === "json_export") {
    return {
      success: false,
      error: "Dieses Backup wurde im JSON-Fallback-Format erstellt und kann nicht automatisch wiederhergestellt werden. Bitte verwenden Sie ein pg_dump-Backup.",
    };
  }

  await auditService.log({
    eventType: "backup",
    action: "restore_started",
    actorId: triggeredBy,
    resourceType: "backup_run",
    resourceId: runId,
    details: { fileName: run.fileName },
  });

  try {
    if (!run.driveItemId || !run.driveId) {
      return { success: false, error: "Keine SharePoint-Datei für diesen Backup-Run vorhanden" };
    }

    const connConfig = await getConnectorConfig();
    const token = await acquireSystemToken(connConfig);
    if (!token) {
      return { success: false, error: "Kein SharePoint-Token verfügbar" };
    }

    const client = getGraphClient(token);
    const stream = await client
      .api(`/drives/${run.driveId}/items/${run.driveItemId}/content`)
      .getStream();

    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "restore-"),
    );
    const restoreFile = path.join(tmpDir, run.fileName || "restore.dump");

    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    await fs.promises.writeFile(restoreFile, Buffer.concat(chunks));

    const databaseUrl = process.env["DATABASE_URL"] || "";
    try {
      await execFileAsync("pg_restore", [
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "-d",
        databaseUrl,
        restoreFile,
      ]);
    } catch {
      return {
        success: false,
        error: "pg_restore fehlgeschlagen. Bitte prüfen Sie das Backup-Format.",
      };
    }

    await fs.promises.rm(tmpDir, { recursive: true, force: true });

    await auditService.log({
      eventType: "backup",
      action: "restore_completed",
      actorId: triggeredBy,
      resourceType: "backup_run",
      resourceId: runId,
      details: { fileName: run.fileName },
    });

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
    await auditService.log({
      eventType: "backup",
      action: "restore_failed",
      actorId: triggeredBy,
      resourceType: "backup_run",
      resourceId: runId,
      details: { error: msg },
    });
    return { success: false, error: msg };
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startBackupScheduler() {
  if (schedulerInterval) return;

  schedulerInterval = setInterval(async () => {
    try {
      const config = await getBackupConfig();
      if (!config?.enabled) return;
      if (!config.targetDriveId) {
        logger.warn("Scheduled backup skipped: no SharePoint target configured");
        return;
      }

      const now = new Date();
      if (config.nextRunAt && now < config.nextRunAt) return;

      const backupType = config.interval as "daily" | "weekly" | "monthly";
      logger.info({ backupType }, "Scheduled backup starting");

      await runBackup("system-scheduler", backupType);

      const nextRun = calculateNextRun(config.interval);
      await db
        .update(backupConfigsTable)
        .set({ nextRunAt: nextRun, updatedAt: new Date() })
        .where(eq(backupConfigsTable.id, config.id));
    } catch (err) {
      logger.error({ err }, "Scheduled backup check failed");
    }
  }, 60 * 1000);

  logger.info("Backup scheduler started");
}

export function stopBackupScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

function calculateNextRun(interval: string): Date {
  const now = new Date();
  switch (interval) {
    case "daily":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "weekly":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "monthly":
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}
