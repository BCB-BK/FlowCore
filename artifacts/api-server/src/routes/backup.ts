import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import {
  upsertBackupConfig,
  listBackupRuns,
  getBackupRun,
  runBackup,
  restoreBackup,
  validateBackupTarget,
  validateBackupConfigInput,
  getBackupConfig,
} from "../services/backup.service";
import { auditService } from "../lib/audit";

export const backupRouter: IRouter = Router();

backupRouter.get(
  "/config",
  requireAuth,
  requirePermission("view_backups"),
  async (_req, res) => {
    try {
      const config = await getBackupConfig();
      res.json(config || { enabled: false });
    } catch (err) {
      res.status(500).json({ error: "Fehler beim Laden der Backup-Konfiguration" });
    }
  },
);

backupRouter.put(
  "/config",
  requireAuth,
  requirePermission("manage_backups"),
  async (req, res) => {
    try {
      const validation = await validateBackupConfigInput(req.body);
      if (!validation.valid) {
        res.status(400).json({ error: "Ungültige Konfiguration", details: validation.errors });
        return;
      }

      const config = await upsertBackupConfig(req.body);

      await auditService.log({
        eventType: "backup",
        action: "config_updated",
        actorId: req.user!.principalId,
        resourceType: "backup_config",
        resourceId: config.id,
        details: { enabled: config.enabled, interval: config.interval },
      });

      res.json(config);
    } catch (err) {
      res.status(500).json({ error: "Fehler beim Speichern der Backup-Konfiguration" });
    }
  },
);

backupRouter.post(
  "/run",
  requireAuth,
  requirePermission("run_backup"),
  async (req, res) => {
    try {
      const runId = await runBackup(req.user!.principalId);
      res.json({ id: runId, status: "started" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Backup konnte nicht gestartet werden";
      const status = msg.includes("läuft bereits") ? 409 : 400;
      res.status(status).json({ error: msg });
    }
  },
);

backupRouter.get(
  "/runs",
  requireAuth,
  requirePermission("view_backups"),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const runs = await listBackupRuns(limit);
      res.json(runs);
    } catch (err) {
      res.status(500).json({ error: "Fehler beim Laden der Backup-Historie" });
    }
  },
);

backupRouter.get(
  "/runs/:id",
  requireAuth,
  requirePermission("view_backups"),
  async (req, res) => {
    try {
      const run = await getBackupRun(req.params.id);
      if (!run) {
        res.status(404).json({ error: "Backup-Run nicht gefunden" });
        return;
      }
      res.json(run);
    } catch (err) {
      res.status(500).json({ error: "Fehler beim Laden des Backup-Runs" });
    }
  },
);

backupRouter.post(
  "/runs/:id/restore",
  requireAuth,
  requirePermission("restore_backup"),
  async (req, res) => {
    try {
      const result = await restoreBackup(req.params.id, req.user!.principalId);
      if (result.success) {
        res.json({ status: "restored" });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (err) {
      res.status(500).json({ error: "Wiederherstellung fehlgeschlagen" });
    }
  },
);

backupRouter.post(
  "/validate-target",
  requireAuth,
  requirePermission("manage_backups"),
  async (req, res) => {
    try {
      const { driveId, folderId } = req.body;
      if (!driveId) {
        res.status(400).json({ error: "driveId ist erforderlich" });
        return;
      }
      const result = await validateBackupTarget(driveId, folderId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Validierung fehlgeschlagen" });
    }
  },
);
