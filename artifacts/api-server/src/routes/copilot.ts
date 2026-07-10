import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import { validateBody } from "../middlewares/validate-body";
import { projectPublishedPage } from "../services/copilot-content-projection.service";
import { projectGlossaryTerm } from "../services/glossary-projection.service";
import {
  exportPublishedPages,
  exportGlossaryTerms,
} from "../services/published-content-export.service";
import { setCopilotIndexStatus } from "../services/copilot-index-status.service";
import { isGlossarySyncEnabled } from "../services/system-settings.service";
import { COPILOT_INDEX_STATUSES } from "../lib/agent-metadata";
import { AppError } from "../lib/app-error";
import { logger } from "../lib/logger";

const SetIndexStatusBody = z.object({
  status: z.enum(COPILOT_INDEX_STATUSES),
  error: z.string().nullable().optional(),
});

export const copilotRouter: IRouter = Router();

function parsePagination(req: { query: Record<string, unknown> }) {
  const limit = parseInt(String(req.query.limit ?? ""), 10);
  const offset = parseInt(String(req.query.offset ?? ""), 10);
  return {
    limit: Number.isFinite(limit) ? limit : 50,
    offset: Number.isFinite(offset) ? offset : 0,
  };
}

copilotRouter.get(
  "/pages",
  requireAuth,
  requirePermission("export_copilot_content"),
  async (req, res) => {
    try {
      const { limit, offset } = parsePagination(req);
      const result = await exportPublishedPages(limit, offset);
      res.json(result);
    } catch (err) {
      logger.error({ err }, "Failed to export copilot pages");
      res.status(500).json({ error: "Failed to export pages" });
    }
  },
);

copilotRouter.get(
  "/pages/:id",
  requireAuth,
  requirePermission("export_copilot_content"),
  async (req, res) => {
    try {
      const projection = await projectPublishedPage(String(req.params.id));
      if (!projection) {
        res.status(404).json({ error: "Page not found or not published" });
        return;
      }
      res.json(projection);
    } catch (err) {
      logger.error({ err }, "Failed to export copilot page");
      res.status(500).json({ error: "Failed to export page" });
    }
  },
);

copilotRouter.get(
  "/glossary",
  requireAuth,
  requirePermission("export_copilot_content"),
  async (req, res) => {
    try {
      if (!(await isGlossarySyncEnabled())) {
        res.json({ items: [], total: 0, limit: 0, offset: 0, hasMore: false });
        return;
      }
      const { limit, offset } = parsePagination(req);
      const result = await exportGlossaryTerms(limit, offset);
      res.json(result);
    } catch (err) {
      logger.error({ err }, "Failed to export copilot glossary");
      res.status(500).json({ error: "Failed to export glossary" });
    }
  },
);

copilotRouter.patch(
  "/pages/:id/index-status",
  requireAuth,
  requirePermission("manage_copilot_index_status"),
  validateBody(SetIndexStatusBody),
  async (req, res) => {
    try {
      await setCopilotIndexStatus(
        String(req.params.id),
        req.body.status,
        req.body.error ?? null,
      );
      res.status(204).end();
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      logger.error({ err }, "Failed to set copilot index status");
      res.status(500).json({ error: "Failed to set index status" });
    }
  },
);

copilotRouter.get(
  "/glossary/:id",
  requireAuth,
  requirePermission("export_copilot_content"),
  async (req, res) => {
    try {
      const projection = await projectGlossaryTerm(String(req.params.id));
      if (!projection) {
        res.status(404).json({ error: "Glossary term not found" });
        return;
      }
      res.json(projection);
    } catch (err) {
      logger.error({ err }, "Failed to export copilot glossary term");
      res.status(500).json({ error: "Failed to export glossary term" });
    }
  },
);
