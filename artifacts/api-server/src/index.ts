import app from "./app";
import { appConfig } from "./lib/config";
import { logger } from "./lib/logger";
import { startSyncScheduler } from "./services/sync-scheduler.service";
import { startBackupScheduler } from "./services/backup.service";
import { startReviewCycleChecker } from "./services/review-cycle.service";
import { Server } from "http";

async function start() {
  const server: Server = app.listen(appConfig.port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info(
      {
        port: appConfig.port,
        env: appConfig.nodeEnv,
        authDevMode: appConfig.authDevMode,
      },
      "Server listening",
    );

    startSyncScheduler();
    startBackupScheduler();
    startReviewCycleChecker();
  });

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
