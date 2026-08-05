import { Client } from "@microsoft/microsoft-graph-client";
import { getAppAccessToken } from "./auth.service";
import { requireGraphConnectionId } from "./graph-connector-config.service";
import { projectPublishedPage } from "./copilot-content-projection.service";
import { projectGlossaryTerm } from "./glossary-projection.service";
import { buildAclForItem } from "./graph-acl-mapping.service";
import {
  mapPageToExternalItem,
  mapGlossaryToExternalItem,
  type GraphExternalItem,
} from "./graph-external-item-mapper.service";
import type { ConfidentialityLevel } from "./confidentiality.service";
import { AppError } from "../lib/app-error";
import { logger } from "../lib/logger";
import {
  isGraphSyncMockMode,
  getGraphFaultInjection,
} from "./system-settings.service";
import { createHash } from "node:crypto";

function combineWithAclHash(contentHash: string, acl: unknown): string {
  const aclHash = createHash("sha256")
    .update(JSON.stringify(acl ?? []))
    .digest("hex");
  return `${contentHash}:${aclHash}`;
}

async function getGraphClient(): Promise<Client> {
  const token = await getAppAccessToken();
  if (!token) {
    throw new AppError(
      502,
      "Konnte kein Microsoft Graph Access Token beziehen (Entra-Konfiguration prüfen)",
    );
  }
  return Client.init({ authProvider: (done) => done(null, token) });
}

export async function pushExternalItem(
  item: GraphExternalItem,
  dryRun: boolean,
): Promise<{
  dryRun: boolean;
  item: GraphExternalItem;
  status?: string;
  graphResponse?: unknown;
  graphResponseCode?: number;
}> {
  if (dryRun) {
    return { dryRun: true, item };
  }

  const fault = await getGraphFaultInjection();
  if (fault === "auth_unconfigured") {
    logger.error(
      { itemId: item.id },
      "Graph sync blocked: fault injection simulating missing Graph credentials (dev/test only)",
    );
    throw new AppError(
      502,
      "Kein gültiges Microsoft Graph Access Token verfügbar (Entra-Konfiguration/Secret fehlt)",
    );
  }
  if (fault === "api_error") {
    logger.error(
      { itemId: item.id },
      "Graph sync failed: fault injection simulating Graph API error (dev/test only)",
    );
    throw new AppError(
      502,
      "Simulierter Microsoft Graph API Fehler (Fault Injection)",
      {
        details: { graphResponseCode: 500 },
        exposeDetails: true,
      },
    );
  }

  if (await isGraphSyncMockMode()) {
    logger.info(
      { itemId: item.id },
      "Graph sync mock mode active - simulating confirmed push",
    );
    return {
      dryRun: false,
      item,
      status: "pushed",
      graphResponse: { acknowledged: true, mock: true },
      graphResponseCode: 200,
    };
  }

  const connectionId = requireGraphConnectionId();
  const client = await getGraphClient();

  let graphResponse: unknown;
  try {
    graphResponse = await client
      .api(`/external/connections/${connectionId}/items/${item.id}`)
      .put(item);
  } catch (err) {
    logger.error(
      { err, connectionId, itemId: item.id },
      "Failed to push Graph externalItem",
    );
    throw new AppError(
      502,
      "Übertragung des externalItem an Microsoft Graph fehlgeschlagen",
      {
        details: err instanceof Error ? err.message : String(err),
        exposeDetails: true,
      },
    );
  }

  return {
    dryRun: false,
    item,
    status: "pushed",
    graphResponse: graphResponse ?? { acknowledged: true },
    graphResponseCode: 200,
  };
}

/**
 * Deletes/deindexes an externalItem from the Graph connection. Only returns
 * success once Graph has confirmed the deletion (or the item is already
 * gone, which Graph reports as 404 - treated as an already-satisfied
 * delete, not a failure).
 */
export async function deleteExternalItem(
  itemId: string,
  dryRun: boolean,
): Promise<{
  dryRun: boolean;
  itemId: string;
  status?: string;
  graphResponse?: unknown;
  graphResponseCode?: number;
}> {
  if (dryRun) {
    return { dryRun: true, itemId, status: "would_delete" };
  }

  const fault = await getGraphFaultInjection();
  if (fault === "auth_unconfigured") {
    logger.error(
      { itemId },
      "Graph deindex blocked: fault injection simulating missing Graph credentials (dev/test only)",
    );
    throw new AppError(
      502,
      "Kein gültiges Microsoft Graph Access Token verfügbar (Entra-Konfiguration/Secret fehlt)",
    );
  }
  if (fault === "api_error") {
    logger.error(
      { itemId },
      "Graph deindex failed: fault injection simulating Graph API error (dev/test only)",
    );
    throw new AppError(
      502,
      "Simulierter Microsoft Graph API Fehler (Fault Injection)",
      {
        details: { graphResponseCode: 500 },
        exposeDetails: true,
      },
    );
  }

  if (await isGraphSyncMockMode()) {
    logger.info(
      { itemId },
      "Graph sync mock mode active - simulating confirmed delete",
    );
    return {
      dryRun: false,
      itemId,
      status: "deleted",
      graphResponse: { acknowledged: true, mock: true },
      graphResponseCode: 200,
    };
  }

  const connectionId = requireGraphConnectionId();
  const client = await getGraphClient();

  try {
    await client
      .api(`/external/connections/${connectionId}/items/${itemId}`)
      .delete();
  } catch (err) {
    const status =
      err && typeof err === "object" && "statusCode" in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;
    if (status === 404) {
      return {
        dryRun: false,
        itemId,
        status: "already_absent",
        graphResponse: { statusCode: 404 },
        graphResponseCode: 404,
      };
    }
    logger.error(
      { err, connectionId, itemId },
      "Failed to delete Graph externalItem",
    );
    throw new AppError(
      502,
      "Löschen des externalItem in Microsoft Graph fehlgeschlagen",
      {
        details: err instanceof Error ? err.message : String(err),
        exposeDetails: true,
      },
    );
  }

  return {
    dryRun: false,
    itemId,
    status: "deleted",
    graphResponse: { acknowledged: true },
    graphResponseCode: 200,
  };
}

