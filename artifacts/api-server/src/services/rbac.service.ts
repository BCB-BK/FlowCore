import { db } from "@workspace/db";
import {
  roleAssignmentsTable,
  pagePermissionsTable,
  contentNodesTable,
  nodeOwnershipTable,
  deputyDelegationsTable,
  sodConfigTable,
} from "@workspace/db/schema";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

export type WikiRole =
  | "system_admin"
  | "process_manager"
  | "editor"
  | "reviewer"
  | "approver"
  | "viewer"
  | "compliance_manager";

export type WikiPermission =
  | "read_page"
  | "create_page"
  | "edit_content"
  | "edit_structure"
  | "manage_relations"
  | "submit_for_review"
  | "review_page"
  | "approve_page"
  | "archive_page"
  | "manage_permissions"
  | "manage_templates"
  | "manage_settings"
  | "view_audit_log"
  | "manage_connectors"
  | "manage_backup"
  | "run_backup"
  | "restore_backup"
  | "view_backups"
  | "manage_media"
  | "view_home"
  | "view_search"
  | "view_glossary"
  | "view_dashboard"
  | "view_tasks"
  | "view_settings"
  | "view_backups"
  | "manage_backups"
  | "run_backup"
  | "restore_backup"
  | "create_working_copy"
  | "edit_working_copy"
  | "submit_working_copy"
  | "review_working_copy"
  | "amend_working_copy_in_review"
  | "publish_working_copy"
  | "cancel_working_copy"
  | "force_unlock_working_copy";

const ROLE_PERMISSIONS: Record<WikiRole, WikiPermission[]> = {
  system_admin: [
    "read_page",
    "create_page",
    "edit_content",
    "edit_structure",
    "manage_relations",
    "submit_for_review",
    "review_page",
    "approve_page",
    "archive_page",
    "manage_permissions",
    "manage_templates",
    "manage_settings",
    "view_audit_log",
    "manage_connectors",
    "manage_backup",
    "run_backup",
    "restore_backup",
    "view_backups",
    "manage_media",
    "view_home",
    "view_search",
    "view_glossary",
    "view_dashboard",
    "view_tasks",
    "view_settings",
    "view_backups",
    "manage_backups",
    "run_backup",
    "restore_backup",
    "create_working_copy",
    "edit_working_copy",
    "submit_working_copy",
    "review_working_copy",
    "amend_working_copy_in_review",
    "publish_working_copy",
    "cancel_working_copy",
    "force_unlock_working_copy",
  ],
  process_manager: [
    "read_page",
    "create_page",
    "edit_content",
    "edit_structure",
    "manage_relations",
    "submit_for_review",
    "review_page",
    "approve_page",
    "archive_page",
    "manage_permissions",
    "manage_templates",
    "view_audit_log",
    "view_home",
    "view_search",
    "view_glossary",
    "view_dashboard",
    "view_tasks",
    "view_settings",
    "review_working_copy",
    "amend_working_copy_in_review",
  ],
  editor: [
    "read_page",
    "create_page",
    "edit_content",
    "manage_relations",
    "submit_for_review",
    "view_home",
    "view_search",
    "view_glossary",
    "view_dashboard",
    "view_tasks",
    "create_working_copy",
    "edit_working_copy",
    "submit_working_copy",
    "cancel_working_copy",
  ],
  reviewer: [
    "read_page",
    "review_page",
    "view_audit_log",
    "view_home",
    "view_search",
    "view_glossary",
    "view_dashboard",
    "view_tasks",
    "review_working_copy",
  ],
  approver: [
    "read_page",
    "review_page",
    "approve_page",
    "view_audit_log",
    "view_home",
    "view_search",
    "view_glossary",
    "view_dashboard",
    "view_tasks",
    "publish_working_copy",
  ],
  compliance_manager: [
    "read_page",
    "review_page",
    "view_audit_log",
    "manage_templates",
    "view_backups",
    "view_home",
    "view_search",
    "view_glossary",
    "view_dashboard",
    "view_tasks",
    "view_settings",
  ],
  viewer: ["read_page", "view_home", "view_search", "view_glossary"],
};

