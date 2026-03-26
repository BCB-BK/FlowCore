import { Router } from "express";
import { appConfig } from "../lib/config";
import { authRateLimit } from "../middlewares/rate-limit";
import {
  exchangeTeamsSsoToken,
  isAuthConfigured,
} from "../services/auth.service";
import {
  upsertPrincipal,
  getRolesForPrincipal,
} from "../services/principal.service";
import {
  getEffectivePermissions,
  type WikiPermission,
} from "../services/rbac.service";
import { db } from "@workspace/db";
import { auditEventsTable } from "@workspace/db/schema";
import { logger } from "../lib/logger";

export const teamsRouter = Router();

teamsRouter.post("/teams/sso", authRateLimit, async (req, res) => {
  if (appConfig.authDevMode) {
    res.status(400).json({ error: "Teams SSO not available in dev mode" });
    return;
  }

  if (!isAuthConfigured()) {
    res.status(503).json({ error: "Entra ID not configured" });
    return;
  }

  const { ssoToken } = req.body as { ssoToken?: string };
  if (!ssoToken || typeof ssoToken !== "string") {
    res.status(400).json({ error: "Missing ssoToken in request body" });
    return;
  }

  try {
    const tokenResult = await exchangeTeamsSsoToken(ssoToken);

    if (
      appConfig.entraTenantId &&
      tokenResult.tenantId !== appConfig.entraTenantId
    ) {
      logger.warn(
        { expected: appConfig.entraTenantId, got: tokenResult.tenantId },
        "Tenant ID mismatch in Teams SSO",
      );
      res.status(403).json({ error: "Tenant not authorized" });
      return;
    }

    const principalId = await upsertPrincipal({
      principalType: "user",
      externalProvider: "entra_id",
      externalId: tokenResult.externalId,
      displayName: tokenResult.displayName,
      email: tokenResult.email,
      upn: tokenResult.upn,
    });

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
      details: {
        provider: "teams_sso",
        tenantId: tokenResult.tenantId,
      },
      ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
    });

    const roles = await getRolesForPrincipal(principalId);
    const permissions = await getEffectivePermissions(principalId);

    res.json({
      principalId,
      displayName: tokenResult.displayName,
      email: tokenResult.email,
      roles: roles.map((r) => ({ role: r.role, scope: r.scope })),
      permissions: Array.from(permissions) as WikiPermission[],
    });
  } catch (err) {
    logger.error({ err }, "Teams SSO token exchange failed");
    res.status(401).json({ error: "Teams SSO authentication failed" });
  }
});

teamsRouter.get("/teams/context", (_req, res) => {
  res.json({
    appId: appConfig.teamsAppId || null,
    configured: !!appConfig.teamsAppId,
    entraConfigured: isAuthConfigured(),
    tenantId: appConfig.entraTenantId || null,
  });
});