/**
 * Builds the externalItem + ACL for a page without pushing to Graph.
 * Throws (via mapAclErrorToAppError / AppError(404)) if the page is not
 * indexable - never returns a partial/fabricated payload.
 */
export interface BuiltExternalItem {
  item: GraphExternalItem;
  contentHash: string;
  version: string | null;
  revision: number | null;
  aclHash: string;
}

function hashAcl(acl: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(acl ?? []))
    .digest("hex");
}

export async function buildPageExternalItem(
  nodeId: string,
): Promise<BuiltExternalItem> {
  const projection = await projectPublishedPage(nodeId);
  if (!projection) {
    throw new AppError(
      404,
      "Seite ist nicht veröffentlicht, nicht indexierbar oder existiert nicht",
    );
  }

  const level = (projection.confidentiality ??
    "public") as ConfidentialityLevel;
  const itemId = `flowcore_page_${projection.immutableId}`;

  let acl;
  try {
    acl = await buildAclForItem({
      itemId,
      itemType: "page",
      nodeId: projection.nodeId,
      level,
    });
  } catch (err) {
    mapAclErrorToAppError(err, `Seite ${nodeId}`);
  }

  const item = mapPageToExternalItem(projection, acl);
  return {
    item,
    contentHash: combineWithAclHash(projection.contentHash, acl),
    version: projection.version ?? null,
    revision: projection.revision ?? null,
    aclHash: hashAcl(acl),
  };
}

/**
 * Builds the externalItem + ACL for a glossary term without pushing to
 * Graph.
 */
export async function buildGlossaryExternalItem(
  termId: string,
): Promise<BuiltExternalItem> {
  const projection = await projectGlossaryTerm(termId);
  if (!projection) {
    throw new AppError(
      404,
      "Glossarbegriff nicht gefunden oder nicht exportierbar",
    );
  }

  const itemId = `flowcore_glossary_${projection.termId}`;

  let acl;
  try {
    acl = await buildAclForItem({
      itemId,
      itemType: "glossary",
      nodeId: null,
      level: "internal" as ConfidentialityLevel,
    });
  } catch (err) {
    mapAclErrorToAppError(err, `Glossarbegriff ${termId}`);
  }

  const item = mapGlossaryToExternalItem(projection, acl);
  return {
    item,
    contentHash: combineWithAclHash(projection.contentHash, acl),
    version: projection.version ?? null,
    revision: projection.revision ?? null,
    aclHash: hashAcl(acl),
  };
}

/**
 * Builds (and optionally pushes) the externalItem for a published page.
 * Throws if the page is not indexable (not published, missing ACL, etc.)
 * or if required fields are missing — never returns a partial/fabricated
 * payload.
 */
function mapAclErrorToAppError(err: unknown, context: string): never {
  if (err instanceof AppError) throw err;
  const reason =
    err && typeof err === "object" && "reason" in err
      ? String((err as { reason: unknown }).reason)
      : "unknown_error";
  const message =
    err instanceof Error ? err.message : `ACL für ${context} nicht ermittelbar`;
  throw new AppError(422, message, {
    details: { reason },
    exposeDetails: true,
  });
}

export async function registerPageExternalItem(
  nodeId: string,
  dryRun = true,
): Promise<{ dryRun: boolean; item: GraphExternalItem; status?: string }> {
  const { item } = await buildPageExternalItem(nodeId);
  return pushExternalItem(item, dryRun);
}

/**
 * Builds (and optionally pushes) the externalItem for a glossary term.
 * Glossary terms have no confidentiality field of their own, so they are
 * always resolved via the "internal_standard" tier (a defined internal
 * default group — never "everyone", and fail-closed if unconfigured).
 */
export async function registerGlossaryExternalItem(
  termId: string,
  dryRun = true,
): Promise<{ dryRun: boolean; item: GraphExternalItem; status?: string }> {
  const { item } = await buildGlossaryExternalItem(termId);
  return pushExternalItem(item, dryRun);
}
