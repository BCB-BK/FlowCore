import { db } from "@workspace/db";
import { graphAclSyncLogTable, type GraphAclTier } from "@workspace/db/schema";
import type { ConfidentialityLevel } from "./confidentiality.service";
import type { GraphAclEntry } from "./graph-acl.service";
import {
  resolveReadAccessPrincipals,
  resolveConfidentialityLevelPrincipals,
} from "./flowcore-permission-resolver.service";
import {
  resolvePrincipalsToEntra,
} from "./entra-principal-mapping.service";
import { getGroupMapping } from "./graph-external-group-mapping.service";
import { logger } from "../lib/logger";

export type GraphItemType = "page" | "glossary";

/**
 * Thrown whenever a node/term cannot be safely mapped to a Microsoft Graph
 * ACL. Callers MUST treat this as "do not export" (fail-closed) rather than
 * falling back to any default ACL.
 */
export class GraphAclNotExportableError extends Error {
  constructor(
    message: string,
    public readonly reason: string,
  ) {
    super(message);
    this.name = "GraphAclNotExportableError";
  }
}

/**
 * Maps a FlowCore confidentiality level onto the Graph ACL tier strategy:
 *  - public / internal  -> internal_standard (a defined internal default
 *    group, never "everyone")
 *  - confidential        -> restricted (explicit groups/users resolved per
 *    node)
 *  - strictly_confidential -> executive (a single dedicated group)
 */
export function determineAclTier(
  level: ConfidentialityLevel,
): GraphAclTier {
  switch (level) {
    case "public":
    case "internal":
      return "internal_standard";
    case "confidential":
      return "restricted";
    case "strictly_confidential":
      return "executive";
    default:
      throw new GraphAclNotExportableError(
        `Unbekannte Vertraulichkeitsstufe "${level}" kann keiner ACL-Strategie zugeordnet werden`,
        "unknown_confidentiality_level",
      );
  }
}

function assertNonEmptyAcl(
  acl: GraphAclEntry[],
  context: string,
): asserts acl is GraphAclEntry[] & { length: number } {
  if (!acl || acl.length === 0) {
    throw new GraphAclNotExportableError(
      `Keine gültige ACL für ${context} ermittelbar. Es wird kein Default auf "everyone" angewendet.`,
      "empty_acl",
    );
  }
}

async function recordSyncLog(entry: {
  itemId: string;
  itemType: GraphItemType;
  nodeId: string | null;
  confidentialityLevel: string | null;
  tier: GraphAclTier | null;
  aclSummary: GraphAclEntry[] | null;
  result: "exported" | "skipped" | "failed";
  reason: string | null;
}): Promise<void> {
  try {
    await db.insert(graphAclSyncLogTable).values({
      itemId: entry.itemId,
      itemType: entry.itemType,
      nodeId: entry.nodeId,
      confidentialityLevel: entry.confidentialityLevel,
      tier: entry.tier,
      aclSummary: entry.aclSummary,
      result: entry.result,
      reason: entry.reason,
    });
  } catch (err) {
    logger.error(
      { err, itemId: entry.itemId },
      "Failed to write Graph ACL sync log entry",
    );
  }
}

async function buildGroupTierAcl(
  tier: "internal_standard" | "executive",
): Promise<GraphAclEntry[]> {
  const mapping = await getGroupMapping(tier);
  if (!mapping) {
    throw new GraphAclNotExportableError(
      `Für die ACL-Stufe "${tier}" ist keine Entra-Gruppe konfiguriert (fail-closed, kein Export).`,
      `missing_group_mapping:${tier}`,
    );
  }
  return [
    {
      type: "group",
      value: mapping.entraGroupId,
      accessType: "grant",
      identitySource: "azureActiveDirectory",
    },
  ];
}

