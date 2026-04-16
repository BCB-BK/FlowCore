import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  contentNodesTable,
  contentRevisionsTable,
  contentRelationsTable,
  contentAliasesTable,
  contentTemplatesTable,
  auditEventsTable,
} from "@workspace/db/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { createContentNode, moveNode } from "../services/identity.service";
import {
  getVersionTree,
} from "../services/revision.service";
import {
  restoreAsWorkingCopy,
} from "../services/working-copy.service";
import {
  createRelation,
  removeRelation,
  getNodeRelations,
  getNodeChildren,
  getNodeTree,
  getSiblings,
} from "../services/graph.service";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import { validateBody } from "../middlewares/validate-body";
import { hasPermission, hasPermissionBatch } from "../services/rbac.service";
import { checkConfidentialityAccess, checkConfidentialityAccessBatch } from "../services/confidentiality.service";
import { AppError } from "../lib/app-error";
import {
  PAGE_TYPE_REGISTRY,
  ALL_TEMPLATE_TYPES,
  getPageType as getPageTypeDef,
} from "@workspace/shared/page-types";
import {
  CreateNodeBody,
  UpdateNodeBody,
  MoveNodeBody,
  CreateRelationBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapServiceError(err: unknown): Error {
  if (err instanceof AppError) return err;
  const message = err instanceof Error ? err.message : "";
  const code = (err as { code?: string }).code;

  if (message.includes("not found") || message.includes("nicht gefunden")) {
    return new AppError(404, message);
  }
  if (code === "WORKING_COPY_ACTIVE" || message.includes("bereits")) {
    return new AppError(409, message, { code });
  }
  if (message.includes("Cannot move") || message.includes("descendants")) {
    return new AppError(400, message);
  }
  return err instanceof Error ? err : new Error(message);
}

router.get("/page-types", requireAuth, async (_req, res) => {
  const types = Object.values(PAGE_TYPE_REGISTRY);
  res.json(types);
});

router.get("/page-types/:templateType", requireAuth, async (req, res) => {
  const templateType = req.params.templateType as string;
  const def = getPageTypeDef(templateType);
  if (!def) {
    res.status(404).json({ error: "Page type not found" });
    return;
  }
  res.json(def);
});

router.get(
  "/nodes",
  requireAuth,
  requirePermission("read_page"),
  async (_req, res) => {
    const nodes = await db
      .select()
      .from(contentNodesTable)
      .where(eq(contentNodesTable.isDeleted, false))
      .orderBy(contentNodesTable.sortOrder);
    res.json(nodes);
  },
);

router.get(
  "/nodes/roots",
  requireAuth,
  requirePermission("read_page"),
  async (_req, res) => {
    const childrenAlias = db
      .$with("children_count")
      .as(
        db
          .select({
            parentNodeId: contentNodesTable.parentNodeId,
            count: sql<number>`count(*)::int`.as("count"),
          })
          .from(contentNodesTable)
          .where(eq(contentNodesTable.isDeleted, false))
          .groupBy(contentNodesTable.parentNodeId),
      );

    const roots = await db
      .with(childrenAlias)
      .select({
        id: contentNodesTable.id,
        immutableId: contentNodesTable.immutableId,
        displayCode: contentNodesTable.displayCode,
        title: contentNodesTable.title,
        templateType: contentNodesTable.templateType,
        templateId: contentNodesTable.templateId,
        parentNodeId: contentNodesTable.parentNodeId,
        sortOrder: contentNodesTable.sortOrder,
        status: contentNodesTable.status,
        currentRevisionId: contentNodesTable.currentRevisionId,
        publishedRevisionId: contentNodesTable.publishedRevisionId,
        ownerId: contentNodesTable.ownerId,
        isDeleted: contentNodesTable.isDeleted,
        deletedAt: contentNodesTable.deletedAt,
        createdAt: contentNodesTable.createdAt,
        updatedAt: contentNodesTable.updatedAt,
        childCount: sql<number>`coalesce(${childrenAlias.count}, 0)`.as("childCount"),
      })
      .from(contentNodesTable)
      .leftJoin(childrenAlias, eq(contentNodesTable.id, sql`${childrenAlias.parentNodeId}`))
      .where(
        and(
          isNull(contentNodesTable.parentNodeId),
          eq(contentNodesTable.isDeleted, false),
        ),
      )
      .orderBy(contentNodesTable.sortOrder);

    const rootIds = roots.map((r) => r.id);
    const confidentialityMap = await checkConfidentialityAccessBatch(
      _req.user!.principalId,
      rootIds,
    );
    const filteredRoots = roots.filter(
      (r) => confidentialityMap.get(r.id) !== false,
    );

    res.json(filteredRoots);
  },
);

router.get(
  "/nodes/:id",
  requireAuth,
  requirePermission("read_page", (req) => req.params.id),
  async (req, res) => {
    const id = req.params.id as string;
    const [node] = await db
      .select()
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, id));

    if (!node) {
      res.status(404).json({ error: "Node not found" });
      return;
    }

    const { allowed, level } = await checkConfidentialityAccess(
      req.user!.principalId,
      id,
    );
    if (!allowed) {
      res.status(403).json({
        error: "CONFIDENTIALITY_DENIED",
        message:
          "Du hast leider keine Freigabe, diese Seite zu \u00F6ffnen. Liegt deines Erachtens ein Fehler in der Freigabe vor, wende dich bitte an deine*n Vorgesetzte*n.",
        confidentialityLevel: level,
      });
      return;
    }

    res.json(node);
  },
);

