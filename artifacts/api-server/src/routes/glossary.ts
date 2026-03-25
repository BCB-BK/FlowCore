import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { glossaryTermsTable } from "@workspace/db/schema";
import { eq, ilike, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";

const router: IRouter = Router();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

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
  const letter = req.query.letter as string | undefined;

  let query = db.select().from(glossaryTermsTable).$dynamic();

  if (q) {
    query = query.where(
      sql`${ilike(glossaryTermsTable.term, `%${q}%`)} OR ${ilike(glossaryTermsTable.definition, `%${q}%`)} OR ${q} = ANY(${glossaryTermsTable.synonyms})`,
    );
  } else if (letter) {
    query = query.where(
      ilike(glossaryTermsTable.term, `${letter.toUpperCase()}%`),
    );
  }

  const terms = await query.orderBy(glossaryTermsTable.term);
  res.json(terms);
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const [term] = await db
    .select()
    .from(glossaryTermsTable)
    .where(eq(glossaryTermsTable.id, id));

  if (!term) {
    res.status(404).json({ error: "Term not found" });
    return;
  }
  res.json(term);
});

router.post(
  "/",
  requireAuth,
  requirePermission("edit_content"),
  async (req, res) => {
    const { term, definition, synonyms, abbreviation, nodeId } = req.body;

    if (
      typeof term !== "string" ||
      term.trim().length === 0 ||
      typeof definition !== "string" ||
      definition.trim().length === 0
    ) {
      res
        .status(400)
        .json({ error: "term and definition are required strings" });
      return;
    }

    if (nodeId !== undefined && nodeId !== null && !isUUID(nodeId)) {
      res.status(400).json({ error: "nodeId must be a valid UUID" });
      return;
    }

    const slug = slugify(term.trim());

    try {
      const [created] = await db
        .insert(glossaryTermsTable)
        .values({
          term: term.trim(),
          slug,
          definition: definition.trim(),
          synonyms: synonyms || null,
          abbreviation: abbreviation || null,
          nodeId: nodeId || null,
          createdBy: req.user!.principalId,
        })
        .returning();

      res.status(201).json(created);
    } catch (err) {
      if (err instanceof Error && err.message.includes("unique")) {
        res.status(409).json({ error: "Term already exists" });
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
    const { term, definition, synonyms, abbreviation, nodeId } = req.body;

    const updates: Record<string, unknown> = {};
    if (term !== undefined) {
      if (typeof term !== "string" || term.trim().length === 0) {
        res.status(400).json({ error: "term must be a non-empty string" });
        return;
      }
      updates.term = term.trim();
      updates.slug = slugify(term.trim());
    }
    if (definition !== undefined) {
      if (typeof definition !== "string") {
        res.status(400).json({ error: "definition must be a string" });
        return;
      }
      updates.definition = definition.trim();
    }
    if (synonyms !== undefined) updates.synonyms = synonyms;
    if (abbreviation !== undefined) updates.abbreviation = abbreviation;
    if (nodeId !== undefined) {
      if (nodeId !== null && !isUUID(nodeId)) {
        res.status(400).json({ error: "nodeId must be a valid UUID or null" });
        return;
      }
      updates.nodeId = nodeId;
    }
    updates.updatedAt = new Date();

    if (Object.keys(updates).length <= 1) {
      res.status(400).json({ error: "No updatable fields" });
      return;
    }

    const [updated] = await db
      .update(glossaryTermsTable)
      .set(updates)
      .where(eq(glossaryTermsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Term not found" });
      return;
    }
    res.json(updated);
  },
);

router.post(
  "/:id/link",
  requireAuth,
  requirePermission("edit_content"),
  async (req, res) => {
    const id = req.params.id as string;
    const { nodeId } = req.body;

    if (!isUUID(nodeId)) {
      res.status(400).json({ error: "nodeId must be a valid UUID" });
      return;
    }

    const [updated] = await db
      .update(glossaryTermsTable)
      .set({ nodeId, updatedAt: new Date() })
      .where(eq(glossaryTermsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Term not found" });
      return;
    }
    res.json(updated);
  },
);

router.post(
  "/:id/unlink",
  requireAuth,
  requirePermission("edit_content"),
  async (req, res) => {
    const id = req.params.id as string;

    const [updated] = await db
      .update(glossaryTermsTable)
      .set({ nodeId: null, updatedAt: new Date() })
      .where(eq(glossaryTermsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Term not found" });
      return;
    }
    res.json(updated);
  },
);

router.get(
  "/by-node/:nodeId",
  requireAuth,
  requirePermission("read_page", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const terms = await db
      .select()
      .from(glossaryTermsTable)
      .where(eq(glossaryTermsTable.nodeId, nodeId))
      .orderBy(glossaryTermsTable.term);
    res.json(terms);
  },
);

router.delete(
  "/:id",
  requireAuth,
  requirePermission("edit_content"),
  async (req, res) => {
    await db
      .delete(glossaryTermsTable)
      .where(eq(glossaryTermsTable.id, req.params.id as string));
    res.status(204).send();
  },
);

export { router as glossaryRouter };
