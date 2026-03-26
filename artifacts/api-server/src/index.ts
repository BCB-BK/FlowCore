import app from "./app";
import { appConfig } from "./lib/config";
import { logger } from "./lib/logger";
import { startSyncScheduler } from "./services/sync-scheduler.service";
import { startBackupScheduler } from "./services/backup.service";

async function start() {
  app.listen(appConfig.port, (err) => {
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
  });
}

start();
