import type { Request, Response, NextFunction } from "express";
import { appConfig } from "../lib/config";
import { getPrincipalById } from "../services/principal.service";
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

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
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
    getPrincipalById(devPrincipalId)
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
    return;
  }

  if (req.session?.user) {
    req.user = req.session.user as AuthUser;
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    logger.warn("Bearer token validation not yet implemented for production");
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  res.status(401).json({ error: "Authentication required" });
}
