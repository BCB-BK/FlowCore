import { db } from "@workspace/db";
import { contentNodesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "../lib/app-error";
import type { CopilotIndexStatus } from "../lib/agent-metadata";

/**
 * Sync-Engine-only mutation of the copilot index status columns on
 * content_nodes. This must NEVER be reachable through the regular
 * working-copy / structuredFields editing path - see SYNC_ONLY_KEYS in
 * lib/agent-metadata.ts. Callers must be gated on the
 * `manage_copilot_index_status` permission.
 */
export async function setCopilotIndexStatus(
  nodeId: string,
  status: CopilotIndexStatus,
  error?: string | null,
): Promise<void> {
  const [node] = await db
    .select({ id: contentNodesTable.id })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, nodeId));
  if (!node) {
    throw new AppError(404, "Node not found");
  }

  await db
    .update(contentNodesTable)
    .set({
      copilotIndexStatus: status,
      copilotIndexError: error ?? null,
      copilotLastIndexedAt: new Date(),
    })
    .where(eq(contentNodesTable.id, nodeId));
}
