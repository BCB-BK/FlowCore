import { db } from "@workspace/db";
import {
  confidentialityAccessConfigTable,
  contentNodesTable,
  contentRevisionsTable,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getUserRoles } from "./rbac.service";

export type ConfidentialityLevel =
  | "public"
  | "internal"
  | "confidential"
  | "strictly_confidential";

export const CONFIDENTIALITY_LEVELS: ConfidentialityLevel[] = [
  "public",
  "internal",
  "confidential",
  "strictly_confidential",
];

export const VALID_ROLES = [
  "system_admin",
  "process_manager",
  "compliance_manager",
  "editor",
  "reviewer",
  "approver",
  "viewer",
];

export const DEFAULT_CONFIDENTIALITY_CONFIG: Record<
  ConfidentialityLevel,
  string[]
> = {
  public: [...VALID_ROLES],
  internal: [...VALID_ROLES],
  confidential: ["system_admin", "process_manager", "compliance_manager"],
  strictly_confidential: ["system_admin"],
};

let configCache: Map<string, string[]> | null = null;
let configCacheExpiresAt = 0;
const CONFIG_CACHE_TTL_MS = 30_000;

export async function getConfidentialityConfig(): Promise<
  Map<string, string[]>
> {
  if (configCache && configCacheExpiresAt > Date.now()) {
    return configCache;
  }

  const rows = await db
    .select()
    .from(confidentialityAccessConfigTable)
    .orderBy(confidentialityAccessConfigTable.level);

  const map = new Map<string, string[]>();
  for (const row of rows) {
    map.set(row.level, row.allowedRoles);
  }

  if (map.size === 0) {
    for (const [level, roles] of Object.entries(
      DEFAULT_CONFIDENTIALITY_CONFIG,
    )) {
      map.set(level, roles);
    }
  }

  configCache = map;
  configCacheExpiresAt = Date.now() + CONFIG_CACHE_TTL_MS;

  return map;
}

export function invalidateConfidentialityConfigCache(): void {
  configCache = null;
  configCacheExpiresAt = 0;
}

export async function getNodeConfidentialityLevel(
  nodeId: string,
): Promise<ConfidentialityLevel | null> {
  const [node] = await db
    .select({
      publishedRevisionId: contentNodesTable.publishedRevisionId,
      currentRevisionId: contentNodesTable.currentRevisionId,
    })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, nodeId));

  if (!node) return null;

  const revisionId = node.publishedRevisionId || node.currentRevisionId;
  if (!revisionId) return null;

  const [revision] = await db
    .select({ structuredFields: contentRevisionsTable.structuredFields })
    .from(contentRevisionsTable)
    .where(eq(contentRevisionsTable.id, revisionId));

  if (!revision?.structuredFields) return null;

  const fields = revision.structuredFields as Record<string, unknown>;
  const level = fields.confidentiality as string | undefined;

  if (!level) return null;

  if (CONFIDENTIALITY_LEVELS.includes(level as ConfidentialityLevel)) {
    return level as ConfidentialityLevel;
  }

  logger.warn({ nodeId, rawLevel: level }, "Unknown confidentiality level on node, treating as strictly_confidential");
  return "strictly_confidential";
}

function isNamedPersonOnNode(
  principalId: string,
  node: {
    ownerId: string | null;
    reviewerId?: string | null;
    approverId?: string | null;
  },
): boolean {
  if (node.ownerId === principalId) return true;
  if (node.reviewerId === principalId) return true;
  if (node.approverId === principalId) return true;
  return false;
}

