export const AGENT_SCOPES = [
  "global",
  "management",
  "marketing",
  "sales",
  "product",
  "ehip",
  "es",
  "ops",
  "qm",
  "hr",
  "finance",
  "tech",
] as const;
export type AgentScope = (typeof AGENT_SCOPES)[number];

export const AUTHORITY_LEVELS = [
  "binding",
  "guidance",
  "draft",
  "archived",
] as const;
export type AuthorityLevel = (typeof AUTHORITY_LEVELS)[number];

export const BRAND_SCOPES = [
  "OneCampus",
  "AoS",
  "DeLSt",
  "EHiP",
  "EHiP Academy",
  "CareerUp",
  "BCB",
] as const;
export type BrandScope = (typeof BRAND_SCOPES)[number];

export const DECISION_STATUSES = ["decided", "proposed", "in_review"] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const COPILOT_INDEX_STATUSES = [
  "not_indexed",
  "pending",
  "indexed",
  "error",
  "excluded",
] as const;
export type CopilotIndexStatus = (typeof COPILOT_INDEX_STATUSES)[number];

export interface AgentMetadata {
  agentEnabled: boolean;
  agentScope: AgentScope[];
  authorityLevel: AuthorityLevel;
  sourcePriority: number;
  brandScope: BrandScope[];
  decisionStatus: DecisionStatus;
  copilotSummary: string | null;
  copilotKeywords: string[];
}

export const AGENT_METADATA_DEFAULTS: AgentMetadata = {
  agentEnabled: false,
  agentScope: [],
  authorityLevel: "draft",
  sourcePriority: 3,
  brandScope: [],
  decisionStatus: "proposed",
  copilotSummary: null,
  copilotKeywords: [],
};

/**
 * Keys within `structuredFields` that this cluster manages. These are the
 * only user-editable agent-metadata keys - they live inside the per-revision
 * structuredFields JSON blob (draft/working-copy scoped).
 */
export const AGENT_METADATA_KEYS = [
  "agent_enabled",
  "agent_scope",
  "authority_level",
  "source_priority",
  "brand_scope",
  "decision_status",
  "copilot_summary",
  "copilot_keywords",
] as const;

/**
 * Keys that must NEVER be settable through the regular content-editing path
 * (working copies / structuredFields). They represent the Sync Engine's view
 * of indexing state and live as dedicated columns on `content_nodes`
 * instead, updatable only via the dedicated sync-status route/service.
 */
export const SYNC_ONLY_KEYS = [
  "copilot_last_indexed_at",
  "copilot_index_status",
  "copilot_index_error",
] as const;

export function containsAgentMetadataKeys(
  fields: Record<string, unknown> | null | undefined,
): boolean {
  if (!fields) return false;
  return AGENT_METADATA_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(fields, key),
  );
}

/**
 * Strips any sync-engine-only keys that a client may have tried to smuggle
 * into structuredFields via the regular content editing routes. Those fields
 * must only ever be set through the dedicated sync-status endpoint.
 */
export function stripSyncOnlyKeys(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...fields };
  for (const key of SYNC_ONLY_KEYS) {
    delete result[key];
  }
  return result;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/**
 * Validates and normalizes the agent-metadata subset of an incoming
 * structuredFields patch. Throws a descriptive error for invalid enum
 * values so callers can surface a 400. Fields not present in the patch are
 * left untouched (partial updates are allowed).
 */
