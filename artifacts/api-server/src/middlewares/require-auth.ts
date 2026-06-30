import type { Request, Response, NextFunction } from "express";
import { appConfig } from "../lib/config";
import { getPrincipalById } from "../services/principal.service";
import { validateApiToken } from "../services/api-token.service";
import { checkGroupMembership } from "../services/graph-client.service";
import { logger } from "../lib/logger";

export interface AuthUser {
  principalId: string;
  externalId: string;
  displayName: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const GROUP_CHECK_TTL_MS = 15 * 60 * 1000;

interface GroupCheckEntry {
  isMember: boolean;
  checkedAt: number;
}

const groupMembershipCache = new Map<string, GroupCheckEntry>();

export function invalidateGroupMembershipCache(externalId: string): void {
  groupMembershipCache.delete(externalId);
}

async function checkEntraGroupMembership(externalId: string): Promise<boolean> {
  const groupId = appConfig.entraRequiredGroupId;
  if (!groupId) return true;
  if (appConfig.authDevMode) return true;

  const cached = groupMembershipCache.get(externalId);
  if (cached && Date.now() - cached.checkedAt < GROUP_CHECK_TTL_MS) {
    return cached.isMember;
  }

  const isMember = await checkGroupMembership("", externalId, groupId);
  groupMembershipCache.set(externalId, { isMember, checkedAt: Date.now() });
  return isMember;
}

function destroySessionAndReject(req: Request, res: Response): void {
  req.session.destroy((err) => {
    if (err) {
      logger.warn({ err }, "Failed to destroy session for removed Entra user");
    }
  });
  res.status(401).json({ error: "Session invalidated: user no longer in required group" });
}

function resolveAndSetPrincipal(
  principalId: string,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  getPrincipalById(principalId)
    .then((principal) => {
      if (principal) {
        req.user = {
          principalId: principal.id,
          externalId: principal.externalId ?? "",
          displayName: principal.displayName,
          email: principal.email ?? "",
        };
        next();
      } else {
        res.status(401).json({ error: "Principal not found" });
      }
    })
    .catch(() => {
      res.status(401).json({ error: "Auth lookup failed" });
    });
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    validateApiToken(token)
      .then((result) => {
        if (!result) {
          res.status(401).json({ error: "Invalid or expired token" });
          return;
        }
        resolveAndSetPrincipal(result.principalId, req, res, next);
      })
      .catch((err) => {
        logger.error("Bearer token validation failed", err);
        res.status(401).json({ error: "Authentication failed" });
      });
    return;
  }

  if (appConfig.authDevMode) {
    const devPrincipalId = req.headers["x-dev-principal-id"] as
      | string
      | undefined;
    if (!devPrincipalId) {
      res
        .status(401)
        .json({ error: "X-Dev-Principal-Id header required in dev mode" });
      return;
    }
    resolveAndSetPrincipal(devPrincipalId, req, res, next);
    return;
  }

  if (req.session?.user) {
    const sessionUser = req.session.user as AuthUser;
    const externalId = sessionUser.externalId;

    if (appConfig.entraRequiredGroupId && externalId) {
      checkEntraGroupMembership(externalId)
        .then((isMember) => {
          if (!isMember) {
            logger.warn(
              { externalId, principalId: sessionUser.principalId },
              "Session invalidated: user no longer in required Entra group",
            );
            destroySessionAndReject(req, res);
            return;
          }
          req.user = sessionUser;
          next();
        })
        .catch((err) => {
          logger.error({ err, externalId }, "Entra group check failed, allowing request");
          req.user = sessionUser;
          next();
        });
      return;
    }

    req.user = sessionUser;
    next();
    return;
  }

  res.status(401).json({ error: "Authentication required" });
}
