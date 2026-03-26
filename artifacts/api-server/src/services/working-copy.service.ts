import { db } from "@workspace/db";
import {
  contentWorkingCopiesTable,
  workingCopyEventsTable,
  contentRevisionsTable,
  contentRevisionEventsTable,
  contentNodesTable,
  auditEventsTable,
} from "@workspace/db/schema";
import { eq, and, sql, notInArray, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

export type WorkingCopyStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "changes_requested"
  | "approved_for_publish"
  | "cancelled"
  | "published";

export interface CreateWorkingCopyInput {
  nodeId: string;
  authorId: string;
}

export interface UpdateWorkingCopyInput {
  title?: string;
  content?: Record<string, unknown>;
  structuredFields?: Record<string, unknown>;
  editorSnapshot?: Record<string, unknown>;
  changeType?: "editorial" | "minor" | "major" | "regulatory" | "structural";
  changeSummary?: string;
}

export interface SubmitWorkingCopyInput {
  changeType?: "editorial" | "minor" | "major" | "regulatory" | "structural";
  changeSummary?: string;
  comment?: string;
}

async function getActiveWorkingCopy(nodeId: string) {
  const [wc] = await db
    .select()
    .from(contentWorkingCopiesTable)
    .where(
      and(
        eq(contentWorkingCopiesTable.nodeId, nodeId),
        notInArray(contentWorkingCopiesTable.status, ["cancelled", "published"]),
      ),
    );
  return wc || null;
}

export async function createWorkingCopy(input: CreateWorkingCopyInput) {
  const { nodeId, authorId } = input;

  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext('wc-' || ${nodeId}))`,
    );

    const [existing] = await tx
      .select({ id: contentWorkingCopiesTable.id, authorId: contentWorkingCopiesTable.authorId })
      .from(contentWorkingCopiesTable)
      .where(
        and(
          eq(contentWorkingCopiesTable.nodeId, nodeId),
          notInArray(contentWorkingCopiesTable.status, [
            "cancelled",
            "published",
          ]),
        ),
      );

    if (existing) {
      if (existing.authorId === authorId) {
        return { workingCopy: await getWorkingCopyById(existing.id), created: false };
      }
      throw new Error(
        `Eine aktive Arbeitskopie existiert bereits für diese Seite (von einem anderen Benutzer).`,
      );
    }

    const [node] = await tx
      .select({
        publishedRevisionId: contentNodesTable.publishedRevisionId,
        title: contentNodesTable.title,
      })
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, nodeId));

    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    let title = node.title;
    let content: Record<string, unknown> | null = null;
    let structuredFields: Record<string, unknown> | null = null;
    let baseRevisionId: string | null = null;

    if (node.publishedRevisionId) {
      const [pubRev] = await tx
        .select()
        .from(contentRevisionsTable)
        .where(eq(contentRevisionsTable.id, node.publishedRevisionId));
      if (pubRev) {
        title = pubRev.title;
        content = pubRev.content as Record<string, unknown> | null;
        structuredFields = pubRev.structuredFields as Record<string, unknown> | null;
        baseRevisionId = pubRev.id;
      }
    } else {
      const [latestRev] = await tx
        .select()
        .from(contentRevisionsTable)
        .where(eq(contentRevisionsTable.nodeId, nodeId))
        .orderBy(desc(contentRevisionsTable.revisionNo))
        .limit(1);
      if (latestRev) {
        title = latestRev.title;
        content = latestRev.content as Record<string, unknown> | null;
        structuredFields = latestRev.structuredFields as Record<string, unknown> | null;
        baseRevisionId = latestRev.id;
      }
    }

    const [wc] = await tx
      .insert(contentWorkingCopiesTable)
      .values({
        nodeId,
        baseRevisionId,
        title,
        content,
        structuredFields,
        authorId,
        lockedBy: authorId,
        status: "draft",
      })
      .returning();

    await tx.insert(workingCopyEventsTable).values({
      workingCopyId: wc.id,
      eventType: "created",
      actorId: authorId,
      metadata: baseRevisionId ? { baseRevisionId } : {},
    });

    await tx.insert(auditEventsTable).values({
      eventType: "content",
      action: "working_copy_created",
      actorId: authorId,
      resourceType: "working_copy",
      resourceId: wc.id,
      details: { nodeId, baseRevisionId },
    });

    logger.info(
      { workingCopyId: wc.id, nodeId, authorId },
      "Working copy created",
    );

    return { workingCopy: wc, created: true };
  });
}

export async function getWorkingCopyById(id: string) {
  const [wc] = await db
    .select()
    .from(contentWorkingCopiesTable)
    .where(eq(contentWorkingCopiesTable.id, id));
  return wc || null;
}

export async function getActiveWorkingCopyForNode(nodeId: string) {
  return getActiveWorkingCopy(nodeId);
}

export async function updateWorkingCopy(
  id: string,
  input: UpdateWorkingCopyInput,
  actorId: string,
) {
  const wc = await getWorkingCopyById(id);
  if (!wc) throw new Error("Working copy not found");
  if (wc.status !== "draft" && wc.status !== "changes_requested") {
    throw new Error(
      `Arbeitskopie kann im Status '${wc.status}' nicht bearbeitet werden.`,
    );
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) updateData.title = input.title;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.structuredFields !== undefined)
    updateData.structuredFields = input.structuredFields;
  if (input.editorSnapshot !== undefined)
    updateData.editorSnapshot = input.editorSnapshot;
  if (input.changeType !== undefined) updateData.changeType = input.changeType;
  if (input.changeSummary !== undefined)
    updateData.changeSummary = input.changeSummary;

  const [updated] = await db
    .update(contentWorkingCopiesTable)
    .set(updateData)
    .where(eq(contentWorkingCopiesTable.id, id))
    .returning();

  return updated;
}

export async function submitWorkingCopy(
  id: string,
  input: SubmitWorkingCopyInput,
  actorId: string,
) {
  const wc = await getWorkingCopyById(id);
  if (!wc) throw new Error("Working copy not found");
  if (wc.status !== "draft" && wc.status !== "changes_requested") {
    throw new Error(
      `Arbeitskopie kann im Status '${wc.status}' nicht eingereicht werden.`,
    );
  }

  const updateData: Record<string, unknown> = {
    status: "submitted",
    submittedAt: new Date(),
    updatedAt: new Date(),
  };
  if (input.changeType) updateData.changeType = input.changeType;
  if (input.changeSummary) updateData.changeSummary = input.changeSummary;

  const [updated] = await db
    .update(contentWorkingCopiesTable)
    .set(updateData)
    .where(eq(contentWorkingCopiesTable.id, id))
    .returning();

  await db.insert(workingCopyEventsTable).values({
    workingCopyId: id,
    eventType: "submitted",
    actorId,
    comment: input.comment || null,
    metadata: { changeType: input.changeType },
  });

  await db.insert(auditEventsTable).values({
    eventType: "content",
    action: "working_copy_submitted",
    actorId,
    resourceType: "working_copy",
    resourceId: id,
    details: { nodeId: wc.nodeId },
  });

  logger.info({ workingCopyId: id, actorId }, "Working copy submitted for review");
  return updated;
}

export async function returnWorkingCopyForChanges(
  id: string,
  comment: string | undefined,
  actorId: string,
) {
  const wc = await getWorkingCopyById(id);
  if (!wc) throw new Error("Working copy not found");
  if (wc.status !== "submitted" && wc.status !== "in_review") {
    throw new Error(
      `Arbeitskopie kann im Status '${wc.status}' nicht zurückgegeben werden.`,
    );
  }

  const [updated] = await db
    .update(contentWorkingCopiesTable)
    .set({
      status: "changes_requested",
      reviewerId: actorId,
      updatedAt: new Date(),
    })
    .where(eq(contentWorkingCopiesTable.id, id))
    .returning();

  await db.insert(workingCopyEventsTable).values({
    workingCopyId: id,
    eventType: "returned_for_changes",
    actorId,
    comment: comment || null,
  });

  await db.insert(auditEventsTable).values({
    eventType: "content",
    action: "working_copy_returned",
    actorId,
    resourceType: "working_copy",
    resourceId: id,
    details: { nodeId: wc.nodeId, comment },
  });

  logger.info(
    { workingCopyId: id, actorId },
    "Working copy returned for changes",
  );
  return updated;
}

export async function approveWorkingCopy(
  id: string,
  comment: string | undefined,
  actorId: string,
) {
  const wc = await getWorkingCopyById(id);
  if (!wc) throw new Error("Working copy not found");
  if (wc.status !== "submitted" && wc.status !== "in_review") {
    throw new Error(
      `Arbeitskopie kann im Status '${wc.status}' nicht genehmigt werden.`,
    );
  }

  const [updated] = await db
    .update(contentWorkingCopiesTable)
    .set({
      status: "approved_for_publish",
      approverId: actorId,
      updatedAt: new Date(),
    })
    .where(eq(contentWorkingCopiesTable.id, id))
    .returning();

  await db.insert(workingCopyEventsTable).values({
    workingCopyId: id,
    eventType: "approved",
    actorId,
    comment: comment || null,
  });

  await db.insert(auditEventsTable).values({
    eventType: "content",
    action: "working_copy_approved",
    actorId,
    resourceType: "working_copy",
    resourceId: id,
    details: { nodeId: wc.nodeId },
  });

  logger.info({ workingCopyId: id, actorId }, "Working copy approved");
  return updated;
}

export async function publishWorkingCopy(
  id: string,
  versionLabel: string,
  actorId: string,
) {
  const wc = await getWorkingCopyById(id);
  if (!wc) throw new Error("Working copy not found");
  if (wc.status !== "approved_for_publish") {
    throw new Error(
      `Arbeitskopie kann im Status '${wc.status}' nicht veröffentlicht werden. Nur freigegebene Arbeitskopien können veröffentlicht werden.`,
    );
  }

  const summary =
    wc.lastManualSummary || wc.lastAiSummary || wc.changeSummary || "";

  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${wc.nodeId}))`,
    );

    const maxResult = await tx
      .select({
        maxNo: sql<number>`coalesce(max(revision_no), 0)::int`,
      })
      .from(contentRevisionsTable)
      .where(eq(contentRevisionsTable.nodeId, wc.nodeId));
    const revisionNo = (maxResult[0]?.maxNo ?? 0) + 1;

    const [newRevision] = await tx
      .insert(contentRevisionsTable)
      .values({
        nodeId: wc.nodeId,
        revisionNo,
        versionLabel,
        title: wc.title,
        content: wc.content,
        structuredFields: wc.structuredFields,
        changeType: wc.changeType,
        changeSummary: summary,
        basedOnRevisionId: wc.baseRevisionId,
        authorId: wc.authorId,
        reviewerId: wc.reviewerId,
        approverId: actorId,
        status: "published",
        validFrom: new Date(),
      })
      .returning();

    await tx
      .update(contentRevisionsTable)
      .set({ status: "archived" })
      .where(
        and(
          eq(contentRevisionsTable.nodeId, wc.nodeId),
          eq(contentRevisionsTable.status, "published"),
        ),
      );

    await tx
      .update(contentRevisionsTable)
      .set({ status: "published", validFrom: new Date() })
      .where(eq(contentRevisionsTable.id, newRevision.id));

    await tx
      .update(contentNodesTable)
      .set({
        publishedRevisionId: newRevision.id,
        title: wc.title,
        status: "published",
        updatedAt: new Date(),
      })
      .where(eq(contentNodesTable.id, wc.nodeId));

    await tx
      .update(contentWorkingCopiesTable)
      .set({
        status: "published",
        updatedAt: new Date(),
      })
      .where(eq(contentWorkingCopiesTable.id, id));

    await tx.insert(workingCopyEventsTable).values({
      workingCopyId: id,
      eventType: "published",
      actorId,
      metadata: { versionLabel, revisionId: newRevision.id },
    });

    await tx.insert(contentRevisionEventsTable).values({
      revisionId: newRevision.id,
      eventType: "published",
      actorId,
      metadata: { versionLabel, fromWorkingCopyId: id },
    });

    await tx.insert(auditEventsTable).values({
      eventType: "content",
      action: "working_copy_published",
      actorId,
      resourceType: "working_copy",
      resourceId: id,
      details: {
        nodeId: wc.nodeId,
        revisionId: newRevision.id,
        versionLabel,
      },
    });

    logger.info(
      {
        workingCopyId: id,
        revisionId: newRevision.id,
        nodeId: wc.nodeId,
        versionLabel,
      },
      "Working copy published as new version",
    );

    const updatedWc = await tx
      .select()
      .from(contentWorkingCopiesTable)
      .where(eq(contentWorkingCopiesTable.id, id))
      .then((rows) => rows[0]);

    return {
      workingCopy: updatedWc,
      revision: {
        id: newRevision.id,
        revisionNo,
        versionLabel,
      },
    };
  });
}

