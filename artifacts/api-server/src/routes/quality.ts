import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import {
  getQualityOverview,
  getPageQualityList,
  getDuplicates,
  getMaintenanceHints,
  getPersonalWorkItems,
  getSearchInsights,
  getQualityByProcess,
} from "../services/quality.service";
import { getRolesForPrincipal } from "../services/principal.service";
import { logger } from "../lib/logger";

export const qualityRouter: IRouter = Router();

qualityRouter.get(
  "/overview",
  requireAuth,
  requirePermission("read_page"),
  async (_req, res) => {
    try {
      const overview = await getQualityOverview();
      res.json(overview);
    } catch (err) {
      logger.error({ err }, "Failed to get quality overview");
      res.status(500).json({ error: "Failed to get quality overview" });
    }
  },
);

qualityRouter.get(
  "/pages",
  requireAuth,
  requirePermission("read_page"),
  async (req, res) => {
    try {
      const filter = req.query.filter as string | undefined;
      const limit = Math.max(
        1,
        Math.min(parseInt(req.query.limit as string, 10) || 50, 200),
      );
      const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);
      const result = await getPageQualityList(filter, limit, offset);
      res.json(result);
    } catch (err) {
      logger.error({ err }, "Failed to get page quality list");
      res.status(500).json({ error: "Failed to get page quality list" });
    }
  },
);

qualityRouter.get(
  "/duplicates",
  requireAuth,
  requirePermission("read_page"),
  async (_req, res) => {
    try {
      const duplicates = await getDuplicates();
      res.json(duplicates);
    } catch (err) {
      logger.error({ err }, "Failed to get duplicates");
      res.status(500).json({ error: "Failed to get duplicates" });
    }
  },
);

qualityRouter.get(
  "/maintenance-hints",
  requireAuth,
  requirePermission("read_page"),
  async (_req, res) => {
    try {
      const hints = await getMaintenanceHints();
      res.json(hints);
    } catch (err) {
      logger.error({ err }, "Failed to get maintenance hints");
      res.status(500).json({ error: "Failed to get maintenance hints" });
    }
  },
);

qualityRouter.get(
  "/by-process",
  requireAuth,
  requirePermission("read_page"),
  async (_req, res) => {
    try {
      const data = await getQualityByProcess();
      res.json(data);
    } catch (err) {
      logger.error({ err }, "Failed to get quality by process");
      res.status(500).json({ error: "Failed to get quality by process" });
    }
  },
);

qualityRouter.get(
  "/my-work",
  requireAuth,
  requirePermission("read_page"),
  async (req, res) => {
    try {
      const roleAssignments = await getRolesForPrincipal(req.user!.principalId);
      const roles = roleAssignments.map((ra) => ra.role);
      const items = await getPersonalWorkItems(req.user!.principalId, roles);
      res.json(items);
    } catch (err) {
      logger.error({ err }, "Failed to get personal work items");
      res.status(500).json({ error: "Failed to get personal work items" });
    }
  },
);

qualityRouter.get(
  "/search-insights",
  requireAuth,
  requirePermission("read_page"),
  async (req, res) => {
    try {
      const days = Math.max(
        1,
        Math.min(parseInt(req.query.days as string, 10) || 30, 365),
      );
      const insights = await getSearchInsights(days);
      res.json(insights);
    } catch (err) {
      logger.error({ err }, "Failed to get search insights");
      res.status(500).json({ error: "Failed to get search insights" });
    }
  },
);
