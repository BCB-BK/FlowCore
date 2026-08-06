import { db } from "@workspace/db";
import {
  contentNodesTable,
  glossaryTermsTable,
  graphSyncStateTable,
} from "@workspace/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { syncPage, syncGlossaryTerm } from "./graph-single-item-sync.service";
import { deindexItem } from "./graph-delete-handler.service";

export interface FullSyncSummary {
  dryRun: boolean;
  pages: { total: number; success: number; skipped: number; failed: number };
  glossary: { total: number; success: number; skipped: number; failed: number };
  deindexed: number;
  errors: { itemId: string; reason: string }[];
}

/**
 * Full sync: re-pushes every currently-indexable page and glossary term to
 * Graph (force=true, ignoring content-hash dedup), then reconciles by
 * de-indexing any previously-synced item that is no longer indexable
 * (archived, deleted, or agent_enabled turned off).
 */
export async function runFullSync(dryRun = false): Promise<FullSyncSummary> {
  const summary: FullSyncSummary = {
    dryRun,
    pages: { total: 0, success: 0, skipped: 0, failed: 0 },
    glossary: { total: 0, success: 0, skipped: 0, failed: 0 },
    deindexed: 0,
    errors: [],
  };

  const nodes = await db
    .select({ id: contentNodesTable.id })
    .from(contentNodesTable)
    .where(
      and(
        eq(contentNodesTable.isDeleted, false),
        isNotNull(contentNodesTable.publishedRevisionId),
      ),
    );

  const currentPageItemIds = new Set<string>();
  summary.pages.total = nodes.length;
  for (const node of nodes) {
    try {
      const result = await syncPage(node.id, { dryRun, force: true });
      currentPageItemIds.add(result.itemId);
      if (result.status === "success") summary.pages.success++;
      else summary.pages.skipped++;
    } catch (err) {
      summary.pages.failed++;
      summary.errors.push({
        itemId: `flowcore_page_${node.id}`,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const terms = await db
    .select({ id: glossaryTermsTable.id })
    .from(glossaryTermsTable);
  const currentGlossaryItemIds = new Set<string>();
  summary.glossary.total = terms.length;
  for (const term of terms) {
    try {
      const result = await syncGlossaryTerm(term.id, { dryRun, force: true });
      currentGlossaryItemIds.add(result.itemId);
      if (result.status === "success") summary.glossary.success++;
      else summary.glossary.skipped++;
    } catch (err) {
      summary.glossary.failed++;
      summary.errors.push({
        itemId: `flowcore_glossary_${term.id}`,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (!dryRun) {
    const priorStates = await db
      .select()
      .from(graphSyncStateTable)
      .where(eq(graphSyncStateTable.lastResult, "success"));

    for (const state of priorStates) {
      const stillCurrent =
        state.itemType === "page"
          ? currentPageItemIds.has(state.itemId)
          : currentGlossaryItemIds.has(state.itemId);
      if (!stillCurrent) {
        try {
          await deindexItem({
            itemType: state.itemType as "page" | "glossary",
            itemId: state.itemId,
            nodeId: state.nodeId,
            reason: "full_sync_reconciliation",
            actor: "system",
          });
          summary.deindexed++;
        } catch (err) {
          summary.errors.push({
            itemId: state.itemId,
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }

  return summary;
}
