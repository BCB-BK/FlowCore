import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { rateLimitHitsTable } from "@workspace/db/schema";
import { lt, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

const CLEANUP_INTERVAL = 5 * 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(async () => {
    try {
      const result = await db
        .delete(rateLimitHitsTable)
        .where(lt(rateLimitHitsTable.resetAt, new Date()));
      logger.debug({ deleted: result.rowCount }, "Rate limit cleanup completed");
    } catch (err) {
      logger.error({ err }, "Rate limit cleanup failed");
    }
  }, CLEANUP_INTERVAL);
  cleanupTimer.unref();
}

startCleanup();

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix = "rl" } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientIp = req.ip || "unknown";
    const key = `${keyPrefix}:${clientIp}`;
    const now = new Date();
    const newResetAt = new Date(now.getTime() + windowMs);

    try {
      const rows = await db.execute<{ hits: number; reset_at: Date }>(sql`
        INSERT INTO rate_limit_hits (key, hits, reset_at)
        VALUES (${key}, 1, ${newResetAt})
        ON CONFLICT (key) DO UPDATE SET
          hits = CASE
            WHEN rate_limit_hits.reset_at < ${now} THEN 1
            ELSE rate_limit_hits.hits + 1
          END,
          reset_at = CASE
            WHEN rate_limit_hits.reset_at < ${now} THEN ${newResetAt}
            ELSE rate_limit_hits.reset_at
          END
        RETURNING hits, reset_at
      `);

      const { hits, reset_at: resetAt } = rows.rows[0];
      const remaining = Math.max(0, maxRequests - hits);
      const resetAtMs = new Date(resetAt).getTime();
      const retryAfter = Math.ceil((resetAtMs - now.getTime()) / 1000);

      res.setHeader("X-RateLimit-Limit", String(maxRequests));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAtMs / 1000)));

      if (hits > maxRequests) {
        logger.warn({ clientIp, key, count: hits }, "Rate limit exceeded");
        res.setHeader("Retry-After", String(retryAfter));
        res.status(429).json({
          error: "Too many requests. Please try again later.",
          retryAfter,
        });
        return;
      }

      next();
    } catch (err) {
      logger.error({ err }, "Rate limit check failed, allowing request");
      next();
    }
  };
}

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  keyPrefix: "auth",
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 200,
  keyPrefix: "api",
});
