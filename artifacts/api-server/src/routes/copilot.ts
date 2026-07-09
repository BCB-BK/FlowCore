import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import { projectPublishedPage } from "../services/copilot-content-projection.service";
import { projectGlossaryTerm } from "../services/glossary-projection.service";
import {
  exportPublishedPages,
  exportGlossaryTerms,
} from "../services/published-content-export.service";
import { logger } from "../lib/logger";

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
      const { limit, offset } = parsePagination(req);
      const result = await exportGlossaryTerms(limit, offset);
      res.json(result);
    } catch (err) {
      logger.error({ err }, "Failed to export copilot glossary");
      res.status(500).json({ error: "Failed to export glossary" });
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
