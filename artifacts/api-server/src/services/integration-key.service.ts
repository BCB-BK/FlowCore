import { db } from "@workspace/db";
import {
  integrationKeysTable,
  integrationKeyNodesTable,
  contentNodesTable,
} from "@workspace/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { logger } from "../lib/logger";
import {
  CONFIDENTIALITY_LEVELS,
  type ConfidentialityLevel,
} from "./confidentiality.service";

const KEY_PREFIX = "fc_int_";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function generateKey(): { plainKey: string; displayPrefix: string } {
  const secret = randomBytes(32).toString("base64url");
  const plainKey = `${KEY_PREFIX}${secret}`;
  return { plainKey, displayPrefix: plainKey.slice(0, 16) };
}

export type NodeSelectionMode = "include" | "exclude";

export interface NodeSelection {
  nodeId: string;
  mode: NodeSelectionMode;
  includeDescendants: boolean;
}

/**
 * Die Freigabe eines Schlüssels — alles, was die Content-API braucht, um zu
 * entscheiden, welche Seiten dieser Schlüssel sehen darf.
 */
export interface IntegrationScope {
  maxConfidentialityLevel: ConfidentialityLevel;
  templateTypes: string[];
  brandScopes: string[];
  agentScopes: string[];
  nodeSelections: NodeSelection[];
}

export interface IntegrationPrincipal extends IntegrationScope {
  keyId: string;
  name: string;
  targetSystem: string | null;
  rateLimitPerMinute: number;
  ipAllowlist: string[];
}

export function confidentialityRank(level: ConfidentialityLevel): number {
  return CONFIDENTIALITY_LEVELS.indexOf(level);
}

export function isConfidentialityAllowed(
  nodeLevel: ConfidentialityLevel,
  maxAllowed: ConfidentialityLevel,
): boolean {
  return confidentialityRank(nodeLevel) <= confidentialityRank(maxAllowed);
}

function normalizeLevel(value: string): ConfidentialityLevel {
  return CONFIDENTIALITY_LEVELS.includes(value as ConfidentialityLevel)
    ? (value as ConfidentialityLevel)
    : "internal";
}

export interface CreateIntegrationKeyInput {
  name: string;
  description?: string | null;
  targetSystem?: string | null;
  maxConfidentialityLevel: ConfidentialityLevel;
  templateTypes: string[];
  brandScopes: string[];
  agentScopes: string[];
  nodeSelections: NodeSelection[];
  ipAllowlist: string[];
  rateLimitPerMinute: number;
  expiresAt: Date | null;
  createdBy: string;
}

/**
 * Prüft, dass alle ausgewählten Knoten existieren. Ein Tippfehler in einer
 * Knoten-ID würde sonst still zu einer leeren Freigabe führen.
 */
