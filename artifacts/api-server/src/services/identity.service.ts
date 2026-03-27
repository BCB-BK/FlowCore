import { db } from "@workspace/db";
import {
  contentNodesTable,
  contentAliasesTable,
  auditEventsTable,
  type InsertContentNode,
} from "@workspace/db/schema";
import { eq, and, isNull, sql, asc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { logger } from "../lib/logger";
import { type InsertAuditEvent } from "../lib/audit";
import crypto from "node:crypto";
import { getDisplayIdPrefix } from "@workspace/shared/page-types";

function generateImmutableId(): string {
  return `WN-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
}

function getPrefix(templateType: string): string {
  return getDisplayIdPrefix(templateType);
}

async function acquireParentLock(
  tx: NodePgDatabase<any>,
  parentNodeId: string | null | undefined,
): Promise<void> {
  if (parentNodeId) {
    await tx
      .select({ id: contentNodesTable.id })
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, parentNodeId))
      .for("update");
  } else {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('root_nodes'))`);
  }
}

async function generateDisplayCodeInTx(
  tx: NodePgDatabase<any>,
  templateType: string,
  parentNodeId: string | null | undefined,
): Promise<string> {
  const prefix = getPrefix(templateType);

  let parentCode = "";
  if (parentNodeId) {
    const parent = await tx
      .select({ displayCode: contentNodesTable.displayCode })
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, parentNodeId))
      .limit(1);
    if (parent[0]) {
      parentCode = parent[0].displayCode + ".";
    }
  }

  await acquireParentLock(tx, parentNodeId);

  const maxSuffix = await tx
    .select({
      maxNum: sql<number>`coalesce(max(
        (regexp_match(display_code, '-(\\d+)$'))[1]::int
      ), 0)`,
    })
    .from(contentNodesTable)
    .where(
      parentNodeId
        ? eq(contentNodesTable.parentNodeId, parentNodeId)
        : isNull(contentNodesTable.parentNodeId),
    );

  const nextNum = (maxSuffix[0]?.maxNum ?? 0) + 1;
  return `${parentCode}${prefix}-${String(nextNum).padStart(3, "0")}`;
}

export interface CreateContentNodeInput {
  title: string;
  templateType: InsertContentNode["templateType"];
  templateId?: string | null;
  parentNodeId?: string | null;
  ownerId?: string | null;
  sortOrder?: number;
}

export async function createContentNode(
  input: CreateContentNodeInput,
  auditEvent?: Omit<InsertAuditEvent, "resourceId">,
): Promise<string> {
  const immutableId = generateImmutableId();

  const nodeId = await db.transaction(async (tx) => {
    const displayCode = await generateDisplayCodeInTx(
      tx,
      input.templateType,
      input.parentNodeId,
    );

    const [node] = await tx
      .insert(contentNodesTable)
      .values({
        immutableId,
        displayCode,
        title: input.title,
        templateType: input.templateType,
        templateId: input.templateId,
        parentNodeId: input.parentNodeId,
        ownerId: input.ownerId,
        sortOrder: input.sortOrder ?? 0,
        status: "draft",
      })
      .returning({ id: contentNodesTable.id });

    if (auditEvent) {
      await tx.insert(auditEventsTable).values({
        ...auditEvent,
        resourceId: node.id,
      });
    }

    logger.info(
      { nodeId: node.id, immutableId, displayCode },
      "Content node created",
    );

    return node.id;
  });

  return nodeId;
}

async function recomputeDescendantCodes(
  tx: NodePgDatabase<any>,
  nodeId: string,
  actorId?: string,
): Promise<void> {
  const children = await tx
    .select({
      id: contentNodesTable.id,
      displayCode: contentNodesTable.displayCode,
      templateType: contentNodesTable.templateType,
    })
    .from(contentNodesTable)
    .where(
      and(
        eq(contentNodesTable.parentNodeId, nodeId),
        eq(contentNodesTable.isDeleted, false),
      ),
    )
    .orderBy(
      asc(contentNodesTable.sortOrder),
      asc(contentNodesTable.createdAt),
    );

  const [parentNode] = await tx
    .select({ displayCode: contentNodesTable.displayCode })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, nodeId));

  if (!parentNode) return;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const prefix = getPrefix(child.templateType);
    const newCode = `${parentNode.displayCode}.${prefix}-${String(i + 1).padStart(3, "0")}`;

    if (newCode !== child.displayCode) {
      await tx.insert(contentAliasesTable).values({
        nodeId: child.id,
        previousDisplayCode: child.displayCode,
        reason: "parent_restructuring",
        changedBy: actorId,
      });

      await tx
        .update(contentNodesTable)
        .set({ displayCode: newCode, updatedAt: new Date() })
        .where(eq(contentNodesTable.id, child.id));

      await recomputeDescendantCodes(tx, child.id, actorId);
    }
  }
}

async function isDescendant(
  tx: NodePgDatabase<Record<string, unknown>>,
  ancestorId: string,
  candidateId: string,
): Promise<boolean> {
  const result = await tx.execute(
    sql`WITH RECURSIVE ancestors AS (
      SELECT parent_node_id FROM content_nodes WHERE id = ${candidateId}
      UNION ALL
      SELECT cn.parent_node_id FROM content_nodes cn
      JOIN ancestors a ON cn.id = a.parent_node_id
    )
    SELECT 1 FROM ancestors WHERE parent_node_id = ${ancestorId} LIMIT 1`,
  );
  return (result.rows?.length ?? 0) > 0;
}

export async function moveNode(
  nodeId: string,
  newParentNodeId: string | null,
  actorId?: string,
  auditEvent?: InsertAuditEvent,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [node] = await tx
      .select({
        displayCode: contentNodesTable.displayCode,
        templateType: contentNodesTable.templateType,
      })
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, nodeId));

    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    if (newParentNodeId) {
      if (newParentNodeId === nodeId) {
        throw new Error("Cannot move a node under itself");
      }
      const isDesc = await isDescendant(tx, nodeId, newParentNodeId);
      if (isDesc) {
        throw new Error("Cannot move a node under one of its own descendants");
      }
    }

    const oldDisplayCode = node.displayCode;
    const newDisplayCode = await generateDisplayCodeInTx(
      tx,
      node.templateType,
      newParentNodeId,
    );

    await tx.insert(contentAliasesTable).values({
      nodeId,
      previousDisplayCode: oldDisplayCode,
      reason: "restructuring",
      changedBy: actorId,
    });

    await tx
      .update(contentNodesTable)
      .set({
        parentNodeId: newParentNodeId,
        displayCode: newDisplayCode,
        updatedAt: new Date(),
      })
      .where(eq(contentNodesTable.id, nodeId));

    await recomputeDescendantCodes(tx, nodeId, actorId);

    if (auditEvent) {
      await tx.insert(auditEventsTable).values(auditEvent);
    }

    logger.info(
      { nodeId, oldDisplayCode, newDisplayCode },
      "Node moved with alias (descendants updated)",
    );
  });
}