router.patch(
  "/nodes/:id",
  requireAuth,
  requirePermission("edit_content", (req) => req.params.id),
  validateBody(UpdateNodeBody),
  async (req, res) => {
    const id = req.params.id as string;
    const { title, templateType } = req.body;

    if (title !== undefined && title.trim().length === 0) {
      res.status(400).json({
        error: "Validierungsfehler",
        details: [{ field: "title", message: "Titel darf nicht leer sein" }],
      });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title.trim();
    if (templateType !== undefined) updates.templateType = templateType;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        error: "Validierungsfehler",
        details: [{ field: "(root)", message: "Keine aktualisierbaren Felder angegeben" }],
      });
      return;
    }

    updates.updatedAt = new Date();

    const updated = await db.transaction(async (tx) => {
      const [result] = await tx
        .update(contentNodesTable)
        .set(updates)
        .where(eq(contentNodesTable.id, id))
        .returning();

      if (!result) return null;

      await tx.insert(auditEventsTable).values({
        eventType: "content",
        action: "node_updated",
        actorId: req.user!.principalId,
        resourceType: "content_node",
        resourceId: id,
        details: updates,
      });

      return result;
    });

    if (!updated) {
      res.status(404).json({ error: "Node not found" });
      return;
    }

    res.json(updated);
  },
);

router.post(
  "/nodes",
  requireAuth,
  requirePermission("create_page"),
  validateBody(CreateNodeBody),
  async (req, res) => {
    try {
      const nodeId = await createContentNode(req.body, {
        eventType: "content",
        action: "node_created",
        actorId: req.user!.principalId,
        resourceType: "content_node",
        details: { title: req.body.title, templateType: req.body.templateType },
      });
      const [node] = await db
        .select()
        .from(contentNodesTable)
        .where(eq(contentNodesTable.id, nodeId));

      res.status(201).json(node);
    } catch (err) {
      throw mapServiceError(err);
    }
  },
);

router.post(
  "/nodes/:id/move",
  requireAuth,
  requirePermission("edit_structure", (req) => req.params.id),
  validateBody(MoveNodeBody),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      await moveNode(
        id,
        req.body.newParentNodeId ?? null,
        req.user!.principalId,
        {
          eventType: "content",
          action: "node_moved",
          actorId: req.user!.principalId,
          resourceType: "content_node",
          resourceId: id,
          details: { newParentNodeId: req.body.newParentNodeId },
        },
      );
      const [node] = await db
        .select()
        .from(contentNodesTable)
        .where(eq(contentNodesTable.id, id));

      res.json(node);
    } catch (err) {
      throw mapServiceError(err);
    }
  },
);

router.delete(
  "/nodes/:id",
  requireAuth,
  requirePermission("archive_page", (req) => req.params.id),
  async (req, res) => {
    const id = req.params.id as string;
    await db.transaction(async (tx) => {
      await tx
        .update(contentNodesTable)
        .set({ isDeleted: true, deletedAt: new Date(), status: "deleted" })
        .where(eq(contentNodesTable.id, id));

      await tx.insert(auditEventsTable).values({
        eventType: "content",
        action: "node_deleted",
        actorId: req.user!.principalId,
        resourceType: "content_node",
        resourceId: id,
      });
    });

    res.status(204).send();
  },
);

