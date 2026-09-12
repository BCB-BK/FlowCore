import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { glossaryTermsTable, auditEventsTable } from "@workspace/db/schema";
import { requireIntegrationKey } from "../middlewares/require-integration-key";
import { validateBody } from "../middlewares/validate-body";
import { buildContentApiSpec } from "../lib/content-api-openapi";
import {
  listScopedNodes,
  checkNodeAccess,
  type ScopedNode,
} from "../services/integration-scope.service";
import { projectPublishedPage } from "../services/copilot-content-projection.service";
import {
  formatiereSeite,
  parseSeitenformat,
  SEITENFORMATE,
} from "../lib/content-api-page-format";
import { projectGlossaryTerm } from "../services/glossary-projection.service";
import { isGlossarySyncEnabled } from "../services/system-settings.service";
import type { IntegrationPrincipal } from "../services/integration-key.service";
import { logger } from "../lib/logger";

/**
 * FlowCore Content-API (v1) — lesender Zugriff für externe Systeme.
 *
 * Authentifizierung ausschließlich über Integrationsschlüssel; jeder Schlüssel
 * bringt seine eigene Freigabe mit (Vertraulichkeit, Seitentypen, Teilbäume,
 * Einzelseiten, Marke/Bereich). Ausgeliefert werden nur veröffentlichte
 * Revisionen — Arbeitskopien verlassen FlowCore nie.
 */
export const contentApiRouter: IRouter = Router();

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

function baseUrlFromRequest(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol;
  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  return `${proto}://${host}`;
}

/**
 * Jeder Abruf wird protokolliert — welcher Schlüssel, welcher Endpunkt, wie
 * viele Datensätze. Ohne diese Spur lässt sich später nicht beantworten, was
 * FlowCore nach außen gegeben hat.
 */
function recordAccess(
  key: IntegrationPrincipal,
  action: string,
  details: Record<string, unknown>,
): void {
  db.insert(auditEventsTable)
    .values({
      eventType: "content_api",
      action,
      actorId: null,
      resourceType: "integration_key",
      resourceId: key.keyId,
      details: {
        keyName: key.name,
        targetSystem: key.targetSystem,
        ...details,
      },
    })
    .then(() => {})
    .catch((err: unknown) => {
      logger.error({ err }, "Content-API: Audit-Eintrag fehlgeschlagen");
    });
}

function toPageSummary(node: ScopedNode, baseUrl: string) {
  return {
    id: node.nodeId,
    displayCode: node.displayCode,
    title: node.title,
    pageType: node.templateType,
    confidentiality: node.confidentiality,
    updatedAt: node.updatedAt.toISOString(),
    url: `${baseUrl}/node/${node.nodeId}`,
  };
}

/**
 * Die Beschreibung der Schnittstelle selbst: keine Inhalte, nur die Form der
 * Endpunkte — zum Import in Salesforce, Postman oder die Power Platform.
 *
 * Die Route verlangt keinen Schlüssel; die globale Anmeldesperre in `app.ts`
 * greift davor trotzdem, sodass auch dieser Abruf den Header
 * `X-FlowCore-Api-Key` braucht. Das ist bewusst so belassen (eine Ausnahme
 * wäre eine Abschwächung der Anmeldung) und in `docs/30-CONTENT-API.md` sowie
 * im Einstellungsdialog entsprechend beschrieben.
 */
contentApiRouter.get("/v1/openapi.json", (req, res) => {
  res.json(buildContentApiSpec(baseUrlFromRequest(req)));
});

/**
 * Selbstauskunft: Was darf dieser Schlüssel? Das erspart bei jeder
 * Integration die Rückfrage, warum eine bestimmte Seite nicht auftaucht.
 */
contentApiRouter.get("/v1/scope", requireIntegrationKey, async (req, res) => {
  const key = req.integrationKey!;
  try {
    const nodes = await listScopedNodes(key.keyId, key);
    res.json({
      name: key.name,
      targetSystem: key.targetSystem,
      maxConfidentialityLevel: key.maxConfidentialityLevel,
      pageTypes: key.templateTypes.length > 0 ? key.templateTypes : "alle",
      brandScopes: key.brandScopes.length > 0 ? key.brandScopes : "alle",
      agentScopes: key.agentScopes.length > 0 ? key.agentScopes : "alle",
      structureSelections: key.nodeSelections.map((s) => ({
        nodeId: s.nodeId,
        mode: s.mode,
        includeDescendants: s.includeDescendants,
      })),
      accessiblePageCount: nodes.length,
      rateLimitPerMinute: key.rateLimitPerMinute,
    });
  } catch (err) {
    logger.error({ err }, "Content-API: Scope-Abruf fehlgeschlagen");
    res.status(500).json({ error: "Freigabe konnte nicht ermittelt werden" });
  }
});

