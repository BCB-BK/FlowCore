import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  deletionRequestsTable,
  contentNodesTable,
  auditEventsTable,
  principalsTable,
} from "@workspace/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";

const router: IRouter = Router();

router.get("/deletion-requests", requireAuth, async (req, res) => {
  const statusFilter = req.query.status as string | undefined;

  let query = db
    .select({
      id: deletionRequestsTable.id,
      nodeId: deletionRequestsTable.nodeId,
      nodeTitle: contentNodesTable.title,
      nodeDisplayCode: contentNodesTable.displayCode,
      requestedBy: deletionRequestsTable.requestedBy,
      reason: deletionRequestsTable.reason,
      status: deletionRequestsTable.status,
      reviewedBy: deletionRequestsTable.reviewedBy,
      reviewComment: deletionRequestsTable.reviewComment,
      reviewedAt: deletionRequestsTable.reviewedAt,
      createdAt: deletionRequestsTable.createdAt,
      updatedAt: deletionRequestsTable.updatedAt,
    })
    .from(deletionRequestsTable)
    .innerJoin(
      contentNodesTable,
      eq(deletionRequestsTable.nodeId, contentNodesTable.id),
    )
    .orderBy(desc(deletionRequestsTable.createdAt))
    .$dynamic();

  if (statusFilter) {
    const validStatuses = ["pending", "approved", "rejected", "executed"] as const;
    type DeletionStatus = (typeof validStatuses)[number];
    if (validStatuses.includes(statusFilter as DeletionStatus)) {
      query = query.where(
        eq(deletionRequestsTable.status, statusFilter as DeletionStatus),
      );
    }
  }

  const rows = await query;

  const requestedByIds = [...new Set(rows.map((r) => r.requestedBy))];
  const reviewedByIds = [
    ...new Set(rows.filter((r) => r.reviewedBy).map((r) => r.reviewedBy!)),
  ];
  const allIds = [...new Set([...requestedByIds, ...reviewedByIds])];

  const principals = allIds.length > 0
    ? await db
        .select({ id: principalsTable.id, displayName: principalsTable.displayName })
        .from(principalsTable)
        .where(inArray(principalsTable.id, allIds))
    : [];

  const nameMap = new Map(principals.map((p) => [p.id, p.displayName]));

  const result = rows.map((r) => ({
    ...r,
    requestedByName: nameMap.get(r.requestedBy) ?? r.requestedBy,
    reviewedByName: r.reviewedBy ? (nameMap.get(r.reviewedBy) ?? r.reviewedBy) : null,
  }));

  res.json(result);
});

router.post("/deletion-requests", requireAuth, async (req, res) => {
  const { nodeId, reason } = req.body as { nodeId: string; reason: string };
  const requestedBy = req.user!.principalId;

  if (!nodeId || !reason?.trim()) {
    res.status(400).json({ error: "nodeId und reason sind erforderlich" });
    return;
  }

  const [node] = await db
    .select({ id: contentNodesTable.id, title: contentNodesTable.title })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, nodeId));

  if (!node) {
    res.status(404).json({ error: "Seite nicht gefunden" });
    return;
  }

  const [existing] = await db
    .select({ id: deletionRequestsTable.id })
    .from(deletionRequestsTable)
    .where(
      and(
        eq(deletionRequestsTable.nodeId, nodeId),
        eq(deletionRequestsTable.status, "pending"),
      ),
    );

  if (existing) {
    res
      .status(409)
      .json({ error: "Es existiert bereits eine offene Löschanfrage für diese Seite" });
    return;
  }

  const [request] = await db
    .insert(deletionRequestsTable)
    .values({
      nodeId,
      requestedBy,
      reason: reason.trim(),
    })
    .returning();

  await db.insert(auditEventsTable).values({
    eventType: "content",
    action: "deletion_requested",
    actorId: requestedBy,
    resourceType: "content_node",
    resourceId: nodeId,
    details: { reason: reason.trim(), requestId: request.id },
  });

  const [nodeDetails] = await db
    .select({
      title: contentNodesTable.title,
      displayCode: contentNodesTable.displayCode,
    })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, nodeId));

  const [requester] = await db
    .select({ displayName: principalsTable.displayName })
    .from(principalsTable)
    .where(eq(principalsTable.id, requestedBy));

  res.status(201).json({
    ...request,
    nodeTitle: nodeDetails?.title ?? "",
    nodeDisplayCode: nodeDetails?.displayCode ?? "",
    requestedByName: requester?.displayName ?? requestedBy,
    reviewedByName: null,
  });
});

