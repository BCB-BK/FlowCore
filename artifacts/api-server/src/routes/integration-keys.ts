import { Router, type IRouter } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { auditEventsTable } from "@workspace/db/schema";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import { validateBody } from "../middlewares/validate-body";
import {
  createIntegrationKey,
  listIntegrationKeys,
  updateIntegrationKey,
  revokeIntegrationKey,
  rotateIntegrationKey,
  type IntegrationScope,
} from "../services/integration-key.service";
import {
  previewScope,
  invalidateStructuralScopeCache,
} from "../services/integration-scope.service";
import { CONFIDENTIALITY_LEVELS } from "../services/confidentiality.service";
import { ALL_TEMPLATE_TYPES } from "@workspace/shared/page-types";
import { logger } from "../lib/logger";

/**
 * Verwaltung der Integrationsschlüssel. Session- und rollenbasiert
 * abgesichert — hier meldet sich ein Mensch an, nicht ein Fremdsystem.
 */
export const integrationKeysRouter: IRouter = Router();

const NodeSelectionSchema = z.object({
  nodeId: z.string().uuid(),
  mode: z.enum(["include", "exclude"]).default("include"),
  includeDescendants: z.boolean().default(true),
});

const ScopeFields = {
  maxConfidentialityLevel: z
    .enum(CONFIDENTIALITY_LEVELS as [string, ...string[]])
    .default("internal"),
  templateTypes: z
    .array(z.enum(ALL_TEMPLATE_TYPES as [string, ...string[]]))
    .default([]),
  brandScopes: z.array(z.string().max(64)).default([]),
  agentScopes: z.array(z.string().max(64)).default([]),
  nodeSelections: z.array(NodeSelectionSchema).max(500).default([]),
};

const CreateKeyBody = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullish(),
  targetSystem: z.string().max(100).nullish(),
  ...ScopeFields,
  ipAllowlist: z.array(z.string().max(64)).max(50).default([]),
  rateLimitPerMinute: z.number().int().min(1).max(6000).default(60),
  expiresAt: z.string().datetime().nullish(),
});

const UpdateKeyBody = CreateKeyBody.partial();

const PreviewBody = z.object(ScopeFields);

function toScope(body: z.infer<typeof PreviewBody>): IntegrationScope {
  return {
    maxConfidentialityLevel:
      body.maxConfidentialityLevel as IntegrationScope["maxConfidentialityLevel"],
    templateTypes: body.templateTypes,
    brandScopes: body.brandScopes,
    agentScopes: body.agentScopes,
    nodeSelections: body.nodeSelections.map((s) => ({
      nodeId: s.nodeId,
      mode: s.mode,
      includeDescendants: s.includeDescendants,
    })),
  };
}

async function audit(
  actorId: string,
  action: string,
  keyId: string,
  details: Record<string, unknown>,
): Promise<void> {
  await db.insert(auditEventsTable).values({
    eventType: "content_api",
    action,
    actorId,
    resourceType: "integration_key",
    resourceId: keyId,
    details,
  });
}

integrationKeysRouter.get(
  "/",
  requireAuth,
  requirePermission("manage_integration_keys"),
  async (_req, res) => {
    res.json({ keys: await listIntegrationKeys() });
  },
);

/**
 * Freigabe-Vorschau. Läuft auf einem noch nicht gespeicherten Entwurf, damit
 * sichtbar ist, was eine Freigabe tatsächlich ausliefert — bevor sie gilt.
 */
integrationKeysRouter.post(
  "/preview",
  requireAuth,
  requirePermission("manage_integration_keys"),
  validateBody(PreviewBody),
  async (req, res) => {
    try {
      res.json(await previewScope(toScope(req.body)));
    } catch (err) {
      logger.error({ err }, "Freigabe-Vorschau fehlgeschlagen");
      res.status(500).json({ error: "Vorschau konnte nicht erstellt werden" });
    }
  },
);

integrationKeysRouter.post(
  "/",
  requireAuth,
  requirePermission("manage_integration_keys"),
  validateBody(CreateKeyBody),
  async (req, res) => {
    const body = req.body as z.infer<typeof CreateKeyBody>;
    try {
      const scope = toScope(body);
      const { id, plainKey } = await createIntegrationKey({
        name: body.name,
        description: body.description ?? null,
        targetSystem: body.targetSystem ?? null,
        ...scope,
        ipAllowlist: body.ipAllowlist,
        rateLimitPerMinute: body.rateLimitPerMinute,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        createdBy: req.user!.principalId,
      });

      await audit(req.user!.principalId, "integration_key_created", id, {
        name: body.name,
        targetSystem: body.targetSystem ?? null,
        maxConfidentialityLevel: scope.maxConfidentialityLevel,
        templateTypes: scope.templateTypes,
        nodeSelections: scope.nodeSelections.length,
      });

      // Der Klartext wird genau einmal ausgeliefert und nirgends gespeichert.
      res.status(201).json({ id, apiKey: plainKey });
    } catch (err) {
      logger.error(
        { err },
        "Anlegen des Integrationsschlüssels fehlgeschlagen",
      );
      res.status(400).json({
        error:
          err instanceof Error
            ? err.message
            : "Schlüssel konnte nicht angelegt werden",
      });
    }
  },
);

integrationKeysRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("manage_integration_keys"),
  validateBody(UpdateKeyBody),
  async (req, res) => {
    const keyId = String(req.params.id);
    const body = req.body as z.infer<typeof UpdateKeyBody>;
    try {
      const updated = await updateIntegrationKey(keyId, {
        ...body,
        maxConfidentialityLevel:
          body.maxConfidentialityLevel as IntegrationScope["maxConfidentialityLevel"],
        expiresAt:
          body.expiresAt === undefined
            ? undefined
            : body.expiresAt
              ? new Date(body.expiresAt)
              : null,
      });
      if (!updated) {
        res.status(404).json({ error: "Schlüssel nicht gefunden" });
        return;
      }

      // Die Struktur-Auswahl ist zwischengespeichert — nach einer Änderung
      // muss sie sofort neu aufgelöst werden, sonst gilt die alte Freigabe
      // noch bis zum Ablauf des Caches weiter.
      invalidateStructuralScopeCache(keyId);

      await audit(req.user!.principalId, "integration_key_updated", keyId, {
        fields: Object.keys(body),
      });
      res.status(204).end();
    } catch (err) {
      logger.error({ err }, "Ändern des Integrationsschlüssels fehlgeschlagen");
      res.status(400).json({
        error:
          err instanceof Error
            ? err.message
            : "Schlüssel konnte nicht geändert werden",
      });
    }
  },
);

integrationKeysRouter.post(
  "/:id/rotate",
  requireAuth,
  requirePermission("manage_integration_keys"),
  async (req, res) => {
    const keyId = String(req.params.id);
    const result = await rotateIntegrationKey(keyId);
    if (!result) {
      res.status(404).json({ error: "Schlüssel nicht gefunden" });
      return;
    }
    await audit(req.user!.principalId, "integration_key_rotated", keyId, {});
    res.json({ apiKey: result.plainKey });
  },
);

integrationKeysRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("manage_integration_keys"),
  async (req, res) => {
    const keyId = String(req.params.id);
    const revoked = await revokeIntegrationKey(keyId);
    if (!revoked) {
      res
        .status(404)
        .json({ error: "Schlüssel nicht gefunden oder bereits widerrufen" });
      return;
    }
    invalidateStructuralScopeCache(keyId);
    await audit(req.user!.principalId, "integration_key_revoked", keyId, {});
    res.status(204).end();
  },
);
