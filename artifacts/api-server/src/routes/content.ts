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
import { eq, and, desc, isNull } from "drizzle-orm";
import { createContentNode, moveNode } from "../services/identity.service";
import {
  createRevision,
  publishRevision,
  restoreRevision,
  getVersionTree,
} from "../services/revision.service";
import {
  createRelation,
  removeRelation,
  getNodeRelations,
  getNodeChildren,
  getNodeTree,
} from "../services/graph.service";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";

const router: IRouter = Router();

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
    const { title, templateType, status } = req.body;

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (templateType !== undefined) updates.templateType = templateType;
    if (status !== undefined) updates.status = status;

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
  requirePermission("edit_content", (req) => req.params.id),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const revisionId = await createRevision({
        nodeId: id,
        ...req.body,
        authorId: req.user!.principalId,
      });
      const [revision] = await db
        .select()
        .from(contentRevisionsTable)
        .where(eq(contentRevisionsTable.id, revisionId));

      await db.insert(auditEventsTable).values({
        eventType: "content",
        action: "revision_created",
        actorId: req.user!.principalId,
        resourceType: "content_revision",
        resourceId: revisionId,
      });

      res.status(201).json(revision);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: message });
    }
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
    "approve_page",
    (req) =>
      (req as unknown as Record<string, string>)._resolvedNodeId as string,
  ),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      await publishRevision(id, req.body.versionLabel, req.user!.principalId);
      const [revision] = await db
        .select()
        .from(contentRevisionsTable)
        .where(eq(contentRevisionsTable.id, id));

      await db.insert(auditEventsTable).values({
        eventType: "content",
        action: "revision_published",
        actorId: req.user!.principalId,
        resourceType: "content_revision",
        resourceId: id,
        details: { versionLabel: req.body.versionLabel },
      });

      res.json(revision);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: message });
    }
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
    "edit_content",
    (req) =>
      (req as unknown as Record<string, string>)._resolvedNodeId as string,
  ),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const newRevisionId = await restoreRevision(id, req.user!.principalId);
      const [revision] = await db
        .select()
        .from(contentRevisionsTable)
        .where(eq(contentRevisionsTable.id, newRevisionId));
      res.status(201).json(revision);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: message });
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

export default router;
