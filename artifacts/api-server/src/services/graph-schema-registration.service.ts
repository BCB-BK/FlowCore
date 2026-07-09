import { Client } from "@microsoft/microsoft-graph-client";
import { getAppAccessToken } from "./auth.service";
import { requireGraphConnectionId } from "./graph-connector-config.service";
import { projectPublishedPage } from "./copilot-content-projection.service";
import { projectGlossaryTerm } from "./glossary-projection.service";
import { buildAclForConfidentialityLevel } from "./graph-acl.service";
import {
  mapPageToExternalItem,
  mapGlossaryToExternalItem,
  type GraphExternalItem,
} from "./graph-external-item-mapper.service";
import type { ConfidentialityLevel } from "./confidentiality.service";
import { AppError } from "../lib/app-error";
import { logger } from "../lib/logger";

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

async function pushExternalItem(
  item: GraphExternalItem,
  dryRun: boolean,
): Promise<{ dryRun: boolean; item: GraphExternalItem; status?: string }> {
  if (dryRun) {
    return { dryRun: true, item };
  }

  const connectionId = requireGraphConnectionId();
  const client = await getGraphClient();

  try {
    await client
      .api(`/external/connections/${connectionId}/items/${item.id}`)
      .put(item);
  } catch (err) {
    logger.error(
      { err, connectionId, itemId: item.id },
      "Failed to push Graph externalItem",
    );
    throw new AppError(502, "Übertragung des externalItem an Microsoft Graph fehlgeschlagen", {
      details: err instanceof Error ? err.message : String(err),
      exposeDetails: true,
    });
  }

  return { dryRun: false, item, status: "pushed" };
}

/**
 * Builds (and optionally pushes) the externalItem for a published page.
 * Throws if the page is not indexable (not published, missing ACL, etc.)
 * or if required fields are missing — never returns a partial/fabricated
 * payload.
 */
export async function registerPageExternalItem(
  nodeId: string,
  dryRun = true,
): Promise<{ dryRun: boolean; item: GraphExternalItem; status?: string }> {
  const projection = await projectPublishedPage(nodeId);
  if (!projection) {
    throw new AppError(
      404,
      "Seite ist nicht veröffentlicht, nicht indexierbar oder existiert nicht",
    );
  }

  const level = (projection.confidentiality ?? "public") as ConfidentialityLevel;
  const acl = await buildAclForConfidentialityLevel(level);
  const item = mapPageToExternalItem(projection, acl);

  return pushExternalItem(item, dryRun);
}

/**
 * Builds (and optionally pushes) the externalItem for a glossary term.
 * Glossary terms have no confidentiality field of their own, so they are
 * treated as "public" ACL (everyone) by default.
 */
export async function registerGlossaryExternalItem(
  termId: string,
  dryRun = true,
): Promise<{ dryRun: boolean; item: GraphExternalItem; status?: string }> {
  const projection = await projectGlossaryTerm(termId);
  if (!projection) {
    throw new AppError(404, "Glossarbegriff nicht gefunden oder nicht exportierbar");
  }

  const acl = await buildAclForConfidentialityLevel("public");
  const item = mapGlossaryToExternalItem(projection, acl);

  return pushExternalItem(item, dryRun);
}
