import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  let dbStatus = "disconnected";
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DB timeout")), 3000)
    );
    await Promise.race([pool.query("SELECT 1"), timeoutPromise]);
    dbStatus = "connected";
  } catch (err) {
    logger.error({ err }, "Health check: DB unreachable");
    dbStatus = "disconnected";
  }

  const status = dbStatus === "connected" ? "ok" : "degraded";
  const statusCode = dbStatus === "connected" ? 200 : 503;

  res.status(statusCode).json({ status, db: dbStatus });
});

export default router;
