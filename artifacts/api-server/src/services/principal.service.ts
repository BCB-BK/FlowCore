import { db } from "@workspace/db";
import {
  principalsTable,
  roleAssignmentsTable,
  type InsertPrincipal,
} from "@workspace/db/schema";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function upsertPrincipal(input: {
  principalType: InsertPrincipal["principalType"];
  externalProvider: string;
  externalId: string;
  displayName: string;
  email?: string;
  upn?: string;
}): Promise<string> {
  const [existing] = await db
    .select({ id: principalsTable.id })
    .from(principalsTable)
    .where(
      and(
        eq(principalsTable.externalProvider, input.externalProvider),
        eq(principalsTable.externalId, input.externalId),
      ),
    );

  if (existing) {
    await db
      .update(principalsTable)
      .set({
        displayName: input.displayName,
        email: input.email,
        upn: input.upn,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(principalsTable.id, existing.id));
    return existing.id;
  }

  const [principal] = await db
    .insert(principalsTable)
    .values({
      principalType: input.principalType,
      externalProvider: input.externalProvider,
      externalId: input.externalId,
      displayName: input.displayName,
      email: input.email,
      upn: input.upn,
      lastSyncAt: new Date(),
    })
    .returning({ id: principalsTable.id });

  logger.info(
    { principalId: principal.id, externalId: input.externalId },
    "Principal created",
  );
  return principal.id;
}

export async function getPrincipalById(id: string) {
  const [principal] = await db
    .select()
    .from(principalsTable)
    .where(eq(principalsTable.id, id));
  return principal ?? null;
}

export async function getPrincipalByExternalId(
  provider: string,
  externalId: string,
) {
  const [principal] = await db
    .select()
    .from(principalsTable)
    .where(
      and(
        eq(principalsTable.externalProvider, provider),
        eq(principalsTable.externalId, externalId),
      ),
    );
  return principal ?? null;
}

export async function searchPrincipals(query: string, limit = 20) {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(principalsTable)
    .where(
      and(
        eq(principalsTable.status, "active"),
        or(
          ilike(principalsTable.displayName, pattern),
          ilike(principalsTable.email, pattern),
        ),
      ),
    )
    .limit(limit);
}

export async function listPrincipals(limit = 50, offset = 0) {
  return db
    .select()
    .from(principalsTable)
    .where(eq(principalsTable.status, "active"))
    .limit(limit)
    .offset(offset);
}

export async function getRolesForPrincipal(principalId: string) {
  return db
    .select()
    .from(roleAssignmentsTable)
    .where(
      and(
        eq(roleAssignmentsTable.principalId, principalId),
        eq(roleAssignmentsTable.isActive, true),
      ),
    );
}

export async function assignRole(input: {
  principalId: string;
  role: InsertPrincipal["principalType"] extends never
    ? string
    :
        | "system_admin"
        | "process_manager"
        | "editor"
        | "reviewer"
        | "approver"
        | "viewer"
        | "compliance_manager";
  scope?: string;
  grantedBy?: string;
}) {
  const existing = await db
    .select({ id: roleAssignmentsTable.id })
    .from(roleAssignmentsTable)
    .where(
      and(
        eq(roleAssignmentsTable.principalId, input.principalId),
        eq(roleAssignmentsTable.role, input.role as "system_admin"),
        eq(roleAssignmentsTable.scope, input.scope ?? "global"),
        eq(roleAssignmentsTable.isActive, true),
      ),
    );

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [assignment] = await db
    .insert(roleAssignmentsTable)
    .values({
      principalId: input.principalId,
      role: input.role as "system_admin",
      scope: input.scope ?? "global",
      grantedBy: input.grantedBy,
    })
    .returning({ id: roleAssignmentsTable.id });

  logger.info(
    { principalId: input.principalId, role: input.role },
    "Role assigned",
  );
  return assignment.id;
}

export async function revokeRole(assignmentId: string) {
  await db
    .update(roleAssignmentsTable)
    .set({ isActive: false })
    .where(eq(roleAssignmentsTable.id, assignmentId));
}
