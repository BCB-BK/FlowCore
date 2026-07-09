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
  testExternalConnection,
} from "../services/graph-external-connection.service";
import { runReadinessCheck } from "../services/graph-readiness.service";
import { getSearchResultTemplatePrep } from "../services/graph-search-result-template.service";
import {
  listPageIndexStatus,
  listGlossaryIndexStatus,
} from "../services/graph-index-status.service";
import {
  registerPageExternalItem,
  registerGlossaryExternalItem,
} from "../services/graph-schema-registration.service";
import { previewAclForNode } from "../services/graph-acl-mapping.service";
import { getNodeConfidentialityLevel } from "../services/confidentiality.service";
import {
  GRAPH_ACL_TIERS,
  getGroupMapping,
  listGroupMappings,
  upsertGroupMapping,
  deleteGroupMapping,
} from "../services/graph-external-group-mapping.service";
import { db } from "@workspace/db";
import { graphAclSyncLogTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { AppError } from "../lib/app-error";
import { logger } from "../lib/logger";
import { runFullSync } from "../services/graph-full-sync.service";
import { runDeltaSync } from "../services/graph-delta-sync.service";
import { syncPage, syncGlossaryTerm } from "../services/graph-single-item-sync.service";
import { listQueue } from "../services/graph-sync-queue.service";
import { listSyncLog } from "../services/graph-sync-log.service";
import { listChangeFeed } from "../services/graph-change-feed.service";

export const graphConnectorRouter: IRouter = Router();

const DryRunBody = z.object({ dryRun: z.boolean().optional().default(true) });

const GroupMappingBody = z.object({
  entraGroupId: z.string().min(1),
  label: z.string().optional(),
});

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
  "/test-connection",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (_req, res) => {
    try {
      const result = await testExternalConnection();
      res.json(result);
    } catch (err) {
      handleError(res, err, "Failed to test Graph connection");
    }
  },
);

graphConnectorRouter.get(
  "/search-result-template",
  requireAuth,
  requirePermission("manage_graph_connector"),
  (_req, res) => {
    res.json(getSearchResultTemplatePrep());
  },
);

graphConnectorRouter.get(
  "/readiness-check",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (_req, res) => {
    try {
      const result = await runReadinessCheck();
      res.json(result);
    } catch (err) {
      handleError(res, err, "Failed to run Copilot Studio readiness check");
    }
  },
);

graphConnectorRouter.delete(
  "/group-mappings/:tier",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (req, res) => {
    try {
      const tier = req.params.tier as (typeof GRAPH_ACL_TIERS)[number];
      if (!GRAPH_ACL_TIERS.includes(tier)) {
        throw new AppError(400, `Unbekannte ACL-Stufe "${req.params.tier}"`);
      }
      await deleteGroupMapping(tier);
      res.status(204).send();
    } catch (err) {
      handleError(res, err, "Failed to delete group mapping");
    }
  },
);

graphConnectorRouter.get(
  "/index-status/pages",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (_req, res) => {
    try {
      const entries = await listPageIndexStatus();
      res.json({ entries });
    } catch (err) {
      handleError(res, err, "Failed to load page index status");
    }
  },
);

graphConnectorRouter.get(
  "/index-status/glossary",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (_req, res) => {
    try {
      const entries = await listGlossaryIndexStatus();
      res.json({ entries });
    } catch (err) {
      handleError(res, err, "Failed to load glossary index status");
    }
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

graphConnectorRouter.get(
  "/acl-preview/:nodeId",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (req, res) => {
    try {
      const nodeId = String(req.params.nodeId);
      const level = await getNodeConfidentialityLevel(nodeId);
      if (!level) {
        throw new AppError(404, "Knoten nicht gefunden");
      }
      const preview = await previewAclForNode(nodeId, level);
      res.json(preview);
    } catch (err) {
      handleError(res, err, "Failed to build ACL preview");
    }
  },
);

graphConnectorRouter.get(
  "/group-mappings",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (_req, res) => {
    try {
      const mappings = await listGroupMappings();
      res.json({ tiers: GRAPH_ACL_TIERS, mappings });
    } catch (err) {
      handleError(res, err, "Failed to load group mappings");
    }
  },
);

graphConnectorRouter.get(
  "/group-mappings/:tier",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (req, res) => {
    try {
      const tier = req.params.tier as (typeof GRAPH_ACL_TIERS)[number];
      if (!GRAPH_ACL_TIERS.includes(tier)) {
        throw new AppError(400, `Unbekannte ACL-Stufe "${req.params.tier}"`);
      }
      const mapping = await getGroupMapping(tier);
      res.json(mapping);
    } catch (err) {
      handleError(res, err, "Failed to load group mapping");
    }
  },
);

graphConnectorRouter.put(
  "/group-mappings/:tier",
  requireAuth,
  requirePermission("manage_graph_connector"),
  validateBody(GroupMappingBody),
  async (req, res) => {
    try {
      const tier = req.params.tier as (typeof GRAPH_ACL_TIERS)[number];
      if (!GRAPH_ACL_TIERS.includes(tier)) {
        throw new AppError(400, `Unbekannte ACL-Stufe "${req.params.tier}"`);
      }
      const updated = await upsertGroupMapping(
        tier,
        req.body.entraGroupId,
        req.body.label,
        req.user!.principalId,
      );
      res.json(updated);
    } catch (err) {
      handleError(res, err, "Failed to update group mapping");
    }
  },
);

graphConnectorRouter.get(
  "/sync-log",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const rows = await db
        .select()
        .from(graphAclSyncLogTable)
        .orderBy(desc(graphAclSyncLogTable.createdAt))
        .limit(limit);
      res.json({ entries: rows });
    } catch (err) {
      handleError(res, err, "Failed to load Graph ACL sync log");
    }
  },
);

