import { z } from "zod";

const configSchema = z.object({
  port: z.coerce.number().int().positive(),
  nodeEnv: z.enum(["development", "production", "test"]),
  databaseUrl: z.string().min(1, "DATABASE_URL is required"),
  logLevel: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .optional()
    .default("info"),
  entraClientId: z.string().optional().default(""),
  entraClientSecret: z.string().optional().default(""),
  entraTenantId: z.string().optional().default(""),
  entraRedirectUri: z.string().optional().default(""),
  sessionSecret: z.string().optional().default("dev-session-secret-change-me"),
  authDevMode: z
    .enum(["true", "false"])
    .optional()
    .default("true")
    .transform((v) => v === "true"),
});

export type AppConfig = z.infer<typeof configSchema>;

function loadConfig(): AppConfig {
  const result = configSchema.safeParse({
    port: process.env["PORT"],
    nodeEnv: process.env["NODE_ENV"] ?? "development",
    databaseUrl: process.env["DATABASE_URL"],
    logLevel: process.env["LOG_LEVEL"],
    entraClientId: process.env["ENTRA_CLIENT_ID"],
    entraClientSecret: process.env["ENTRA_CLIENT_SECRET"],
    entraTenantId: process.env["ENTRA_TENANT_ID"],
    entraRedirectUri: process.env["ENTRA_REDIRECT_URI"],
    sessionSecret: process.env["SESSION_SECRET"],
    authDevMode: process.env["AUTH_DEV_MODE"],
  });

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuration validation failed:\n${errors}`);
  }

  return result.data;
}

export const appConfig = loadConfig();