export function getPermissionsForRole(role: WikiRole): WikiPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function getRolePermissionMatrix(): Record<WikiRole, WikiPermission[]> {
  return { ...ROLE_PERMISSIONS };
}

const ROLE_PRIORITY: WikiRole[] = [
  "system_admin",
  "compliance_manager",
  "process_manager",
  "approver",
  "reviewer",
  "editor",
  "viewer",
];

export async function getUserRoles(
  principalId: string,
  globalOnly = false,
): Promise<WikiRole[]> {
  const conditions = [
    eq(roleAssignmentsTable.principalId, principalId),
    eq(roleAssignmentsTable.isActive, true),
    or(
      sql`${roleAssignmentsTable.expiresAt} IS NULL`,
      sql`${roleAssignmentsTable.expiresAt} > NOW()`,
    )!,
  ];

  if (globalOnly) {
    conditions.push(eq(roleAssignmentsTable.scope, "global"));
  }

  const rows = await db
    .select({ role: roleAssignmentsTable.role })
    .from(roleAssignmentsTable)
    .where(and(...conditions));

  return rows.map((r) => r.role as WikiRole);
}

export async function getHighestRole(principalId: string): Promise<WikiRole> {
  const roles = await getUserRoles(principalId, true);
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return "viewer";
}

export type SearchVisibility = "published_only" | "include_review" | "all";

export function getSearchVisibilityForRole(role: WikiRole): SearchVisibility {
  if (role === "system_admin" || role === "compliance_manager") return "all";
  if (
    role === "process_manager" ||
    role === "approver" ||
    role === "reviewer" ||
    role === "editor"
  )
    return "include_review";
  return "published_only";
}

export async function getEffectivePermissions(
  principalId: string,
  nodeId?: string,
): Promise<Set<WikiPermission>> {
  const permissions = new Set<WikiPermission>();

  const roles = await db
    .select({
      role: roleAssignmentsTable.role,
      scope: roleAssignmentsTable.scope,
    })
    .from(roleAssignmentsTable)
    .where(
      and(
        eq(roleAssignmentsTable.principalId, principalId),
        eq(roleAssignmentsTable.isActive, true),
        or(
          sql`${roleAssignmentsTable.expiresAt} IS NULL`,
          sql`${roleAssignmentsTable.expiresAt} > NOW()`,
        ),
      ),
    );

  const scopeConditions = nodeId
    ? await resolveNodeScopes(nodeId)
    : new Set<string>();
  scopeConditions.add("global");

  for (const { role, scope } of roles) {
    if (!scopeConditions.has(scope)) continue;

    const rolePerms = ROLE_PERMISSIONS[role as WikiRole];
    if (rolePerms) {
      for (const p of rolePerms) {
        permissions.add(p);
      }
    }
  }

  if (nodeId) {
    const pagePerms = await resolvePagePermissions(principalId, nodeId);
    for (const p of pagePerms) {
      permissions.add(p);
    }
  }

  const deputyPerms = await resolveDeputyPermissions(principalId, nodeId);
  for (const p of deputyPerms) {
    permissions.add(p);
  }

  return permissions;
}

const nodeScopeCache = new Map<string, { scopes: Set<string>; expiresAt: number }>();
const NODE_SCOPE_CACHE_TTL_MS = 30_000;

