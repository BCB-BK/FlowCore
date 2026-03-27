import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import {
  AiAskBody,
  AiPageAssistBody,
  AiFieldAssistBody,
  UpdateAiSettingsBody,
  CreateAiFieldProfileBody,
} from "@workspace/api-zod";
import {
  getAiSettings,
  upsertAiSettings,
  streamAskAnswer,
  streamPageAssist,
  streamFieldAssist,
  getUsageStats,
  listFieldProfiles,
  createFieldProfile,
  updateFieldProfile,
  deleteFieldProfile,
  type PageAssistAction,
  type FieldAssistAction,
} from "../services/ai.service";
import { logger } from "../lib/logger";

export const aiRouter: IRouter = Router();

aiRouter.get(
  "/settings",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    try {
      const settings = await getAiSettings();
      res.json(settings);
    } catch (err) {
      logger.error({ err }, "Failed to get AI settings");
      res.status(500).json({ error: "Failed to get AI settings" });
    }
  },
);

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
    await streamAskAnswer(
      parsed.data.query,
      req.user!.principalId,
      res,
      parsed.data.includeUnpublished ?? false,
    );
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

aiRouter.post("/field-assist", requireAuth, async (req, res) => {
  const parsed = AiFieldAssistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error });
    return;
  }

  try {
    await streamFieldAssist(
      parsed.data.action as FieldAssistAction,
      parsed.data.text,
      parsed.data.fieldKey,
      parsed.data.pageType,
      parsed.data.nodeId,
      req.user!.principalId,
      res,
    );
  } catch (err) {
    logger.error({ err }, "AI field-assist failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "AI request failed" });
    }
  }
});

aiRouter.get(
  "/field-profiles",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    try {
      const pageType = typeof req.query.pageType === "string" ? req.query.pageType : undefined;
      const fieldKey = typeof req.query.fieldKey === "string" ? req.query.fieldKey : undefined;
      const profiles = await listFieldProfiles(pageType, fieldKey);
      res.json(profiles);
    } catch (err) {
      logger.error({ err }, "Failed to list AI field profiles");
      res.status(500).json({ error: "Failed to list field profiles" });
    }
  },
);

aiRouter.post(
  "/field-profiles",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    const parsed = CreateAiFieldProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error });
      return;
    }

    try {
      const profile = await createFieldProfile(
        parsed.data,
        req.user!.principalId,
      );
      res.status(201).json(profile);
    } catch (err) {
      logger.error({ err }, "Failed to create AI field profile");
      res.status(500).json({ error: "Failed to create field profile" });
    }
  },
);

aiRouter.put(
  "/field-profiles/:id",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    const parsed = CreateAiFieldProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error });
      return;
    }

    try {
      const id = typeof req.params.id === "string" ? req.params.id : String(req.params.id);
      const profile = await updateFieldProfile(
        id,
        parsed.data,
        req.user!.principalId,
      );
      if (!profile) {
        res.status(404).json({ error: "Field profile not found" });
        return;
      }
      res.json(profile);
    } catch (err) {
      logger.error({ err }, "Failed to update AI field profile");
      res.status(500).json({ error: "Failed to update field profile" });
    }
  },
);

aiRouter.delete(
  "/field-profiles/:id",
  requireAuth,
  requirePermission("manage_settings"),
  async (req, res) => {
    try {
      const id = typeof req.params.id === "string" ? req.params.id : String(req.params.id);
      await deleteFieldProfile(id);
      res.status(204).send();
    } catch (err) {
      logger.error({ err }, "Failed to delete AI field profile");
      res.status(500).json({ error: "Failed to delete field profile" });
    }
  },
);

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