export async function checkConfidentialityAccess(
  principalId: string,
  nodeId: string,
): Promise<{ allowed: boolean; level: ConfidentialityLevel | null }> {
  const level = await getNodeConfidentialityLevel(nodeId);

  if (!level || level === "public") {
    return { allowed: true, level };
  }

  const [node] = await db
    .select({
      ownerId: contentNodesTable.ownerId,
    })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, nodeId));

  if (!node) return { allowed: false, level };

  const revisionId = await db
    .select({
      publishedRevisionId: contentNodesTable.publishedRevisionId,
      currentRevisionId: contentNodesTable.currentRevisionId,
    })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, nodeId))
    .then((rows) => rows[0]?.publishedRevisionId || rows[0]?.currentRevisionId);

  let reviewerId: string | null = null;
  let approverId: string | null = null;
  if (revisionId) {
    const [rev] = await db
      .select({
        reviewerId: contentRevisionsTable.reviewerId,
        approverId: contentRevisionsTable.approverId,
      })
      .from(contentRevisionsTable)
      .where(eq(contentRevisionsTable.id, revisionId));
    if (rev) {
      reviewerId = rev.reviewerId;
      approverId = rev.approverId;
    }
  }

  if (
    isNamedPersonOnNode(principalId, {
      ownerId: node.ownerId,
      reviewerId,
      approverId,
    })
  ) {
    return { allowed: true, level };
  }

  const config = await getConfidentialityConfig();
  const allowedRoles = config.get(level) || [];

  const userRoles = await getUserRoles(principalId);

  const hasAccess = userRoles.some((role) => allowedRoles.includes(role));

  if (!hasAccess) {
    logger.info(
      {
        principalId,
        nodeId,
        confidentialityLevel: level,
        userRoles,
        allowedRoles,
      },
      "Confidentiality access denied",
    );
  }

  return { allowed: hasAccess, level };
}

export async function checkConfidentialityAccessBatch(
  principalId: string,
  nodeIds: string[],
): Promise<Map<string, boolean>> {
  if (nodeIds.length === 0) return new Map();

  const userRoles = await getUserRoles(principalId);
  const config = await getConfidentialityConfig();

  const isSystemAdmin = userRoles.includes("system_admin" as any);
  if (isSystemAdmin) {
    return new Map(nodeIds.map((id) => [id, true]));
  }

  const nodes = await db
    .select({
      id: contentNodesTable.id,
      ownerId: contentNodesTable.ownerId,
      publishedRevisionId: contentNodesTable.publishedRevisionId,
      currentRevisionId: contentNodesTable.currentRevisionId,
    })
    .from(contentNodesTable)
    .where(
      sql`${contentNodesTable.id} IN (${sql.join(
        nodeIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})`,
    );

  const revisionIds = nodes
    .map((n) => n.publishedRevisionId || n.currentRevisionId)
    .filter(Boolean) as string[];

  const revisions =
    revisionIds.length > 0
      ? await db
          .select({
            id: contentRevisionsTable.id,
            structuredFields: contentRevisionsTable.structuredFields,
            reviewerId: contentRevisionsTable.reviewerId,
            approverId: contentRevisionsTable.approverId,
          })
          .from(contentRevisionsTable)
          .where(
            sql`${contentRevisionsTable.id} IN (${sql.join(
              revisionIds.map((id) => sql`${id}::uuid`),
              sql`, `,
            )})`,
          )
      : [];

  const revisionMap = new Map(revisions.map((r) => [r.id, r]));

  const result = new Map<string, boolean>();

  for (const node of nodes) {
    const revId = node.publishedRevisionId || node.currentRevisionId;
    const rev = revId ? revisionMap.get(revId) : null;
    const fields = (rev?.structuredFields || {}) as Record<string, unknown>;
    const level = fields.confidentiality as string | undefined;

    if (!level || level === "public") {
      result.set(node.id, true);
      continue;
    }

    if (
      node.ownerId === principalId ||
      rev?.reviewerId === principalId ||
      rev?.approverId === principalId
    ) {
      result.set(node.id, true);
      continue;
    }

    const effectiveLevel = CONFIDENTIALITY_LEVELS.includes(level as ConfidentialityLevel)
      ? level
      : "strictly_confidential";
    const allowedRoles = config.get(effectiveLevel) || [];
    const hasAccess = userRoles.some((role) => allowedRoles.includes(role));
    result.set(node.id, hasAccess);
  }

  for (const id of nodeIds) {
    if (!result.has(id)) {
      result.set(id, false);
    }
  }

  return result;
}
