import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth";
import {
  createApiToken,
  listApiTokens,
  deleteApiToken,
} from "../services/api-token.service";
import { logger } from "../lib/logger";

const router = Router();

router.post("/tokens", requireAuth, async (req, res) => {
  try {
    const { name, expiresAt } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Token name is required" });
      return;
    }
    if (name.length > 100) {
      res.status(400).json({ error: "Token name must be 100 characters or less" });
      return;
    }

    let parsedExpiresAt: Date | null = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (isNaN(parsedExpiresAt.getTime())) {
        res.status(400).json({ error: "Invalid expiration date" });
        return;
      }
      if (parsedExpiresAt <= new Date()) {
        res.status(400).json({ error: "Expiration date must be in the future" });
        return;
      }
    }

    const result = await createApiToken({
      principalId: req.user!.principalId,
      name: name.trim(),
      expiresAt: parsedExpiresAt,
    });

    res.status(201).json({
      id: result.id,
      token: result.plainToken,
      name: name.trim(),
      expiresAt: parsedExpiresAt,
    });
  } catch (err: unknown) {
    logger.error({ err }, "Failed to create API token");
    res.status(500).json({ error: "Failed to create token" });
  }
});

router.get("/tokens", requireAuth, async (req, res) => {
  try {
    const tokens = await listApiTokens(req.user!.principalId);
    res.json(tokens);
  } catch (err: unknown) {
    logger.error({ err }, "Failed to list API tokens");
    res.status(500).json({ error: "Failed to list tokens" });
  }
});

router.delete("/tokens/:id", requireAuth, async (req, res) => {
  try {
    const tokenId = req.params.id as string;
    const deleted = await deleteApiToken(tokenId, req.user!.principalId);
    if (!deleted) {
      res.status(404).json({ error: "Token not found" });
      return;
    }
    res.status(204).send();
  } catch (err: unknown) {
    logger.error({ err }, "Failed to delete API token");
    res.status(500).json({ error: "Failed to delete token" });
  }
});

export default router;
