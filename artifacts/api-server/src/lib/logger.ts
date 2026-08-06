import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
    // Anwendungseigene Zugangswege — ohne diese Eintraege landen gueltige
    // Schluessel im Klartext im Protokoll (Audit-Befund B11).
    "req.headers['x-flowcore-api-key']",
    "req.headers['x-dev-principal-id']",
    "req.headers['x-graph-token']",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