async function resolveNodeScopes(nodeId: string): Promise<Set<string>> {
  const cached = nodeScopeCache.get(nodeId);
  if (cached && cached.expiresAt > Date.now()) {
    return new Set(cached.scopes);
  }

  const rows = (await db.execute(sql`
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
  `)).rows as Array<{ id: string; display_code: string | null }>;

  const scopes = new Set<string>();
  for (const row of rows) {
    scopes.add(`node:${row.id}`);
    if (row.display_code) {
      scopes.add(`code:${row.display_code}`);
    }
  }
  scopes.add("global");

  nodeScopeCache.set(nodeId, { scopes: new Set(scopes), expiresAt: Date.now() + NODE_SCOPE_CACHE_TTL_MS });

  if (nodeScopeCache.size > 500) {
    const now = Date.now();
    for (const [key, val] of nodeScopeCache) {
      if (val.expiresAt <= now) nodeScopeCache.delete(key);
    }
    if (nodeScopeCache.size > 1000) {
      const entries = [...nodeScopeCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      const toRemove = entries.slice(0, entries.length - 500);
      for (const [key] of toRemove) nodeScopeCache.delete(key);
    }
  }

  return scopes;
}

export async function hasPermission(
  principalId: string,
  permission: WikiPermission,
  nodeId?: string,
): Promise<boolean> {
  const perms = await getEffectivePermissions(principalId, nodeId);
  return perms.has(permission);
}

export async function hasPermissionBatch(
  principalId: string,
  permission: WikiPermission,
  nodeIds: string[],
): Promise<Map<string, boolean>> {
  if (nodeIds.length === 0) return new Map();

  const uniqueNodeIds = [...new Set(nodeIds)];

  const roles = await db
    .select({
      role: roleAssignmentsTable.role,
      scope: roleAssignmentsTable.scope,
    })
    .from(roleAssignmentsTable)
    .where(
      and(
        eq(roleAssignmentsTable.principalId, principalId),
        eq(roleAssignmentsTable.isActive, true),
        or(
          sql`${roleAssignmentsTable.expiresAt} IS NULL`,
          sql`${roleAssignmentsTable.expiresAt} > NOW()`,
        ),
      ),
    );

  const globalGranted = roles.some(
    (r) =>
      r.scope === "global" &&
      (ROLE_PERMISSIONS[r.role as WikiRole] ?? []).includes(permission),
  );

  if (globalGranted) {
    return new Map(uniqueNodeIds.map((id) => [id, true]));
  }

  const ancestorRows: Array<{
    origin_node_id: string;
    id: string;
    display_code: string | null;
    depth: number;
  }> = (
    await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_node_id, display_code, id AS origin_node_id, 0 AS depth
      FROM content_nodes
      WHERE id = ANY(${uniqueNodeIds}::uuid[])
      UNION
      SELECT cn.id, cn.parent_node_id, cn.display_code, a.origin_node_id, a.depth + 1
      FROM content_nodes cn
      JOIN ancestors a ON cn.id = a.parent_node_id
      WHERE a.depth < 100
    )
    SELECT origin_node_id, id, display_code, depth FROM ancestors
  `)
  ).rows as Array<{
    origin_node_id: string;
    id: string;
    display_code: string | null;
    depth: number;
  }>;

  const nodeScopeMaps = new Map<string, Set<string>>();
  const nodeAncestorChains = new Map<
    string,
    Array<{ id: string; depth: number }>
  >();
  for (const nodeId of uniqueNodeIds) {
    nodeScopeMaps.set(nodeId, new Set(["global", `node:${nodeId}`]));
    nodeAncestorChains.set(nodeId, [{ id: nodeId, depth: -1 }]);
  }
  for (const row of ancestorRows) {
    const scopes = nodeScopeMaps.get(row.origin_node_id)!;
    scopes.add(`node:${row.id}`);
    if (row.display_code) scopes.add(`code:${row.display_code}`);
    nodeAncestorChains.get(row.origin_node_id)!.push({
      id: row.id,
      depth: row.depth,
    });
  }
  for (const chain of nodeAncestorChains.values()) {
    chain.sort((a, b) => a.depth - b.depth);
  }

  const result = new Map<string, boolean>();
  for (const nodeId of uniqueNodeIds) {
    const scopes = nodeScopeMaps.get(nodeId)!;
    let granted = false;
    for (const { role, scope } of roles) {
      if (!scopes.has(scope)) continue;
      if ((ROLE_PERMISSIONS[role as WikiRole] ?? []).includes(permission)) {
        granted = true;
        break;
      }
    }
    result.set(nodeId, granted);
  }

  const ungrantedNodeIds = uniqueNodeIds.filter((id) => !result.get(id));
  if (ungrantedNodeIds.length > 0) {
    const allAncestorIds = new Set<string>();
    for (const nodeId of ungrantedNodeIds) {
      for (const ancestor of nodeAncestorChains.get(nodeId)!) {
        allAncestorIds.add(ancestor.id);
      }
    }

    if (allAncestorIds.size > 0) {
      const pagePerms = await db
        .select({
          nodeId: pagePermissionsTable.nodeId,
          permission: pagePermissionsTable.permission,
        })
        .from(pagePermissionsTable)
        .where(
          and(
            eq(pagePermissionsTable.principalId, principalId),
            inArray(pagePermissionsTable.nodeId, [...allAncestorIds]),
          ),
        );

      const permsByNode = new Map<string, string[]>();
      for (const pp of pagePerms) {
        if (!permsByNode.has(pp.nodeId)) permsByNode.set(pp.nodeId, []);
        permsByNode.get(pp.nodeId)!.push(pp.permission);
      }

      for (const nodeId of ungrantedNodeIds) {
        const chain = nodeAncestorChains.get(nodeId)!;
        for (const ancestor of chain) {
          const permsForAncestor = permsByNode.get(ancestor.id);
          if (permsForAncestor && permsForAncestor.length > 0) {
            if (permsForAncestor.includes(permission)) {
              result.set(nodeId, true);
            }
            break;
          }
        }
      }
    }
  }

  const stillUngrantedNodeIds = uniqueNodeIds.filter((id) => !result.get(id));
  if (stillUngrantedNodeIds.length > 0) {
    const delegations = await db
      .select({
        delegatorId: deputyDelegationsTable.principalId,
        scope: deputyDelegationsTable.scope,
      })
      .from(deputyDelegationsTable)
      .where(
        and(
          eq(deputyDelegationsTable.deputyId, principalId),
          eq(deputyDelegationsTable.isActive, true),
          sql`${deputyDelegationsTable.startsAt} <= NOW()`,
          or(
            sql`${deputyDelegationsTable.endsAt} IS NULL`,
            sql`${deputyDelegationsTable.endsAt} > NOW()`,
          ),
        ),
      );

    if (delegations.length > 0) {
      const delegatorIds = [
        ...new Set(delegations.map((d) => d.delegatorId)),
      ];
      const delegatorRoles = await db
        .select({
          principalId: roleAssignmentsTable.principalId,
          role: roleAssignmentsTable.role,
          scope: roleAssignmentsTable.scope,
        })
        .from(roleAssignmentsTable)
        .where(
          and(
            inArray(roleAssignmentsTable.principalId, delegatorIds),
            eq(roleAssignmentsTable.isActive, true),
            or(
              sql`${roleAssignmentsTable.expiresAt} IS NULL`,
              sql`${roleAssignmentsTable.expiresAt} > NOW()`,
            ),
          ),
        );

      for (const nodeId of stillUngrantedNodeIds) {
        const nodeScopes = nodeScopeMaps.get(nodeId)!;
        let granted = false;
        for (const delegation of delegations) {
          const delegationScopeOk =
            delegation.scope === "global" ||
            nodeScopes.has(delegation.scope);
          if (!delegationScopeOk) continue;

          for (const dr of delegatorRoles) {
            if (dr.principalId !== delegation.delegatorId) continue;
            if (!nodeScopes.has(dr.scope)) continue;
            if (
              (ROLE_PERMISSIONS[dr.role as WikiRole] ?? []).includes(permission)
            ) {
              granted = true;
              break;
            }
          }
          if (granted) break;
        }
        if (granted) result.set(nodeId, true);
      }
    }
  }

  for (const nodeId of uniqueNodeIds) {
    if (!result.has(nodeId)) result.set(nodeId, false);
  }

  return result;
}

async function resolvePagePermissions(
  principalId: string,
  nodeId: string,
): Promise<WikiPermission[]> {
  const rows = (await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_node_id, 0 AS depth
      FROM content_nodes
      WHERE id = ${nodeId}::uuid
      UNION
      SELECT cn.id, cn.parent_node_id, a.depth + 1
      FROM content_nodes cn
      JOIN ancestors a ON cn.id = a.parent_node_id
      WHERE a.depth < 100
    )
    SELECT pp.permission, a.depth
    FROM page_permissions pp
    JOIN ancestors a ON pp.node_id = a.id
    WHERE pp.principal_id = ${principalId}::uuid
    ORDER BY a.depth ASC
  `)).rows as Array<{ permission: string; depth: number }>;

  if (rows.length === 0) return [];

  const closestDepth = rows[0].depth;
  return rows
    .filter((r) => r.depth === closestDepth)
    .map((r) => r.permission as WikiPermission);
}

