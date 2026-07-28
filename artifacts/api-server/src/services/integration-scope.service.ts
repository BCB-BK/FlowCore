import { db } from "@workspace/db";
import {
  contentNodesTable,
  contentRevisionsTable,
  contentNodeTagsTable,
  contentTagsTable,
} from "@workspace/db/schema";
import { sql, eq, and, inArray } from "drizzle-orm";
import {
  CONFIDENTIALITY_LEVELS,
  DEFAULT_CONFIDENTIALITY_LEVEL,
  type ConfidentialityLevel,
} from "./confidentiality.service";
import {
  isConfidentialityAllowed,
  type IntegrationScope,
} from "./integration-key.service";
import { deriveBrandScope } from "./copilot-content-projection.service";
import { envInt } from "../lib/env";

/**
 * Auflösung der Freigabe eines Integrationsschlüssels auf konkrete Seiten.
 *
 * Reihenfolge der Prüfung — bewusst restriktiv:
 *  1. Nur veröffentlichte, nicht gelöschte Seiten.
 *  2. Struktur-Auswahl: Einschlüsse (Teilbaum oder Einzelseite) minus
 *     Ausschlüsse. Ohne jeden Einschluss gilt der gesamte Bestand.
 *  3. Seitentyp muss in der Freigabe stehen (leere Liste = alle).
 *  4. Vertraulichkeitsstufe darf die Höchststufe nicht überschreiten.
 *  5. Marken- und Bereichszuschnitt müssen sich überschneiden
 *     (leere Liste = alle).
 */

const SCOPE_CACHE_TTL_MS = envInt("INTEGRATION_SCOPE_CACHE_TTL_SEC", 60) * 1000;

interface StructuralScope {
  /** null bedeutet "keine strukturelle Einschränkung". */
  includedNodeIds: Set<string> | null;
  excludedNodeIds: Set<string>;
}

const structuralCache = new Map<
  string,
  { value: StructuralScope; expiresAt: number }
>();

export function invalidateStructuralScopeCache(keyId?: string): void {
  if (keyId) structuralCache.delete(keyId);
  else structuralCache.clear();
}

/**
 * Ermittelt alle Nachfahren der übergebenen Knoten (inklusive der Knoten
 * selbst) über eine rekursive Abfrage. Gelöschte Seiten bleiben außen vor;
 * ihre Unterseiten damit ebenfalls.
 */
async function expandSubtrees(rootIds: string[]): Promise<Set<string>> {
  if (rootIds.length === 0) return new Set();

  const rows = await db.execute<{ id: string }>(sql`
    WITH RECURSIVE subtree AS (
      SELECT id
      FROM content_nodes
      WHERE id IN (${sql.join(
        rootIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})
        AND is_deleted = false
      UNION
      SELECT child.id
      FROM content_nodes child
      JOIN subtree ON child.parent_node_id = subtree.id
      WHERE child.is_deleted = false
    )
    SELECT id FROM subtree
  `);

  const result = new Set<string>();
  for (const row of rows.rows ?? []) result.add(row.id);
  return result;
}

