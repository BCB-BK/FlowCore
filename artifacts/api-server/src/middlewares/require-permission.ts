import type { Request, Response, NextFunction } from "express";
import { hasPermission, type WikiPermission } from "../services/rbac.service";
import { logger } from "../lib/logger";

export function requirePermission(
  permission: WikiPermission,
  getNodeId?: (req: Request) => string | string[] | undefined,
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const rawNodeId = getNodeId ? getNodeId(req) : undefined;
    const nodeId = Array.isArray(rawNodeId) ? rawNodeId[0] : rawNodeId;

    const allowed = await hasPermission(
      req.user.principalId,
      permission,
      nodeId,
    );

    if (!allowed) {
      logger.warn(
        {
          principalId: req.user.principalId,
          permission,
          nodeId,
        },
        "Permission denied",
      );
      res.status(403).json({
        error: "Forbidden",
        requiredPermission: permission,
      });
      return;
    }

    next();
  };
}
