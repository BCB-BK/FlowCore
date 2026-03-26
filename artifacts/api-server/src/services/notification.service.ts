import { db } from "@workspace/db";
import {
  notificationsTable,
  pageWatchersTable,
  principalsTable,
  contentNodesTable,
  nodeOwnershipTable,
  roleAssignmentsTable,
} from "@workspace/db/schema";
import { eq, and, or, sql, desc, inArray } from "drizzle-orm";
import { getAppAccessToken } from "./auth.service";
import { logger } from "../lib/logger";

export type NotificationEventType =
  | "working_copy_submitted"
  | "working_copy_approved"
  | "working_copy_returned"
  | "working_copy_published"
  | "review_overdue"
  | "review_overdue_escalation"
  | "page_updated";

interface NotifyInput {
  eventType: NotificationEventType;
  nodeId: string;
  actorId: string;
  title: string;
  body: string;
  link: string;
  metadata?: Record<string, unknown>;
}

export async function getNotificationRecipients(
  eventType: NotificationEventType,
  nodeId: string,
  actorId: string,
): Promise<string[]> {
  const recipientSet = new Set<string>();

  const watchers = await db
    .select({ principalId: pageWatchersTable.principalId })
    .from(pageWatchersTable)
    .where(eq(pageWatchersTable.nodeId, nodeId));
  for (const w of watchers) {
    recipientSet.add(w.principalId);
  }

  const [node] = await db
    .select({ parentNodeId: contentNodesTable.parentNodeId })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, nodeId));

  if (node?.parentNodeId) {
    const parentWatchers = await db
      .select({ principalId: pageWatchersTable.principalId })
      .from(pageWatchersTable)
      .where(
        and(
          eq(pageWatchersTable.nodeId, node.parentNodeId),
          eq(pageWatchersTable.watchChildren, true),
        ),
      );
    for (const w of parentWatchers) {
      recipientSet.add(w.principalId);
    }
  }

  const ownership = await db
    .select()
    .from(nodeOwnershipTable)
    .where(eq(nodeOwnershipTable.nodeId, nodeId));

  if (ownership.length > 0) {
    const own = ownership[0];
    if (own.ownerId) recipientSet.add(own.ownerId);
    if (own.deputyId) recipientSet.add(own.deputyId);

    if (
      eventType === "working_copy_submitted" ||
      eventType === "review_overdue" ||
      eventType === "review_overdue_escalation"
    ) {
      if (own.reviewerId) recipientSet.add(own.reviewerId);
      if (own.approverId) recipientSet.add(own.approverId);
    }
  }

  if (
    eventType === "review_overdue_escalation" ||
    eventType === "working_copy_submitted"
  ) {
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
      recipientSet.add(pm.principalId);
    }
  }

  recipientSet.delete(actorId);

  return Array.from(recipientSet);
}

export async function createNotification(input: NotifyInput): Promise<number> {
  const recipients = await getNotificationRecipients(
    input.eventType,
    input.nodeId,
    input.actorId,
  );

  if (recipients.length === 0) {
    return 0;
  }

  const rows = recipients.map((recipientId) => ({
    recipientId,
    channel: "in_app" as const,
    type: input.eventType,
    title: input.title,
    body: input.body,
    link: input.link,
    nodeId: input.nodeId,
    actorId: input.actorId,
    status: "unread" as const,
    metadata: input.metadata ?? {},
  }));

  await db.insert(notificationsTable).values(rows);

  sendTeamsNotifications(recipients, input).catch((err) => {
    logger.error({ err, eventType: input.eventType }, "Teams notification delivery failed");
  });

  logger.info(
    { eventType: input.eventType, nodeId: input.nodeId, recipientCount: recipients.length },
    "Notifications created",
  );

  return recipients.length;
}

async function sendTeamsNotifications(
  recipientIds: string[],
  input: NotifyInput,
): Promise<void> {
  let accessToken: string | null = null;
  try {
    accessToken = await getAppAccessToken();
  } catch {
    logger.warn("Could not acquire app token for Teams notifications");
    return;
  }

  if (!accessToken) {
    return;
  }

  const principals = await db
    .select({
      id: principalsTable.id,
      externalId: principalsTable.externalId,
      displayName: principalsTable.displayName,
    })
    .from(principalsTable)
    .where(inArray(principalsTable.id, recipientIds));

  for (const principal of principals) {
    if (!principal.externalId) continue;

    try {
      await sendTeamsChatMessage(
        accessToken,
        principal.externalId,
        input.title,
        input.body,
        input.link,
      );
    } catch (err) {
      logger.warn(
        { err, principalId: principal.id, displayName: principal.displayName },
        "Failed to send Teams chat message to user",
      );
    }
  }
}

