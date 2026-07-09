import { db } from "@workspace/db";
import { principalsTable } from "@workspace/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { logger } from "../lib/logger";

/**
 * A resolved Microsoft Entra identity for a Graph ACL grant entry.
 */
export interface EntraIdentity {
  type: "user" | "group";
  value: string;
}

/**
 * Resolves a single FlowCore principal id to its Microsoft Entra identity.
 * Returns null (never fabricates an id) when the principal doesn't exist,
 * isn't backed by Entra, or has no externalId recorded yet — callers must
 * treat that as "cannot grant access" (fail-closed), not as public access.
 */
export async function resolvePrincipalToEntra(
  principalId: string,
): Promise<EntraIdentity | null> {
  const [principal] = await db
    .select({
      externalId: principalsTable.externalId,
      externalProvider: principalsTable.externalProvider,
      principalType: principalsTable.principalType,
      status: principalsTable.status,
    })
    .from(principalsTable)
    .where(eq(principalsTable.id, principalId));

  if (!principal) {
    logger.warn({ principalId }, "Entra mapping: principal not found");
    return null;
  }

  if (principal.externalProvider !== "entra" || !principal.externalId) {
    logger.warn(
      { principalId, externalProvider: principal.externalProvider },
      "Entra mapping: principal has no Entra externalId",
    );
    return null;
  }

  if (principal.status !== "active") {
    logger.warn(
      { principalId, status: principal.status },
      "Entra mapping: principal is not active, excluding from ACL",
    );
    return null;
  }

  return {
    type: principal.principalType === "group" ? "group" : "user",
    value: principal.externalId,
  };
}

export interface BatchEntraMappingResult {
  resolved: EntraIdentity[];
  unmapped: string[];
}

/**
 * Batch variant of {@link resolvePrincipalToEntra}. Deduplicates resolved
 * identities by Entra id and reports which FlowCore principal ids could not
 * be mapped so callers can decide whether that constitutes a fail-closed
 * condition (e.g. all principals unmapped -> empty ACL -> not exportable).
 */
export async function resolvePrincipalsToEntra(
  principalIds: string[],
): Promise<BatchEntraMappingResult> {
  const uniqueIds = [...new Set(principalIds)];
  if (uniqueIds.length === 0) {
    return { resolved: [], unmapped: [] };
  }

  const principals = await db
    .select({
      id: principalsTable.id,
      externalId: principalsTable.externalId,
      externalProvider: principalsTable.externalProvider,
      principalType: principalsTable.principalType,
      status: principalsTable.status,
    })
    .from(principalsTable)
    .where(
      and(
        inArray(principalsTable.id, uniqueIds),
        eq(principalsTable.externalProvider, "entra"),
        eq(principalsTable.status, "active"),
      ),
    );

  const byId = new Map(principals.map((p) => [p.id, p]));
  const seenExternalIds = new Set<string>();
  const resolved: EntraIdentity[] = [];
  const unmapped: string[] = [];

  for (const id of uniqueIds) {
    const p = byId.get(id);
    if (!p || !p.externalId) {
      unmapped.push(id);
      continue;
    }
    if (seenExternalIds.has(p.externalId)) continue;
    seenExternalIds.add(p.externalId);
    resolved.push({
      type: p.principalType === "group" ? "group" : "user",
      value: p.externalId,
    });
  }

  if (unmapped.length > 0) {
    logger.warn(
      { unmappedCount: unmapped.length },
      "Entra mapping: some FlowCore principals could not be mapped to an Entra identity",
    );
  }

  return { resolved, unmapped };
}
