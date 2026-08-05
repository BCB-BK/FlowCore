import { db } from "@workspace/db";
import {
  contentNodesTable,
  glossaryTermsTable,
  graphSyncStateTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface PageIndexStatus {
  nodeId: string;
  immutableId: string;
  title: string;
  displayCode: string;
  itemId: string;
  indexStatus: "synced" | "failed" | "skipped" | "not_indexed";
  lastResult: string | null;
  lastError: string | null;
  lastSyncedAt: Date | null;
}

export interface GlossaryIndexStatus {
  termId: string;
  term: string;
  itemId: string;
  indexStatus: "synced" | "failed" | "skipped" | "not_indexed";
  lastResult: string | null;
  lastError: string | null;
  lastSyncedAt: Date | null;
}

function toIndexStatus(
  lastResult: string | undefined | null,
): PageIndexStatus["indexStatus"] {
  if (lastResult === "success") return "synced";
  if (lastResult === "failed") return "failed";
  if (lastResult === "skipped") return "skipped";
  return "not_indexed";
}

/** Index status per page ("Indexstatus pro Seite"), including pages never synced. */
export async function listPageIndexStatus(): Promise<PageIndexStatus[]> {
  const nodes = await db
    .select({
      id: contentNodesTable.id,
      immutableId: contentNodesTable.immutableId,
      title: contentNodesTable.title,
      displayCode: contentNodesTable.displayCode,
      isDeleted: contentNodesTable.isDeleted,
    })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.isDeleted, false));

  const states = await db
    .select()
    .from(graphSyncStateTable)
    .where(eq(graphSyncStateTable.itemType, "page"));
  const byItemId = new Map(states.map((s) => [s.itemId, s]));

  return nodes.map((node) => {
    const itemId = `flowcore_page_${node.immutableId}`;
    const state = byItemId.get(itemId);
    return {
      nodeId: node.id,
      immutableId: node.immutableId,
      title: node.title,
      displayCode: node.displayCode,
      itemId,
      indexStatus: toIndexStatus(state?.lastResult),
      lastResult: state?.lastResult ?? null,
      lastError: state?.lastError ?? null,
      lastSyncedAt: state?.lastSyncedAt ?? null,
    };
  });
}

/** Index status per glossary term ("Indexstatus pro Glossarbegriff"). */
export async function listGlossaryIndexStatus(): Promise<
  GlossaryIndexStatus[]
> {
  const terms = await db
    .select({ id: glossaryTermsTable.id, term: glossaryTermsTable.term })
    .from(glossaryTermsTable);

  const states = await db
    .select()
    .from(graphSyncStateTable)
    .where(eq(graphSyncStateTable.itemType, "glossary"));
  const byItemId = new Map(states.map((s) => [s.itemId, s]));

  return terms.map((term) => {
    const itemId = `flowcore_glossary_${term.id}`;
    const state = byItemId.get(itemId);
    return {
      termId: term.id,
      term: term.term,
      itemId,
      indexStatus: toIndexStatus(state?.lastResult),
      lastResult: state?.lastResult ?? null,
      lastError: state?.lastError ?? null,
      lastSyncedAt: state?.lastSyncedAt ?? null,
    };
  });
}
