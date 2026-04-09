import { db, systemSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
    await db
      .insert(systemSettingsTable)
      .values({ key, value, updatedAt: new Date(), updatedBy: updatedBy ?? null });
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
