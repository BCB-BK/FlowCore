import { db } from "@workspace/db";
import {
  contentRevisionsTable,
  contentRevisionEventsTable,
  contentNodesTable,
  auditEventsTable,
} from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export interface CreateRevisionInput {
  nodeId: string;
  title: string;
  content?: Record<string, unknown>;
  structuredFields?: Record<string, unknown>;
  changeType?: "editorial" | "minor" | "major" | "regulatory" | "structural";
  changeSummary?: string;
  changedFields?: string[];
  basedOnRevisionId?: string;
  authorId?: string;
}

export async function createRevision(
  input: CreateRevisionInput,
): Promise<string> {
  const revisionId = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${input.nodeId}))`,
    );
    const maxResult = await tx
      .select({
        maxNo: sql<number>`coalesce(max(revision_no), 0)::int`,
      })
      .from(contentRevisionsTable)
      .where(eq(contentRevisionsTable.nodeId, input.nodeId));
    const revisionNo = (maxResult[0]?.maxNo ?? 0) + 1;

    const [revision] = await tx
      .insert(contentRevisionsTable)
      .values({
        nodeId: input.nodeId,
        revisionNo,
        title: input.title,
        content: input.content,
        structuredFields: input.structuredFields,
        changeType: input.changeType ?? "editorial",
        changeSummary: input.changeSummary,
        changedFields: input.changedFields,
        basedOnRevisionId: input.basedOnRevisionId,
        authorId: input.authorId,
        status: "draft",
      })
      .returning({ id: contentRevisionsTable.id });

    await tx.insert(contentRevisionEventsTable).values({
      revisionId: revision.id,
      eventType: "created",
      actorId: input.authorId,
    });

    logger.info(
      { revisionId: revision.id, nodeId: input.nodeId, revisionNo },
      "Revision created",
    );

    return revision.id;
  });

  return revisionId;
}

export async function publishRevision(
  revisionId: string,
  versionLabel: string,
  actorId?: string,
): Promise<void> {
  const [revision] = await db
    .select()
    .from(contentRevisionsTable)
    .where(eq(contentRevisionsTable.id, revisionId));

  if (!revision) {
    throw new Error(`Revision ${revisionId} not found`);
  }

  await db.transaction(async (tx) => {
    const archivedRevisions = await tx
      .select({ id: contentRevisionsTable.id })
      .from(contentRevisionsTable)
      .where(
        and(
          eq(contentRevisionsTable.nodeId, revision.nodeId),
          eq(contentRevisionsTable.status, "published"),
          sql`${contentRevisionsTable.id} != ${revisionId}`,
        ),
      );

    if (archivedRevisions.length > 0) {
      await tx
        .update(contentRevisionsTable)
        .set({ status: "archived" })
        .where(
          and(
            eq(contentRevisionsTable.nodeId, revision.nodeId),
            eq(contentRevisionsTable.status, "published"),
            sql`${contentRevisionsTable.id} != ${revisionId}`,
          ),
        );

      for (const archived of archivedRevisions) {
        await tx.insert(auditEventsTable).values({
          eventType: "content",
          action: "revision_archived",
          actorId,
          resourceType: "revision",
          resourceId: archived.id,
          details: { nodeId: revision.nodeId, reason: "superseded_by_publish", newRevisionId: revisionId },
        });
      }
    }

    await tx
      .update(contentRevisionsTable)
      .set({
        status: "published",
        versionLabel,
        validFrom: new Date(),
      })
      .where(eq(contentRevisionsTable.id, revisionId));

    await tx
      .update(contentNodesTable)
      .set({
        publishedRevisionId: revisionId,
        status: "published",
        updatedAt: new Date(),
      })
      .where(eq(contentNodesTable.id, revision.nodeId));

    await tx.insert(contentRevisionEventsTable).values({
      revisionId,
      eventType: "published",
      actorId,
      metadata: { versionLabel },
    });
  });

  logger.info(
    { revisionId, nodeId: revision.nodeId, versionLabel },
    "Revision published as version",
  );
}

export async function restoreRevision(
  sourceRevisionId: string,
  authorId?: string,
): Promise<string> {
  const [source] = await db
    .select()
    .from(contentRevisionsTable)
    .where(eq(contentRevisionsTable.id, sourceRevisionId));

  if (!source) {
    throw new Error(`Source revision ${sourceRevisionId} not found`);
  }

  const newRevisionId = await createRevision({
    nodeId: source.nodeId,
    title: source.title,
    content: source.content as Record<string, unknown> | undefined,
    structuredFields: source.structuredFields as
      | Record<string, unknown>
      | undefined,
    changeType: "editorial",
    changeSummary: `Restored from revision ${source.revisionNo}`,
    basedOnRevisionId: sourceRevisionId,
    authorId,
  });

  await db.insert(contentRevisionEventsTable).values({
    revisionId: newRevisionId,
    eventType: "restored",
    actorId: authorId,
    metadata: { restoredFromRevisionId: sourceRevisionId },
  });

  logger.info(
    {
      newRevisionId,
      sourceRevisionId,
      nodeId: source.nodeId,
    },
    "Revision restored",
  );

  return newRevisionId;
}

export async function getVersionTree(nodeId: string) {
  const revisions = await db
    .select({
      id: contentRevisionsTable.id,
      revisionNo: contentRevisionsTable.revisionNo,
      versionLabel: contentRevisionsTable.versionLabel,
      status: contentRevisionsTable.status,
      changeType: contentRevisionsTable.changeType,
      changeSummary: contentRevisionsTable.changeSummary,
      title: contentRevisionsTable.title,
      authorId: contentRevisionsTable.authorId,
      reviewerId: contentRevisionsTable.reviewerId,
      approverId: contentRevisionsTable.approverId,
      basedOnRevisionId: contentRevisionsTable.basedOnRevisionId,
      validFrom: contentRevisionsTable.validFrom,
      nextReviewDate: contentRevisionsTable.nextReviewDate,
      createdAt: contentRevisionsTable.createdAt,
      content: contentRevisionsTable.content,
      structuredFields: contentRevisionsTable.structuredFields,
    })
    .from(contentRevisionsTable)
    .where(eq(contentRevisionsTable.nodeId, nodeId))
    .orderBy(desc(contentRevisionsTable.revisionNo));

  return revisions;
}