/**
 * Seitenliste. `updatedSince` macht daraus einen inkrementellen Abgleich:
 * das Zielsystem merkt sich den Zeitstempel des letzten Laufs und holt nur
 * noch Geändertes.
 */
contentApiRouter.get("/v1/pages", requireIntegrationKey, async (req, res) => {
  const key = req.integrationKey!;
  const limit = Math.min(
    Math.max(Number(req.query.limit) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const pageType =
    typeof req.query.pageType === "string" ? req.query.pageType : null;
  const updatedSinceRaw =
    typeof req.query.updatedSince === "string" ? req.query.updatedSince : null;

  let updatedSince: Date | null = null;
  if (updatedSinceRaw) {
    const parsed = new Date(updatedSinceRaw);
    if (Number.isNaN(parsed.getTime())) {
      res.status(400).json({
        error: "updatedSince muss ein gültiger ISO-8601-Zeitstempel sein.",
      });
      return;
    }
    updatedSince = parsed;
  }

  try {
    let nodes = await listScopedNodes(key.keyId, key);
    if (pageType) nodes = nodes.filter((n) => n.templateType === pageType);
    if (updatedSince) {
      nodes = nodes.filter(
        (n) => n.updatedAt.getTime() > updatedSince.getTime(),
      );
    }

    const baseUrl = baseUrlFromRequest(req);
    const window = nodes.slice(offset, offset + limit);

    recordAccess(key, "pages_listed", {
      returned: window.length,
      total: nodes.length,
      pageType,
      updatedSince: updatedSinceRaw,
    });

    res.json({
      total: nodes.length,
      limit,
      offset,
      hasMore: offset + window.length < nodes.length,
      items: window.map((n) => toPageSummary(n, baseUrl)),
    });
  } catch (err) {
    logger.error({ err }, "Content-API: Seitenliste fehlgeschlagen");
    res.status(500).json({ error: "Seitenliste konnte nicht geladen werden" });
  }
});

/**
 * Änderungs-Feed für die laufende Synchronisation. Anders als /v1/pages
 * meldet er auch, was aus der Freigabe herausgefallen ist — damit das
 * Zielsystem Inhalte wieder entfernen kann, statt sie ewig zu behalten.
 */
contentApiRouter.get("/v1/changes", requireIntegrationKey, async (req, res) => {
  const key = req.integrationKey!;
  const sinceRaw = typeof req.query.since === "string" ? req.query.since : null;
  const knownIds =
    typeof req.query.knownIds === "string"
      ? req.query.knownIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  let since: Date | null = null;
  if (sinceRaw) {
    const parsed = new Date(sinceRaw);
    if (Number.isNaN(parsed.getTime())) {
      res
        .status(400)
        .json({ error: "since muss ein gültiger ISO-8601-Zeitstempel sein." });
      return;
    }
    since = parsed;
  }

  try {
    const nodes = await listScopedNodes(key.keyId, key);
    const currentIds = new Set(nodes.map((n) => n.nodeId));
    const baseUrl = baseUrlFromRequest(req);

    const changed = since
      ? nodes.filter((n) => n.updatedAt.getTime() > since.getTime())
      : nodes;
    const removed = knownIds.filter((id) => !currentIds.has(id));

    recordAccess(key, "changes_polled", {
      changed: changed.length,
      removed: removed.length,
      since: sinceRaw,
    });

    res.json({
      since: sinceRaw,
      // Zeitstempel für den nächsten Aufruf — vom Server, damit Uhrenversatz
      // beim Zielsystem keine Änderungen verschluckt.
      checkpoint: new Date().toISOString(),
      changed: changed.map((n) => toPageSummary(n, baseUrl)),
      removed,
    });
  } catch (err) {
    logger.error({ err }, "Content-API: Änderungs-Feed fehlgeschlagen");
    res.status(500).json({ error: "Änderungen konnten nicht geladen werden" });
  }
});

const ACCESS_DENIED_MESSAGES: Record<string, string> = {
  not_published: "Seite nicht gefunden oder nicht veröffentlicht.",
  out_of_structure:
    "Diese Seite liegt außerhalb der für diesen Schlüssel freigegebenen Struktur.",
  template_type: "Dieser Seitentyp ist für diesen Schlüssel nicht freigegeben.",
  confidentiality:
    "Die Vertraulichkeitsstufe dieser Seite übersteigt die Freigabe dieses Schlüssels.",
  brand_or_agent_scope:
    "Diese Seite gehört nicht zum freigegebenen Marken- oder Bereichszuschnitt.",
};

contentApiRouter.get(
  "/v1/pages/:id",
  requireIntegrationKey,
  async (req, res) => {
    const key = req.integrationKey!;
    const nodeId = String(req.params.id);
    const format = parseSeitenformat(req.query.format);
    if (!format) {
      res.status(400).json({
        error: `Unbekanntes Format. Erlaubt: ${SEITENFORMATE.join(", ")}.`,
      });
      return;
    }

    try {
      const decision = await checkNodeAccess(key.keyId, key, nodeId);
      if (!decision.allowed) {
        recordAccess(key, "page_denied", { nodeId, reason: decision.reason });
        // "Nicht veröffentlicht" bleibt 404, damit ein Schlüssel nicht die
        // Existenz von Seiten außerhalb seiner Freigabe abtasten kann.
        const status = decision.reason === "not_published" ? 404 : 403;
        res.status(status).json({
          error: ACCESS_DENIED_MESSAGES[decision.reason],
          reason: decision.reason,
        });
        return;
      }

      const projection = await projectPublishedPage(nodeId, {
        requireGraphAcl: false,
      });
      if (!projection) {
        res.status(404).json({ error: "Seite nicht gefunden" });
        return;
      }

      recordAccess(key, "page_read", {
        nodeId,
        displayCode: projection.displayCode,
        format,
      });
      res.json(formatiereSeite(projection, format));
    } catch (err) {
      logger.error({ err, nodeId }, "Content-API: Seitenabruf fehlgeschlagen");
      res.status(500).json({ error: "Seite konnte nicht geladen werden" });
    }
  },
);

const SearchBody = z.object({
  query: z.string().min(1).max(500),
  pageType: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

/**
 * Einfache Volltextsuche über den freigegebenen Ausschnitt. Bewusst schlank
 * gehalten: Titel und Kennung wiegen schwerer als der Fließtext, gesucht wird
 * ausschließlich in dem, was der Schlüssel ohnehin lesen darf.
 */
contentApiRouter.post(
  "/v1/search",
  requireIntegrationKey,
  validateBody(SearchBody),
  async (req, res) => {
    const key = req.integrationKey!;
    const { query, pageType } = req.body as z.infer<typeof SearchBody>;
    const limit = req.body.limit ?? 10;

    try {
      let nodes = await listScopedNodes(key.keyId, key);
      if (pageType) nodes = nodes.filter((n) => n.templateType === pageType);

      const needle = query.toLowerCase();
      const baseUrl = baseUrlFromRequest(req);
      const scored: { node: ScopedNode; score: number; summary: string }[] = [];

      for (const node of nodes) {
        let score = 0;
        if (node.title.toLowerCase().includes(needle)) score += 10;
        if (node.displayCode.toLowerCase().includes(needle)) score += 8;

        let summary = "";
        if (score === 0 || scored.length < limit * 4) {
          const projection = await projectPublishedPage(node.nodeId, {
            requireGraphAcl: false,
          });
          if (projection) {
            summary = projection.summary;
            if (projection.summary.toLowerCase().includes(needle)) score += 4;
            if (projection.contentText.toLowerCase().includes(needle))
              score += 2;
          }
        }
        if (score > 0) scored.push({ node, score, summary });
      }

      scored.sort((a, b) => b.score - a.score);
      const results = scored.slice(0, limit);

      recordAccess(key, "search", { query, results: results.length });

      res.json({
        query,
        results: results.map((r) => ({
          ...toPageSummary(r.node, baseUrl),
          summary: r.summary,
          score: r.score,
        })),
      });
    } catch (err) {
      logger.error({ err }, "Content-API: Suche fehlgeschlagen");
      res.status(500).json({ error: "Suche fehlgeschlagen" });
    }
  },
);

/**
 * Glossar. Begriffe hängen nicht an der Seitenstruktur, deshalb greift hier
 * nur die Vertraulichkeitsgrenze des Schlüssels — und die Freigabe des
 * Glossar-Exports in den Systemeinstellungen.
 */
contentApiRouter.get(
  "/v1/glossary",
  requireIntegrationKey,
  async (req, res) => {
    const key = req.integrationKey!;
    try {
      if (!(await isGlossarySyncEnabled())) {
        res.json({
          total: 0,
          items: [],
          note: "Glossar-Export ist deaktiviert.",
        });
        return;
      }

      const terms = await db
        .select({ id: glossaryTermsTable.id })
        .from(glossaryTermsTable);

      const items = [];
      for (const t of terms) {
        const projection = await projectGlossaryTerm(t.id);
        if (projection) items.push(projection);
      }

      recordAccess(key, "glossary_listed", { returned: items.length });
      res.json({ total: items.length, items });
    } catch (err) {
      logger.error({ err }, "Content-API: Glossarabruf fehlgeschlagen");
      res.status(500).json({ error: "Glossar konnte nicht geladen werden" });
    }
  },
);
