import { db } from "@workspace/db";
import {
  confidentialityAccessConfigTable,
  confidentialityPrincipalAccessTable,
  roleAssignmentsTable,
  principalsTable,
} from "@workspace/db/schema";
import { eq, and, inArray, or, sql } from "drizzle-orm";
import type { ConfidentialityLevel } from "./confidentiality.service";

/**
 * A single Microsoft Graph externalItem ACL entry.
 * https://learn.microsoft.com/en-us/graph/api/resources/externalconnectors-acl
 */
export interface GraphAclEntry {
  type: "user" | "group" | "everyone";
  value: string;
  accessType: "grant" | "deny";
  identitySource?: "azureActiveDirectory";
}

const EVERYONE_ACL: GraphAclEntry[] = [
  { type: "everyone", value: "everyone", accessType: "grant" },
];

/**
 * Builds the Graph ACL for a given confidentiality level by resolving:
 *  - roles allowed for the level (confidentiality_access_config.allowed_roles)
 *    -> active role assignments -> principals' Entra object ids, and
 *  - individually-assigned principals (confidentiality_principal_access).
 *
 * "public" always maps to the built-in "everyone" ACL entry. Any other
 * level with no resolvable principals returns an empty array — callers
 * must treat an empty ACL as non-indexable (see Cluster 3 indexability
 * rule) rather than silently falling back to "everyone".
 */
export async function buildAclForConfidentialityLevel(
  level: ConfidentialityLevel,
): Promise<GraphAclEntry[]> {
  if (level === "public") {
    return EVERYONE_ACL;
  }

  const [config] = await db
    .select({ allowedRoles: confidentialityAccessConfigTable.allowedRoles })
    .from(confidentialityAccessConfigTable)
    .where(eq(confidentialityAccessConfigTable.level, level));

  const allowedRoles = config?.allowedRoles ?? [];

  const principalsFromRoles = allowedRoles.length
    ? await db
        .select({
          externalId: principalsTable.externalId,
          principalType: principalsTable.principalType,
        })
        .from(roleAssignmentsTable)
        .innerJoin(
          principalsTable,
          eq(roleAssignmentsTable.principalId, principalsTable.id),
        )
        .where(
          and(
            inArray(roleAssignmentsTable.role, allowedRoles as never[]),
            eq(roleAssignmentsTable.isActive, true),
            eq(principalsTable.externalProvider, "entra"),
            or(
              sql`${roleAssignmentsTable.expiresAt} IS NULL`,
              sql`${roleAssignmentsTable.expiresAt} > NOW()`,
            ),
          ),
        )
    : [];

  const principalsFromDirectAccess = await db
    .select({
      externalId: principalsTable.externalId,
      principalType: principalsTable.principalType,
    })
    .from(confidentialityPrincipalAccessTable)
    .innerJoin(
      principalsTable,
      eq(confidentialityPrincipalAccessTable.principalId, principalsTable.id),
    )
    .where(
      and(
        eq(confidentialityPrincipalAccessTable.level, level),
        eq(principalsTable.externalProvider, "entra"),
      ),
    );

  const seen = new Set<string>();
  const entries: GraphAclEntry[] = [];

  for (const p of [...principalsFromRoles, ...principalsFromDirectAccess]) {
    if (!p.externalId || seen.has(p.externalId)) continue;
    seen.add(p.externalId);
    entries.push({
      type: p.principalType === "group" ? "group" : "user",
      value: p.externalId,
      accessType: "grant",
      identitySource: "azureActiveDirectory",
    });
  }

  return entries;
}
