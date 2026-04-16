import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { glossaryTermsTable } from "@workspace/db/schema";
import { eq, ilike, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import multer from "multer";
import * as XLSX from "xlsx";
import { reimportGlossarySeedTerms } from "../services/startup-seed.service";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok =
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".xls");
    cb(null, ok);
  },
});

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

router.get(
  "/",
  requireAuth,
  requirePermission("read_page"),
  async (req, res) => {
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
  },
);

router.get(
  "/export",
  requireAuth,
  requirePermission("manage_settings"),
  async (_req, res) => {
    const terms = await db
      .select()
      .from(glossaryTermsTable)
      .orderBy(glossaryTermsTable.term);

    const rows = terms.map((t) => ({
      term: t.term,
      definition: t.definition,
      synonyms: Array.isArray(t.synonyms) ? t.synonyms.join("; ") : "",
      abbreviation: t.abbreviation ?? "",
    }));

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows, {
      header: ["term", "definition", "synonyms", "abbreviation"],
    });
    XLSX.utils.book_append_sheet(workbook, sheet, "Glossar");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="glossar-export.xlsx"`,
    );
    res.send(buffer);
  },
);

router.get(
  "/:id",
  requireAuth,
  requirePermission("read_page"),
  async (req, res) => {
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
  },
);

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

router.post(
  "/reimport-seed",
  requireAuth,
  requirePermission("manage_settings"),
  async (_req, res) => {
    const result = await reimportGlossarySeedTerms();
    res.json({ message: "Seed-Daten erfolgreich reimportiert", ...result });
  },
);

router.post(
  "/import",
  requireAuth,
  requirePermission("manage_settings"),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "Keine Datei hochgeladen" });
      return;
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    } catch {
      res.status(400).json({ error: "Datei konnte nicht gelesen werden" });
      return;
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      res.status(400).json({ error: "Keine Tabellenblätter in der Datei" });
      return;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (rows.length === 0) {
      res.status(400).json({ error: "Die Tabelle enthält keine Daten" });
      return;
    }

    const errors: string[] = [];
    let upserted = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const term = String(row["term"] ?? row["Term"] ?? row["Begriff"] ?? "").trim();
      const definition = String(
        row["definition"] ?? row["Definition"] ?? row["Beschreibung"] ?? "",
      ).trim();

      if (!term) {
        skipped++;
        continue;
      }

      if (!definition) {
        errors.push(`Zeile ${rowNum}: Begriff "${term}" hat keine Definition`);
        skipped++;
        continue;
      }

      const rawSynonyms = String(
        row["synonyms"] ?? row["Synonyme"] ?? "",
      ).trim();
      const synonyms =
        rawSynonyms
          ? rawSynonyms
              .split(/[,;]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : null;

      const abbreviation =
        String(row["abbreviation"] ?? row["Abkürzung"] ?? "").trim() || null;

      const slug = slugify(term);

      await db
        .insert(glossaryTermsTable)
        .values({
          term,
          slug,
          definition,
          synonyms,
          abbreviation,
          createdBy: req.user!.principalId,
        })
        .onConflictDoUpdate({
          target: glossaryTermsTable.slug,
          set: {
            term,
            definition,
            synonyms,
            abbreviation,
            updatedAt: new Date(),
          },
        });

      upserted++;
    }

    res.json({
      message: "Import abgeschlossen",
      upserted,
      skipped,
      errors: errors.slice(0, 20),
    });
  },
);

export { router as glossaryRouter };