async function resolveStructuralScope(
  keyId: string,
  scope: IntegrationScope,
): Promise<StructuralScope> {
  const cached = structuralCache.get(keyId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const includeSubtreeRoots: string[] = [];
  const includeSingle: string[] = [];
  const excludeSubtreeRoots: string[] = [];
  const excludeSingle: string[] = [];

  for (const sel of scope.nodeSelections) {
    const bucket =
      sel.mode === "exclude"
        ? sel.includeDescendants
          ? excludeSubtreeRoots
          : excludeSingle
        : sel.includeDescendants
          ? includeSubtreeRoots
          : includeSingle;
    bucket.push(sel.nodeId);
  }

  const hasIncludes = includeSubtreeRoots.length + includeSingle.length > 0;

  const [includedFromTrees, excludedFromTrees] = await Promise.all([
    expandSubtrees(includeSubtreeRoots),
    expandSubtrees(excludeSubtreeRoots),
  ]);

  const includedNodeIds = hasIncludes
    ? new Set<string>([...includedFromTrees, ...includeSingle])
    : null;
  const excludedNodeIds = new Set<string>([
    ...excludedFromTrees,
    ...excludeSingle,
  ]);

  const value: StructuralScope = { includedNodeIds, excludedNodeIds };
  structuralCache.set(keyId, {
    value,
    expiresAt: Date.now() + SCOPE_CACHE_TTL_MS,
  });
  return value;
}

export interface ScopedNode {
  nodeId: string;
  displayCode: string;
  title: string;
  templateType: string;
  confidentiality: ConfidentialityLevel;
  updatedAt: Date;
}

interface PublishedNodeRow {
  nodeId: string;
  displayCode: string;
  title: string;
  templateType: string;
  updatedAt: Date;
  structuredFields: unknown;
}

function readConfidentiality(fields: unknown): ConfidentialityLevel {
  const sf = (fields ?? {}) as Record<string, unknown>;
  const raw = sf.confidentiality;
  if (typeof raw !== "string") return DEFAULT_CONFIDENTIALITY_LEVEL;
  if (CONFIDENTIALITY_LEVELS.includes(raw as ConfidentialityLevel)) {
    return raw as ConfidentialityLevel;
  }
  // Unbekannte Stufe = im Zweifel die strengste. Ein Tippfehler im Feld darf
  // niemals dazu führen, dass Inhalte nach außen gehen.
  return "strictly_confidential";
}

function readAgentScope(fields: unknown): string[] {
  const sf = (fields ?? {}) as Record<string, unknown>;
  return Array.isArray(sf.agent_scope)
    ? (sf.agent_scope as unknown[]).filter(
        (v): v is string => typeof v === "string",
      )
    : [];
}

/**
 * Marken-Zuschnitt steckt in den Tags (`brand:<Marke>`) — dieselbe Ableitung
 * wie im Copilot-Export, damit beide Wege denselben Zuschnitt sehen.
 */
async function loadBrandScopes(
  nodeIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (nodeIds.length === 0) return result;

  const rows = await db
    .select({
      nodeId: contentNodeTagsTable.nodeId,
      name: contentTagsTable.name,
    })
    .from(contentNodeTagsTable)
    .innerJoin(
      contentTagsTable,
      eq(contentNodeTagsTable.tagId, contentTagsTable.id),
    )
    .where(inArray(contentNodeTagsTable.nodeId, nodeIds));

  for (const row of rows) {
    const list = result.get(row.nodeId) ?? [];
    list.push(row.name);
    result.set(row.nodeId, list);
  }

  for (const [nodeId, tags] of result) {
    result.set(nodeId, deriveBrandScope(tags));
  }
  return result;
}

async function loadPublishedNodes(): Promise<PublishedNodeRow[]> {
  return db
    .select({
      nodeId: contentNodesTable.id,
      displayCode: contentNodesTable.displayCode,
      title: contentNodesTable.title,
      templateType: contentNodesTable.templateType,
      updatedAt: contentNodesTable.updatedAt,
      structuredFields: contentRevisionsTable.structuredFields,
    })
    .from(contentNodesTable)
    .innerJoin(
      contentRevisionsTable,
      eq(contentNodesTable.publishedRevisionId, contentRevisionsTable.id),
    )
    .where(eq(contentNodesTable.isDeleted, false))
    .orderBy(contentNodesTable.updatedAt);
}

function scopeAllowed(keyScopes: string[], nodeScopes: string[]): boolean {
  if (keyScopes.length === 0) return true;
  if (nodeScopes.length === 0) return false;
  return nodeScopes.some((s) => keyScopes.includes(s));
}

/**
 * Alle veröffentlichten Seiten, die dieser Schlüssel lesen darf — sortiert
 * nach Änderungszeitpunkt, damit der Änderungs-Feed darauf aufsetzen kann.
 */
export async function listScopedNodes(
  keyId: string,
  scope: IntegrationScope,
): Promise<ScopedNode[]> {
  const structural = await resolveStructuralScope(keyId, scope);
  const rows = await loadPublishedNodes();

  const candidates = rows.filter((row) => {
    if (structural.excludedNodeIds.has(row.nodeId)) return false;
    if (
      structural.includedNodeIds &&
      !structural.includedNodeIds.has(row.nodeId)
    ) {
      return false;
    }
    if (
      scope.templateTypes.length > 0 &&
      !scope.templateTypes.includes(row.templateType)
    ) {
      return false;
    }
    if (
      !isConfidentialityAllowed(
        readConfidentiality(row.structuredFields),
        scope.maxConfidentialityLevel,
      )
    ) {
      return false;
    }
    if (
      !scopeAllowed(scope.agentScopes, readAgentScope(row.structuredFields))
    ) {
      return false;
    }
    return true;
  });

  if (scope.brandScopes.length === 0) {
    return candidates.map(toScopedNode);
  }

  const brandScopes = await loadBrandScopes(candidates.map((c) => c.nodeId));
  return candidates
    .filter((row) =>
      scopeAllowed(scope.brandScopes, brandScopes.get(row.nodeId) ?? []),
    )
    .map(toScopedNode);
}

function toScopedNode(row: PublishedNodeRow): ScopedNode {
  return {
    nodeId: row.nodeId,
    displayCode: row.displayCode,
    title: row.title,
    templateType: row.templateType,
    confidentiality: readConfidentiality(row.structuredFields),
    updatedAt: row.updatedAt,
  };
}

export type NodeAccessDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | "not_published"
        | "out_of_structure"
        | "template_type"
        | "confidentiality"
        | "brand_or_agent_scope";
    };