export async function cancelWorkingCopy(
  id: string,
  comment: string | undefined,
  actorId: string,
) {
  const wc = await getWorkingCopyById(id);
  if (!wc) throw new Error("Working copy not found");
  if (wc.status === "cancelled" || wc.status === "published") {
    throw new Error(
      `Arbeitskopie ist bereits ${wc.status === "cancelled" ? "abgebrochen" : "veröffentlicht"}.`,
    );
  }

  const [updated] = await db
    .update(contentWorkingCopiesTable)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(contentWorkingCopiesTable.id, id))
    .returning();

  await db.insert(workingCopyEventsTable).values({
    workingCopyId: id,
    eventType: "cancelled",
    actorId,
    comment: comment || null,
  });

  await db.insert(auditEventsTable).values({
    eventType: "content",
    action: "working_copy_cancelled",
    actorId,
    resourceType: "working_copy",
    resourceId: id,
    details: { nodeId: wc.nodeId },
  });

  logger.info({ workingCopyId: id, actorId }, "Working copy cancelled");
  return updated;
}

export async function unlockWorkingCopy(
  id: string,
  actorId: string,
) {
  const wc = await getWorkingCopyById(id);
  if (!wc) throw new Error("Working copy not found");

  const [updated] = await db
    .update(contentWorkingCopiesTable)
    .set({
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(contentWorkingCopiesTable.id, id))
    .returning();

  await db.insert(workingCopyEventsTable).values({
    workingCopyId: id,
    eventType: "unlocked",
    actorId,
    metadata: { previousLockedBy: wc.lockedBy },
  });

  await db.insert(auditEventsTable).values({
    eventType: "content",
    action: "working_copy_unlocked",
    actorId,
    resourceType: "working_copy",
    resourceId: id,
    details: { nodeId: wc.nodeId },
  });

  logger.info({ workingCopyId: id, actorId }, "Working copy unlocked");
  return updated;
}

export async function getWorkingCopyDiff(id: string) {
  const wc = await getWorkingCopyById(id);
  if (!wc) throw new Error("Working copy not found");

  let baseContent: Record<string, unknown> | null = null;
  let baseStructuredFields: Record<string, unknown> | null = null;
  let baseTitle: string | null = null;

  if (wc.baseRevisionId) {
    const [baseRev] = await db
      .select()
      .from(contentRevisionsTable)
      .where(eq(contentRevisionsTable.id, wc.baseRevisionId));
    if (baseRev) {
      baseContent = baseRev.content as Record<string, unknown> | null;
      baseStructuredFields = baseRev.structuredFields as Record<string, unknown> | null;
      baseTitle = baseRev.title;
    }
  }

  const wcFields = (wc.structuredFields || {}) as Record<string, unknown>;
  const baseFields = (baseStructuredFields || {}) as Record<string, unknown>;
  const structuredFieldChanges: Record<string, { old: unknown; new: unknown }> = {};
  const allKeys = new Set([...Object.keys(wcFields), ...Object.keys(baseFields)]);
  for (const key of allKeys) {
    if (JSON.stringify(wcFields[key]) !== JSON.stringify(baseFields[key])) {
      structuredFieldChanges[key] = {
        old: baseFields[key] ?? null,
        new: wcFields[key] ?? null,
      };
    }
  }

  const metadataChanges: Record<string, { old: unknown; new: unknown }> = {};
  if (baseTitle !== null && baseTitle !== wc.title) {
    metadataChanges.title = { old: baseTitle, new: wc.title };
  }

  const contentChanged =
    JSON.stringify(baseContent) !== JSON.stringify(wc.content);

  return {
    workingCopyId: id,
    nodeId: wc.nodeId,
    baseRevisionId: wc.baseRevisionId,
    titleChanged: baseTitle !== wc.title,
    metadataChanges,
    structuredFieldChanges,
    contentChanged,
    baseContent,
    newContent: wc.content,
    baseStructuredFields,
    newStructuredFields: wc.structuredFields,
  };
}

export async function getWorkingCopyEvents(id: string) {
  return db
    .select()
    .from(workingCopyEventsTable)
    .where(eq(workingCopyEventsTable.workingCopyId, id))
    .orderBy(desc(workingCopyEventsTable.createdAt));
}
