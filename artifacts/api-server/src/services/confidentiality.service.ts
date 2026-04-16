import { db } from "@workspace/db";
import {
  confidentialityPrincipalAccessTable,
  contentNodesTable,
  contentRevisionsTable,
} from "@workspace/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { logger } from "../lib/logger";

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

export const LEVEL_LABELS: Record<ConfidentialityLevel, string> = {
  public: "\u00D6ffentlich",
  internal: "Intern",
  confidential: "Vertraulich",
  strictly_confidential: "Streng vertraulich",
};

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

async function hasPrincipalAccessToLevel(
  principalId: string,
  level: ConfidentialityLevel,
): Promise<boolean> {
  if (level === "public") return true;

  const rows = await db
    .select({ id: confidentialityPrincipalAccessTable.id })
    .from(confidentialityPrincipalAccessTable)
    .where(
      and(
        eq(confidentialityPrincipalAccessTable.level, level),
        eq(confidentialityPrincipalAccessTable.principalId, principalId),
      ),
    )
    .limit(1);

  return rows.length > 0;
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

  const hasAccess = await hasPrincipalAccessToLevel(principalId, level);

  if (!hasAccess) {
    logger.info(
      {
        principalId,
        nodeId,
        confidentialityLevel: level,
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

  const principalLevels = await db
    .select({ level: confidentialityPrincipalAccessTable.level })
    .from(confidentialityPrincipalAccessTable)
    .where(eq(confidentialityPrincipalAccessTable.principalId, principalId));

  const allowedLevels = new Set(principalLevels.map((r) => r.level));
  allowedLevels.add("public");

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

    result.set(node.id, allowedLevels.has(effectiveLevel));
  }

  for (const id of nodeIds) {
    if (!result.has(id)) {
      result.set(id, false);
    }
  }

  return result;
}

export async function getAssignmentsForLevel(level: string) {
  return db
    .select()
    .from(confidentialityPrincipalAccessTable)
    .where(eq(confidentialityPrincipalAccessTable.level, level));
}

export async function getAllAssignments() {
  return db
    .select()
    .from(confidentialityPrincipalAccessTable);
}

export async function assignPrincipalToLevel(
  level: string,
  principalId: string,
  assignedBy: string,
): Promise<void> {
  await db
    .insert(confidentialityPrincipalAccessTable)
    .values({ level, principalId, assignedBy })
    .onConflictDoNothing();
}

export async function removePrincipalFromLevel(
  level: string,
  principalId: string,
): Promise<void> {
  await db
    .delete(confidentialityPrincipalAccessTable)
    .where(
      and(
        eq(confidentialityPrincipalAccessTable.level, level),
        eq(confidentialityPrincipalAccessTable.principalId, principalId),
      ),
    );
}