async function resolveDeputyPermissions(
  principalId: string,
  nodeId?: string,
): Promise<WikiPermission[]> {
  const activeDelegations = await db
    .select({
      delegatorId: deputyDelegationsTable.principalId,
      scope: deputyDelegationsTable.scope,
    })
    .from(deputyDelegationsTable)
    .where(
      and(
        eq(deputyDelegationsTable.deputyId, principalId),
        eq(deputyDelegationsTable.isActive, true),
        sql`${deputyDelegationsTable.startsAt} <= NOW()`,
        or(
          sql`${deputyDelegationsTable.endsAt} IS NULL`,
          sql`${deputyDelegationsTable.endsAt} > NOW()`,
        ),
      ),
    );

  if (activeDelegations.length === 0) return [];

  const inheritedPerms: WikiPermission[] = [];

  for (const delegation of activeDelegations) {
    const delegatorRoles = await db
      .select({
        role: roleAssignmentsTable.role,
        scope: roleAssignmentsTable.scope,
      })
      .from(roleAssignmentsTable)
      .where(
        and(
          eq(roleAssignmentsTable.principalId, delegation.delegatorId),
          eq(roleAssignmentsTable.isActive, true),
          or(
            sql`${roleAssignmentsTable.expiresAt} IS NULL`,
            sql`${roleAssignmentsTable.expiresAt} > NOW()`,
          ),
        ),
      );

    const scopeConditions = nodeId
      ? await resolveNodeScopes(nodeId)
      : new Set<string>();
    scopeConditions.add("global");

    const delegationScopeOk =
      delegation.scope === "global" ||
      scopeConditions.has(delegation.scope);

    if (!delegationScopeOk) continue;

    for (const { role, scope } of delegatorRoles) {
      if (!scopeConditions.has(scope)) continue;
      const rolePerms = ROLE_PERMISSIONS[role as WikiRole];
      if (rolePerms) {
        for (const p of rolePerms) {
          inheritedPerms.push(p);
        }
      }
    }

    logger.debug(
      {
        deputyId: principalId,
        delegatorId: delegation.delegatorId,
        permCount: inheritedPerms.length,
      },
      "Deputy permissions resolved via active delegation",
    );
  }

  return inheritedPerms;
}

