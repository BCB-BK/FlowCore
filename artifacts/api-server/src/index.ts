import app, { ensureSessionTable } from "./app";
import { appConfig } from "./lib/config";
import { logger } from "./lib/logger";
import { startSyncScheduler } from "./services/sync-scheduler.service";
import { startBackupScheduler } from "./services/backup.service";
import { startReviewCycleChecker } from "./services/review-cycle.service";
import { runStartupSeed } from "./services/startup-seed.service";
import { Server } from "http";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServer(port: number, attempt = 1): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info(
        {
          port,
          env: appConfig.nodeEnv,
          authDevMode: appConfig.authDevMode,
        },
        "Server listening",
      );
      resolve(server);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE" && attempt < MAX_RETRIES) {
        logger.warn(
          { port, attempt, maxRetries: MAX_RETRIES },
          `Port ${port} already in use, retrying in ${RETRY_DELAY_MS}ms...`,
        );
        server.close();
        sleep(RETRY_DELAY_MS)
          .then(() => startServer(port, attempt + 1))
          .then(resolve)
          .catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

async function start() {
  let server: Server;

  if (appConfig.nodeEnv === "production") {
    try {
      await ensureSessionTable();
    } catch (err) {
      logger.error({ err }, "Failed to ensure user_sessions table — aborting");
      process.exit(1);
    }
  }

  try {
    await runStartupSeed();
  } catch (err) {
    logger.error({ err }, "Startup seed encountered errors (non-fatal)");
  }

  try {
    server = await startServer(appConfig.port);
  } catch (err) {
    logger.error({ err }, "Failed to start server after retries");
    process.exit(1);
  }

  startSyncScheduler();
  startBackupScheduler();
  startReviewCycleChecker();

  let isShuttingDown = false;

  function shutdown(signal: string) {
    if (isShuttingDown) {
      logger.warn({ signal }, "Shutdown already in progress, ignoring signal");
      return;
    }
    isShuttingDown = true;
    logger.info({ signal }, "Received shutdown signal, closing server...");

    const FORCE_TIMEOUT_MS = 10_000;
    const forceExit = setTimeout(() => {
      logger.warn("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, FORCE_TIMEOUT_MS);
    forceExit.unref();

    server.close((err) => {
      if (err) {
        logger.error({ err }, "Error during server close");
        process.exit(1);
      }
      logger.info("Server closed cleanly");
      process.exit(0);
    });
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start();
