import { db } from "@workspace/db";
import {
  contentRevisionsTable,
  contentNodesTable,
  nodeOwnershipTable,
  notificationsTable,
  roleAssignmentsTable,
} from "@workspace/db/schema";
import { eq, and, lt, sql, or, isNotNull } from "drizzle-orm";
import { notifyReviewOverdue } from "./notification.service";
import { logger } from "../lib/logger";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const ESCALATION_DAYS = 14;

let timer: ReturnType<typeof setInterval> | null = null;

async function checkOverdueReviews(): Promise<void> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdueRevisions = await db
    .select({
      revisionId: contentRevisionsTable.id,
      nodeId: contentRevisionsTable.nodeId,
      nextReviewDate: contentRevisionsTable.nextReviewDate,
      title: contentRevisionsTable.title,
    })
    .from(contentRevisionsTable)
    .innerJoin(
      contentNodesTable,
      and(
        eq(contentNodesTable.publishedRevisionId, contentRevisionsTable.id),
        eq(contentNodesTable.isDeleted, false),
      ),
    )
    .where(
      and(
        eq(contentRevisionsTable.status, "published"),
        isNotNull(contentRevisionsTable.nextReviewDate),
        lt(contentRevisionsTable.nextReviewDate, today),
      ),
    );

  if (overdueRevisions.length === 0) {
    return;
  }

  logger.info(
    { count: overdueRevisions.length },
    "Found overdue reviews",
  );

  for (const rev of overdueRevisions) {
    if (!rev.nextReviewDate) continue;

    const daysOverdue = Math.floor(
      (today.getTime() - rev.nextReviewDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const alreadyNotified = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.nodeId, rev.nodeId),
          eq(notificationsTable.type, daysOverdue >= ESCALATION_DAYS ? "review_overdue_escalation" : "review_overdue"),
          sql`${notificationsTable.createdAt} > NOW() - INTERVAL '24 hours'`,
        ),
      )
      .limit(1);

    if (alreadyNotified.length > 0) {
      continue;
    }

    const isEscalation = daysOverdue >= ESCALATION_DAYS;

    const ownership = await db
      .select()
      .from(nodeOwnershipTable)
      .where(eq(nodeOwnershipTable.nodeId, rev.nodeId));

    const recipientIds: string[] = [];

    if (ownership.length > 0) {
      const own = ownership[0];
      if (own.ownerId) recipientIds.push(own.ownerId);
      if (own.deputyId) recipientIds.push(own.deputyId);

      if (isEscalation) {
        const processManagers = await db
          .select({ principalId: roleAssignmentsTable.principalId })
          .from(roleAssignmentsTable)
          .where(
            and(
              eq(roleAssignmentsTable.role, "process_manager"),
              eq(roleAssignmentsTable.isActive, true),
              or(
                sql`${roleAssignmentsTable.expiresAt} IS NULL`,
                sql`${roleAssignmentsTable.expiresAt} > NOW()`,
              ),
            ),
          );
        for (const pm of processManagers) {
          if (!recipientIds.includes(pm.principalId)) {
            recipientIds.push(pm.principalId);
          }
        }
      }
    }

    if (recipientIds.length > 0) {
      await notifyReviewOverdue(
        rev.nodeId,
        rev.title,
        recipientIds,
        daysOverdue,
        isEscalation,
      );

      logger.info(
        {
          nodeId: rev.nodeId,
          daysOverdue,
          isEscalation,
          recipientCount: recipientIds.length,
        },
        "Review overdue notification sent",
      );
    }
  }
}

export function startReviewCycleChecker(): void {
  if (timer) return;

  logger.info(
    { intervalMs: CHECK_INTERVAL_MS },
    "Starting review cycle checker",
  );

  timer = setInterval(() => {
    checkOverdueReviews().catch((err) => {
      logger.error({ err }, "Review cycle checker error");
    });
  }, CHECK_INTERVAL_MS);

  setTimeout(() => {
    checkOverdueReviews().catch((err) => {
      logger.error({ err }, "Initial review cycle check error");
    });
  }, 10_000);
}

export function stopReviewCycleChecker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info("Review cycle checker stopped");
  }
}