export interface SodCheckResult {
  allowed: boolean;
  rule: string;
  reason?: string;
}

const SOD_RULES = {
  four_eyes_review: {
    description: "Einreicher darf eigene Inhalte nicht prüfen/freigeben (Vier-Augen-Prinzip)",
  },
  four_eyes_publish: {
    description: "Einreicher darf eigene Inhalte nicht veröffentlichen (Vier-Augen-Prinzip)",
  },
} as const;

export type SodRuleKey = keyof typeof SOD_RULES;

export async function checkSeparationOfDuties(
  ruleKey: SodRuleKey,
  actorId: string,
  submitterId: string,
): Promise<SodCheckResult> {
  if (actorId !== submitterId) {
    return { allowed: true, rule: ruleKey };
  }

  const [config] = await db
    .select({ isEnabled: sodConfigTable.isEnabled })
    .from(sodConfigTable)
    .where(eq(sodConfigTable.ruleKey, ruleKey));

  const isEnabled = config ? config.isEnabled : true;

  if (!isEnabled) {
    logger.warn(
      { ruleKey, actorId, submitterId },
      "SoD rule bypassed (disabled by config)",
    );
    return { allowed: true, rule: ruleKey, reason: "rule_disabled" };
  }

  return {
    allowed: false,
    rule: ruleKey,
    reason: SOD_RULES[ruleKey].description,
  };
}