export function validateAgentMetadataPatch(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...fields };

  if ("agent_enabled" in result && typeof result.agent_enabled !== "boolean") {
    throw new Error("agent_enabled muss ein Boolean sein (true/false).");
  }

  if ("agent_scope" in result) {
    const scopes = asStringArray(result.agent_scope);
    const invalid = scopes.filter(
      (s) => !AGENT_SCOPES.includes(s as AgentScope),
    );
    if (invalid.length > 0) {
      throw new Error(
        `Ungültiger agent_scope Wert: ${invalid.join(", ")}. Erlaubt: ${AGENT_SCOPES.join(", ")}`,
      );
    }
    result.agent_scope = scopes;
  }

  if ("authority_level" in result) {
    if (
      typeof result.authority_level !== "string" ||
      !AUTHORITY_LEVELS.includes(result.authority_level as AuthorityLevel)
    ) {
      throw new Error(
        `Ungültiger authority_level Wert. Erlaubt: ${AUTHORITY_LEVELS.join(", ")}`,
      );
    }
  }

  if ("source_priority" in result) {
    const priority = result.source_priority;
    if (
      typeof priority !== "number" ||
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 5
    ) {
      throw new Error("source_priority muss eine ganze Zahl zwischen 1 und 5 sein.");
    }
  }

  if ("brand_scope" in result) {
    const brands = asStringArray(result.brand_scope);
    const invalid = brands.filter(
      (b) => !BRAND_SCOPES.includes(b as BrandScope),
    );
    if (invalid.length > 0) {
      throw new Error(
        `Ungültiger brand_scope Wert: ${invalid.join(", ")}. Erlaubt: ${BRAND_SCOPES.join(", ")}`,
      );
    }
    result.brand_scope = brands;
  }

  if ("decision_status" in result) {
    if (
      typeof result.decision_status !== "string" ||
      !DECISION_STATUSES.includes(result.decision_status as DecisionStatus)
    ) {
      throw new Error(
        `Ungültiger decision_status Wert. Erlaubt: ${DECISION_STATUSES.join(", ")}`,
      );
    }
  }

  if (
    "copilot_summary" in result &&
    result.copilot_summary !== null &&
    typeof result.copilot_summary !== "string"
  ) {
    throw new Error("copilot_summary muss ein String oder null sein.");
  }

  if ("copilot_keywords" in result) {
    result.copilot_keywords = asStringArray(result.copilot_keywords);
  }

  return result;
}

export function extractAgentMetadata(
  structuredFields: Record<string, unknown> | null | undefined,
): AgentMetadata {
  const sf = structuredFields ?? {};
  const authorityLevel =
    typeof sf.authority_level === "string" &&
    AUTHORITY_LEVELS.includes(sf.authority_level as AuthorityLevel)
      ? (sf.authority_level as AuthorityLevel)
      : AGENT_METADATA_DEFAULTS.authorityLevel;
  const decisionStatus =
    typeof sf.decision_status === "string" &&
    DECISION_STATUSES.includes(sf.decision_status as DecisionStatus)
      ? (sf.decision_status as DecisionStatus)
      : AGENT_METADATA_DEFAULTS.decisionStatus;
  const sourcePriority =
    typeof sf.source_priority === "number" &&
    Number.isInteger(sf.source_priority) &&
    sf.source_priority >= 1 &&
    sf.source_priority <= 5
      ? sf.source_priority
      : AGENT_METADATA_DEFAULTS.sourcePriority;

  return {
    agentEnabled: sf.agent_enabled === true,
    agentScope: asStringArray(sf.agent_scope).filter((s) =>
      AGENT_SCOPES.includes(s as AgentScope),
    ) as AgentScope[],
    authorityLevel,
    sourcePriority,
    brandScope: asStringArray(sf.brand_scope).filter((b) =>
      BRAND_SCOPES.includes(b as BrandScope),
    ) as BrandScope[],
    decisionStatus,
    copilotSummary:
      typeof sf.copilot_summary === "string" ? sf.copilot_summary : null,
    copilotKeywords: asStringArray(sf.copilot_keywords),
  };
}

export interface IndexabilityInput {
  nodeStatus: string;
  isDeleted: boolean;
  publishedRevisionId: string | null;
  confidentialityMapsToAcl: boolean;
  aclPresent: boolean;
}

export interface IndexabilityResult {
  indexable: boolean;
  reasons: string[];
}

/**
 * Central Copilot/Graph indexability rule (Cluster 3):
 * A page is only indexable if it is published (per the real node_status,
 * the single source of truth for draft/published/archived) and its
 * confidentiality level maps to a valid ACL that actually has entries.
 *
 * `authority_level` is intentionally NOT part of this rule. It duplicated
 * node_status (published/draft/archived) but was never exposed in the
 * content-editing UI, so it could never be set by editors — every page
 * without an explicit value silently collapsed to "draft" and was excluded
 * from the index, even though the page itself was genuinely published.
 * node_status already correctly reflects draft/published/archived, so it is
 * the sole source of truth here (removed per user decision, 2026-07-10).
 * agent_enabled is also not a gating criterion (removed per earlier user
 * request).
 */
export function evaluateIndexability(
  input: IndexabilityInput,
): IndexabilityResult {
  const reasons: string[] = [];

  if (input.isDeleted) reasons.push("node_deleted");
  if (input.nodeStatus !== "published") reasons.push("node_not_published");
  if (!input.publishedRevisionId) reasons.push("no_published_revision");
  if (!input.confidentialityMapsToAcl)
    reasons.push("confidentiality_not_mappable_to_acl");
  if (!input.aclPresent) reasons.push("no_acl");

  return { indexable: reasons.length === 0, reasons };
}
