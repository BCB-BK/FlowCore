import { Client } from "@microsoft/microsoft-graph-client";
import { getAppAccessToken } from "./auth.service";
import { requireGraphConnectionId } from "./graph-connector-config.service";
import {
  COMMON_SCHEMA_PROPERTIES,
  GLOSSARY_SCHEMA_PROPERTIES,
  type GraphSchemaProperty,
} from "../lib/graph-external-item-schema";
import { AppError } from "../lib/app-error";
import { logger } from "../lib/logger";
import { setSystemSetting, getSystemSetting } from "./system-settings.service";

export const GRAPH_SCHEMA_REGISTERED_AT_KEY = "graph_schema_registered_at";

export async function getSchemaRegisteredAt(): Promise<string | null> {
  return getSystemSetting(GRAPH_SCHEMA_REGISTERED_AT_KEY);
}

export interface GraphConnectionSchema {
  baseType: "microsoft.graph.externalItem";
  properties: GraphSchemaProperty[];
}

/**
 * Builds the full Graph External Connection schema (base properties shared
 * by pages plus glossary-only properties merged in — Microsoft Graph
 * schemas are defined once per connection and cover every item type pushed
 * into it).
 */
export function buildGraphConnectionSchema(): GraphConnectionSchema {
  const byName = new Map<string, GraphSchemaProperty>();
  for (const prop of [...COMMON_SCHEMA_PROPERTIES, ...GLOSSARY_SCHEMA_PROPERTIES]) {
    byName.set(prop.name, prop);
  }
  return {
    baseType: "microsoft.graph.externalItem",
    properties: [...byName.values()],
  };
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  propertyCount: number;
}

/**
 * Validates the schema shape without calling Microsoft Graph. Used for the
 * "Dry Run für Schema" requirement: the caller can inspect exactly what
 * would be registered before committing to a live PATCH.
 */
export function dryRunValidateSchema(): SchemaValidationResult {
  const schema = buildGraphConnectionSchema();
  const errors: string[] = [];

  if (schema.baseType !== "microsoft.graph.externalItem") {
    errors.push("baseType muss microsoft.graph.externalItem sein");
  }
  if (schema.properties.length === 0) {
    errors.push("Schema enthält keine Properties");
  }

  const names = new Set<string>();
  for (const prop of schema.properties) {
    if (names.has(prop.name)) {
      errors.push(`Doppelte Property: ${prop.name}`);
    }
    names.add(prop.name);
    if (!prop.name || !prop.type) {
      errors.push(`Ungültige Property-Definition: ${JSON.stringify(prop)}`);
    }
  }

  return { valid: errors.length === 0, errors, propertyCount: schema.properties.length };
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
 * Registers (or re-registers) the connection schema against Microsoft
 * Graph. When `dryRun` is true (the default), no network call is made and
 * the built + validated schema is returned instead — errors are never
 * swallowed, a failed validation throws.
 */
export async function registerConnectionSchema(
  dryRun = true,
): Promise<{ dryRun: boolean; schema: GraphConnectionSchema; status?: string }> {
  const validation = dryRunValidateSchema();
  if (!validation.valid) {
    throw new AppError(400, "Schema-Validierung fehlgeschlagen", {
      details: validation.errors,
      exposeDetails: true,
    });
  }

  const schema = buildGraphConnectionSchema();

  if (dryRun) {
    return { dryRun: true, schema };
  }

  const connectionId = requireGraphConnectionId();
  const client = await getGraphClient();

  try {
    await client
      .api(`/external/connections/${connectionId}/schema`)
      .patch(schema);
  } catch (err) {
    logger.error({ err, connectionId }, "Failed to register Graph connection schema");
    throw new AppError(502, "Schema-Registrierung bei Microsoft Graph fehlgeschlagen", {
      details: err instanceof Error ? err.message : String(err),
      exposeDetails: true,
    });
  }

  await setSystemSetting(GRAPH_SCHEMA_REGISTERED_AT_KEY, new Date().toISOString());

  return { dryRun: false, schema, status: "registered" };
}
