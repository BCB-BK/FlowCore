import type { Request, Response, NextFunction } from "express";
import { appConfig } from "../lib/config";
import { getPrincipalById } from "../services/principal.service";
import { validateApiToken } from "../services/api-token.service";
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
    req.user = req.session.user as AuthUser;
    next();
    return;
  }

  res.status(401).json({ error: "Authentication required" });
}
