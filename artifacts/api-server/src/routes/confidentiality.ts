import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { confidentialityAccessConfigTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import {
  getConfidentialityConfig,
  invalidateConfidentialityConfigCache,
  CONFIDENTIALITY_LEVELS,
  VALID_ROLES,
} from "../services/confidentiality.service";

const router: IRouter = Router();

router.get("/", requireAuth, async (_req, res) => {
  const config = await getConfidentialityConfig();
  const result = CONFIDENTIALITY_LEVELS.map((level) => ({
    level,
    allowedRoles: config.get(level) || [],
  }));
  res.json(result);
});

router.put(
  "/",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    const body = req.body as Array<{
      level: string;
      allowedRoles: string[];
    }>;

    if (!Array.isArray(body)) {
      res.status(400).json({ error: "Body must be an array" });
      return;
    }

    for (const entry of body) {
      if (
        !entry.level ||
        !CONFIDENTIALITY_LEVELS.includes(entry.level as any)
      ) {
        res.status(400).json({
          error: `Invalid level: ${entry.level}`,
        });
        return;
      }
      if (!Array.isArray(entry.allowedRoles)) {
        res.status(400).json({
          error: `allowedRoles must be an array for level ${entry.level}`,
        });
        return;
      }
      const invalidRoles = entry.allowedRoles.filter(
        (r) => !VALID_ROLES.includes(r),
      );
      if (invalidRoles.length > 0) {
        res.status(400).json({
          error: `Invalid roles for level ${entry.level}: ${invalidRoles.join(", ")}`,
        });
        return;
      }
    }

    await db.transaction(async (tx) => {
      for (const entry of body) {
        await tx
          .insert(confidentialityAccessConfigTable)
          .values({
            level: entry.level,
            allowedRoles: entry.allowedRoles,
            updatedAt: new Date(),
            updatedBy: req.user!.principalId,
          })
          .onConflictDoUpdate({
            target: confidentialityAccessConfigTable.level,
            set: {
              allowedRoles: entry.allowedRoles,
              updatedAt: new Date(),
              updatedBy: req.user!.principalId,
            },
          });
      }
    });

    invalidateConfidentialityConfigCache();

    const config = await getConfidentialityConfig();
    const result = CONFIDENTIALITY_LEVELS.map((level) => ({
      level,
      allowedRoles: config.get(level) || [],
    }));

    res.json(result);
  },
);

export const confidentialityRouter = router;
