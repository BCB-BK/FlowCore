import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import {
  CONFIDENTIALITY_LEVELS,
  getAllAssignments,
  assignPrincipalToLevel,
  removePrincipalFromLevel,
} from "../services/confidentiality.service";
import { db } from "@workspace/db";
import { principalsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", requireAuth, requirePermission("manage_permissions"), async (_req, res) => {
  const assignments = await getAllAssignments();

  const principalIds = [...new Set(assignments.map((a) => a.principalId))];

  let principals: { id: string; displayName: string; email: string | null; principalType: string }[] = [];
  if (principalIds.length > 0) {
    principals = await db
      .select({
        id: principalsTable.id,
        displayName: principalsTable.displayName,
        email: principalsTable.email,
        principalType: principalsTable.principalType,
      })
      .from(principalsTable)
      .where(
        sql`${principalsTable.id} IN (${sql.join(
          principalIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )})`,
      );
  }

  const principalMap = new Map(principals.map((p) => [p.id, p]));

  const result = CONFIDENTIALITY_LEVELS.filter((l) => l !== "public").map((level) => ({
    level,
    assignments: assignments
      .filter((a) => a.level === level)
      .map((a) => ({
        id: a.id,
        principalId: a.principalId,
        displayName: principalMap.get(a.principalId)?.displayName ?? "Unbekannt",
        email: principalMap.get(a.principalId)?.email ?? null,
        principalType: principalMap.get(a.principalId)?.principalType ?? "user",
        assignedAt: a.assignedAt,
      })),
  }));

  res.json(result);
});

router.post(
  "/assign",
  requireAuth,
  requirePermission("manage_permissions"),
  async (req, res) => {
    const { level, principalId } = req.body as {
      level: string;
      principalId: string;
    };

    if (!level || !CONFIDENTIALITY_LEVELS.includes(level as any) || level === "public") {
      res.status(400).json({ error: `Invalid level: ${level}. Must be internal, confidential, or strictly_confidential.` });
      return;
    }

    if (!principalId) {
      res.status(400).json({ error: "principalId is required" });
      return;
    }

    const [principal] = await db
      .select({ id: principalsTable.id })
      .from(principalsTable)
      .where(eq(principalsTable.id, principalId));

    if (!principal) {
      res.status(404).json({ error: "Principal not found" });
      return;
    }

    await assignPrincipalToLevel(level, principalId, req.user!.principalId);

    res.json({ success: true });
  },
);

router.delete(
  "/assign",
  requireAuth,
  requirePermission("manage_permissions"),
  async (req, res) => {
    const { level, principalId } = req.body as {
      level: string;
      principalId: string;
    };

    if (!level || !principalId) {
      res.status(400).json({ error: "level and principalId are required" });
      return;
    }

    await removePrincipalFromLevel(level, principalId);

    res.json({ success: true });
  },
);

export const confidentialityRouter = router;