router.get("/deletion-requests/:requestId", requireAuth, async (req, res) => {
  const { requestId } = req.params;

  const [request] = await db
    .select({
      id: deletionRequestsTable.id,
      nodeId: deletionRequestsTable.nodeId,
      nodeTitle: contentNodesTable.title,
      nodeDisplayCode: contentNodesTable.displayCode,
      requestedBy: deletionRequestsTable.requestedBy,
      reason: deletionRequestsTable.reason,
      status: deletionRequestsTable.status,
      reviewedBy: deletionRequestsTable.reviewedBy,
      reviewComment: deletionRequestsTable.reviewComment,
      reviewedAt: deletionRequestsTable.reviewedAt,
      createdAt: deletionRequestsTable.createdAt,
      updatedAt: deletionRequestsTable.updatedAt,
    })
    .from(deletionRequestsTable)
    .innerJoin(
      contentNodesTable,
      eq(deletionRequestsTable.nodeId, contentNodesTable.id),
    )
    .where(eq(deletionRequestsTable.id, requestId));

  if (!request) {
    res.status(404).json({ error: "Löschanfrage nicht gefunden" });
    return;
  }

  res.json(request);
});

router.post(
  "/deletion-requests/:requestId/review",
  requireAuth,
  requirePermission("archive_page"),
  async (req, res) => {
    const { requestId } = req.params;
    const { decision, comment } = req.body as {
      decision: "approved" | "rejected";
      comment?: string;
    };
    const reviewerId = req.user!.principalId;

    if (!decision || !["approved", "rejected"].includes(decision)) {
      res.status(400).json({ error: "Ungültige Entscheidung" });
      return;
    }

    const [request] = await db
      .select()
      .from(deletionRequestsTable)
      .where(eq(deletionRequestsTable.id, requestId));

    if (!request) {
      res.status(404).json({ error: "Löschanfrage nicht gefunden" });
      return;
    }

    if (request.status !== "pending") {
      res.status(400).json({ error: "Löschanfrage ist nicht mehr offen" });
      return;
    }

    const newStatus = decision === "approved" ? "approved" : "rejected";

    await db.transaction(async (tx) => {
      await tx
        .update(deletionRequestsTable)
        .set({
          status: newStatus,
          reviewedBy: reviewerId,
          reviewComment: comment?.trim() || null,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deletionRequestsTable.id, requestId));

      if (decision === "approved") {
        await tx
          .update(contentNodesTable)
          .set({
            isDeleted: true,
            deletedAt: new Date(),
            status: "deleted",
          })
          .where(eq(contentNodesTable.id, request.nodeId));

        await tx
          .update(deletionRequestsTable)
          .set({ status: "executed", updatedAt: new Date() })
          .where(eq(deletionRequestsTable.id, requestId));
      }

      await tx.insert(auditEventsTable).values({
        eventType: "content",
        action:
          decision === "approved"
            ? "deletion_approved"
            : "deletion_rejected",
        actorId: reviewerId,
        resourceType: "content_node",
        resourceId: request.nodeId,
        details: {
          requestId,
          decision,
          comment: comment?.trim() || null,
        },
      });
    });

    const [updated] = await db
      .select({
        id: deletionRequestsTable.id,
        nodeId: deletionRequestsTable.nodeId,
        nodeTitle: contentNodesTable.title,
        nodeDisplayCode: contentNodesTable.displayCode,
        requestedBy: deletionRequestsTable.requestedBy,
        reason: deletionRequestsTable.reason,
        status: deletionRequestsTable.status,
        reviewedBy: deletionRequestsTable.reviewedBy,
        reviewComment: deletionRequestsTable.reviewComment,
        reviewedAt: deletionRequestsTable.reviewedAt,
        createdAt: deletionRequestsTable.createdAt,
        updatedAt: deletionRequestsTable.updatedAt,
      })
      .from(deletionRequestsTable)
      .innerJoin(
        contentNodesTable,
        eq(deletionRequestsTable.nodeId, contentNodesTable.id),
      )
      .where(eq(deletionRequestsTable.id, requestId));

    res.json(updated);
  },
);

