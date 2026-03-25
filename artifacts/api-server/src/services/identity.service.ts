import { db } from "@workspace/db";
import {
  contentNodesTable,
  contentAliasesTable,
  type InsertContentNode,
} from "@workspace/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import crypto from "node:crypto";

function generateImmutableId(): string {
  return `WN-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
}

export async function generateDisplayCode(
  templateType: string,
  parentNodeId: string | null | undefined,
): Promise<string> {
  const prefixMap: Record<string, string> = {
    core_process_overview: "KP",
    area_overview: "BER",
    process_page_text: "PRZ",
    process_page_graphic: "PRZ",
    procedure_instruction: "VA",
    use_case: "UC",
    policy: "RL",
    role_profile: "ROL",
    dashboard: "DSH",
    system_documentation: "SYS",
  };

  const prefix = prefixMap[templateType] ?? "DOC";

  let parentCode = "";
  if (parentNodeId) {
    const parent = await db
      .select({ displayCode: contentNodesTable.displayCode })
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, parentNodeId))
      .limit(1);
    if (parent[0]) {
      parentCode = parent[0].displayCode + ".";
    }
  }

  const siblingCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contentNodesTable)
    .where(
      parentNodeId
        ? and(
            eq(contentNodesTable.parentNodeId, parentNodeId),
            eq(contentNodesTable.isDeleted, false),
          )
        : and(
            isNull(contentNodesTable.parentNodeId),
            eq(contentNodesTable.isDeleted, false),
          ),
    );

  const nextNum = (siblingCount[0]?.count ?? 0) + 1;
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
): Promise<string> {
  const immutableId = generateImmutableId();
  const displayCode = await generateDisplayCode(
    input.templateType,
    input.parentNodeId,
  );

  const [node] = await db
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

  logger.info(
    { nodeId: node.id, immutableId, displayCode },
    "Content node created",
  );

  return node.id;
}

export async function moveNode(
  nodeId: string,
  newParentNodeId: string | null,
  actorId?: string,
): Promise<void> {
  const [node] = await db
    .select({
      displayCode: contentNodesTable.displayCode,
      templateType: contentNodesTable.templateType,
    })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, nodeId));

  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const oldDisplayCode = node.displayCode;
  const newDisplayCode = await generateDisplayCode(
    node.templateType,
    newParentNodeId,
  );

  await db.transaction(async (tx) => {
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
  });

  logger.info(
    { nodeId, oldDisplayCode, newDisplayCode },
    "Node moved with alias",
  );
}
