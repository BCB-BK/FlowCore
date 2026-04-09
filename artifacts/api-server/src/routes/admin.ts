import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { appConfig } from "../lib/config";
import { isAuthConfigured } from "../services/auth.service";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission, requireAnyPermission } from "../middlewares/require-permission";
import { migrateToWorkingCopyModel } from "../scripts/migrate-working-copies";
import { runConsistencyCheck } from "../services/consistency.service";
import {
  listReleases,
  getReleaseById,
  createRelease,
  updateRelease,
  transitionRelease,
} from "../services/release.service";
import { auditService, type AuditQueryOptions } from "../lib/audit";
import { hasPermission } from "../services/rbac.service";
import { getAllSystemSettings, setSystemSetting, isSetupMode } from "../services/system-settings.service";

const router: IRouter = Router();

router.get("/admin/system-info", requireAuth, requirePermission("manage_settings"), async (_req, res) => {
  let dbStatus = "disconnected";
  let dbVersion = "";
  try {
    const r = await pool.query("SELECT version()");
    dbStatus = "connected";
    dbVersion = (r.rows[0] as Record<string, string>)?.version ?? "";
  } catch {
    dbStatus = "disconnected";
  }

  const openaiConfigured = !!(
    process.env["OPENAI_API_KEY"] ||
    process.env["AI_INTEGRATIONS_OPENAI_API_KEY"]
  );
  const openaiBaseUrl = process.env["OPENAI_API_KEY"]
    ? "https://api.openai.com/v1"
    : process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"] ||
      "https://api.openai.com/v1";

  const setupModeActive = await isSetupMode();

  res.json({
    system: {
      version: "0.4",
      environment: appConfig.nodeEnv,
      uptime: Math.floor(process.uptime()),
      setupMode: setupModeActive,
    },
    database: {
      status: dbStatus,
      version: dbVersion.split(" ").slice(0, 2).join(" "),
    },
    auth: {
      devMode: appConfig.authDevMode,
      entraConfigured: isAuthConfigured(),
      entraTenantId: appConfig.entraTenantId || null,
      entraClientId: appConfig.entraClientId ? "***configured***" : null,
    },
    integrations: {
      openai: {
        configured: openaiConfigured,
        baseUrl: openaiBaseUrl,
      },
      teams: {
        appId: appConfig.teamsAppId || null,
        configured: !!appConfig.teamsAppId,
      },
    },
  });
});