async function assertNodesExist(nodeIds: string[]): Promise<void> {
  if (nodeIds.length === 0) return;
  const rows = await db
    .select({ id: contentNodesTable.id })
    .from(contentNodesTable)
    .where(
      and(
        inArray(contentNodesTable.id, nodeIds),
        eq(contentNodesTable.isDeleted, false),
      ),
    );
  const found = new Set(rows.map((r) => r.id));
  const missing = nodeIds.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Unbekannte oder gelöschte Seiten in der Auswahl: ${missing.join(", ")}`,
    );
  }
}

export async function createIntegrationKey(
  input: CreateIntegrationKeyInput,
): Promise<{ id: string; plainKey: string }> {
  await assertNodesExist(input.nodeSelections.map((s) => s.nodeId));

  const { plainKey, displayPrefix } = generateKey();
  const keyHash = hashKey(plainKey);

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(integrationKeysTable)
      .values({
        name: input.name,
        description: input.description ?? null,
        targetSystem: input.targetSystem ?? null,
        keyHash,
        keyPrefix: displayPrefix,
        maxConfidentialityLevel: input.maxConfidentialityLevel,
        templateTypes: input.templateTypes,
        brandScopes: input.brandScopes,
        agentScopes: input.agentScopes,
        ipAllowlist: input.ipAllowlist,
        rateLimitPerMinute: input.rateLimitPerMinute,
        expiresAt: input.expiresAt,
        createdBy: input.createdBy,
      })
      .returning({ id: integrationKeysTable.id });

    if (input.nodeSelections.length > 0) {
      await tx.insert(integrationKeyNodesTable).values(
        input.nodeSelections.map((s) => ({
          keyId: row.id,
          nodeId: s.nodeId,
          mode: s.mode,
          includeDescendants: s.includeDescendants,
        })),
      );
    }

    return row.id;
  });

  return { id, plainKey };
}

export interface UpdateIntegrationKeyInput {
  name?: string;
  description?: string | null;
  targetSystem?: string | null;
  maxConfidentialityLevel?: ConfidentialityLevel;
  templateTypes?: string[];
  brandScopes?: string[];
  agentScopes?: string[];
  nodeSelections?: NodeSelection[];
  ipAllowlist?: string[];
  rateLimitPerMinute?: number;
  expiresAt?: Date | null;
}

export async function updateIntegrationKey(
  keyId: string,
  input: UpdateIntegrationKeyInput,
): Promise<boolean> {
  if (input.nodeSelections) {
    await assertNodesExist(input.nodeSelections.map((s) => s.nodeId));
  }

  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: integrationKeysTable.id })
      .from(integrationKeysTable)
      .where(eq(integrationKeysTable.id, keyId));
    if (!existing) return false;

    await tx
      .update(integrationKeysTable)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.targetSystem !== undefined
          ? { targetSystem: input.targetSystem }
          : {}),
        ...(input.maxConfidentialityLevel !== undefined
          ? { maxConfidentialityLevel: input.maxConfidentialityLevel }
          : {}),
        ...(input.templateTypes !== undefined
          ? { templateTypes: input.templateTypes }
          : {}),
        ...(input.brandScopes !== undefined
          ? { brandScopes: input.brandScopes }
          : {}),
        ...(input.agentScopes !== undefined
          ? { agentScopes: input.agentScopes }
          : {}),
        ...(input.ipAllowlist !== undefined
          ? { ipAllowlist: input.ipAllowlist }
          : {}),
        ...(input.rateLimitPerMinute !== undefined
          ? { rateLimitPerMinute: input.rateLimitPerMinute }
          : {}),
        ...(input.expiresAt !== undefined
          ? { expiresAt: input.expiresAt }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(integrationKeysTable.id, keyId));

    if (input.nodeSelections) {
      await tx
        .delete(integrationKeyNodesTable)
        .where(eq(integrationKeyNodesTable.keyId, keyId));
      if (input.nodeSelections.length > 0) {
        await tx.insert(integrationKeyNodesTable).values(
          input.nodeSelections.map((s) => ({
            keyId,
            nodeId: s.nodeId,
            mode: s.mode,
            includeDescendants: s.includeDescendants,
          })),
        );
      }
    }

    return true;
  });
}

export type KeyValidationFailure =
  | "unknown"
  | "revoked"
  | "expired"
  | "ip_not_allowed";

export type KeyValidationResult =
  | { ok: true; principal: IntegrationPrincipal }
  | { ok: false; reason: KeyValidationFailure };

/**
 * Prüft einen übergebenen Schlüssel. Der Vergleich läuft über den Hash; der
 * Klartext existiert in FlowCore nach der Erstellung nicht mehr.
 */
export async function validateIntegrationKey(
  key: string,
  clientIp: string | null,
): Promise<KeyValidationResult> {
  const keyHash = hashKey(key);

  const [row] = await db
    .select()
    .from(integrationKeysTable)
    .where(eq(integrationKeysTable.keyHash, keyHash));

  if (!row) return { ok: false, reason: "unknown" };

  // Konstantzeitvergleich, obwohl der Lookup bereits über den Hash lief —
  // schützt gegen Timing-Auswertung bei künftigen Änderungen am Lookup.
  const a = Buffer.from(row.keyHash, "hex");
  const b = Buffer.from(keyHash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "unknown" };
  }

  if (row.revoked) return { ok: false, reason: "revoked" };
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const allowlist = row.ipAllowlist ?? [];
  if (allowlist.length > 0 && (!clientIp || !allowlist.includes(clientIp))) {
    return { ok: false, reason: "ip_not_allowed" };
  }

  const selections = await db
    .select()
    .from(integrationKeyNodesTable)
    .where(eq(integrationKeyNodesTable.keyId, row.id));

  db.update(integrationKeysTable)
    .set({
      lastUsedAt: new Date(),
      requestCount: sql`${integrationKeysTable.requestCount} + 1`,
    })
    .where(eq(integrationKeysTable.id, row.id))
    .then(() => {})
    .catch((err: unknown) => {
      logger.error({ err }, "Failed to update integration key usage");
    });

  return {
    ok: true,
    principal: {
      keyId: row.id,
      name: row.name,
      targetSystem: row.targetSystem,
      rateLimitPerMinute: row.rateLimitPerMinute,
      ipAllowlist: allowlist,
      maxConfidentialityLevel: normalizeLevel(row.maxConfidentialityLevel),
      templateTypes: row.templateTypes ?? [],
      brandScopes: row.brandScopes ?? [],
      agentScopes: row.agentScopes ?? [],
      nodeSelections: selections.map((s) => ({
        nodeId: s.nodeId,
        mode: s.mode === "exclude" ? "exclude" : "include",
        includeDescendants: s.includeDescendants,
      })),
    },
  };
}

export interface IntegrationKeySummary {
  id: string;
  name: string;
  description: string | null;
  targetSystem: string | null;
  keyPrefix: string;
  maxConfidentialityLevel: string;
  templateTypes: string[];
  brandScopes: string[];
  agentScopes: string[];
  ipAllowlist: string[];
  rateLimitPerMinute: number;
  revoked: boolean;
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  requestCount: number;
  nodeSelections: (NodeSelection & {
    title: string | null;
    displayCode: string | null;
  })[];
}

export async function listIntegrationKeys(): Promise<IntegrationKeySummary[]> {
  const rows = await db
    .select()
    .from(integrationKeysTable)
    .orderBy(integrationKeysTable.createdAt);

  if (rows.length === 0) return [];

  const selections = await db
    .select({
      keyId: integrationKeyNodesTable.keyId,
      nodeId: integrationKeyNodesTable.nodeId,
      mode: integrationKeyNodesTable.mode,
      includeDescendants: integrationKeyNodesTable.includeDescendants,
      title: contentNodesTable.title,
      displayCode: contentNodesTable.displayCode,
    })
    .from(integrationKeyNodesTable)
    .leftJoin(
      contentNodesTable,
      eq(integrationKeyNodesTable.nodeId, contentNodesTable.id),
    )
    .where(
      inArray(
        integrationKeyNodesTable.keyId,
        rows.map((r) => r.id),
      ),
    );

  const byKey = new Map<string, IntegrationKeySummary["nodeSelections"]>();
  for (const s of selections) {
    const list = byKey.get(s.keyId) ?? [];
    list.push({
      nodeId: s.nodeId,
      mode: s.mode === "exclude" ? "exclude" : "include",
      includeDescendants: s.includeDescendants,
      title: s.title,
      displayCode: s.displayCode,
    });
    byKey.set(s.keyId, list);
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    targetSystem: r.targetSystem,
    keyPrefix: r.keyPrefix,
    maxConfidentialityLevel: r.maxConfidentialityLevel,
    templateTypes: r.templateTypes ?? [],
    brandScopes: r.brandScopes ?? [],
    agentScopes: r.agentScopes ?? [],
    ipAllowlist: r.ipAllowlist ?? [],
    rateLimitPerMinute: r.rateLimitPerMinute,
    revoked: r.revoked,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    requestCount: r.requestCount,
    nodeSelections: byKey.get(r.id) ?? [],
  }));
}

export async function revokeIntegrationKey(keyId: string): Promise<boolean> {
  const result = await db
    .update(integrationKeysTable)
    .set({ revoked: true, updatedAt: new Date() })
    .where(
      and(
        eq(integrationKeysTable.id, keyId),
        eq(integrationKeysTable.revoked, false),
      ),
    )
    .returning({ id: integrationKeysTable.id });
  return result.length > 0;
}

/**
 * Erzeugt einen neuen Schlüsselwert für einen bestehenden Eintrag. Die
 * Freigabe bleibt unverändert, der alte Wert verliert sofort seine Gültigkeit
 * — das ist der reguläre Weg, einen Schlüssel zu tauschen, ohne die mühsam
 * zusammengestellte Auswahl neu anlegen zu müssen.
 */
export async function rotateIntegrationKey(
  keyId: string,
): Promise<{ plainKey: string } | null> {
  const { plainKey, displayPrefix } = generateKey();
  const result = await db
    .update(integrationKeysTable)
    .set({
      keyHash: hashKey(plainKey),
      keyPrefix: displayPrefix,
      revoked: false,
      updatedAt: new Date(),
    })
    .where(eq(integrationKeysTable.id, keyId))
    .returning({ id: integrationKeysTable.id });

  return result.length > 0 ? { plainKey } : null;
}
