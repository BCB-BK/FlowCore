import { z } from "zod/v4";

const configSchema = z.object({
  port: z.coerce.number().int().positive(),
  nodeEnv: z.enum(["development", "production", "test"]),
  databaseUrl: z.string().min(1, "DATABASE_URL is required"),
  logLevel: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .optional()
    .default("info"),
});

export type AppConfig = z.infer<typeof configSchema>;

function loadConfig(): AppConfig {
  const result = configSchema.safeParse({
    port: process.env["PORT"],
    nodeEnv: process.env["NODE_ENV"] ?? "development",
    databaseUrl: process.env["DATABASE_URL"],
    logLevel: process.env["LOG_LEVEL"],
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