router.post(
  "/deletion-requests/:requestId/cancel",
  requireAuth,
  async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user!.principalId;

    const [request] = await db
      .select()
      .from(deletionRequestsTable)
      .where(eq(deletionRequestsTable.id, requestId));

    if (!request) {
      res.status(404).json({ error: "Löschanfrage nicht gefunden" });
      return;
    }

    if (request.status !== "pending") {
      res.status(400).json({ error: "Löschanfrage ist nicht mehr offen" });
      return;
    }

    if (request.requestedBy !== userId) {
      res
        .status(403)
        .json({ error: "Nur der Antragsteller kann die Anfrage abbrechen" });
      return;
    }

    await db
      .update(deletionRequestsTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(deletionRequestsTable.id, requestId));

    const [updated] = await db
      .select({
        id: deletionRequestsTable.id,
        nodeId: deletionRequestsTable.nodeId,
        nodeTitle: contentNodesTable.title,
        nodeDisplayCode: contentNodesTable.displayCode,
        requestedBy: deletionRequestsTable.requestedBy,
        reason: deletionRequestsTable.reason,
        status: deletionRequestsTable.status,
        reviewedBy: deletionRequestsTable.reviewedBy,
        reviewComment: deletionRequestsTable.reviewComment,
        reviewedAt: deletionRequestsTable.reviewedAt,
        createdAt: deletionRequestsTable.createdAt,
        updatedAt: deletionRequestsTable.updatedAt,
      })
      .from(deletionRequestsTable)
      .innerJoin(
        contentNodesTable,
        eq(deletionRequestsTable.nodeId, contentNodesTable.id),
      )
      .where(eq(deletionRequestsTable.id, requestId));

    res.json(updated);
  },
);

router.get("/nodes/:nodeId/deletion-request", requireAuth, async (req, res) => {
  const { nodeId } = req.params;

  const [request] = await db
    .select({
      id: deletionRequestsTable.id,
      nodeId: deletionRequestsTable.nodeId,
      nodeTitle: contentNodesTable.title,
      nodeDisplayCode: contentNodesTable.displayCode,
      requestedBy: deletionRequestsTable.requestedBy,
      reason: deletionRequestsTable.reason,
      status: deletionRequestsTable.status,
      reviewedBy: deletionRequestsTable.reviewedBy,
      reviewComment: deletionRequestsTable.reviewComment,
      reviewedAt: deletionRequestsTable.reviewedAt,
      createdAt: deletionRequestsTable.createdAt,
      updatedAt: deletionRequestsTable.updatedAt,
    })
    .from(deletionRequestsTable)
    .innerJoin(
      contentNodesTable,
      eq(deletionRequestsTable.nodeId, contentNodesTable.id),
    )
    .where(
      and(
        eq(deletionRequestsTable.nodeId, nodeId),
        eq(deletionRequestsTable.status, "pending"),
      ),
    )
    .orderBy(desc(deletionRequestsTable.createdAt))
    .limit(1);

  res.json(request ?? null);
});

export { router as deletionRequestsRouter };