router.get(
  "/nodes/:id/children",
  requireAuth,
  requirePermission("read_page", (req) => req.params.id),
  async (req, res) => {
    const id = req.params.id as string;

    const grandchildrenCount = db
      .$with("grandchildren_count")
      .as(
        db
          .select({
            parentNodeId: contentNodesTable.parentNodeId,
            count: sql<number>`count(*)::int`.as("count"),
          })
          .from(contentNodesTable)
          .where(eq(contentNodesTable.isDeleted, false))
          .groupBy(contentNodesTable.parentNodeId),
      );

    const children = await db
      .with(grandchildrenCount)
      .select({
        id: contentNodesTable.id,
        immutableId: contentNodesTable.immutableId,
        displayCode: contentNodesTable.displayCode,
        title: contentNodesTable.title,
        templateType: contentNodesTable.templateType,
        templateId: contentNodesTable.templateId,
        parentNodeId: contentNodesTable.parentNodeId,
        sortOrder: contentNodesTable.sortOrder,
        status: contentNodesTable.status,
        currentRevisionId: contentNodesTable.currentRevisionId,
        publishedRevisionId: contentNodesTable.publishedRevisionId,
        ownerId: contentNodesTable.ownerId,
        isDeleted: contentNodesTable.isDeleted,
        deletedAt: contentNodesTable.deletedAt,
        createdAt: contentNodesTable.createdAt,
        updatedAt: contentNodesTable.updatedAt,
        childCount: sql<number>`coalesce(${grandchildrenCount.count}, 0)`.as("childCount"),
      })
      .from(contentNodesTable)
      .leftJoin(grandchildrenCount, eq(contentNodesTable.id, sql`${grandchildrenCount.parentNodeId}`))
      .where(
        and(
          eq(contentNodesTable.parentNodeId, id),
          eq(contentNodesTable.isDeleted, false),
        ),
      )
      .orderBy(contentNodesTable.sortOrder);

    const childIds = children.map((c) => c.id);
    const confidentialityMap = await checkConfidentialityAccessBatch(
      req.user!.principalId,
      childIds,
    );
    const filteredChildren = children.filter(
      (c) => confidentialityMap.get(c.id) !== false,
    );

    res.json(filteredChildren);
  },
);

router.get(
  "/nodes/:id/siblings",
  requireAuth,
  requirePermission("read_page", (req) => req.params.id),
  async (req, res) => {
    const id = req.params.id as string;
    const siblings = await getSiblings(id);
    const principalId = req.user!.principalId;
    const siblingIds = siblings.map((sib) => sib.id);
    const permMap = await hasPermissionBatch(principalId, "read_page", siblingIds);
    const filtered = siblings.filter((sib) => permMap.get(sib.id) === true);
    res.json(filtered);
  },
);

router.get(
  "/nodes/:id/ancestors",
  requireAuth,
  requirePermission("read_page", (req) => req.params.id),
  async (req, res) => {
    const id = req.params.id as string;
    const ancestors: (typeof contentNodesTable.$inferSelect)[] = [];
    let currentId: string | null = id;

    const [startNode] = await db
      .select()
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, currentId));

    if (!startNode) {
      res.status(404).json({ error: "Node not found" });
      return;
    }

    currentId = startNode.parentNodeId;

    while (currentId) {
      const [parent] = await db
        .select()
        .from(contentNodesTable)
        .where(eq(contentNodesTable.id, currentId));
      if (!parent) break;
      ancestors.unshift(parent);
      currentId = parent.parentNodeId;
    }

    res.json(ancestors);
  },
);

router.get(
  "/nodes/:id/tree",
  requireAuth,
  requirePermission("read_page", (req) => req.params.id),
  async (req, res) => {
    const id = req.params.id as string;
    const tree = await getNodeTree(id);
    res.json(tree);
  },
);

router.get(
  "/nodes/:id/aliases",
  requireAuth,
  requirePermission("read_page", (req) => req.params.id),
  async (req, res) => {
    const id = req.params.id as string;
    const aliases = await db
      .select()
      .from(contentAliasesTable)
      .where(eq(contentAliasesTable.nodeId, id))
      .orderBy(desc(contentAliasesTable.changedAt));
    res.json(aliases);
  },
);

