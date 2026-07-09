import { db } from "@workspace/db";
import { contentNodesTable } from "@workspace/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import {
  projectPublishedPage,
  type CopilotPageProjection,
} from "./copilot-content-projection.service";
import { getNodeConfidentialityLevel } from "./confidentiality.service";
import {
  isConfidentialityAllowed,
  type CopilotConnectorPrincipal,
} from "./copilot-connector-key.service";

export interface ConnectorSearchResult {
  nodeId: string;
  displayCode: string;
  title: string;
  summary: string;
  url: string;
  version: string | null;
  authorityLevel: string | null;
  brandScope: string[];
  agentScope: string[];
  score: number;
}

/**
 * A key with an empty scope array is allowed to access ANY value for that
 * dimension (i.e. an unscoped key). A key with a non-empty array may only
 * access nodes whose own scope list intersects with it.
 */
function scopeAllowed(keyScopes: string[], nodeScopes: string[]): boolean {
  if (keyScopes.length === 0) return true;
  if (nodeScopes.length === 0) return false;
  return nodeScopes.some((s) => keyScopes.includes(s));
}

async function isNodeAllowedForKey(
  projection: CopilotPageProjection,
  key: CopilotConnectorPrincipal,
): Promise<boolean> {
  if (!scopeAllowed(key.agentScopes, projection.agentScope)) return false;
  if (!scopeAllowed(key.brandScopes, projection.brandScope)) return false;

  const level = await getNodeConfidentialityLevel(projection.nodeId);
  if (!level) return false;
  return isConfidentialityAllowed(level, key.maxConfidentialityLevel);
}

function textMatches(projection: CopilotPageProjection, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  let score = 0;
  if (projection.title.toLowerCase().includes(q)) score += 3;
  if (projection.summary.toLowerCase().includes(q)) score += 2;
  if (projection.contentText.toLowerCase().includes(q)) score += 1;
  if (projection.copilotKeywords.some((k) => k.toLowerCase().includes(q)))
    score += 2;
  return score;
}

export interface ConnectorSearchInput {
  query: string;
  brandScope?: string[];
  agentScope?: string[];
  limit?: number;
}

/**
 * Requested brandScope/agentScope filters must be a subset of what the key
 * itself is allowed to see. Requesting a scope the key isn't allowed to
 * touch is rejected up front rather than silently dropped, so a
 * misconfigured Copilot Studio action fails loudly instead of returning an
 * empty result that looks like "no matches".
 */
export function validateRequestedScope(
  requested: string[] | undefined,
  keyScopes: string[],
): { ok: true } | { ok: false; disallowed: string[] } {
  if (!requested || requested.length === 0) return { ok: true };
  if (keyScopes.length === 0) return { ok: true };
  const disallowed = requested.filter((s) => !keyScopes.includes(s));
  if (disallowed.length > 0) return { ok: false, disallowed };
  return { ok: true };
}

export async function searchForConnector(
  input: ConnectorSearchInput,
  key: CopilotConnectorPrincipal,
): Promise<ConnectorSearchResult[]> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 25);

  const rows = await db
    .select({ id: contentNodesTable.id })
    .from(contentNodesTable)
    .where(
      and(
        eq(contentNodesTable.isDeleted, false),
        isNotNull(contentNodesTable.publishedRevisionId),
      ),
    );

  const results: ConnectorSearchResult[] = [];
  for (const row of rows) {
    const projection = await projectPublishedPage(row.id);
    if (!projection) continue;

    if (input.brandScope?.length) {
      const overlaps = projection.brandScope.some((b) =>
        input.brandScope!.includes(b),
      );
      if (!overlaps) continue;
    }
    if (input.agentScope?.length) {
      const overlaps = projection.agentScope.some((s) =>
        input.agentScope!.includes(s),
      );
      if (!overlaps) continue;
    }

    const allowed = await isNodeAllowedForKey(projection, key);
    if (!allowed) continue;

    const score = textMatches(projection, input.query);
    if (score <= 0) continue;

    results.push({
      nodeId: projection.nodeId,
      displayCode: projection.displayCode,
      title: projection.title,
      summary: projection.summary,
      url: projection.sourceUrl,
      version: projection.version,
      authorityLevel: projection.authorityLevel,
      brandScope: projection.brandScope,
      agentScope: projection.agentScope,
      score,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export async function getNodeForConnector(
  nodeId: string,
  key: CopilotConnectorPrincipal,
): Promise<CopilotPageProjection | "forbidden" | null> {
  const projection = await projectPublishedPage(nodeId);
  if (!projection) return null;

  const allowed = await isNodeAllowedForKey(projection, key);
  if (!allowed) return "forbidden";

  return projection;
}