export function getSodRules(): Record<string, { description: string }> {
  return { ...SOD_RULES };
}

export async function getSodConfig(): Promise<
  Array<{ ruleKey: string; description: string; isEnabled: boolean }>
> {
  const rows = await db.select().from(sodConfigTable);
  const result: Array<{
    ruleKey: string;
    description: string;
    isEnabled: boolean;
  }> = [];

  for (const [key, meta] of Object.entries(SOD_RULES)) {
    const row = rows.find((r) => r.ruleKey === key);
    result.push({
      ruleKey: key,
      description: meta.description,
      isEnabled: row ? row.isEnabled : true,
    });
  }

  return result;
}

export function isValidSodRuleKey(key: string): key is SodRuleKey {
  return key in SOD_RULES;
}

export async function updateSodConfig(
  ruleKey: SodRuleKey,
  isEnabled: boolean,
  updatedBy?: string,
  txOrDb: Pick<typeof db, "select" | "insert" | "update"> = db,
): Promise<void> {
  const [existing] = await txOrDb
    .select({ id: sodConfigTable.id })
    .from(sodConfigTable)
    .where(eq(sodConfigTable.ruleKey, ruleKey));

  if (existing) {
    await txOrDb
      .update(sodConfigTable)
      .set({ isEnabled, updatedBy, updatedAt: new Date() })
      .where(eq(sodConfigTable.id, existing.id));
  } else {
    await txOrDb.insert(sodConfigTable).values({
      ruleKey,
      description: SOD_RULES[ruleKey].description,
      isEnabled,
      updatedBy,
    });
  }
}

export async function grantPagePermission(input: {
  nodeId: string;
  principalId: string;
  permission: WikiPermission;
  grantedBy?: string;
}, txOrDb: Pick<typeof db, "select" | "insert"> = db) {
  const [existing] = await txOrDb
    .select({ id: pagePermissionsTable.id })
    .from(pagePermissionsTable)
    .where(
      and(
        eq(pagePermissionsTable.nodeId, input.nodeId),
        eq(pagePermissionsTable.principalId, input.principalId),
        eq(pagePermissionsTable.permission, input.permission as "read_page"),
      ),
    );

  if (existing) return existing.id;

  const [perm] = await txOrDb
    .insert(pagePermissionsTable)
    .values({
      nodeId: input.nodeId,
      principalId: input.principalId,
      permission: input.permission as "read_page",
      grantedBy: input.grantedBy,
    })
    .returning({ id: pagePermissionsTable.id });

  logger.info(
    {
      nodeId: input.nodeId,
      principalId: input.principalId,
      permission: input.permission,
    },
    "Page permission granted",
  );
  return perm.id;
}

export async function revokePagePermission(permissionId: string, txOrDb: Pick<typeof db, "delete"> = db) {
  await txOrDb
    .delete(pagePermissionsTable)
    .where(eq(pagePermissionsTable.id, permissionId));
}

export async function getPagePermissions(nodeId: string) {
  return db
    .select()
    .from(pagePermissionsTable)
    .where(eq(pagePermissionsTable.nodeId, nodeId));
}