router.post(
  "/nodes/:id/revisions",
  requireAuth,
  (_req, res) => {
    res.status(409).json({
      error: "Direkte Revisionserstellung ist deaktiviert. Bitte verwenden Sie den Arbeitskopie-Workflow (POST /nodes/:id/working-copies).",
    });
  },
);

router.get(
  "/nodes/:id/revisions",
  requireAuth,
  requirePermission("read_page", (req) => req.params.id),
  async (req, res) => {
    const id = req.params.id as string;
    const revisions = await getVersionTree(id);
    res.json(revisions);
  },
);

router.post(
  "/revisions/:id/publish",
  requireAuth,
  (_req, res) => {
    res.status(409).json({
      error: "Direktes Veröffentlichen von Revisionen ist deaktiviert. Veröffentlichung erfolgt ausschließlich über den Arbeitskopie-Freigabe-Workflow (POST /working-copies/:id/publish).",
    });
  },
);

router.post(
  "/revisions/:id/restore",
  requireAuth,
  async (req, res, next) => {
    const id = req.params.id as string;
    const [rev] = await db
      .select({ nodeId: contentRevisionsTable.nodeId })
      .from(contentRevisionsTable)
      .where(eq(contentRevisionsTable.id, id));
    if (!rev) {
      res.status(404).json({ error: "Revision not found" });
      return;
    }
    (req as unknown as Record<string, string>)._resolvedNodeId = rev.nodeId;
    next();
  },
  requirePermission(
    "create_working_copy",
    (req) =>
      (req as unknown as Record<string, string>)._resolvedNodeId as string,
  ),
  async (req, res) => {
    const sourceRevisionId = req.params.id as string;
    const actorId = req.user!.principalId;
    try {
      const result = await restoreAsWorkingCopy(sourceRevisionId, actorId);
      res.status(201).json(result.workingCopy);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "WORKING_COPY_ACTIVE") {
        throw new AppError(409, "Es existiert bereits eine aktive Arbeitskopie für diesen Inhalt.", { code });
      }
      throw err;
    }
  },
);

router.post(
  "/relations",
  requireAuth,
  requirePermission("manage_relations"),
  validateBody(CreateRelationBody),
  async (req, res) => {
    try {
      const relationId = await createRelation(req.body, {
        eventType: "content",
        action: "relation_created",
        actorId: req.user!.principalId,
        resourceType: "content_relation",
      });
      const [relation] = await db
        .select()
        .from(contentRelationsTable)
        .where(eq(contentRelationsTable.id, relationId));

      res.status(201).json(relation);
    } catch (err) {
      throw mapServiceError(err);
    }
  },
);

router.get(
  "/nodes/:id/relations",
  requireAuth,
  requirePermission("read_page", (req) => req.params.id),
  async (req, res) => {
    const id = req.params.id as string;
    const relations = await getNodeRelations(id);
    res.json(relations);
  },
);

router.delete(
  "/relations/:id",
  requireAuth,
  requirePermission("manage_relations"),
  async (req, res) => {
    const id = req.params.id as string;
    await removeRelation(id, {
      eventType: "content",
      action: "relation_deleted",
      actorId: req.user!.principalId,
      resourceType: "content_relation",
      resourceId: id,
    });

    res.status(204).send();
  },
);

router.get(
  "/templates",
  requireAuth,
  requirePermission("read_page"),
  async (_req, res) => {
    const templates = await db
      .select()
      .from(contentTemplatesTable)
      .where(eq(contentTemplatesTable.isActive, true));
    res.json(templates);
  },
);

router.get(
  "/templates/:id",
  requireAuth,
  requirePermission("read_page"),
  async (req, res) => {
    const id = req.params.id as string;
    const [template] = await db
      .select()
      .from(contentTemplatesTable)
      .where(eq(contentTemplatesTable.id, id));
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    res.json(template);
  },
);

