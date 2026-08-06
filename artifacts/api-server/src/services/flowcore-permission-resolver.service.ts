import { db } from "@workspace/db";
import {
  roleAssignmentsTable,
  pagePermissionsTable,
  deputyDelegationsTable,
  nodeOwnershipTable,
  contentNodesTable,
  contentRevisionsTable,
  confidentialityAccessConfigTable,
  confidentialityPrincipalAccessTable,
} from "@workspace/db/schema";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import { getPermissionsForRole } from "./rbac.service";
import type { ConfidentialityLevel } from "./confidentiality.service";
import { logger } from "../lib/logger";

/**
 * FlowCorePermissionResolver (Cluster 5): resolves the *complete* set of
 * FlowCore principal ids that have effective read access to a node, by
 * combining every access path the wiki supports:
 *  - global roles with `read_page`
 *  - node-scoped roles with `read_page` (inherited through ancestor nodes)
 *  - explicit `page_permissions` grants of `read_page` on the node or an
 *    ancestor
 *  - active deputy delegations (a deputy inherits the delegator's access
 *    while the delegation window is active)
 *  - node ownership (owner / deputy / reviewer / approver are always named
 *    persons with access, regardless of confidentiality)
 *  - confidentiality-level access (`confidentiality_access_config.allowed_roles`
 *    plus individually assigned principals in `confidentiality_principal_access`)
 *
 * This is the single source of truth `GraphAclMappingService` uses to decide
 * *who* an externalItem's ACL should be granted to for the "restricted" tier.
 * It intentionally over-includes (any of the above paths grants access) since
 * under-granting would silently hide content from users who are allowed to
 * see it, while over-granting is caught by the "prefer groups over individual
 * expansion" + fail-closed checks in the mapping service.
 */
