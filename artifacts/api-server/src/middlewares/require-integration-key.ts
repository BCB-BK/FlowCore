import type { Request, Response, NextFunction } from "express";
import {
  validateIntegrationKey,
  type IntegrationPrincipal,
  type KeyValidationFailure,
} from "../services/integration-key.service";
import { consumeRateLimit } from "./rate-limit";
import { logger } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      integrationKey?: IntegrationPrincipal;
    }
  }
}

function extractKey(req: Request): string | null {
  const headerKey = req.headers["x-flowcore-api-key"];
  if (typeof headerKey === "string" && headerKey.length > 0) return headerKey;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  return null;
}

const FAILURE_MESSAGES: Record<KeyValidationFailure, string> = {
  unknown: "Ungültiger API-Schlüssel.",
  revoked: "Dieser API-Schlüssel wurde widerrufen.",
  expired: "Dieser API-Schlüssel ist abgelaufen.",
  ip_not_allowed:
    "Zugriff von dieser IP-Adresse ist für diesen API-Schlüssel nicht freigegeben.",
};

/**
 * Authentifizierung der Content-API. Prüft Schlüssel, Ablauf, IP-Freigabe und
 * das schlüsseleigene Anfragelimit — in dieser Reihenfolge, damit ein
 * ungültiger Schlüssel nicht erst Limitzähler verbraucht.
 */
export function requireIntegrationKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const key = extractKey(req);
  if (!key) {
    res.status(401).json({
      error:
        "API-Schlüssel erforderlich. Bitte im Header X-FlowCore-Api-Key übergeben.",
    });
    return;
  }

  const clientIp = req.ip ?? null;

  validateIntegrationKey(key, clientIp)
    .then(async (result) => {
      if (!result.ok) {
        logger.warn(
          { reason: result.reason, clientIp, path: req.path },
          "Content-API: Schlüsselprüfung fehlgeschlagen",
        );
        res
          .status(result.reason === "ip_not_allowed" ? 403 : 401)
          .json({ error: FAILURE_MESSAGES[result.reason] });
        return;
      }

      const principal = result.principal;
      const decision = await consumeRateLimit(
        `int:${principal.keyId}`,
        principal.rateLimitPerMinute,
        60_000,
      );

      res.setHeader("X-RateLimit-Limit", String(principal.rateLimitPerMinute));
      res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
      res.setHeader(
        "X-RateLimit-Reset",
        String(Math.ceil(decision.resetAtMs / 1000)),
      );

      if (!decision.allowed) {
        res.setHeader("Retry-After", String(decision.retryAfterSec));
        res.status(429).json({
          error: "Anfragelimit für diesen API-Schlüssel erreicht.",
          retryAfter: decision.retryAfterSec,
        });
        return;
      }

      req.integrationKey = principal;
      next();
    })
    .catch((err: unknown) => {
      logger.error({ err }, "Content-API: Schlüsselprüfung fehlgeschlagen");
      res
        .status(401)
        .json({ error: "Prüfung des API-Schlüssels fehlgeschlagen" });
    });
}