export async function setNodeOwnership(input: {
  nodeId: string;
  ownerId: string;
  deputyId?: string;
  reviewerId?: string;
  approverId?: string;
}, txOrDb: Pick<typeof db, "select" | "insert" | "update"> = db) {
  const [existing] = await txOrDb
    .select({ id: nodeOwnershipTable.id })
    .from(nodeOwnershipTable)
    .where(eq(nodeOwnershipTable.nodeId, input.nodeId));

  if (existing) {
    await txOrDb
      .update(nodeOwnershipTable)
      .set({
        ownerId: input.ownerId,
        deputyId: input.deputyId,
        reviewerId: input.reviewerId,
        approverId: input.approverId,
        updatedAt: new Date(),
      })
      .where(eq(nodeOwnershipTable.id, existing.id));
    return existing.id;
  }

  const [ownership] = await txOrDb
    .insert(nodeOwnershipTable)
    .values({
      nodeId: input.nodeId,
      ownerId: input.ownerId,
      deputyId: input.deputyId,
      reviewerId: input.reviewerId,
      approverId: input.approverId,
    })
    .returning({ id: nodeOwnershipTable.id });

  return ownership.id;
}

export async function getNodeOwnership(nodeId: string) {
  const [ownership] = await db
    .select()
    .from(nodeOwnershipTable)
    .where(eq(nodeOwnershipTable.nodeId, nodeId));
  return ownership ?? null;
}

export async function getActiveDelegationsForDeputy(deputyId: string) {
  return db
    .select()
    .from(deputyDelegationsTable)
    .where(
      and(
        eq(deputyDelegationsTable.deputyId, deputyId),
        eq(deputyDelegationsTable.isActive, true),
        sql`${deputyDelegationsTable.startsAt} <= NOW()`,
        or(
          sql`${deputyDelegationsTable.endsAt} IS NULL`,
          sql`${deputyDelegationsTable.endsAt} > NOW()`,
        ),
      ),
    );
}

export async function getActiveDelegationsForPrincipal(principalId: string) {
  return db
    .select()
    .from(deputyDelegationsTable)
    .where(
      and(
        eq(deputyDelegationsTable.principalId, principalId),
        eq(deputyDelegationsTable.isActive, true),
        sql`${deputyDelegationsTable.startsAt} <= NOW()`,
        or(
          sql`${deputyDelegationsTable.endsAt} IS NULL`,
          sql`${deputyDelegationsTable.endsAt} > NOW()`,
        ),
      ),
    );
}

export async function createDelegation(input: {
  principalId: string;
  deputyId: string;
  scope?: string;
  reason?: string;
  startsAt: Date;
  endsAt?: Date;
  createdBy?: string;
}, txOrDb: Pick<typeof db, "insert"> = db): Promise<string> {
  const [delegation] = await txOrDb
    .insert(deputyDelegationsTable)
    .values({
      principalId: input.principalId,
      deputyId: input.deputyId,
      scope: input.scope ?? "global",
      reason: input.reason,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdBy: input.createdBy,
    })
    .returning({ id: deputyDelegationsTable.id });

  logger.info(
    {
      delegationId: delegation.id,
      principalId: input.principalId,
      deputyId: input.deputyId,
      scope: input.scope,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    },
    "Deputy delegation created",
  );

  return delegation.id;
}

export async function revokeDelegation(delegationId: string, txOrDb: Pick<typeof db, "update"> = db): Promise<void> {
  await txOrDb
    .update(deputyDelegationsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(deputyDelegationsTable.id, delegationId));
}

export async function getDelegationById(delegationId: string) {
  const [delegation] = await db
    .select()
    .from(deputyDelegationsTable)
    .where(eq(deputyDelegationsTable.id, delegationId))
    .limit(1);
  return delegation ?? null;
}

export async function getAllDelegations() {
  return db.select().from(deputyDelegationsTable);
}
