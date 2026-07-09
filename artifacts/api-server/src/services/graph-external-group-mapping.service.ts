import { db } from "@workspace/db";
import { graphGroupMappingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { GraphAclTier } from "@workspace/db/schema";

export const GRAPH_ACL_TIERS: GraphAclTier[] = [
  "internal_standard",
  "restricted",
  "executive",
];

export interface GroupMapping {
  tier: GraphAclTier;
  entraGroupId: string;
  label: string | null;
  updatedAt: Date;
}

/**
 * Looks up the configured Entra group for a given ACL tier. Returns null
 * (never a fabricated/default id) when nothing has been configured yet —
 * callers must treat that as fail-closed for tiers that require a fixed
 * group (internal_standard, executive).
 */
export async function getGroupMapping(
  tier: GraphAclTier,
): Promise<GroupMapping | null> {
  const [row] = await db
    .select()
    .from(graphGroupMappingsTable)
    .where(eq(graphGroupMappingsTable.tier, tier));

  if (!row) return null;

  return {
    tier: row.tier as GraphAclTier,
    entraGroupId: row.entraGroupId,
    label: row.label,
    updatedAt: row.updatedAt,
  };
}

export async function listGroupMappings(): Promise<GroupMapping[]> {
  const rows = await db.select().from(graphGroupMappingsTable);
  return rows.map((row) => ({
    tier: row.tier as GraphAclTier,
    entraGroupId: row.entraGroupId,
    label: row.label,
    updatedAt: row.updatedAt,
  }));
}

export async function upsertGroupMapping(
  tier: GraphAclTier,
  entraGroupId: string,
  label: string | undefined,
  updatedBy: string,
): Promise<GroupMapping> {
  const [existing] = await db
    .select({ id: graphGroupMappingsTable.id })
    .from(graphGroupMappingsTable)
    .where(eq(graphGroupMappingsTable.tier, tier));

  if (existing) {
    const [updated] = await db
      .update(graphGroupMappingsTable)
      .set({ entraGroupId, label, updatedBy, updatedAt: new Date() })
      .where(eq(graphGroupMappingsTable.id, existing.id))
      .returning();
    return {
      tier: updated.tier as GraphAclTier,
      entraGroupId: updated.entraGroupId,
      label: updated.label,
      updatedAt: updated.updatedAt,
    };
  }

  const [inserted] = await db
    .insert(graphGroupMappingsTable)
    .values({ tier, entraGroupId, label, updatedBy })
    .returning();

  return {
    tier: inserted.tier as GraphAclTier,
    entraGroupId: inserted.entraGroupId,
    label: inserted.label,
    updatedAt: inserted.updatedAt,
  };
}

/**
 * Removes a configured Entra group mapping for a tier, returning the ACL
 * for that tier to its fail-closed "unconfigured" state (never falls back
 * to "everyone" - callers of buildGroupTierAcl will throw until a new
 * mapping is configured).
 */
export async function deleteGroupMapping(tier: GraphAclTier): Promise<void> {
  await db
    .delete(graphGroupMappingsTable)
    .where(eq(graphGroupMappingsTable.tier, tier));
}