router.post("/admin/migrate-working-copies", requireAuth, requirePermission("manage_settings"), async (_req, res) => {
  try {
    const result = await migrateToWorkingCopyModel();
    res.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.get("/admin/consistency-check", requireAuth, requirePermission("manage_settings"), async (_req, res) => {
  try {
    const report = await runConsistencyCheck();
    res.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.get("/admin/releases", requireAuth, requirePermission("manage_settings"), async (_req, res) => {
  try {
    const releases = await listReleases();
    res.json({ releases });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.get("/admin/releases/:id", requireAuth, requirePermission("manage_settings"), async (req, res) => {
  try {
    const id = req.params.id as string;
    const release = await getReleaseById(id);
    if (!release) {
      res.status(404).json({ error: "Release nicht gefunden" });
      return;
    }
    res.json(release);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.post("/admin/releases", requireAuth, requirePermission("manage_settings"), async (req, res) => {
  try {
    const { title, description, version, clusterRef, changedFiles } = req.body;
    if (!title || !version) {
      res.status(400).json({ error: "Titel und Version sind Pflichtfelder" });
      return;
    }
    const release = await createRelease({
      title,
      description: description || null,
      version,
      clusterRef: clusterRef || null,
      changedFiles: changedFiles || null,
      createdBy: req.user?.displayName || "system",
    });
    res.status(201).json(release);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.patch("/admin/releases/:id", requireAuth, requirePermission("manage_settings"), async (req, res) => {
  try {
    const id = req.params.id as string;
    const { title, description, clusterRef, changedFiles } = req.body;
    const release = await updateRelease(id, {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(clusterRef !== undefined && { clusterRef }),
      ...(changedFiles !== undefined && { changedFiles }),
    });
    if (!release) {
      res.status(404).json({ error: "Release nicht gefunden" });
      return;
    }
    res.json(release);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.post("/admin/releases/:id/transition", requireAuth, requirePermission("manage_settings"), async (req, res) => {
  try {
    const id = req.params.id as string;
    const { status, auditNotes, syncRef, syncNotes, releaseNotes } = req.body;
    if (!status) {
      res.status(400).json({ error: "Status ist ein Pflichtfeld" });
      return;
    }
    const userName = req.user?.displayName || "system";
    const release = await transitionRelease(id, status, {
      auditNotes,
      auditedBy: userName,
      syncRef,
      syncNotes,
      releasedBy: userName,
      releaseNotes,
    });
    if (!release) {
      res.status(404).json({ error: "Release nicht gefunden" });
      return;
    }
    res.json(release);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.startsWith("Ungültiger Statusübergang")) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(500).json({ error: message });
  }
});

const PII_FIELD_PATTERNS = /^(actor|author|user|submitted|approved|returned|created|updated|reviewed|assigned|delegat|unlock|cancel|comment|ip|email|name)/i;

const SAFE_ID_FIELDS = new Set(["resourceId", "correlationId", "workingCopyId", "revisionId", "pageId", "nodeId"]);

function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (PII_FIELD_PATTERNS.test(key)) continue;
    if (typeof value === "string" && key.toLowerCase().includes("id") && !SAFE_ID_FIELDS.has(key)) continue;
    if (Array.isArray(value)) {
      safe[key] = value.map((item) =>
        item !== null && typeof item === "object" && !Array.isArray(item)
          ? sanitizeDetails(item as Record<string, unknown>)
          : item,
      );
    } else if (value !== null && typeof value === "object") {
      safe[key] = sanitizeDetails(value as Record<string, unknown>);
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

function sanitizeAuditEvent(evt: Record<string, unknown>, canSeePersonalData: boolean) {
  const base: Record<string, unknown> = {
    id: evt.id,
    eventType: evt.eventType,
    action: evt.action,
    resourceType: evt.resourceType,
    resourceId: evt.resourceId,
    correlationId: evt.correlationId,
    createdAt: evt.createdAt,
  };

  if (canSeePersonalData) {
    base.actorId = evt.actorId;
    base.ipAddress = evt.ipAddress;
    base.details = evt.details;
  } else {
    base.actorId = evt.actorId ? "[redacted]" : null;
    base.ipAddress = null;
    const details = evt.details as Record<string, unknown> | null;
    if (details) {
      base.details = sanitizeDetails(details);
    }
  }

  return base;
}

router.get("/admin/audit-events", requireAuth, requireAnyPermission("view_audit_log", "manage_settings"), async (req, res) => {
  try {
    const opts: AuditQueryOptions = {};
    if (req.query.resourceType) opts.resourceType = req.query.resourceType as string;
    if (req.query.resourceId) opts.resourceId = req.query.resourceId as string;
    if (req.query.actorId) opts.actorId = req.query.actorId as string;
    if (req.query.action) opts.action = req.query.action as string;
    if (req.query.eventType) opts.eventType = req.query.eventType as string;
    if (req.query.from) {
      const d = new Date(req.query.from as string);
      if (!isNaN(d.getTime())) opts.from = d;
    }
    if (req.query.to) {
      const d = new Date(req.query.to as string);
      if (!isNaN(d.getTime())) opts.to = d;
    }
    if (req.query.limit) {
      const parsed = parseInt(req.query.limit as string, 10);
      opts.limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 500) : 100;
    }
    if (req.query.offset) {
      const parsed = parseInt(req.query.offset as string, 10);
      opts.offset = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    }

    const canSeePersonalData = req.user
      ? await hasPermission(req.user.principalId, "manage_settings")
      : false;

    const result = await auditService.query(opts);
    res.json({
      events: result.events.map((evt) => sanitizeAuditEvent(evt as unknown as Record<string, unknown>, canSeePersonalData)),
      total: result.total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.get("/admin/audit-events/filters", requireAuth, requireAnyPermission("view_audit_log", "manage_settings"), async (_req, res) => {
  try {
    const [actions, resourceTypes] = await Promise.all([
      auditService.getDistinctActions(),
      auditService.getDistinctResourceTypes(),
    ]);
    res.json({ actions, resourceTypes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.get("/admin/audit-events/export", requireAuth, requireAnyPermission("view_audit_log", "manage_settings"), async (req, res) => {
  try {
    const opts: AuditQueryOptions = { limit: 10000 };
    if (req.query.resourceType) opts.resourceType = req.query.resourceType as string;
    if (req.query.resourceId) opts.resourceId = req.query.resourceId as string;
    if (req.query.actorId) opts.actorId = req.query.actorId as string;
    if (req.query.action) opts.action = req.query.action as string;
    if (req.query.eventType) opts.eventType = req.query.eventType as string;
    if (req.query.from) {
      const d = new Date(req.query.from as string);
      if (!isNaN(d.getTime())) opts.from = d;
    }
    if (req.query.to) {
      const d = new Date(req.query.to as string);
      if (!isNaN(d.getTime())) opts.to = d;
    }

    const includePersonalData = req.query.includePersonalData === "true";
    const canExportPersonal = includePersonalData && req.user
      ? await hasPermission(req.user!.principalId, "manage_settings")
      : false;

    const result = await auditService.query(opts);

    const format = (req.query.format as string) || "json";

    const sanitizedEvents = result.events.map((evt) =>
      sanitizeAuditEvent(evt as unknown as Record<string, unknown>, canExportPersonal),
    );

    if (format === "csv") {
      const escapeCsv = (val: unknown): string => {
        const str = val == null ? "" : String(val);
        if (str.includes(";") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const header = "id;eventType;action;actorId;resourceType;resourceId;correlationId;createdAt\n";
      const rows = sanitizedEvents.map((e) =>
        [e.id, e.eventType, e.action, e.actorId || "", e.resourceType || "", e.resourceId || "", e.correlationId || "", e.createdAt].map(escapeCsv).join(";"),
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="audit-export-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(header + rows.join("\n"));
    } else {
      res.setHeader("Content-Disposition", `attachment; filename="audit-export-${new Date().toISOString().slice(0, 10)}.json"`);
      res.json({
        exportedAt: new Date().toISOString(),
        total: result.total,
        includesPersonalData: includePersonalData && canExportPersonal,
        events: sanitizedEvents,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.get("/admin/setup-mode", requireAuth, async (_req, res) => {
  try {
    const active = await isSetupMode();
    res.json({ setupMode: active });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.get("/admin/system-settings", requireAuth, requirePermission("manage_settings"), async (_req, res) => {
  try {
    const settings = await getAllSystemSettings();
    res.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.put("/admin/system-settings/:key", requireAuth, requirePermission("manage_settings"), async (req, res) => {
  try {
    const key = req.params.key as string;
    const { value } = req.body;
    if (typeof value !== "string") {
      res.status(400).json({ error: "value muss ein String sein" });
      return;
    }
    const actorName = req.user?.displayName || "system";
    await setSystemSetting(key, value, actorName);
    res.json({ success: true, key, value });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