async function buildRestrictedAcl(
  nodeId: string,
  level: ConfidentialityLevel,
): Promise<GraphAclEntry[]> {
  const [rbacPrincipals, confidentialityPrincipals] = await Promise.all([
    resolveReadAccessPrincipals(nodeId),
    resolveConfidentialityLevelPrincipals(level),
  ]);

  const combined = new Set<string>([
    ...rbacPrincipals,
    ...confidentialityPrincipals,
  ]);

  if (combined.size === 0) {
    throw new GraphAclNotExportableError(
      `Für Knoten ${nodeId} (Stufe "${level}") sind keine berechtigten Principals hinterlegt (fail-closed, kein Export).`,
      "no_authorized_principals",
    );
  }

  const { resolved, unmapped } = await resolvePrincipalsToEntra([
    ...combined,
  ]);

  if (unmapped.length > 0) {
    logger.warn(
      { nodeId, level, unmappedCount: unmapped.length },
      "Some authorized FlowCore principals have no Entra mapping and were excluded from the ACL",
    );
  }

  if (resolved.length === 0) {
    throw new GraphAclNotExportableError(
      `Für Knoten ${nodeId} (Stufe "${level}") konnte keiner der berechtigten Principals einer Entra-Identität zugeordnet werden (fail-closed, kein Export).`,
      "no_entra_mapping",
    );
  }

  const groups = resolved.filter((r) => r.type === "group");
  const users = resolved.filter((r) => r.type === "user");
  const preferred = groups.length > 0 ? [...groups, ...users] : users;

  return preferred.map((identity) => ({
    type: identity.type,
    value: identity.value,
    accessType: "grant",
    identitySource: "azureActiveDirectory",
  }));
}

/**
 * GraphAclMappingService (Cluster 5): builds the Microsoft Graph ACL for a
 * FlowCore item (page or glossary term) from its confidentiality level,
 * following the fail-closed tier strategy above. Never returns an empty ACL
 * and never defaults to "everyone" — any unresolvable case throws
 * {@link GraphAclNotExportableError} and is recorded in the sync log as
 * "failed" so operators can see exactly why an item wasn't exported.
 */
export async function buildAclForItem(params: {
  itemId: string;
  itemType: GraphItemType;
  nodeId: string | null;
  level: ConfidentialityLevel;
}): Promise<GraphAclEntry[]> {
  const { itemId, itemType, nodeId, level } = params;

  let tier: GraphAclTier;
  try {
    tier = determineAclTier(level);
  } catch (err) {
    await recordSyncLog({
      itemId,
      itemType,
      nodeId,
      confidentialityLevel: level,
      tier: null,
      aclSummary: null,
      result: "failed",
      reason: err instanceof GraphAclNotExportableError ? err.reason : "unknown_error",
    });
    throw err;
  }

  try {
    const acl =
      tier === "restricted"
        ? await buildRestrictedAcl(
            nodeId ??
              (() => {
                throw new GraphAclNotExportableError(
                  `"restricted" ACL erfordert eine Knoten-ID, aber keine wurde übergeben für ${itemId}`,
                  "missing_node_id",
                );
              })(),
            level,
          )
        : await buildGroupTierAcl(tier);

    assertNonEmptyAcl(acl, `${itemType} ${itemId}`);

    await recordSyncLog({
      itemId,
      itemType,
      nodeId,
      confidentialityLevel: level,
      tier,
      aclSummary: acl,
      result: "exported",
      reason: null,
    });

    return acl;
  } catch (err) {
    await recordSyncLog({
      itemId,
      itemType,
      nodeId,
      confidentialityLevel: level,
      tier,
      aclSummary: null,
      result: "failed",
      reason: err instanceof GraphAclNotExportableError ? err.reason : "unknown_error",
    });
    throw err;
  }
}

/**
 * Preview variant used by the admin UI / API: never throws for expected
 * "not exportable" cases, instead returns a structured result so the UI can
 * show *why* a node can't be exported yet.
 */
export interface AclPreviewResult {
  exportable: boolean;
  level: ConfidentialityLevel | null;
  tier: GraphAclTier | null;
  acl: GraphAclEntry[] | null;
  reason: string | null;
}

export async function previewAclForNode(
  nodeId: string,
  level: ConfidentialityLevel,
): Promise<AclPreviewResult> {
  try {
    const tier = determineAclTier(level);
    const acl =
      tier === "restricted"
        ? await buildRestrictedAcl(nodeId, level)
        : await buildGroupTierAcl(tier);
    assertNonEmptyAcl(acl, `Vorschau für Knoten ${nodeId}`);
    return { exportable: true, level, tier, acl, reason: null };
  } catch (err) {
    if (err instanceof GraphAclNotExportableError) {
      return {
        exportable: false,
        level,
        tier: null,
        acl: null,
        reason: err.reason,
      };
    }
    throw err;
  }
}
