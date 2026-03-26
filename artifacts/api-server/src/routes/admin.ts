import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { appConfig } from "../lib/config";
import { isAuthConfigured } from "../services/auth.service";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import { migrateToWorkingCopyModel } from "../scripts/migrate-working-copies";
import { runConsistencyCheck } from "../services/consistency.service";
import {
  listReleases,
  getReleaseById,
  createRelease,
  updateRelease,
  transitionRelease,
} from "../services/release.service";

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

  res.json({
    system: {
      version: "0.4",
      environment: appConfig.nodeEnv,
      uptime: Math.floor(process.uptime()),
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

export default router;
