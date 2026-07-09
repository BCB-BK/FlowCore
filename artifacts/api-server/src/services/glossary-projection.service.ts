import { db } from "@workspace/db";
import {
  glossaryTermsTable,
  contentNodesTable,
  contentNodeTagsTable,
  contentTagsTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { stableContentHash } from "../lib/content-hash";

const SOURCE_BASE_URL = "https://flowcore.bildungscampus-backnang.de";

export interface GlossaryTermProjection {
  itemType: "glossary_term";
  termId: string;
  term: string;
  definition: string;
  synonyms: string[];
  relatedTerms: string[];
  tags: string[];
  sourceUrl: string;
  status: "published";
  contentHash: string;
}

/**
 * The glossary schema has no draft/review workflow of its own (no status
 * column), so every non-deleted term is treated as "published". If a term
 * is linked to a content node (nodeId), that node must not be soft-deleted
 * for the term to be exported, and its tags are inherited on the item.
 */
export async function projectGlossaryTerm(
  termId: string,
): Promise<GlossaryTermProjection | null> {
  const [term] = await db
    .select()
    .from(glossaryTermsTable)
    .where(eq(glossaryTermsTable.id, termId));
  if (!term) return null;

  if (term.nodeId) {
    const [node] = await db
      .select({ isDeleted: contentNodesTable.isDeleted })
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, term.nodeId));
    if (!node || node.isDeleted) return null;
  }

  const tags = term.nodeId
    ? (
        await db
          .select({ name: contentTagsTable.name })
          .from(contentNodeTagsTable)
          .innerJoin(
            contentTagsTable,
            eq(contentNodeTagsTable.tagId, contentTagsTable.id),
          )
          .where(eq(contentNodeTagsTable.nodeId, term.nodeId))
      ).map((t) => t.name)
    : [];

  const contentHash = stableContentHash({
    term: term.term,
    definition: term.definition,
    synonyms: term.synonyms ?? [],
    abbreviation: term.abbreviation ?? null,
  });

  return {
    itemType: "glossary_term",
    termId: term.id,
    term: term.term,
    definition: term.definition,
    synonyms: term.synonyms ?? [],
    relatedTerms: [],
    tags,
    sourceUrl: `${SOURCE_BASE_URL}/glossary/${term.slug}`,
    status: "published",
    contentHash,
  };
}

export async function isGlossaryTermExportable(termId: string): Promise<boolean> {
  const projection = await projectGlossaryTerm(termId);
  return projection !== null;
}
