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
import { eq, and, desc, isNull, sql, ne } from "drizzle-orm";
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
} from "../services/graph.service";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import { hasPermission } from "../services/rbac.service";
import {
  PAGE_TYPE_REGISTRY,
  getPageType as getPageTypeDef,
} from "@workspace/shared/page-types";

const router: IRouter = Router();

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
    const roots = await db
      .select()
      .from(contentNodesTable)
      .where(
        and(
          isNull(contentNodesTable.parentNodeId),
          eq(contentNodesTable.isDeleted, false),
        ),
      )
      .orderBy(contentNodesTable.sortOrder);
    res.json(roots);
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
    res.json(node);
  },
);

router.patch(
  "/nodes/:id",
  requireAuth,
  requirePermission("edit_content", (req) => req.params.id),
  async (req, res) => {
    const id = req.params.id as string;
    const { title, templateType } = req.body;

    if (
      title !== undefined &&
      (typeof title !== "string" || title.trim().length === 0)
    ) {
      res.status(400).json({ error: "title must be a non-empty string" });
      return;
    }

    const VALID_TEMPLATE_TYPES = [
      "core_process_overview",
      "area_overview",
      "process_page_text",
      "process_page_graphic",
      "procedure_instruction",
      "use_case",
      "policy",
      "role_profile",
      "dashboard",
      "system_documentation",
    ];
    if (
      templateType !== undefined &&
      !VALID_TEMPLATE_TYPES.includes(templateType)
    ) {
      res.status(400).json({
        error: `templateType must be one of: ${VALID_TEMPLATE_TYPES.join(", ")}`,
      });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title.trim();
    if (templateType !== undefined) updates.templateType = templateType;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No updatable fields provided" });
      return;
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(contentNodesTable)
      .set(updates)
      .where(eq(contentNodesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Node not found" });
      return;
    }

    await db.insert(auditEventsTable).values({
      eventType: "content",
      action: "node_updated",
      actorId: req.user!.principalId,
      resourceType: "content_node",
      resourceId: id,
      details: updates,
    });

    res.json(updated);
  },
);

router.post(
  "/nodes",
  requireAuth,
  requirePermission("create_page"),
  async (req, res) => {
    try {
      const nodeId = await createContentNode(req.body);
      const [node] = await db
        .select()
        .from(contentNodesTable)
        .where(eq(contentNodesTable.id, nodeId));

      await db.insert(auditEventsTable).values({
        eventType: "content",
        action: "node_created",
        actorId: req.user!.principalId,
        resourceType: "content_node",
        resourceId: nodeId,
        details: { title: req.body.title, templateType: req.body.templateType },
      });

      res.status(201).json(node);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  },
);

router.post(
  "/nodes/:id/move",
  requireAuth,
  requirePermission("edit_structure", (req) => req.params.id),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      await moveNode(
        id,
        req.body.newParentNodeId ?? null,
        req.user!.principalId,
      );
      const [node] = await db
        .select()
        .from(contentNodesTable)
        .where(eq(contentNodesTable.id, id));

      await db.insert(auditEventsTable).values({
        eventType: "content",
        action: "node_moved",
        actorId: req.user!.principalId,
        resourceType: "content_node",
        resourceId: id,
        details: { newParentNodeId: req.body.newParentNodeId },
      });

      res.json(node);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  },
);

router.delete(
  "/nodes/:id",
  requireAuth,
  requirePermission("archive_page", (req) => req.params.id),
  async (req, res) => {
    const id = req.params.id as string;
    await db
      .update(contentNodesTable)
      .set({ isDeleted: true, deletedAt: new Date(), status: "deleted" })
      .where(eq(contentNodesTable.id, id));

    await db.insert(auditEventsTable).values({
      eventType: "content",
      action: "node_deleted",
      actorId: req.user!.principalId,
      resourceType: "content_node",
      resourceId: id,
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
    const children = await getNodeChildren(id);
    res.json(children);
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
    try {
      const sourceRevisionId = req.params.id as string;
      const actorId = req.user!.principalId;
      const result = await restoreAsWorkingCopy(sourceRevisionId, actorId);
      res.status(201).json(result.workingCopy);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const code = (err as { code?: string }).code;
      if (code === "WORKING_COPY_ACTIVE") {
        res.status(409).json({ error: message, code });
      } else {
        res.status(400).json({ error: message });
      }
    }
  },
);

router.post(
  "/relations",
  requireAuth,
  requirePermission("manage_relations"),
  async (req, res) => {
    try {
      const relationId = await createRelation(req.body);
      const [relation] = await db
        .select()
        .from(contentRelationsTable)
        .where(eq(contentRelationsTable.id, relationId));

      await db.insert(auditEventsTable).values({
        eventType: "content",
        action: "relation_created",
        actorId: req.user!.principalId,
        resourceType: "content_relation",
        resourceId: relationId,
      });

      res.status(201).json(relation);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: message });
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
    await removeRelation(id);

    await db.insert(auditEventsTable).values({
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
    const filtered = [];
    for (const link of backlinks) {
      if (await hasPermission(principalId, "read_page", link.sourceId)) {
        filtered.push(link);
      }
    }

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
    const filtered = [];
    for (const link of forwardLinks) {
      if (await hasPermission(principalId, "read_page", link.targetId)) {
        filtered.push(link);
      }
    }

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

    const filteredRelations = [];
    for (const rel of brokenRelations) {
      if (await hasPermission(principalId, "read_page", rel.sourceNodeId)) {
        filteredRelations.push(rel);
      }
    }

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

    const filteredOrphans = [];
    for (const node of orphanedNodes) {
      if (await hasPermission(principalId, "read_page", node.id)) {
        filteredOrphans.push(node);
      }
    }

    res.json({
      brokenRelations: filteredRelations,
      orphanedNodes: filteredOrphans,
    });
  },
);

export default router;
