import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  contentTagsTable,
  contentNodeTagsTable,
  contentNodesTable,
  auditEventsTable,
} from "@workspace/db/schema";
import { eq, ilike, sql, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";

const router: IRouter = Router();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

router.get("/", requireAuth, async (req, res) => {
  const q = req.query.q as string | undefined;
  let query = db
    .select({
      id: contentTagsTable.id,
      name: contentTagsTable.name,
      slug: contentTagsTable.slug,
      color: contentTagsTable.color,
      createdAt: contentTagsTable.createdAt,
      nodeCount: sql<number>`(
        SELECT count(*) FROM content_node_tags
        WHERE content_node_tags.tag_id = ${contentTagsTable.id}
      )`,
    })
    .from(contentTagsTable)
    .$dynamic();

  if (q) {
    query = query.where(ilike(contentTagsTable.name, `%${q}%`));
  }

  const tags = await query.orderBy(contentTagsTable.name);
  res.json(tags);
});

router.post(
  "/",
  requireAuth,
  requirePermission("edit_content"),
  async (req, res) => {
    const { name, color } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const slug = slugify(name.trim());

    try {
      const [tag] = await db
        .insert(contentTagsTable)
        .values({ name: name.trim(), slug, color: color || null })
        .returning();

      res.status(201).json(tag);
    } catch (err) {
      if (err instanceof Error && err.message.includes("unique")) {
        res.status(409).json({ error: "Tag already exists" });
        return;
      }
      throw err;
    }
  },
);

router.patch(
  "/:id",
  requireAuth,
  requirePermission("edit_content"),
  async (req, res) => {
    const id = req.params.id as string;
    const { name, color } = req.body;
    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({ error: "name must be a non-empty string" });
        return;
      }
      updates.name = name.trim();
      updates.slug = slugify(name.trim());
    }
    if (color !== undefined) {
      updates.color = color;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No updatable fields" });
      return;
    }

    const [tag] = await db
      .update(contentTagsTable)
      .set(updates)
      .where(eq(contentTagsTable.id, id))
      .returning();

    if (!tag) {
      res.status(404).json({ error: "Tag not found" });
      return;
    }
    res.json(tag);
  },
);

router.delete(
  "/:id",
  requireAuth,
  requirePermission("edit_content"),
  async (req, res) => {
    const id = req.params.id as string;
    await db
      .delete(contentNodeTagsTable)
      .where(eq(contentNodeTagsTable.tagId, id));
    await db.delete(contentTagsTable).where(eq(contentTagsTable.id, id));
    res.status(204).send();
  },
);

router.get(
  "/nodes/:nodeId",
  requireAuth,
  requirePermission("read_page", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const tags = await db
      .select({
        id: contentTagsTable.id,
        name: contentTagsTable.name,
        slug: contentTagsTable.slug,
        color: contentTagsTable.color,
      })
      .from(contentNodeTagsTable)
      .innerJoin(
        contentTagsTable,
        eq(contentNodeTagsTable.tagId, contentTagsTable.id),
      )
      .where(eq(contentNodeTagsTable.nodeId, nodeId));
    res.json(tags);
  },
);

router.post(
  "/nodes/:nodeId",
  requireAuth,
  requirePermission("edit_content", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const { tagId } = req.body;
    if (!tagId) {
      res.status(400).json({ error: "tagId is required" });
      return;
    }

    try {
      const [assignment] = await db
        .insert(contentNodeTagsTable)
        .values({ nodeId, tagId })
        .returning();

      await db.insert(auditEventsTable).values({
        eventType: "content",
        action: "tag_assigned",
        actorId: req.user!.principalId,
        resourceType: "content_node",
        resourceId: nodeId,
        details: { tagId },
      });

      res.status(201).json(assignment);
    } catch (err) {
      if (err instanceof Error && err.message.includes("unique")) {
        res.status(409).json({ error: "Tag already assigned" });
        return;
      }
      throw err;
    }
  },
);

router.delete(
  "/nodes/:nodeId/:tagId",
  requireAuth,
  requirePermission("edit_content", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const tagId = req.params.tagId as string;

    await db
      .delete(contentNodeTagsTable)
      .where(
        and(
          eq(contentNodeTagsTable.nodeId, nodeId),
          eq(contentNodeTagsTable.tagId, tagId),
        ),
      );

    await db.insert(auditEventsTable).values({
      eventType: "content",
      action: "tag_removed",
      actorId: req.user!.principalId,
      resourceType: "content_node",
      resourceId: nodeId,
      details: { tagId },
    });

    res.status(204).send();
  },
);

export { router as tagsRouter };
