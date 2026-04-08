import { Router } from "express";
import { appConfig } from "../lib/config";
import { authRateLimit } from "../middlewares/rate-limit";
import {
  getAuthUrl,
  exchangeCodeForToken,
  isAuthConfigured,
} from "../services/auth.service";
import {
  upsertPrincipal,
  getRolesForPrincipal,
  assignRole,
} from "../services/principal.service";
import { requireAuth } from "../middlewares/require-auth";
import {
  getEffectivePermissions,
  getSodConfig,
  type WikiPermission,
} from "../services/rbac.service";
import { checkGroupMembership } from "../services/graph-client.service";
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

router.get("/auth/login", authRateLimit, async (req, res) => {
  if (appConfig.authDevMode) {
    res.json({
      devMode: true,
      message:
        "Dev mode active — use X-Dev-Principal-Id header with a real principal ID from the database",
    });
    return;
  }

  if (!isAuthConfigured()) {
    res.status(503).json({ error: "Entra ID not configured" });
    return;
  }

  try {
    const { randomUUID } = await import("crypto");
    const state = randomUUID();
    req.session.oauthState = state;
    const url = await getAuthUrl(state);
    res.json({ loginUrl: url });
  } catch (err) {
    logger.error({ err }, "Failed to generate auth URL");
    res.status(500).json({ error: "Failed to initiate login" });
  }
});

router.get("/auth/callback", authRateLimit, async (req, res) => {
  if (appConfig.authDevMode) {
    res.status(400).json({ error: "Callback not available in dev mode" });
    return;
  }

  const code = req.query.code as string;
  const state = req.query.state as string | undefined;
  if (!code) {
    res.status(400).json({ error: "Missing authorization code" });
    return;
  }

  const expectedState = req.session.oauthState;
  if (!expectedState || !state || state !== expectedState) {
    logger.warn("OAuth state missing or mismatch — possible CSRF");
    res.status(400).json({ error: "Invalid or missing state parameter" });
    return;
  }
  delete req.session.oauthState;

  try {
    const tokenResult = await exchangeCodeForToken(code);

    if (
      appConfig.entraTenantId &&
      tokenResult.tenantId !== appConfig.entraTenantId
    ) {
      logger.warn(
        { expected: appConfig.entraTenantId, got: tokenResult.tenantId },
        "Tenant ID mismatch in auth callback",
      );
      res.status(403).json({ error: "Tenant not authorized" });
      return;
    }

    if (appConfig.entraRequiredGroupId) {
      const isMember = await checkGroupMembership(
        tokenResult.accessToken,
        tokenResult.externalId,
        appConfig.entraRequiredGroupId,
      );

      if (!isMember) {
        logger.warn(
          { externalId: tokenResult.externalId, groupId: appConfig.entraRequiredGroupId },
          "Login rejected: user not in required Entra group",
        );
        await db.insert(auditEventsTable).values({
          eventType: "auth",
          action: "login_rejected_group",
          actorId: null,
          resourceType: "principal",
          resourceId: null,
          details: {
            reason: "not_in_required_group",
            externalId: tokenResult.externalId,
            groupId: appConfig.entraRequiredGroupId,
          },
          ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
        });
        res.redirect("/?auth_error=group_not_authorized");
        return;
      }
    }

    const principalId = await upsertPrincipal({
      principalType: "user",
      externalProvider: "entra",
      externalId: tokenResult.externalId,
      displayName: tokenResult.displayName,
      email: tokenResult.email,
      upn: tokenResult.upn,
    });

    const existingRoles = await getRolesForPrincipal(principalId);
    if (existingRoles.length === 0) {
      await assignRole({ principalId, role: "viewer", scope: "global" });
      logger.info({ principalId }, "Auto-assigned Viewer role on first login");
      await db.insert(auditEventsTable).values({
        eventType: "auth",
        action: "auto_role_assigned",
        actorId: principalId,
        resourceType: "principal",
        resourceId: principalId,
        details: { role: "viewer", scope: "global", reason: "first_login" },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      });
    }

    req.session.user = {
      principalId,
      externalId: tokenResult.externalId,
      displayName: tokenResult.displayName,
      email: tokenResult.email,
    };
    req.session.graphAccessToken = tokenResult.accessToken;

    await db.insert(auditEventsTable).values({
      eventType: "auth",
      action: "login",
      actorId: principalId,
      resourceType: "principal",
      resourceId: principalId,
      details: { provider: "entra", tenantId: tokenResult.tenantId },
      ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
    });

    req.session.save((saveErr) => {
      if (saveErr) {
        logger.error({ err: saveErr }, "Failed to save session after login");
      }
      res.redirect("/");
    });
  } catch (err) {
    logger.error({ err }, "Auth callback failed");
    res.redirect("/?auth_error=1");
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = req.user!;
  const roles = await getRolesForPrincipal(user.principalId);
  const permissions = await getEffectivePermissions(user.principalId);
  const sodConfig = await getSodConfig();

  res.json({
    ...user,
    roles: roles.map((r) => ({
      role: r.role,
      scope: r.scope,
    })),
    permissions: Array.from(permissions) as WikiPermission[],
    sodRules: sodConfig.reduce(
      (acc, rule) => {
        acc[rule.ruleKey] = rule.isEnabled;
        return acc;
      },
      {} as Record<string, boolean>,
    ),
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

  req.session.destroy((err) => {
    if (err) {
      logger.warn({ err }, "Session destroy failed");
    }
    res.json({ message: "Logged out" });
  });
});

export default router;
