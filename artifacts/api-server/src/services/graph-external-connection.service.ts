import { Client } from "@microsoft/microsoft-graph-client";
import { getAppAccessToken } from "./auth.service";
import {
  getGraphConnectorConfig,
  requireGraphConnectionId,
} from "./graph-connector-config.service";
import { AppError } from "../lib/app-error";
import { logger } from "../lib/logger";

export interface ExternalConnectionPayload {
  id: string;
  name: string;
  description: string;
}

/** Builds the External Connection payload (id/name/description) without calling Graph. */
export function buildExternalConnectionPayload(): ExternalConnectionPayload {
  const { connectionId, connectionName, connectionDescription } =
    getGraphConnectorConfig();
  return {
    id: connectionId || "(unset — see GRAPH_EXTERNAL_CONNECTION_ID)",
    name: connectionName,
    description: connectionDescription,
  };
}

async function getGraphClient(): Promise<Client> {
  const token = await getAppAccessToken();
  if (!token) {
    throw new AppError(
      502,
      "Konnte kein Microsoft Graph Access Token beziehen (Entra-Konfiguration prüfen)",
    );
  }
  return Client.init({
    authProvider: (done) => done(null, token),
  });
}

/**
 * Ensures the External Connection exists in Microsoft Graph, reusing it if
 * already present ("Bestehende Graph-Anbindung wiederverwenden, wenn sauber
 * möglich") rather than creating a duplicate. In dry-run mode, no network
 * call is made.
 */
export async function ensureExternalConnection(
  dryRun = true,
): Promise<{ dryRun: boolean; connection: ExternalConnectionPayload; created?: boolean }> {
  const connection = buildExternalConnectionPayload();

  if (dryRun) {
    return { dryRun: true, connection };
  }

  const connectionId = requireGraphConnectionId();
  const client = await getGraphClient();

  try {
    await client.api(`/external/connections/${connectionId}`).get();
    return { dryRun: false, connection, created: false };
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status !== 404) {
      logger.error({ err, connectionId }, "Failed to look up Graph external connection");
      throw new AppError(502, "Abfrage der Graph External Connection fehlgeschlagen", {
        details: err instanceof Error ? err.message : String(err),
        exposeDetails: true,
      });
    }
  }

  try {
    await client.api("/external/connections").post({
      id: connectionId,
      name: connection.name,
      description: connection.description,
    });
  } catch (err) {
    logger.error({ err, connectionId }, "Failed to create Graph external connection");
    throw new AppError(502, "Anlegen der Graph External Connection fehlgeschlagen", {
      details: err instanceof Error ? err.message : String(err),
      exposeDetails: true,
    });
  }

  return { dryRun: false, connection, created: true };
}
