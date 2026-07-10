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

/**
 * Copilot Studio sends free-text queries ("Vision BildungsCampus", "Was
 * weißt du über Produkte?") rather than exact phrases. Matching the whole
 * query as one literal substring meant almost nothing ever matched, even
 * when every individual word was present in the page (e.g. the page
 * "Vision des BildungsCampus" doesn't contain the contiguous phrase "vision
 * bildungscampus"). Instead, score each significant word independently and
 * sum the best-field match per word, so a page containing all of the query's
 * words (in any order, anywhere) ranks above one containing only some.
 */
function textMatches(projection: CopilotPageProjection, query: string): number {
  const words = query
    .trim()
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1);

  if (words.length === 0) return 1;

  const title = projection.title.toLowerCase();
  const summary = projection.summary.toLowerCase();
  const contentText = projection.contentText.toLowerCase();
  const keywords = projection.copilotKeywords.map((k) => k.toLowerCase());

  let score = 0;
  for (const word of words) {
    if (title.includes(word)) score += 3;
    if (summary.includes(word)) score += 2;
    if (contentText.includes(word)) score += 1;
    if (keywords.some((k) => k.includes(word))) score += 2;
  }
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

  // Projecting + checking each node involves several sequential DB round
  // trips (revision, tags, relations, glossary scan, confidentiality
  // lookup). With potentially hundreds of published nodes, awaiting these
  // one at a time in a loop turns into tens of seconds of wall-clock time
  // (observed ~45s in production) — enough to risk a Power Platform/Copilot
  // Studio connector timeout. Running them concurrently in bounded batches
  // keeps the same per-node cost but lets the DB pool pipeline the work.
  const BATCH_SIZE = 10;
  const candidates: ConnectorSearchResult[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (row) => {
        const projection = await projectPublishedPage(row.id);
        if (!projection) return null;

        if (input.brandScope?.length) {
          const overlaps = projection.brandScope.some((b) =>
            input.brandScope!.includes(b),
          );
          if (!overlaps) return null;
        }
        if (input.agentScope?.length) {
          const overlaps = projection.agentScope.some((s) =>
            input.agentScope!.includes(s),
          );
          if (!overlaps) return null;
        }

        const allowed = await isNodeAllowedForKey(projection, key);
        if (!allowed) return null;

        const score = textMatches(projection, input.query);
        if (score <= 0) return null;

        const result: ConnectorSearchResult = {
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
        };
        return result;
      }),
    );
    for (const r of batchResults) {
      if (r) candidates.push(r);
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit);
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
