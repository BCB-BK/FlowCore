// require-connector-key.ts — auth middleware for the FlowCore Custom
// Connector (Cluster 13, optional). Distinct from requireAuth: this is for
// Copilot Studio "specialist agents" calling FlowCore as a Tool/Action via a
// Power Platform Custom Connector, not human/session users.
import type { Request, Response, NextFunction } from "express";
import {
  validateConnectorKey,
  type CopilotConnectorPrincipal,
} from "../services/copilot-connector-key.service";

declare global {
  namespace Express {
    interface Request {
      connectorKey?: CopilotConnectorPrincipal;
    }
  }
}

function extractKey(req: Request): string | null {
  const headerKey = req.headers["x-flowcore-api-key"];
  if (typeof headerKey === "string" && headerKey.length > 0) return headerKey;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token) return token;
  }
  return null;
}

export function requireConnectorKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const key = extractKey(req);
  if (!key) {
    res.status(401).json({
      error: "API key required. Provide it via the X-FlowCore-Api-Key header.",
    });
    return;
  }

  validateConnectorKey(key)
    .then((principal) => {
      if (!principal) {
        res.status(401).json({ error: "Invalid or revoked API key" });
        return;
      }
      req.connectorKey = principal;
      next();
    })
    .catch(() => {
      res.status(401).json({ error: "API key validation failed" });
    });
}
