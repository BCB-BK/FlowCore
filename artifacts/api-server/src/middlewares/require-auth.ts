// require-auth.ts — Express middleware enforcing authentication and Entra group membership
import type { Request, Response, NextFunction } from "express";
import { appConfig } from "../lib/config";
import { getPrincipalById } from "../services/principal.service";
import { validateApiToken } from "../services/api-token.service";
import { checkGroupMembership } from "../services/graph-client.service";
import { logger } from "../lib/logger";
import { envInt } from "../lib/env";

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

const GROUP_CHECK_TTL_MS = envInt("GROUP_CHECK_TTL_MIN", 15) * 60 * 1000;

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

  try {
    const isMember = await checkGroupMembership("", externalId, groupId);
    groupMembershipCache.set(externalId, { isMember, checkedAt: Date.now() });
    return isMember;
  } catch (err) {
    // Fail-closed mit Übergangs-Cache: Bei Graph-Ausfall gilt der letzte
    // bekannte Zustand weiter (auch wenn abgelaufen); ohne bekannten Zustand
    // wird der Request abgelehnt statt durchgelassen.
    if (cached) {
      logger.warn(
        { err, externalId },
        "Entra group check failed, falling back to last known membership state",
      );
      return cached.isMember;
    }
    throw err;
  }
}

function destroySessionAndReject(req: Request, res: Response): void {
  req.session.destroy((err) => {
    if (err) {
      logger.warn({ err }, "Failed to destroy session for removed Entra user");
    }
  });
  res
    .status(401)
    .json({ error: "Session invalidated: user no longer in required group" });
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
      .then(async (result) => {
        if (!result) {
          res.status(401).json({ error: "Invalid or expired token" });
          return;
        }
        const principal = await getPrincipalById(result.principalId);
        if (!principal) {
          res.status(401).json({ error: "Principal not found" });
          return;
        }
        const externalId = principal.externalId ?? "";
        if (appConfig.entraRequiredGroupId && externalId) {
          let isMember: boolean;
          try {
            isMember = await checkEntraGroupMembership(externalId);
          } catch (err) {
            logger.error(
              { err, externalId },
              "Entra group check failed for API token, denying request (fail-closed)",
            );
            res.status(503).json({
              error:
                "Gruppenprüfung derzeit nicht möglich, bitte erneut versuchen",
            });
            return;
          }
          if (!isMember) {
            logger.warn(
              { externalId, principalId: principal.id },
              "API token rejected: user no longer in required Entra group",
            );
            res.status(401).json({
              error: "Access denied: user no longer in required group",
            });
            return;
          }
        }
        req.user = {
          principalId: principal.id,
          externalId,
          displayName: principal.displayName,
          email: principal.email ?? "",
        };
        next();
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
    const sessionUser = req.session.user;
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
          // Fail-closed: Session bleibt bestehen (kein destroy — der Fehler
          // liegt bei Graph, nicht beim Benutzer), aber der Request wird
          // abgelehnt, statt die Gruppenprüfung zu umgehen.
          logger.error(
            { err, externalId },
            "Entra group check failed, denying request (fail-closed)",
          );
          res.status(503).json({
            error:
              "Gruppenprüfung derzeit nicht möglich, bitte erneut versuchen",
          });
        });
      return;
    }

    req.user = sessionUser;
    next();
    return;
  }

  res.status(401).json({ error: "Authentication required" });
}
