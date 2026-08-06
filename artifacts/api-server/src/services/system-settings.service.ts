import { db, systemSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { appConfig } from "../lib/config";

export async function getSystemSetting(key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: systemSettingsTable.value })
    .from(systemSettingsTable)
    .where(eq(systemSettingsTable.key, key));
  return row?.value ?? null;
}

export async function setSystemSetting(
  key: string,
  value: string,
  updatedBy?: string,
): Promise<void> {
  const existing = await db
    .select({ id: systemSettingsTable.id })
    .from(systemSettingsTable)
    .where(eq(systemSettingsTable.key, key));

  if (existing.length > 0) {
    await db
      .update(systemSettingsTable)
      .set({ value, updatedAt: new Date(), updatedBy: updatedBy ?? null })
      .where(eq(systemSettingsTable.key, key));
  } else {
    await db.insert(systemSettingsTable).values({
      key,
      value,
      updatedAt: new Date(),
      updatedBy: updatedBy ?? null,
    });
  }
}

export async function getAllSystemSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(systemSettingsTable);
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value ?? "";
  }
  return result;
}

export async function isSetupMode(): Promise<boolean> {
  const val = await getSystemSetting("setup_mode");
  return val === "true";
}

export async function isGraphSyncMockMode(): Promise<boolean> {
  // Fail-closed: a mock success can never mask a real Graph failure in
  // production, regardless of what is stored in system_settings.
  if (appConfig.nodeEnv === "production") return false;
  const val = await getSystemSetting("graph_sync_mock_mode");
  return val === "true";
}

/**
 * Whether glossary terms are included in Graph/Copilot sync and the ad-hoc
 * connector search. Defaults to enabled (true) when unset, since the
 * glossary is a core content source (Task 6) - explicit opt-out only, never
 * opt-in-by-surprise.
 */
export async function isGlossarySyncEnabled(): Promise<boolean> {
  const val = await getSystemSetting("glossary_sync_enabled");
  return val !== "false";
}

export type GraphFaultInjection = "none" | "auth_unconfigured" | "api_error";

/**
 * Dev/test-only fault injection to exercise fail-closed Graph sync paths
 * (missing credentials, Graph API errors) end-to-end without touching real
 * secrets. Always disabled in production — never usable to hide a real
 * failure or bypass auth in a live environment.
 */
export async function getGraphFaultInjection(): Promise<GraphFaultInjection> {
  if (appConfig.nodeEnv === "production") return "none";
  const val = await getSystemSetting("graph_sync_fault_injection");
  if (val === "auth_unconfigured" || val === "api_error") return val;
  return "none";
}
