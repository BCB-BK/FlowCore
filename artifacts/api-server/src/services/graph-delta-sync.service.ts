import {
  claimBatch,
  completeSuccess,
  completeFailure,
  completeSkipped,
  completeDeleted,
} from "./graph-sync-queue.service";
import { syncPage, syncGlossaryTerm } from "./graph-single-item-sync.service";
import { deindexItem } from "./graph-delete-handler.service";
import { buildPageExternalItem, buildGlossaryExternalItem } from "./graph-schema-registration.service";
import { AppError } from "../lib/app-error";
import { db } from "@workspace/db";
import { contentNodesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

async function resolvePageItemId(nodeId: string): Promise<string> {
  const [node] = await db
    .select({ immutableId: contentNodesTable.immutableId })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, nodeId));
  return `flowcore_page_${node?.immutableId ?? nodeId}`;
}

export interface DeltaSyncSummary {
  processed: number;
  success: number;
  deindexed: number;
  failed: number;
  retried: number;
  errors: { itemId: string; reason: string }[];
}

/**
 * Processes pending jobs from the graph_sync_queue: upserts push the item
 * (content-hash dedup applies unless the underlying revision changed),
 * deletes deindex it. A job that fails is requeued with an incremented
 * attempt count up to its max-attempts limit, after which it is left in a
 * terminal "failed" state, visible via the sync log / queue for auditing.
 */
export async function runDeltaSync(limit = 25): Promise<DeltaSyncSummary> {
  const summary: DeltaSyncSummary = {
    processed: 0,
    success: 0,
    deindexed: 0,
    failed: 0,
    retried: 0,
    errors: [],
  };

  const jobs = await claimBatch(limit);
  summary.processed = jobs.length;

  for (const job of jobs) {
    try {
      if (job.operation === "skip") {
        await completeSkipped(job.id);
        continue;
      }

      if (job.operation === "delete") {
        const itemId = job.itemType === "page" && job.nodeId
          ? await resolvePageItemId(job.nodeId)
          : `flowcore_glossary_${job.termId}`;
        await deindexItem({
          itemType: job.itemType as "page" | "glossary",
          itemId,
          nodeId: job.nodeId,
          reason: "delta_sync_delete",
        });
        summary.deindexed++;
        await completeDeleted(job.id);
        continue;
      }

      // "upsert" and "acl_update" both push the current item (ACL is always
      // recomputed as part of the push) - acl_update just means the trigger
      // was a rights change rather than a content change.
      let deindexedInline = false;

      if (job.itemType === "page" && job.nodeId) {
        try {
          await syncPage(job.nodeId, { force: false });
          summary.success++;
        } catch (err) {
          if (isBuildNotFound(err)) {
            const itemId = await resolvePageItemId(job.nodeId);
            await deindexItem({
              itemType: "page",
              itemId,
              nodeId: job.nodeId,
              reason: "no_longer_indexable",
            });
            summary.deindexed++;
            deindexedInline = true;
          } else {
            throw err;
          }
        }
      } else if (job.itemType === "glossary" && job.termId) {
        try {
          await syncGlossaryTerm(job.termId, { force: false });
          summary.success++;
        } catch (err) {
          if (isBuildNotFound(err)) {
            const itemId = `flowcore_glossary_${job.termId}`;
            await deindexItem({
              itemType: "glossary",
              itemId,
              nodeId: null,
              reason: "no_longer_indexable",
            });
            summary.deindexed++;
            deindexedInline = true;
          } else {
            throw err;
          }
        }
      }

      if (deindexedInline) {
        await completeDeleted(job.id);
      } else {
        await completeSuccess(job.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await completeFailure(job.id, message);
      summary.failed++;
      summary.errors.push({
        itemId:
          job.itemType === "page" && job.nodeId
            ? await resolvePageItemId(job.nodeId)
            : `flowcore_glossary_${job.termId}`,
        reason: message,
      });
      if (job.attempts + 1 < job.maxAttempts) summary.retried++;
    }
  }

  return summary;
}

function isBuildNotFound(err: unknown): boolean {
  return err instanceof AppError && err.status === 404;
}

// Re-exported so callers building custom flows can construct items directly.
export { buildPageExternalItem, buildGlossaryExternalItem };