async function sendTeamsChatMessage(
  accessToken: string,
  userAadId: string,
  title: string,
  body: string,
  link: string,
): Promise<void> {
  const appUrl = process.env["APP_PUBLIC_URL"] || `https://${process.env["REPLIT_DEV_DOMAIN"] || "localhost"}`;
  const fullLink = link.startsWith("http") ? link : `${appUrl}${link}`;

  const teamsAppId = process.env["TEAMS_APP_ID"];
  if (teamsAppId) {
    const activitySent = await sendTeamsActivityNotification(
      accessToken,
      userAadId,
      teamsAppId,
      title,
      body,
      fullLink,
    );
    if (activitySent) return;
  }

  const htmlContent = `<b>${escapeHtml(title)}</b><br/>${escapeHtml(body)}<br/><a href="${escapeHtml(fullLink)}">Zur Seite →</a>`;

  const chatRes = await fetch("https://graph.microsoft.com/v1.0/chats", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chatType: "oneOnOne",
      members: [
        {
          "@odata.type": "#microsoft.graph.aadUserConversationMember",
          roles: ["owner"],
          "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${userAadId}`,
        },
        {
          "@odata.type": "#microsoft.graph.aadUserConversationMember",
          roles: ["owner"],
          "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${userAadId}`,
        },
      ],
    }),
  });

  if (!chatRes.ok) {
    const errorText = await chatRes.text();
    logger.debug({ status: chatRes.status, errorText, userAadId }, "Failed to create/get Teams chat – falling back to in-app only");
    return;
  }

  const chatData = (await chatRes.json()) as { id: string };

  const msgRes = await fetch(
    `https://graph.microsoft.com/v1.0/chats/${chatData.id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: {
          contentType: "html",
          content: htmlContent,
        },
      }),
    },
  );

  if (!msgRes.ok) {
    const errorText = await msgRes.text();
    logger.debug({ status: msgRes.status, errorText }, "Failed to send Teams chat message");
  } else {
    logger.info({ userAadId }, "Teams chat message sent");
  }
}

async function sendTeamsActivityNotification(
  accessToken: string,
  userAadId: string,
  teamsAppId: string,
  title: string,
  body: string,
  fullLink: string,
): Promise<boolean> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userAadId}/teamwork/sendActivityNotification`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: {
          source: "text",
          value: title,
          webUrl: fullLink,
        },
        activityType: "taskCreated",
        previewText: {
          content: body.slice(0, 200),
        },
      }),
    },
  );

  if (res.ok || res.status === 202) {
    logger.info({ userAadId }, "Teams activity notification sent");
    return true;
  }

  const errorText = await res.text();
  logger.debug(
    { status: res.status, errorText, userAadId },
    "Teams activity notification failed, falling back to chat",
  );
  return false;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function getNotificationsForUser(
  principalId: string,
  opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
) {
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const conditions = [eq(notificationsTable.recipientId, principalId)];
  if (opts.unreadOnly) {
    conditions.push(eq(notificationsTable.status, "unread"));
  }

  const items = await db
    .select()
    .from(notificationsTable)
    .where(and(...conditions))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit)
    .offset(offset);

  return items;
}

export async function getUnreadCount(principalId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.recipientId, principalId),
        eq(notificationsTable.status, "unread"),
      ),
    );
  return result?.count ?? 0;
}

export async function markAsRead(notificationId: string, principalId: string): Promise<boolean> {
  const result = await db
    .update(notificationsTable)
    .set({ status: "read", readAt: new Date() })
    .where(
      and(
        eq(notificationsTable.id, notificationId),
        eq(notificationsTable.recipientId, principalId),
      ),
    )
    .returning({ id: notificationsTable.id });
  return result.length > 0;
}

