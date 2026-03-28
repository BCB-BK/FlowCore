import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { rateLimitHitsTable } from "@workspace/db/schema";
import { eq, lt, sql } from "drizzle-orm";
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

    try {
      const rows = await db
        .select({ hits: rateLimitHitsTable.hits, resetAt: rateLimitHitsTable.resetAt })
        .from(rateLimitHitsTable)
        .where(eq(rateLimitHitsTable.key, key))
        .limit(1);

      let hits: number;
      let resetAt: Date;

      if (rows.length === 0 || rows[0].resetAt < now) {
        hits = 1;
        resetAt = new Date(now.getTime() + windowMs);
        await db
          .insert(rateLimitHitsTable)
          .values({ key, hits: 1, resetAt })
          .onConflictDoUpdate({
            target: rateLimitHitsTable.key,
            set: { hits: 1, resetAt },
          });
      } else {
        resetAt = rows[0].resetAt;
        const updated = await db
          .update(rateLimitHitsTable)
          .set({ hits: sql`${rateLimitHitsTable.hits} + 1` })
          .where(eq(rateLimitHitsTable.key, key))
          .returning({ hits: rateLimitHitsTable.hits });
        hits = updated[0]?.hits ?? rows[0].hits + 1;
      }

      const remaining = Math.max(0, maxRequests - hits);
      const retryAfter = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);

      res.setHeader("X-RateLimit-Limit", String(maxRequests));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAt.getTime() / 1000)));

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
