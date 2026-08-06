import { appConfig } from "./config";
import { logger } from "./logger";

/**
 * Bereitet eine interne Fehlermeldung für die HTTP-Antwort auf: In Produktion
 * wird eine generische Meldung zurückgegeben (keine internen Details wie
 * DB-Fehlertexte an Clients leaken), in Entwicklung die Originalmeldung.
 * Die Originalmeldung wird in jedem Fall geloggt.
 */
export function sanitizeInternalError(
  message: string,
  fallback = "Interner Serverfehler",
): string {
  logger.error(
    { message },
    "Internal error returned to client (sanitized in production)",
  );
  return appConfig.nodeEnv === "production" ? fallback : message;
}
