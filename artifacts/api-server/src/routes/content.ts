import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  contentNodesTable,
  contentRevisionsTable,
  contentRelationsTable,
  contentAliasesTable,
  contentTemplatesTable,
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

const router: IRouter = Router();

router.get("/nodes", async (_req, res) => {
  const nodes = await db
    .select()
    .from(contentNodesTable)
    .where(eq(contentNodesTable.isDeleted, false))
    .orderBy(contentNodesTable.sortOrder);
  res.json(nodes);
});

router.get("/nodes/roots", async (_req, res) => {
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
});

router.get("/nodes/:id", async (req, res) => {
  const [node] = await db
    .select()
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, req.params.id));

  if (!node) {
    res.status(404).json({ error: "Node not found" });
    return;
  }
  res.json(node);
});

router.post("/nodes", async (req, res) => {
  try {
    const nodeId = await createContentNode(req.body);
    const [node] = await db
      .select()
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, nodeId));
    res.status(201).json(node);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

router.post("/nodes/:id/move", async (req, res) => {
  try {
    await moveNode(
      req.params.id,
      req.body.newParentNodeId ?? null,
      req.body.actorId,
    );
    const [node] = await db
      .select()
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, req.params.id));
    res.json(node);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

router.delete("/nodes/:id", async (req, res) => {
  await db
    .update(contentNodesTable)
    .set({ isDeleted: true, deletedAt: new Date(), status: "deleted" })
    .where(eq(contentNodesTable.id, req.params.id));
  res.status(204).send();
});

router.get("/nodes/:id/children", async (req, res) => {
  const children = await getNodeChildren(req.params.id);
  res.json(children);
});

router.get("/nodes/:id/tree", async (req, res) => {
  const tree = await getNodeTree(req.params.id);
  res.json(tree);
});

router.get("/nodes/:id/aliases", async (req, res) => {
  const aliases = await db
    .select()
    .from(contentAliasesTable)
    .where(eq(contentAliasesTable.nodeId, req.params.id))
    .orderBy(desc(contentAliasesTable.changedAt));
  res.json(aliases);
});

router.post("/nodes/:id/revisions", async (req, res) => {
  try {
    const revisionId = await createRevision({
      nodeId: req.params.id,
      ...req.body,
    });
    const [revision] = await db
      .select()
      .from(contentRevisionsTable)
      .where(eq(contentRevisionsTable.id, revisionId));
    res.status(201).json(revision);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

router.get("/nodes/:id/revisions", async (req, res) => {
  const revisions = await getVersionTree(req.params.id);
  res.json(revisions);
});

router.post("/revisions/:id/publish", async (req, res) => {
  try {
    await publishRevision(
      req.params.id,
      req.body.versionLabel,
      req.body.actorId,
    );
    const [revision] = await db
      .select()
      .from(contentRevisionsTable)
      .where(eq(contentRevisionsTable.id, req.params.id));
    res.json(revision);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

router.post("/revisions/:id/restore", async (req, res) => {
  try {
    const newRevisionId = await restoreRevision(
      req.params.id,
      req.body.authorId,
    );
    const [revision] = await db
      .select()
      .from(contentRevisionsTable)
      .where(eq(contentRevisionsTable.id, newRevisionId));
    res.status(201).json(revision);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

router.post("/relations", async (req, res) => {
  try {
    const relationId = await createRelation(req.body);
    const [relation] = await db
      .select()
      .from(contentRelationsTable)
      .where(eq(contentRelationsTable.id, relationId));
    res.status(201).json(relation);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

router.get("/nodes/:id/relations", async (req, res) => {
  const relations = await getNodeRelations(req.params.id);
  res.json(relations);
});

router.delete("/relations/:id", async (req, res) => {
  await removeRelation(req.params.id);
  res.status(204).send();
});

router.get("/templates", async (_req, res) => {
  const templates = await db
    .select()
    .from(contentTemplatesTable)
    .where(eq(contentTemplatesTable.isActive, true));
  res.json(templates);
});

router.get("/templates/:id", async (req, res) => {
  const [template] = await db
    .select()
    .from(contentTemplatesTable)
    .where(eq(contentTemplatesTable.id, req.params.id));
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(template);
});

export default router;