export async function markAllAsRead(principalId: string): Promise<number> {
  const result = await db
    .update(notificationsTable)
    .set({ status: "read", readAt: new Date() })
    .where(
      and(
        eq(notificationsTable.recipientId, principalId),
        eq(notificationsTable.status, "unread"),
      ),
    )
    .returning({ id: notificationsTable.id });
  return result.length;
}

export async function notifyWorkingCopySubmitted(
  nodeId: string,
  nodeTitle: string,
  actorId: string,
  actorName: string,
  workingCopyId: string,
): Promise<void> {
  await createNotification({
    eventType: "working_copy_submitted",
    nodeId,
    actorId,
    title: "Review angefordert",
    body: `${actorName} hat eine Arbeitskopie von „${nodeTitle}" zur Überprüfung eingereicht.`,
    link: `/nodes/${nodeId}/review`,
    metadata: { workingCopyId },
  });
}

export async function notifyWorkingCopyApproved(
  nodeId: string,
  nodeTitle: string,
  actorId: string,
  actorName: string,
  workingCopyId: string,
): Promise<void> {
  await createNotification({
    eventType: "working_copy_approved",
    nodeId,
    actorId,
    title: "Arbeitskopie freigegeben",
    body: `${actorName} hat die Arbeitskopie von „${nodeTitle}" freigegeben.`,
    link: `/nodes/${nodeId}/review`,
    metadata: { workingCopyId },
  });
}

export async function notifyWorkingCopyReturned(
  nodeId: string,
  nodeTitle: string,
  actorId: string,
  actorName: string,
  workingCopyId: string,
  authorId: string,
  comment?: string,
): Promise<void> {
  const rows = [
    {
      recipientId: authorId,
      channel: "in_app" as const,
      type: "working_copy_returned" as const,
      title: "Überarbeitung erforderlich",
      body: `${actorName} hat die Arbeitskopie von „${nodeTitle}" zur Überarbeitung zurückgegeben.${comment ? ` Kommentar: ${comment}` : ""}`,
      link: `/nodes/${nodeId}/edit`,
      nodeId,
      actorId,
      status: "unread" as const,
      metadata: { workingCopyId, comment } as Record<string, unknown>,
    },
  ];

  if (authorId !== actorId) {
    await db.insert(notificationsTable).values(rows);

    sendTeamsNotifications([authorId], {
      eventType: "working_copy_returned",
      nodeId,
      actorId,
      title: rows[0].title,
      body: rows[0].body,
      link: rows[0].link,
      metadata: rows[0].metadata,
    }).catch((err) => {
      logger.error({ err }, "Teams notification delivery failed for returned WC");
    });
  }
}

export async function notifyWorkingCopyPublished(
  nodeId: string,
  nodeTitle: string,
  actorId: string,
  actorName: string,
  versionLabel: string,
): Promise<void> {
  await createNotification({
    eventType: "working_copy_published",
    nodeId,
    actorId,
    title: "Neue Version veröffentlicht",
    body: `${actorName} hat „${nodeTitle}" als Version ${versionLabel} veröffentlicht.`,
    link: `/node/${nodeId}`,
    metadata: { versionLabel },
  });
}

export async function notifyReviewOverdue(
  nodeId: string,
  nodeTitle: string,
  recipientIds: string[],
  daysOverdue: number,
  escalation: boolean,
): Promise<void> {
  const eventType = escalation ? "review_overdue_escalation" : "review_overdue";
  const title = escalation ? "Überfälliges Review – Eskalation" : "Review überfällig";
  const body = `Die Seite „${nodeTitle}" ist seit ${daysOverdue} Tagen überfällig für ein Review.`;
  const link = `/node/${nodeId}`;

  const systemActorId = "00000000-0000-0000-0000-000000000000";

  const rows = recipientIds.map((recipientId) => ({
    recipientId,
    channel: "in_app" as const,
    type: eventType,
    title,
    body,
    link,
    nodeId,
    actorId: systemActorId,
    status: "unread" as const,
    metadata: { daysOverdue, escalation } as Record<string, unknown>,
  }));

  if (rows.length > 0) {
    await db.insert(notificationsTable).values(rows);

    sendTeamsNotifications(recipientIds, {
      eventType,
      nodeId,
      actorId: systemActorId,
      title,
      body,
      link,
      metadata: { daysOverdue, escalation },
    }).catch((err) => {
      logger.error({ err }, "Teams notification delivery failed for overdue review");
    });
  }
}
