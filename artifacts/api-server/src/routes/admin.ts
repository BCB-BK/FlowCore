import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { appConfig } from "../lib/config";
import { isAuthConfigured } from "../services/auth.service";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import { migrateToWorkingCopyModel } from "../scripts/migrate-working-copies";

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

export default router;