graphConnectorRouter.post(
  "/sync/full",
  requireAuth,
  requirePermission("manage_graph_connector"),
  validateBody(DryRunBody),
  async (req, res) => {
    try {
      const result = await runFullSync(req.body.dryRun);
      res.json(result);
    } catch (err) {
      handleError(res, err, "Failed to run full Graph sync");
    }
  },
);

graphConnectorRouter.post(
  "/sync/delta",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 25, 200);
      const result = await runDeltaSync(limit);
      res.json(result);
    } catch (err) {
      handleError(res, err, "Failed to run delta Graph sync");
    }
  },
);

graphConnectorRouter.post(
  "/sync/pages/:id",
  requireAuth,
  requirePermission("manage_graph_connector"),
  validateBody(DryRunBody),
  async (req, res) => {
    try {
      const result = await syncPage(String(req.params.id), {
        dryRun: req.body.dryRun,
        force: true,
        actor: req.user?.displayName || req.user?.principalId || "system",
      });
      res.json(result);
    } catch (err) {
      handleError(res, err, "Failed to sync page to Graph");
    }
  },
);

graphConnectorRouter.post(
  "/sync/glossary/:id",
  requireAuth,
  requirePermission("manage_graph_connector"),
  validateBody(DryRunBody),
  async (req, res) => {
    try {
      const result = await syncGlossaryTerm(String(req.params.id), {
        dryRun: req.body.dryRun,
        force: true,
        actor: req.user?.displayName || req.user?.principalId || "system",
      });
      res.json(result);
    } catch (err) {
      handleError(res, err, "Failed to sync glossary term to Graph");
    }
  },
);

graphConnectorRouter.get(
  "/change-feed",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const rows = await listChangeFeed(status);
      res.json({ entries: rows });
    } catch (err) {
      handleError(res, err, "Failed to load Graph change feed");
    }
  },
);

graphConnectorRouter.get(
  "/sync/queue",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const rows = await listQueue(status);
      res.json({ entries: rows });
    } catch (err) {
      handleError(res, err, "Failed to load Graph sync queue");
    }
  },
);

graphConnectorRouter.get(
  "/sync/log",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (req, res) => {
    try {
      const rows = await listSyncLog({
        itemId: typeof req.query.itemId === "string" ? req.query.itemId : undefined,
        result:
          typeof req.query.result === "string"
            ? (req.query.result as "success" | "failed" | "skipped" | "deleted")
            : undefined,
        limit: Number(req.query.limit) || 50,
      });
      res.json({ entries: rows });
    } catch (err) {
      handleError(res, err, "Failed to load Graph sync log");
    }
  },
);

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

graphConnectorRouter.get(
  "/sync/log/export",
  requireAuth,
  requirePermission("manage_graph_connector"),
  async (req, res) => {
    try {
      const rows = await listSyncLog({
        itemId: typeof req.query.itemId === "string" ? req.query.itemId : undefined,
        result:
          typeof req.query.result === "string"
            ? (req.query.result as "success" | "failed" | "skipped" | "deleted")
            : undefined,
        limit: Math.min(Number(req.query.limit) || 1000, 5000),
      });

      const columns = [
        "id",
        "itemId",
        "itemType",
        "nodeId",
        "operation",
        "result",
        "reason",
        "contentHash",
        "dryRun",
        "attempt",
        "createdAt",
      ] as const;

      const lines = [columns.join(",")];
      for (const row of rows) {
        lines.push(
          columns
            .map((col) => toCsvValue((row as Record<string, unknown>)[col]))
            .join(","),
        );
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="graph-sync-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      res.send(lines.join("\n"));
    } catch (err) {
      handleError(res, err, "Failed to export Graph sync log");
    }
  },
);