/**
 * Einzelprüfung für den Direktabruf einer Seite. Liefert bewusst einen Grund
 * mit — das ist der Unterschied zwischen "vom Zielsystem falsch angefragt"
 * und "Freigabe zu eng geschnitten", und beides landet im Protokoll.
 */
export async function checkNodeAccess(
  keyId: string,
  scope: IntegrationScope,
  nodeId: string,
): Promise<NodeAccessDecision> {
  const [node] = await db
    .select({
      templateType: contentNodesTable.templateType,
      structuredFields: contentRevisionsTable.structuredFields,
    })
    .from(contentNodesTable)
    .innerJoin(
      contentRevisionsTable,
      eq(contentNodesTable.publishedRevisionId, contentRevisionsTable.id),
    )
    .where(
      and(
        eq(contentNodesTable.id, nodeId),
        eq(contentNodesTable.isDeleted, false),
      ),
    );

  if (!node) return { allowed: false, reason: "not_published" };

  const structural = await resolveStructuralScope(keyId, scope);
  if (structural.excludedNodeIds.has(nodeId)) {
    return { allowed: false, reason: "out_of_structure" };
  }
  if (structural.includedNodeIds && !structural.includedNodeIds.has(nodeId)) {
    return { allowed: false, reason: "out_of_structure" };
  }

  if (
    scope.templateTypes.length > 0 &&
    !scope.templateTypes.includes(node.templateType)
  ) {
    return { allowed: false, reason: "template_type" };
  }

  if (
    !isConfidentialityAllowed(
      readConfidentiality(node.structuredFields),
      scope.maxConfidentialityLevel,
    )
  ) {
    return { allowed: false, reason: "confidentiality" };
  }

  if (!scopeAllowed(scope.agentScopes, readAgentScope(node.structuredFields))) {
    return { allowed: false, reason: "brand_or_agent_scope" };
  }

  if (scope.brandScopes.length > 0) {
    const brands = await loadBrandScopes([nodeId]);
    if (!scopeAllowed(scope.brandScopes, brands.get(nodeId) ?? [])) {
      return { allowed: false, reason: "brand_or_agent_scope" };
    }
  }

  return { allowed: true };
}

export interface ScopePreview {
  totalPublished: number;
  accessible: number;
  byTemplateType: { templateType: string; count: number }[];
  byConfidentiality: { level: ConfidentialityLevel; count: number }[];
  sample: { displayCode: string; title: string; templateType: string }[];
}

/**
 * Freigabe-Vorschau: zeigt vor dem Speichern, was ein Schlüssel tatsächlich
 * ausliefern würde. Eine Regel zu lesen ist das eine — die Liste der Seiten
 * zu sehen, die daraus folgt, etwas anderes.
 */
export async function previewScope(
  scope: IntegrationScope,
  sampleSize = 25,
): Promise<ScopePreview> {
  // Vorschauen laufen auf noch nicht gespeicherten Entwürfen: eigener
  // Cache-Schlüssel, damit sie sich nicht gegenseitig überschreiben.
  const previewKeyId = `preview:${JSON.stringify(scope.nodeSelections)}`;
  invalidateStructuralScopeCache(previewKeyId);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contentNodesTable)
    .where(
      sql`${contentNodesTable.isDeleted} = false
        AND ${contentNodesTable.publishedRevisionId} IS NOT NULL`,
    );

  const nodes = await listScopedNodes(previewKeyId, scope);
  invalidateStructuralScopeCache(previewKeyId);

  const byType = new Map<string, number>();
  for (const n of nodes) {
    byType.set(n.templateType, (byType.get(n.templateType) ?? 0) + 1);
  }

  const byLevel = new Map<ConfidentialityLevel, number>();
  for (const n of nodes) {
    byLevel.set(n.confidentiality, (byLevel.get(n.confidentiality) ?? 0) + 1);
  }

  return {
    totalPublished: totalRow?.count ?? 0,
    accessible: nodes.length,
    byTemplateType: [...byType.entries()]
      .map(([templateType, count]) => ({ templateType, count }))
      .sort((a, b) => b.count - a.count),
    byConfidentiality: [...byLevel.entries()]
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count),
    sample: nodes.slice(0, sampleSize).map((n) => ({
      displayCode: n.displayCode,
      title: n.title,
      templateType: n.templateType,
    })),
  };
}