export async function resolveReadAccessPrincipals(
  nodeId: string,
): Promise<Set<string>> {
  const principalIds = new Set<string>();

  const ancestorRows = (
    await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_node_id, display_code, 0 AS depth
      FROM content_nodes
      WHERE id = ${nodeId}::uuid
      UNION
      SELECT cn.id, cn.parent_node_id, cn.display_code, a.depth + 1
      FROM content_nodes cn
      JOIN ancestors a ON cn.id = a.parent_node_id
      WHERE a.depth < 100
    )
    SELECT id, display_code FROM ancestors
  `)
  ).rows as Array<{ id: string; display_code: string | null }>;

  // Deliberately excludes the "global" scope: a sitewide role such as
  // system_admin's blanket `read_page` exists to allow normal browsing of
  // public/internal content, not to authorize confidential/strictly
  // confidential material. Restricted-tier ACLs must mirror the same gate
  // `checkConfidentialityAccess` uses (ownership + confidentiality grants),
  // so only node/ancestor-scoped role assignments count here.
  const scopes = new Set<string>();
  for (const row of ancestorRows) {
    scopes.add(`node:${row.id}`);
    if (row.display_code) scopes.add(`code:${row.display_code}`);
  }

  const roleRows = await db
    .select({
      principalId: roleAssignmentsTable.principalId,
      role: roleAssignmentsTable.role,
      scope: roleAssignmentsTable.scope,
    })
    .from(roleAssignmentsTable)
    .where(
      and(
        eq(roleAssignmentsTable.isActive, true),
        or(
          sql`${roleAssignmentsTable.expiresAt} IS NULL`,
          sql`${roleAssignmentsTable.expiresAt} > NOW()`,
        ),
      ),
    );

  const grantedViaRole = new Set<string>();
  for (const row of roleRows) {
    if (!scopes.has(row.scope)) continue;
    const perms = getPermissionsForRole(row.role);
    if (perms.includes("read_page")) {
      principalIds.add(row.principalId);
      grantedViaRole.add(row.principalId);
    }
  }

  const ancestorIds = ancestorRows.map((r) => r.id);
  if (ancestorIds.length > 0) {
    const pagePerms = await db
      .select({
        principalId: pagePermissionsTable.principalId,
      })
      .from(pagePermissionsTable)
      .where(
        and(
          inArray(pagePermissionsTable.nodeId, ancestorIds),
          eq(pagePermissionsTable.permission, "read_page"),
        ),
      );
    for (const row of pagePerms) {
      principalIds.add(row.principalId);
    }
  }

  const activeDelegations = await db
    .select({
      delegatorId: deputyDelegationsTable.principalId,
      deputyId: deputyDelegationsTable.deputyId,
      scope: deputyDelegationsTable.scope,
    })
    .from(deputyDelegationsTable)
    .where(
      and(
        eq(deputyDelegationsTable.isActive, true),
        sql`${deputyDelegationsTable.startsAt} <= NOW()`,
        or(
          sql`${deputyDelegationsTable.endsAt} IS NULL`,
          sql`${deputyDelegationsTable.endsAt} > NOW()`,
        ),
      ),
    );

  for (const delegation of activeDelegations) {
    const scopeOk =
      delegation.scope === "global" || scopes.has(delegation.scope);
    if (!scopeOk) continue;
    if (principalIds.has(delegation.delegatorId)) {
      principalIds.add(delegation.deputyId);
    }
  }

  const [ownership] = await db
    .select({
      ownerId: nodeOwnershipTable.ownerId,
      deputyId: nodeOwnershipTable.deputyId,
      reviewerId: nodeOwnershipTable.reviewerId,
      approverId: nodeOwnershipTable.approverId,
    })
    .from(nodeOwnershipTable)
    .where(eq(nodeOwnershipTable.nodeId, nodeId));

  if (ownership) {
    if (ownership.ownerId) principalIds.add(ownership.ownerId);
    if (ownership.deputyId) principalIds.add(ownership.deputyId);
    if (ownership.reviewerId) principalIds.add(ownership.reviewerId);
    if (ownership.approverId) principalIds.add(ownership.approverId);
  }

  const [node] = await db
    .select({
      ownerId: contentNodesTable.ownerId,
      publishedRevisionId: contentNodesTable.publishedRevisionId,
      currentRevisionId: contentNodesTable.currentRevisionId,
    })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, nodeId));

  if (node?.ownerId) principalIds.add(node.ownerId);

  const revisionId = node?.publishedRevisionId || node?.currentRevisionId;
  if (revisionId) {
    const [rev] = await db
      .select({
        reviewerId: contentRevisionsTable.reviewerId,
        approverId: contentRevisionsTable.approverId,
      })
      .from(contentRevisionsTable)
      .where(eq(contentRevisionsTable.id, revisionId));
    if (rev?.reviewerId) principalIds.add(rev.reviewerId);
    if (rev?.approverId) principalIds.add(rev.approverId);
  }

  logger.debug(
    { nodeId, resolvedCount: principalIds.size },
    "FlowCorePermissionResolver: resolved read-access principals via RBAC/ownership",
  );

  return principalIds;
}

/**
 * Adds principals granted access via the confidentiality model for a given
 * level (allowed_roles -> global role holders, plus individually assigned
 * principals) into the provided set. Kept separate from
 * {@link resolveReadAccessPrincipals} so callers building a "restricted"
 * tier ACL can combine plain RBAC access with the confidentiality grant list
 * for the node's specific level.
 */
export async function resolveConfidentialityLevelPrincipals(
  level: ConfidentialityLevel,
): Promise<Set<string>> {
  const principalIds = new Set<string>();
  if (level === "public") return principalIds;

  const [config] = await db
    .select({ allowedRoles: confidentialityAccessConfigTable.allowedRoles })
    .from(confidentialityAccessConfigTable)
    .where(eq(confidentialityAccessConfigTable.level, level));

  const allowedRoles = config?.allowedRoles ?? [];

  if (allowedRoles.length > 0) {
    const rows = await db
      .select({
        principalId: roleAssignmentsTable.principalId,
        role: roleAssignmentsTable.role,
      })
      .from(roleAssignmentsTable)
      .where(
        and(
          inArray(roleAssignmentsTable.role, allowedRoles as never[]),
          eq(roleAssignmentsTable.isActive, true),
          or(
            sql`${roleAssignmentsTable.expiresAt} IS NULL`,
            sql`${roleAssignmentsTable.expiresAt} > NOW()`,
          ),
        ),
      );
    for (const row of rows) principalIds.add(row.principalId);
  }

  const directAccess = await db
    .select({ principalId: confidentialityPrincipalAccessTable.principalId })
    .from(confidentialityPrincipalAccessTable)
    .where(eq(confidentialityPrincipalAccessTable.level, level));

  for (const row of directAccess) principalIds.add(row.principalId);

  return principalIds;
}
