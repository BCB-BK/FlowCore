import { db } from "@workspace/db";
import { contentRelationsTable, contentNodesTable } from "@workspace/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const DIRECTED_RELATION_TYPES = new Set([
  "depends_on",
  "implements_policy",
  "upstream_of",
  "downstream_of",
  "replaces",
]);

export interface CreateRelationInput {
  sourceNodeId: string;
  targetNodeId: string;
  relationType:
    | "related_to"
    | "uses_template"
    | "depends_on"
    | "implements_policy"
    | "upstream_of"
    | "downstream_of"
    | "replaces"
    | "references";
  description?: string;
  createdBy?: string;
}

export async function createRelation(
  input: CreateRelationInput,
): Promise<string> {
  if (input.sourceNodeId === input.targetNodeId) {
    throw new Error("Self-referencing relations are not allowed");
  }

  if (DIRECTED_RELATION_TYPES.has(input.relationType)) {
    const hasCycle = await detectCycle(
      input.sourceNodeId,
      input.targetNodeId,
      input.relationType,
    );
    if (hasCycle) {
      throw new Error(
        `Adding this relation would create a cycle for type '${input.relationType}'`,
      );
    }
  }

  const [relation] = await db
    .insert(contentRelationsTable)
    .values({
      sourceNodeId: input.sourceNodeId,
      targetNodeId: input.targetNodeId,
      relationType: input.relationType,
      description: input.description,
      createdBy: input.createdBy,
    })
    .returning({ id: contentRelationsTable.id });

  logger.info(
    {
      relationId: relation.id,
      source: input.sourceNodeId,
      target: input.targetNodeId,
      type: input.relationType,
    },
    "Relation created",
  );

  return relation.id;
}

async function detectCycle(
  sourceNodeId: string,
  targetNodeId: string,
  relationType: string,
): Promise<boolean> {
  const result = await db.execute(sql`
    WITH RECURSIVE chain AS (
      SELECT source_node_id, target_node_id
      FROM content_relations
      WHERE source_node_id = ${targetNodeId}
        AND relation_type = ${relationType}

      UNION ALL

      SELECT cr.source_node_id, cr.target_node_id
      FROM content_relations cr
      JOIN chain c ON cr.source_node_id = c.target_node_id
      WHERE cr.relation_type = ${relationType}
    )
    SELECT EXISTS (
      SELECT 1 FROM chain WHERE target_node_id = ${sourceNodeId}
    ) AS has_cycle
  `);

  return (result.rows[0] as { has_cycle: boolean })?.has_cycle === true;
}

export async function removeRelation(relationId: string): Promise<void> {
  await db
    .delete(contentRelationsTable)
    .where(eq(contentRelationsTable.id, relationId));
}

export async function getNodeRelations(nodeId: string) {
  const relations = await db
    .select({
      id: contentRelationsTable.id,
      sourceNodeId: contentRelationsTable.sourceNodeId,
      targetNodeId: contentRelationsTable.targetNodeId,
      relationType: contentRelationsTable.relationType,
      description: contentRelationsTable.description,
      createdAt: contentRelationsTable.createdAt,
    })
    .from(contentRelationsTable)
    .where(
      or(
        eq(contentRelationsTable.sourceNodeId, nodeId),
        eq(contentRelationsTable.targetNodeId, nodeId),
      ),
    );

  return relations;
}

export async function getNodeChildren(nodeId: string) {
  return db
    .select()
    .from(contentNodesTable)
    .where(
      and(
        eq(contentNodesTable.parentNodeId, nodeId),
        eq(contentNodesTable.isDeleted, false),
      ),
    );
}

export async function getNodeTree(rootNodeId: string) {
  const result = await db.execute(sql`
    WITH RECURSIVE tree AS (
      SELECT id, immutable_id, display_code, title, template_type,
             parent_node_id, sort_order, status, 0 AS depth
      FROM content_nodes
      WHERE id = ${rootNodeId} AND is_deleted = false

      UNION ALL

      SELECT cn.id, cn.immutable_id, cn.display_code, cn.title, cn.template_type,
             cn.parent_node_id, cn.sort_order, cn.status, t.depth + 1
      FROM content_nodes cn
      JOIN tree t ON cn.parent_node_id = t.id
      WHERE cn.is_deleted = false
    )
    SELECT * FROM tree ORDER BY depth, sort_order
  `);

  return result.rows;
}
