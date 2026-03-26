import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import {
  AiAskBody,
  AiPageAssistBody,
  UpdateAiSettingsBody,
} from "@workspace/api-zod";
import {
  getAiSettings,
  upsertAiSettings,
  streamAskAnswer,
  streamPageAssist,
  getUsageStats,
  type PageAssistAction,
} from "../services/ai.service";
import { logger } from "../lib/logger";

export const aiRouter: IRouter = Router();

aiRouter.get("/settings", requireAuth, async (req, res) => {
  try {
    const settings = await getAiSettings();
    res.json(settings);
  } catch (err) {
    logger.error({ err }, "Failed to get AI settings");
    res.status(500).json({ error: "Failed to get AI settings" });
  }
});

aiRouter.put(
  "/settings",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    const parsed = UpdateAiSettingsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error });
      return;
    }

    try {
      const settings = await upsertAiSettings(
        parsed.data,
        req.user!.principalId,
      );
      res.json(settings);
    } catch (err) {
      logger.error({ err }, "Failed to update AI settings");
      res.status(500).json({ error: "Failed to update AI settings" });
    }
  },
);

aiRouter.post("/ask", requireAuth, async (req, res) => {
  const parsed = AiAskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error });
    return;
  }

  try {
    await streamAskAnswer(parsed.data.query, req.user!.principalId, res);
  } catch (err) {
    logger.error({ err }, "AI ask failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "AI request failed" });
    }
  }
});

aiRouter.post("/page-assist", requireAuth, async (req, res) => {
  const parsed = AiPageAssistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error });
    return;
  }

  try {
    await streamPageAssist(
      parsed.data.action as PageAssistAction,
      parsed.data.text,
      parsed.data.nodeId,
      req.user!.principalId,
      res,
    );
  } catch (err) {
    logger.error({ err }, "AI page-assist failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "AI request failed" });
    }
  }
});

aiRouter.get(
  "/usage-stats",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    const days = parseInt(req.query.days as string, 10) || 30;
    try {
      const stats = await getUsageStats(days);
      res.json(stats);
    } catch (err) {
      logger.error({ err }, "Failed to get AI usage stats");
      res.status(500).json({ error: "Failed to get AI usage stats" });
    }
  },
);
