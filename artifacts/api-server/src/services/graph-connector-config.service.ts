import { AppError } from "../lib/app-error";

/**
 * Configuration for the Microsoft Graph External Connection used to expose
 * FlowCore content to Microsoft Search / Copilot Studio ("Enterprise data
 * using connectors"). All values are configurable via environment
 * variables — no secrets or connection identifiers are hardcoded.
 */
export interface GraphConnectorConfig {
  connectionId: string;
  connectionName: string;
  connectionDescription: string;
}

const DEFAULT_CONNECTION_NAME = "FlowCore Wiki";
const DEFAULT_CONNECTION_DESCRIPTION =
  "FlowCore Bildungscampus Backnang – veröffentlichte Seiten und Glossarbegriffe für Microsoft Search und Copilot Studio";

/**
 * Returns the connector configuration. `connectionId` is required for any
 * live registration/push against Microsoft Graph but is NOT required to
 * build schema/externalItem payloads for dry runs — those can be inspected
 * without a live connection configured.
 */
export function getGraphConnectorConfig(): GraphConnectorConfig {
  const connectionId = (process.env["GRAPH_EXTERNAL_CONNECTION_ID"] ?? "").trim();
  const connectionName = (
    process.env["GRAPH_EXTERNAL_CONNECTION_NAME"] ?? DEFAULT_CONNECTION_NAME
  ).trim();
  const connectionDescription = (
    process.env["GRAPH_EXTERNAL_CONNECTION_DESCRIPTION"] ??
    DEFAULT_CONNECTION_DESCRIPTION
  ).trim();

  return { connectionId, connectionName, connectionDescription };
}

/**
 * Validates that a connection id is configured. Throws (never returns a
 * silently-fabricated id) — callers attempting live Graph operations must
 * handle this explicitly rather than falling back to a guessed value.
 */
export function requireGraphConnectionId(): string {
  const { connectionId } = getGraphConnectorConfig();
  if (!connectionId) {
    throw new AppError(
      400,
      "GRAPH_EXTERNAL_CONNECTION_ID ist nicht konfiguriert. Für Live-Registrierung bei Microsoft Graph muss diese Umgebungsvariable gesetzt sein.",
    );
  }
  return connectionId;
}
