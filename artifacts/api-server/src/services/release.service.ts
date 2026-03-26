import { db } from "@workspace/db";
import { releasesTable, type InsertRelease } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export async function listReleases() {
  return db
    .select()
    .from(releasesTable)
    .orderBy(desc(releasesTable.createdAt))
    .limit(50);
}

export async function getReleaseById(id: string) {
  const rows = await db
    .select()
    .from(releasesTable)
    .where(eq(releasesTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createRelease(data: InsertRelease) {
  const rows = await db.insert(releasesTable).values(data).returning();
  return rows[0];
}

export async function updateRelease(
  id: string,
  data: Partial<InsertRelease>,
) {
  const rows = await db
    .update(releasesTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(releasesTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function transitionRelease(
  id: string,
  newStatus: string,
  meta: {
    auditNotes?: string;
    auditedBy?: string;
    syncRef?: string;
    syncNotes?: string;
    releasedBy?: string;
    releaseNotes?: string;
  } = {},
) {
  const release = await getReleaseById(id);
  if (!release) return null;

  const validTransitions: Record<string, string[]> = {
    in_progress: ["audit_pending"],
    audit_pending: ["audit_passed", "in_progress"],
    audit_passed: ["sync_pending", "in_progress"],
    sync_pending: ["released", "in_progress"],
    released: ["revoked"],
    revoked: ["in_progress"],
  };

  const allowed = validTransitions[release.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Ungültiger Statusübergang: ${release.status} → ${newStatus}. Erlaubt: ${allowed.join(", ")}`,
    );
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  if (newStatus === "audit_pending") {
    if (meta.auditNotes) updateData.auditNotes = meta.auditNotes;
    if (meta.auditedBy) updateData.auditedBy = meta.auditedBy;
  }

  if (newStatus === "audit_passed") {
    if (meta.auditNotes) updateData.auditNotes = meta.auditNotes;
    if (meta.auditedBy) updateData.auditedBy = meta.auditedBy;
    updateData.auditedAt = new Date();
  }

  if (newStatus === "sync_pending") {
    if (meta.syncNotes) updateData.syncNotes = meta.syncNotes;
    if (meta.syncRef) updateData.syncRef = meta.syncRef;
  }

  if (newStatus === "released") {
    if (meta.syncNotes) updateData.syncNotes = meta.syncNotes;
    if (meta.syncRef) updateData.syncRef = meta.syncRef;
    updateData.syncedAt = new Date();
    if (meta.releaseNotes) updateData.releaseNotes = meta.releaseNotes;
    if (meta.releasedBy) updateData.releasedBy = meta.releasedBy;
    updateData.releasedAt = new Date();
  }

  const rows = await db
    .update(releasesTable)
    .set(updateData)
    .where(eq(releasesTable.id, id))
    .returning();
  return rows[0] ?? null;
}
