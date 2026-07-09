import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import { validateBody } from "../middlewares/validate-body";
import {
  buildGraphConnectionSchema,
  dryRunValidateSchema,
  registerConnectionSchema,
} from "../services/graph-schema.service";
import {
  buildExternalConnectionPayload,
  ensureExternalConnection,
} from "../services/graph-external-connection.service";
import {
  registerPageExternalItem,
  registerGlossaryExternalItem,
} from "../services/graph-schema-registration.service";
import { AppError } from "../lib/app-error";
import { logger } from "../lib/logger";

export const graphConnectorRouter: IRouter = Router();

const DryRunBody = z.object({ dryRun: z.boolean().optional().default(true) });

function handleError(res: import("express").Response, err: unknown, fallback: string) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.message,
      details: err.exposeDetails ? err.details : undefined,
    });
    return;
  }
  logger.error({ err }, fallback);
  res.status(500).json({ error: fallback });
}

graphConnectorRouter.get(
  "/connection",
  requireAuth,
  requirePermission("manage_graph_connector"),
  (_req, res) => {
    res.json(buildExternalConnectionPayload());
  },
);

graphConnectorRouter.post(
  "/connection/register",
  requireAuth,
  requirePermission("manage_graph_connector"),
  validateBody(DryRunBody),
  async (req, res) => {
    try {
      const result = await ensureExternalConnection(req.body.dryRun);
      res.json(result);
    } catch (err) {
      handleError(res, err, "Failed to register Graph external connection");
    }
  },
);

graphConnectorRouter.get(
  "/schema",
  requireAuth,
  requirePermission("manage_graph_connector"),
  (_req, res) => {
    res.json(buildGraphConnectionSchema());
  },
);

graphConnectorRouter.get(
  "/schema/dry-run",
  requireAuth,
  requirePermission("manage_graph_connector"),
  (_req, res) => {
    res.json(dryRunValidateSchema());
  },
);

graphConnectorRouter.post(
  "/schema/register",
  requireAuth,
  requirePermission("manage_graph_connector"),
  validateBody(DryRunBody),
  async (req, res) => {
    try {
      const result = await registerConnectionSchema(req.body.dryRun);
      res.json(result);
    } catch (err) {
      handleError(res, err, "Failed to register Graph connection schema");
    }
  },
);

graphConnectorRouter.get(
  "/external-items/pages/:id",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (req, res) => {
    try {
      const result = await registerPageExternalItem(String(req.params.id), true);
      res.json(result);
    } catch (err) {
      handleError(res, err, "Failed to build page externalItem");
    }
  },
);

graphConnectorRouter.post(
  "/external-items/pages/:id/register",
  requireAuth,
  requirePermission("manage_graph_connector"),
  validateBody(DryRunBody),
  async (req, res) => {
    try {
      const result = await registerPageExternalItem(
        String(req.params.id),
        req.body.dryRun,
      );
      res.json(result);
    } catch (err) {
      handleError(res, err, "Failed to register page externalItem");
    }
  },
);

graphConnectorRouter.get(
  "/external-items/glossary/:id",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (req, res) => {
    try {
      const result = await registerGlossaryExternalItem(String(req.params.id), true);
      res.json(result);
    } catch (err) {
      handleError(res, err, "Failed to build glossary externalItem");
    }
  },
);

graphConnectorRouter.post(
  "/external-items/glossary/:id/register",
  requireAuth,
  requirePermission("manage_graph_connector"),
  validateBody(DryRunBody),
  async (req, res) => {
    try {
      const result = await registerGlossaryExternalItem(
        String(req.params.id),
        req.body.dryRun,
      );
      res.json(result);
    } catch (err) {
      handleError(res, err, "Failed to register glossary externalItem");
    }
  },
);
