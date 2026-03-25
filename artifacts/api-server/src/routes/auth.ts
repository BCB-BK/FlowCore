import { Router } from "express";
import { appConfig } from "../lib/config";
import {
  getAuthUrl,
  exchangeCodeForToken,
  isAuthConfigured,
  getDevUsers,
} from "../services/auth.service";
import {
  upsertPrincipal,
  getPrincipalByExternalId,
  getRolesForPrincipal,
} from "../services/principal.service";
import { requireAuth } from "../middlewares/require-auth";
import {
  getEffectivePermissions,
  type WikiPermission,
} from "../services/rbac.service";
import { db } from "@workspace/db";
import { auditEventsTable } from "@workspace/db/schema";
import { logger } from "../lib/logger";

const router = Router();

router.get("/auth/config", (_req, res) => {
  res.json({
    devMode: appConfig.authDevMode,
    entraConfigured: isAuthConfigured(),
    tenantId: appConfig.entraTenantId || null,
  });
});

router.get("/auth/login", async (req, res) => {
  if (appConfig.authDevMode) {
    res.json({
      devMode: true,
      devUsers: getDevUsers(),
      message: "Use X-Dev-Principal-Id header with any dev user principalId",
    });
    return;
  }

  if (!isAuthConfigured()) {
    res.status(503).json({ error: "Entra ID not configured" });
    return;
  }

  try {
    const url = await getAuthUrl();
    res.json({ loginUrl: url });
  } catch (err) {
    logger.error({ err }, "Failed to generate auth URL");
    res.status(500).json({ error: "Failed to initiate login" });
  }
});

router.get("/auth/callback", async (req, res) => {
  if (appConfig.authDevMode) {
    res.status(400).json({ error: "Callback not available in dev mode" });
    return;
  }

  const code = req.query.code as string;
  if (!code) {
    res.status(400).json({ error: "Missing authorization code" });
    return;
  }

  try {
    const tokenResult = await exchangeCodeForToken(code);

    const principalId = await upsertPrincipal({
      principalType: "user",
      externalProvider: "entra_id",
      externalId: tokenResult.externalId,
      displayName: tokenResult.displayName,
      email: tokenResult.email,
      upn: tokenResult.upn,
    });

    const session = (req as unknown as Record<string, Record<string, unknown>>)
      .session;
    if (session) {
      session.user = {
        principalId,
        externalId: tokenResult.externalId,
        displayName: tokenResult.displayName,
        email: tokenResult.email,
      };
    }

    await db.insert(auditEventsTable).values({
      eventType: "auth",
      action: "login",
      actorId: principalId,
      resourceType: "principal",
      resourceId: principalId,
      details: { provider: "entra_id", tenantId: tokenResult.tenantId },
      ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
    });

    res.json({ principalId, displayName: tokenResult.displayName });
  } catch (err) {
    logger.error({ err }, "Auth callback failed");
    res.status(401).json({ error: "Authentication failed" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = req.user!;
  const roles = await getRolesForPrincipal(user.principalId);
  const permissions = await getEffectivePermissions(user.principalId);

  res.json({
    ...user,
    roles: roles.map((r) => ({
      role: r.role,
      scope: r.scope,
    })),
    permissions: Array.from(permissions) as WikiPermission[],
  });
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  const user = req.user!;

  await db.insert(auditEventsTable).values({
    eventType: "auth",
    action: "logout",
    actorId: user.principalId,
    resourceType: "principal",
    resourceId: user.principalId,
    ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
  });

  const session = (req as unknown as Record<string, Record<string, unknown>>)
    .session;
  if (session?.destroy) {
    (session.destroy as (cb: (err?: unknown) => void) => void)(() => {
      res.json({ message: "Logged out" });
    });
    return;
  }

  res.json({ message: "Logged out" });
});

router.get("/auth/dev-users", (_req, res) => {
  if (!appConfig.authDevMode) {
    res.status(404).json({ error: "Not available" });
    return;
  }
  res.json(getDevUsers());
});

export default router;
