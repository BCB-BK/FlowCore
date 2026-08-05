import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { rateLimitHitsTable } from "@workspace/db/schema";
import { lt, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { envInt } from "../lib/env";

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

// In-Memory-Fallback, falls die DB-basierte Zählung ausfällt: Limits bleiben
// durchgesetzt (fail-closed bezüglich des Limits), ohne dass ein DB-Ausfall
// jeden Request blockiert.
const memoryHits = new Map<string, { hits: number; resetAt: number }>();

function countInMemory(key: string, windowMs: number): { hits: number; resetAtMs: number } {
  const now = Date.now();
  const entry = memoryHits.get(key);
  if (!entry || entry.resetAt < now) {
    const fresh = { hits: 1, resetAt: now + windowMs };
    memoryHits.set(key, fresh);
    if (memoryHits.size > 10_000) {
      for (const [k, v] of memoryHits) {
        if (v.resetAt < now) memoryHits.delete(k);
      }
    }
    return { hits: 1, resetAtMs: fresh.resetAt };
  }
  entry.hits += 1;
  return { hits: entry.hits, resetAtMs: entry.resetAt };
}

export interface RateLimitDecision {
  allowed: boolean;
  hits: number;
  remaining: number;
  resetAtMs: number;
  retryAfterSec: number;
}

/**
 * Zählt einen Zugriff auf einen beliebigen Zählschlüssel und entscheidet, ob
 * er noch im Limit liegt. Als eigene Funktion herausgezogen, weil nicht jedes
 * Limit an der IP hängt — Integrationsschlüssel bringen ihr eigenes Limit mit.
 */
export async function consumeRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitDecision> {
  const now = new Date();
  const newResetAt = new Date(now.getTime() + windowMs);

  const decide = (hits: number, resetAtMs: number): RateLimitDecision => ({
    allowed: hits <= maxRequests,
    hits,
    remaining: Math.max(0, maxRequests - hits),
    resetAtMs,
    retryAfterSec: Math.max(1, Math.ceil((resetAtMs - now.getTime()) / 1000)),
  });

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
    return decide(hits, new Date(resetAt).getTime());
  } catch (err) {
    logger.error(
      { err },
      "Rate limit DB check failed, falling back to in-memory counting",
    );
    const fallback = countInMemory(key, windowMs);
    return decide(fallback.hits, fallback.resetAtMs);
  }
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix = "rl" } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientIp = req.ip || "unknown";
    const key = `${keyPrefix}:${clientIp}`;

    const decision = await consumeRateLimit(key, maxRequests, windowMs);

    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
    res.setHeader(
      "X-RateLimit-Reset",
      String(Math.ceil(decision.resetAtMs / 1000)),
    );

    if (!decision.allowed) {
      logger.warn({ clientIp, key, count: decision.hits }, "Rate limit exceeded");
      res.setHeader("Retry-After", String(decision.retryAfterSec));
      res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter: decision.retryAfterSec,
      });
      return;
    }

    next();
  };
}

export const authRateLimit = rateLimit({
  windowMs: envInt("RATE_LIMIT_AUTH_WINDOW_MIN", 15) * 60 * 1000,
  maxRequests: envInt("RATE_LIMIT_AUTH_MAX", 30),
  keyPrefix: "auth",
});

export const apiRateLimit = rateLimit({
  windowMs: envInt("RATE_LIMIT_API_WINDOW_SEC", 60) * 1000,
  maxRequests: envInt("RATE_LIMIT_API_MAX", 200),
  keyPrefix: "api",
});
