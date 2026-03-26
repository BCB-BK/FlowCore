import { db } from "@workspace/db";
import {
  roleAssignmentsTable,
  pagePermissionsTable,
  contentNodesTable,
  nodeOwnershipTable,
  deputyDelegationsTable,
  sodConfigTable,
} from "@workspace/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
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

async function resolveNodeScopes(nodeId: string): Promise<Set<string>> {
  const scopes = new Set<string>();
  scopes.add(`node:${nodeId}`);

  let currentId: string | null = nodeId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const [node] = await db
      .select({
        parentNodeId: contentNodesTable.parentNodeId,
        displayCode: contentNodesTable.displayCode,
      })
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, currentId));

    if (!node) break;

    if (node.displayCode) {
      scopes.add(`code:${node.displayCode}`);
    }

    if (node.parentNodeId) {
      scopes.add(`node:${node.parentNodeId}`);
      currentId = node.parentNodeId;
    } else {
      currentId = null;
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

async function resolvePagePermissions(
  principalId: string,
  nodeId: string,
): Promise<WikiPermission[]> {
  const directPerms = await db
    .select({ permission: pagePermissionsTable.permission })
    .from(pagePermissionsTable)
    .where(
      and(
        eq(pagePermissionsTable.nodeId, nodeId),
        eq(pagePermissionsTable.principalId, principalId),
      ),
    );

  if (directPerms.length > 0) {
    return directPerms.map((p) => p.permission as WikiPermission);
  }

  const [node] = await db
    .select({ parentNodeId: contentNodesTable.parentNodeId })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, nodeId));

  if (node?.parentNodeId) {
    return resolvePagePermissions(principalId, node.parentNodeId);
  }

  return [];
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
): Promise<void> {
  const [existing] = await db
    .select({ id: sodConfigTable.id })
    .from(sodConfigTable)
    .where(eq(sodConfigTable.ruleKey, ruleKey));

  if (existing) {
    await db
      .update(sodConfigTable)
      .set({ isEnabled, updatedBy, updatedAt: new Date() })
      .where(eq(sodConfigTable.id, existing.id));
  } else {
    await db.insert(sodConfigTable).values({
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
}) {
  const [existing] = await db
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

  const [perm] = await db
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

export async function revokePagePermission(permissionId: string) {
  await db
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
}) {
  const [existing] = await db
    .select({ id: nodeOwnershipTable.id })
    .from(nodeOwnershipTable)
    .where(eq(nodeOwnershipTable.nodeId, input.nodeId));

  if (existing) {
    await db
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

  const [ownership] = await db
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
}): Promise<string> {
  const [delegation] = await db
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

export async function revokeDelegation(delegationId: string): Promise<void> {
  await db
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
