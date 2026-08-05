import { db } from "@workspace/db";
import { copilotConnectorKeysTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import { logger } from "../lib/logger";
import {
  CONFIDENTIALITY_LEVELS,
  type ConfidentialityLevel,
} from "./confidentiality.service";

const KEY_PREFIX = "fc_connector_";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function generateKey(): { plainKey: string; displayPrefix: string } {
  const secret = randomBytes(24).toString("hex");
  const plainKey = `${KEY_PREFIX}${secret}`;
  return { plainKey, displayPrefix: plainKey.slice(0, 12) };
}

export interface CopilotConnectorPrincipal {
  keyId: string;
  name: string;
  agentScopes: string[];
  brandScopes: string[];
  maxConfidentialityLevel: ConfidentialityLevel;
}

/**
 * Numeric rank of a confidentiality level; higher = more restrictive.
 * Used to check whether a key's maxConfidentialityLevel permits access to
 * a node at a given level.
 */
export function confidentialityRank(level: ConfidentialityLevel): number {
  return CONFIDENTIALITY_LEVELS.indexOf(level);
}

export function isConfidentialityAllowed(
  nodeLevel: ConfidentialityLevel,
  maxAllowed: ConfidentialityLevel,
): boolean {
  return confidentialityRank(nodeLevel) <= confidentialityRank(maxAllowed);
}

export async function createConnectorKey(input: {
  name: string;
  agentScopes: string[];
  brandScopes: string[];
  maxConfidentialityLevel: ConfidentialityLevel;
  createdBy: string;
}): Promise<{ id: string; plainKey: string }> {
  const { plainKey, displayPrefix } = generateKey();
  const keyHash = hashKey(plainKey);

  const [row] = await db
    .insert(copilotConnectorKeysTable)
    .values({
      name: input.name,
      keyHash,
      keyPrefix: displayPrefix,
      agentScopes: input.agentScopes,
      brandScopes: input.brandScopes,
      maxConfidentialityLevel: input.maxConfidentialityLevel,
      createdBy: input.createdBy,
    })
    .returning({ id: copilotConnectorKeysTable.id });

  return { id: row.id, plainKey };
}

export async function validateConnectorKey(
  key: string,
): Promise<CopilotConnectorPrincipal | null> {
  const keyHash = hashKey(key);

  const [row] = await db
    .select()
    .from(copilotConnectorKeysTable)
    .where(
      and(
        eq(copilotConnectorKeysTable.keyHash, keyHash),
        eq(copilotConnectorKeysTable.revoked, false),
      ),
    );

  if (!row) return null;

  db.update(copilotConnectorKeysTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(copilotConnectorKeysTable.id, row.id))
    .then(() => {})
    .catch((err: unknown) => {
      logger.error({ err }, "Failed to update lastUsedAt for connector key");
    });

  const maxLevel = CONFIDENTIALITY_LEVELS.includes(
    row.maxConfidentialityLevel as ConfidentialityLevel,
  )
    ? (row.maxConfidentialityLevel as ConfidentialityLevel)
    : "internal";

  return {
    keyId: row.id,
    name: row.name,
    agentScopes: row.agentScopes ?? [],
    brandScopes: row.brandScopes ?? [],
    maxConfidentialityLevel: maxLevel,
  };
}

export async function listConnectorKeys() {
  return db
    .select({
      id: copilotConnectorKeysTable.id,
      name: copilotConnectorKeysTable.name,
      keyPrefix: copilotConnectorKeysTable.keyPrefix,
      agentScopes: copilotConnectorKeysTable.agentScopes,
      brandScopes: copilotConnectorKeysTable.brandScopes,
      maxConfidentialityLevel:
        copilotConnectorKeysTable.maxConfidentialityLevel,
      revoked: copilotConnectorKeysTable.revoked,
      lastUsedAt: copilotConnectorKeysTable.lastUsedAt,
      createdAt: copilotConnectorKeysTable.createdAt,
    })
    .from(copilotConnectorKeysTable)
    .orderBy(copilotConnectorKeysTable.createdAt);
}

export async function revokeConnectorKey(id: string): Promise<boolean> {
  const result = await db
    .update(copilotConnectorKeysTable)
    .set({ revoked: true })
    .where(eq(copilotConnectorKeysTable.id, id))
    .returning({ id: copilotConnectorKeysTable.id });
  return result.length > 0;
}