router.get(
  "/nodes/:nodeId/backlinks",
  requireAuth,
  requirePermission("read_page", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;

    const backlinks = await db
      .select({
        id: contentRelationsTable.id,
        sourceId: contentRelationsTable.sourceNodeId,
        relationType: contentRelationsTable.relationType,
        sourceTitle: contentNodesTable.title,
        sourceDisplayCode: contentNodesTable.displayCode,
        sourceTemplateType: contentNodesTable.templateType,
        sourceStatus: contentNodesTable.status,
      })
      .from(contentRelationsTable)
      .innerJoin(
        contentNodesTable,
        eq(contentRelationsTable.sourceNodeId, contentNodesTable.id),
      )
      .where(
        and(
          eq(contentRelationsTable.targetNodeId, nodeId),
          eq(contentNodesTable.isDeleted, false),
        ),
      );

    const principalId = req.user!.principalId;
    const sourceIds = backlinks.map((link) => link.sourceId);
    const permMap = await hasPermissionBatch(principalId, "read_page", sourceIds);
    const filtered = backlinks.filter((link) => permMap.get(link.sourceId) === true);

    res.json(filtered);
  },
);

router.get(
  "/nodes/:nodeId/forward-links",
  requireAuth,
  requirePermission("read_page", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;

    const forwardLinks = await db
      .select({
        id: contentRelationsTable.id,
        targetId: contentRelationsTable.targetNodeId,
        relationType: contentRelationsTable.relationType,
        targetTitle: contentNodesTable.title,
        targetDisplayCode: contentNodesTable.displayCode,
        targetTemplateType: contentNodesTable.templateType,
        targetStatus: contentNodesTable.status,
      })
      .from(contentRelationsTable)
      .innerJoin(
        contentNodesTable,
        eq(contentRelationsTable.targetNodeId, contentNodesTable.id),
      )
      .where(
        and(
          eq(contentRelationsTable.sourceNodeId, nodeId),
          eq(contentNodesTable.isDeleted, false),
        ),
      );

    const principalId = req.user!.principalId;
    const targetIds = forwardLinks.map((link) => link.targetId);
    const permMap = await hasPermissionBatch(principalId, "read_page", targetIds);
    const filtered = forwardLinks.filter((link) => permMap.get(link.targetId) === true);

    res.json(filtered);
  },
);

router.get(
  "/broken-links",
  requireAuth,
  requirePermission("read_page"),
  async (req, res) => {
    const principalId = req.user!.principalId;

    const brokenRelations = await db
      .select({
        relationId: contentRelationsTable.id,
        sourceNodeId: contentRelationsTable.sourceNodeId,
        targetNodeId: contentRelationsTable.targetNodeId,
        relationType: contentRelationsTable.relationType,
        sourceTitle: contentNodesTable.title,
        sourceDisplayCode: contentNodesTable.displayCode,
      })
      .from(contentRelationsTable)
      .innerJoin(
        contentNodesTable,
        eq(contentRelationsTable.sourceNodeId, contentNodesTable.id),
      )
      .where(
        sql`${contentRelationsTable.targetNodeId} NOT IN (
          SELECT id FROM content_nodes WHERE is_deleted = false
        )`,
      );

    const brokenSourceIds = brokenRelations.map((rel) => rel.sourceNodeId);
    const brokenPermMap = await hasPermissionBatch(principalId, "read_page", brokenSourceIds);
    const filteredRelations = brokenRelations.filter(
      (rel) => brokenPermMap.get(rel.sourceNodeId) === true,
    );

    const orphanedNodes = await db
      .select({
        id: contentNodesTable.id,
        title: contentNodesTable.title,
        displayCode: contentNodesTable.displayCode,
        templateType: contentNodesTable.templateType,
        parentNodeId: contentNodesTable.parentNodeId,
      })
      .from(contentNodesTable)
      .where(
        and(
          eq(contentNodesTable.isDeleted, false),
          sql`${contentNodesTable.parentNodeId} IS NOT NULL AND ${contentNodesTable.parentNodeId} NOT IN (
            SELECT id FROM content_nodes WHERE is_deleted = false
          )`,
        ),
      );

    const orphanIds = orphanedNodes.map((node) => node.id);
    const orphanPermMap = await hasPermissionBatch(principalId, "read_page", orphanIds);
    const filteredOrphans = orphanedNodes.filter(
      (node) => orphanPermMap.get(node.id) === true,
    );

    res.json({
      brokenRelations: filteredRelations,
      orphanedNodes: filteredOrphans,
    });
  },
);

export default router;
