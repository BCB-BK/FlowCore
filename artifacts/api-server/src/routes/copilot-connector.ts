import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import { requireConnectorKey } from "../middlewares/require-connector-key";
import { validateBody } from "../middlewares/validate-body";
import {
  buildConnectorOpenApiSpec,
  buildConnectorSwagger2Spec,
} from "../lib/copilot-connector-openapi";
import {
  searchForConnector,
  getNodeForConnector,
  validateRequestedScope,
} from "../services/copilot-connector-search.service";
import {
  createConnectorKey,
  listConnectorKeys,
  revokeConnectorKey,
} from "../services/copilot-connector-key.service";
import { CONFIDENTIALITY_LEVELS } from "../services/confidentiality.service";
import { AGENT_SCOPES, BRAND_SCOPES } from "../lib/agent-metadata";
import { logger } from "../lib/logger";

export const copilotConnectorRouter: IRouter = Router();

function baseUrlFromRequest(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol;
  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  return `${proto}://${host}`;
}

/**
 * Public: no auth. This is the connector's own OpenAPI discovery document,
 * imported by a tenant admin into the Power Apps Custom Connector wizard —
 * it must be fetchable without an API key, same as any OpenAPI description
 * endpoint. It only describes the shape of the API; it does not expose data.
 */
copilotConnectorRouter.get("/openapi.json", (req, res) => {
  const spec = buildConnectorOpenApiSpec(baseUrlFromRequest(req));
  res.json(spec);
});

/**
 * Public: no auth. Power Apps / Power Automate Custom Connectors only
 * accept OpenAPI 2.0 (Swagger) on import, not OpenAPI 3.x — this is the
 * document to import into the Custom Connector wizard. See
 * copilot-connector-openapi.ts for the source and Microsoft Learn reference.
 */
copilotConnectorRouter.get("/swagger.json", (req, res) => {
  const spec = buildConnectorSwagger2Spec(baseUrlFromRequest(req));
  res.json(spec);
});

const SearchBody = z.object({
  query: z.string().min(1),
  brandScope: z.array(z.string()).optional(),
  agentScope: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(25).optional(),
});

copilotConnectorRouter.post(
  "/search",
  requireConnectorKey,
  validateBody(SearchBody),
  async (req, res) => {
    const key = req.connectorKey!;
    const agentCheck = validateRequestedScope(
      req.body.agentScope,
      key.agentScopes,
    );
    if (!agentCheck.ok) {
      res.status(400).json({
        error: `API-Key nicht berechtigt für agentScope: ${agentCheck.disallowed.join(", ")}`,
      });
      return;
    }
    const brandCheck = validateRequestedScope(
      req.body.brandScope,
      key.brandScopes,
    );
    if (!brandCheck.ok) {
      res.status(400).json({
        error: `API-Key nicht berechtigt für brandScope: ${brandCheck.disallowed.join(", ")}`,
      });
      return;
    }

    try {
      const results = await searchForConnector(
        {
          query: req.body.query,
          brandScope: req.body.brandScope,
          agentScope: req.body.agentScope,
          limit: req.body.limit,
        },
        key,
      );
      res.json({ results });
    } catch (err) {
      logger.error({ err }, "Connector search failed");
      res.status(500).json({ error: "Suche fehlgeschlagen" });
    }
  },
);

copilotConnectorRouter.get(
  "/nodes/:id",
  requireConnectorKey,
  async (req, res) => {
    try {
      const result = await getNodeForConnector(
        String(req.params.id),
        req.connectorKey!,
      );
      if (result === null) {
        res
          .status(404)
          .json({ error: "Seite nicht gefunden oder nicht veröffentlicht" });
        return;
      }
      if (result === "forbidden") {
        res.status(403).json({
          error:
            "API-Key ist für diese Seite nicht berechtigt (agent_scope/brand_scope/Vertraulichkeit)",
        });
        return;
      }
      res.json(result);
    } catch (err) {
      logger.error({ err }, "Connector node lookup failed");
      res.status(500).json({ error: "Abruf fehlgeschlagen" });
    }
  },
);

// --- Admin management of connector keys (session/RBAC auth, not the API key itself) ---

const CreateKeyBody = z.object({
  name: z.string().min(1).max(100),
  agentScopes: z.array(z.enum(AGENT_SCOPES)).default([]),
  brandScopes: z.array(z.enum(BRAND_SCOPES)).default([]),
  maxConfidentialityLevel: z
    .enum(CONFIDENTIALITY_LEVELS as [string, ...string[]])
    .default("internal"),
});

copilotConnectorRouter.get(
  "/admin/keys",
  requireAuth,
  requirePermission("manage_copilot_connector_keys"),
  async (_req, res) => {
    const keys = await listConnectorKeys();
    res.json({ keys });
  },
);

copilotConnectorRouter.post(
  "/admin/keys",
  requireAuth,
  requirePermission("manage_copilot_connector_keys"),
  validateBody(CreateKeyBody),
  async (req, res) => {
    const { id, plainKey } = await createConnectorKey({
      name: req.body.name,
      agentScopes: req.body.agentScopes,
      brandScopes: req.body.brandScopes,
      maxConfidentialityLevel: req.body.maxConfidentialityLevel,
      createdBy: req.user!.principalId,
    });
    // plainKey is only ever returned once, at creation time.
    res.status(201).json({ id, apiKey: plainKey });
  },
);

copilotConnectorRouter.delete(
  "/admin/keys/:id",
  requireAuth,
  requirePermission("manage_copilot_connector_keys"),
  async (req, res) => {
    const revoked = await revokeConnectorKey(String(req.params.id));
    if (!revoked) {
      res.status(404).json({ error: "Key nicht gefunden" });
      return;
    }
    res.status(204).end();
  },
);
