import app from "./app";
import { appConfig } from "./lib/config";
import { logger } from "./lib/logger";

app.listen(appConfig.port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info(
    { port: appConfig.port, env: appConfig.nodeEnv },
    "Server listening",
  );
});
