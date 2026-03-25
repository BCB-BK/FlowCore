import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  reviewWorkflowsTable,
  approvalsTable,
  contentRevisionsTable,
  contentRevisionEventsTable,
  pageWatchersTable,
  auditEventsTable,
  contentNodesTable,
  contentRelationsTable,
  contentNodeTagsTable,
  contentTagsTable,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Request } from "express";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import type { WikiPermission } from "../services/rbac.service";

const router: IRouter = Router();

interface RevisionResolvedRequest extends Request {
  _resolvedNodeId: string;
  _resolvedRevisionStatus: string;
}

function resolveNodeIdFromRevision(permissionKey: WikiPermission) {
  return [
    requireAuth,
    async (
      req: Request,
      res: import("express").Response,
      next: import("express").NextFunction,
    ) => {
      const id = req.params.id as string;
      const [rev] = await db
        .select({
          nodeId: contentRevisionsTable.nodeId,
          status: contentRevisionsTable.status,
        })
        .from(contentRevisionsTable)
        .where(eq(contentRevisionsTable.id, id));
      if (!rev) {
        res.status(404).json({ error: "Revision not found" });
        return;
      }
      (req as RevisionResolvedRequest)._resolvedNodeId = rev.nodeId;
      (req as RevisionResolvedRequest)._resolvedRevisionStatus = rev.status;
      next();
    },
    requirePermission(
      permissionKey,
      (req) => (req as RevisionResolvedRequest)._resolvedNodeId,
    ),
  ];
}

router.post(
  "/revisions/:id/submit-for-review",
  ...resolveNodeIdFromRevision("submit_for_review"),
  async (req, res) => {
    try {
      const revisionId = req.params.id as string;
      const currentStatus = (req as RevisionResolvedRequest)
        ._resolvedRevisionStatus;
      const { reviewerId, comment } = req.body;

      if (currentStatus !== "draft") {
        res.status(409).json({
          error: `Revision must be in 'draft' status to submit for review (current: ${currentStatus})`,
        });
        return;
      }

      const [existingWorkflow] = await db
        .select()
        .from(reviewWorkflowsTable)
        .where(
          and(
            eq(reviewWorkflowsTable.revisionId, revisionId),
            eq(reviewWorkflowsTable.status, "pending"),
          ),
        );

      if (existingWorkflow) {
        res
          .status(409)
          .json({ error: "A review is already pending for this revision" });
        return;
      }

      const [workflow] = await db
        .insert(reviewWorkflowsTable)
        .values({
          revisionId,
          status: "pending",
          requiredApprovals: 1,
          currentStep: 1,
          initiatedBy: req.user!.principalId,
        })
        .returning();

      await db.insert(approvalsTable).values({
        workflowId: workflow.id,
        revisionId,
        stepNumber: 1,
        reviewerId: reviewerId || null,
      });

      await db
        .update(contentRevisionsTable)
        .set({ status: "in_review", reviewerId: reviewerId || null })
        .where(eq(contentRevisionsTable.id, revisionId));

      const nodeId = (req as RevisionResolvedRequest)._resolvedNodeId;
      await db
        .update(contentNodesTable)
        .set({ status: "in_review", updatedAt: new Date() })
        .where(eq(contentNodesTable.id, nodeId));

      await db.insert(contentRevisionEventsTable).values({
        revisionId,
        eventType: "submitted_for_review",
        actorId: req.user!.principalId,
        comment: comment || null,
        metadata: reviewerId ? { reviewerId } : {},
      });

      await db.insert(auditEventsTable).values({
        eventType: "content",
        action: "submitted_for_review",
        actorId: req.user!.principalId,
        resourceType: "content_revision",
        resourceId: revisionId,
        details: { reviewerId },
      });

      res.status(201).json(workflow);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  },
);

router.post(
  "/revisions/:id/approve",
  ...resolveNodeIdFromRevision("approve_page"),
  async (req, res) => {
    try {
      const revisionId = req.params.id as string;
      const currentStatus = (req as RevisionResolvedRequest)
        ._resolvedRevisionStatus;
      const { comment, nextReviewDate } = req.body;

      if (currentStatus !== "in_review") {
        res.status(409).json({
          error: `Revision must be in 'in_review' status to approve (current: ${currentStatus})`,
        });
        return;
      }

      const [workflow] = await db
        .select()
        .from(reviewWorkflowsTable)
        .where(
          and(
            eq(reviewWorkflowsTable.revisionId, revisionId),
            eq(reviewWorkflowsTable.status, "pending"),
          ),
        )
        .orderBy(desc(reviewWorkflowsTable.createdAt))
        .limit(1);

      if (workflow) {
        await db
          .update(reviewWorkflowsTable)
          .set({
            status: "approved",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(reviewWorkflowsTable.id, workflow.id));

        await db
          .update(approvalsTable)
          .set({
            decision: "approved",
            reviewerId: req.user!.principalId,
            comment: comment || null,
            decidedAt: new Date(),
          })
          .where(
            and(
              eq(approvalsTable.workflowId, workflow.id),
              eq(approvalsTable.stepNumber, workflow.currentStep),
            ),
          );
      }

      const updateFields: Record<string, unknown> = {
        status: "approved",
        approverId: req.user!.principalId,
      };
      if (nextReviewDate) {
        updateFields.nextReviewDate = new Date(nextReviewDate);
      }
      await db
        .update(contentRevisionsTable)
        .set(updateFields)
        .where(eq(contentRevisionsTable.id, revisionId));

      const approveNodeId = (req as RevisionResolvedRequest)._resolvedNodeId;
      await db
        .update(contentNodesTable)
        .set({ status: "approved", updatedAt: new Date() })
        .where(eq(contentNodesTable.id, approveNodeId));

      await db.insert(contentRevisionEventsTable).values({
        revisionId,
        eventType: "review_approved",
        actorId: req.user!.principalId,
        comment: comment || null,
        metadata: nextReviewDate ? { nextReviewDate } : {},
      });

      await db.insert(auditEventsTable).values({
        eventType: "content",
        action: "revision_approved",
        actorId: req.user!.principalId,
        resourceType: "content_revision",
        resourceId: revisionId,
      });

      const [revision] = await db
        .select()
        .from(contentRevisionsTable)
        .where(eq(contentRevisionsTable.id, revisionId));
      res.json(revision);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  },
);

router.post(
  "/revisions/:id/reject",
  ...resolveNodeIdFromRevision("review_page"),
  async (req, res) => {
    try {
      const revisionId = req.params.id as string;
      const currentStatus = (req as RevisionResolvedRequest)
        ._resolvedRevisionStatus;
      const { comment, decision } = req.body;

      if (currentStatus !== "in_review") {
        res.status(409).json({
          error: `Revision must be in 'in_review' status to reject (current: ${currentStatus})`,
        });
        return;
      }

      const [workflow] = await db
        .select()
        .from(reviewWorkflowsTable)
        .where(
          and(
            eq(reviewWorkflowsTable.revisionId, revisionId),
            eq(reviewWorkflowsTable.status, "pending"),
          ),
        )
        .orderBy(desc(reviewWorkflowsTable.createdAt))
        .limit(1);

      if (workflow) {
        await db
          .update(reviewWorkflowsTable)
          .set({
            status: "rejected",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(reviewWorkflowsTable.id, workflow.id));

        await db
          .update(approvalsTable)
          .set({
            decision:
              decision === "returned_for_changes"
                ? "returned_for_changes"
                : "rejected",
            reviewerId: req.user!.principalId,
            comment: comment || null,
            decidedAt: new Date(),
          })
          .where(
            and(
              eq(approvalsTable.workflowId, workflow.id),
              eq(approvalsTable.stepNumber, workflow.currentStep),
            ),
          );
      }

      await db
        .update(contentRevisionsTable)
        .set({ status: "draft" })
        .where(eq(contentRevisionsTable.id, revisionId));

      const rejectNodeId = (req as RevisionResolvedRequest)._resolvedNodeId;
      await db
        .update(contentNodesTable)
        .set({ status: "draft", updatedAt: new Date() })
        .where(eq(contentNodesTable.id, rejectNodeId));

      await db.insert(contentRevisionEventsTable).values({
        revisionId,
        eventType: "review_rejected",
        actorId: req.user!.principalId,
        comment: comment || null,
        metadata: { decision: decision || "rejected" },
      });

      await db.insert(auditEventsTable).values({
        eventType: "content",
        action: "revision_rejected",
        actorId: req.user!.principalId,
        resourceType: "content_revision",
        resourceId: revisionId,
        details: { decision },
      });

      const [revision] = await db
        .select()
        .from(contentRevisionsTable)
        .where(eq(contentRevisionsTable.id, revisionId));
      res.json(revision);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  },
);

router.get(
  "/revisions/:id/workflow",
  ...resolveNodeIdFromRevision("read_page"),
  async (req, res) => {
    const revisionId = req.params.id as string;
    const workflows = await db
      .select()
      .from(reviewWorkflowsTable)
      .where(eq(reviewWorkflowsTable.revisionId, revisionId))
      .orderBy(desc(reviewWorkflowsTable.createdAt));

    if (workflows.length === 0) {
      res.status(404).json({ error: "No review workflow found" });
      return;
    }

    const workflow = workflows[0];
    const approvals = await db
      .select()
      .from(approvalsTable)
      .where(eq(approvalsTable.workflowId, workflow.id))
      .orderBy(approvalsTable.stepNumber);

    res.json({ ...workflow, approvals });
  },
);

router.get(
  "/revisions/:id/events",
  ...resolveNodeIdFromRevision("read_page"),
  async (req, res) => {
    const revisionId = req.params.id as string;
    const events = await db
      .select()
      .from(contentRevisionEventsTable)
      .where(eq(contentRevisionEventsTable.revisionId, revisionId))
      .orderBy(desc(contentRevisionEventsTable.createdAt));
    res.json(events);
  },
);

router.get(
  "/revisions/:id/diff/:compareId",
  ...resolveNodeIdFromRevision("read_page"),
  async (req, res) => {
    const id = req.params.id as string;
    const compareId = req.params.compareId as string;
    const authorizedNodeId = (req as RevisionResolvedRequest)._resolvedNodeId;

    const [revA] = await db
      .select()
      .from(contentRevisionsTable)
      .where(eq(contentRevisionsTable.id, id));
    const [revB] = await db
      .select()
      .from(contentRevisionsTable)
      .where(eq(contentRevisionsTable.id, compareId));

    if (!revA || !revB) {
      res.status(404).json({ error: "One or both revisions not found" });
      return;
    }

    if (revB.nodeId !== authorizedNodeId) {
      res.status(403).json({
        error: "Compare revision belongs to a different node",
      });
      return;
    }

    const metadataChanges: Record<string, { old: unknown; new: unknown }> = {};
    const fieldsToCompare = [
      "title",
      "status",
      "changeType",
      "versionLabel",
      "reviewerId",
      "approverId",
    ] as const;
    for (const field of fieldsToCompare) {
      if (revA[field] !== revB[field]) {
        metadataChanges[field] = {
          old: revA[field],
          new: revB[field],
        };
      }
    }

    const structuredFieldsA = (revA.structuredFields || {}) as Record<
      string,
      unknown
    >;
    const structuredFieldsB = (revB.structuredFields || {}) as Record<
      string,
      unknown
    >;
    const structuredFieldChanges: Record<
      string,
      { old: unknown; new: unknown }
    > = {};

    const allKeys = new Set([
      ...Object.keys(structuredFieldsA),
      ...Object.keys(structuredFieldsB),
    ]);
    for (const key of allKeys) {
      if (
        JSON.stringify(structuredFieldsA[key]) !==
        JSON.stringify(structuredFieldsB[key])
      ) {
        structuredFieldChanges[key] = {
          old: structuredFieldsA[key],
          new: structuredFieldsB[key],
        };
      }
    }

    const contentA = revA.content as Record<string, unknown> | null;
    const contentB = revB.content as Record<string, unknown> | null;
    const contentChanged =
      JSON.stringify(contentA) !== JSON.stringify(contentB);

    const relations = await db
      .select({
        id: contentRelationsTable.id,
        sourceNodeId: contentRelationsTable.sourceNodeId,
        targetNodeId: contentRelationsTable.targetNodeId,
        relationType: contentRelationsTable.relationType,
        description: contentRelationsTable.description,
      })
      .from(contentRelationsTable)
      .where(eq(contentRelationsTable.sourceNodeId, authorizedNodeId));

    const tags = await db
      .select({
        tagId: contentNodeTagsTable.tagId,
        tagName: contentTagsTable.name,
        tagSlug: contentTagsTable.slug,
      })
      .from(contentNodeTagsTable)
      .innerJoin(
        contentTagsTable,
        eq(contentNodeTagsTable.tagId, contentTagsTable.id),
      )
      .where(eq(contentNodeTagsTable.nodeId, authorizedNodeId));

    res.json({
      revisionA: {
        id: revA.id,
        revisionNo: revA.revisionNo,
        title: revA.title,
        status: revA.status,
        createdAt: revA.createdAt,
        authorId: revA.authorId,
      },
      revisionB: {
        id: revB.id,
        revisionNo: revB.revisionNo,
        title: revB.title,
        status: revB.status,
        createdAt: revB.createdAt,
        authorId: revB.authorId,
      },
      metadataChanges,
      structuredFieldChanges,
      contentChanged,
      contentA: contentChanged ? contentA : undefined,
      contentB: contentChanged ? contentB : undefined,
      nodeContext: {
        relations,
        tags,
      },
    });
  },
);

router.get(
  "/nodes/:nodeId/watchers",
  requireAuth,
  requirePermission("read_page", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const watchers = await db
      .select()
      .from(pageWatchersTable)
      .where(eq(pageWatchersTable.nodeId, nodeId));
    res.json(watchers);
  },
);

router.post(
  "/nodes/:nodeId/watch",
  requireAuth,
  requirePermission("read_page", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const principalId = req.user!.principalId;
    const watchChildren = req.body?.watchChildren === true;

    const [existing] = await db
      .select()
      .from(pageWatchersTable)
      .where(
        and(
          eq(pageWatchersTable.nodeId, nodeId),
          eq(pageWatchersTable.principalId, principalId),
        ),
      );

    if (existing) {
      res.json(existing);
      return;
    }

    const [watcher] = await db
      .insert(pageWatchersTable)
      .values({ nodeId, principalId, watchChildren })
      .returning();

    res.status(201).json(watcher);
  },
);

router.delete(
  "/nodes/:nodeId/watch",
  requireAuth,
  requirePermission("read_page", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const principalId = req.user!.principalId;

    await db
      .delete(pageWatchersTable)
      .where(
        and(
          eq(pageWatchersTable.nodeId, nodeId),
          eq(pageWatchersTable.principalId, principalId),
        ),
      );

    res.status(204).send();
  },
);

router.get(
  "/nodes/:nodeId/watch",
  requireAuth,
  requirePermission("read_page", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const principalId = req.user!.principalId;

    const [watcher] = await db
      .select()
      .from(pageWatchersTable)
      .where(
        and(
          eq(pageWatchersTable.nodeId, nodeId),
          eq(pageWatchersTable.principalId, principalId),
        ),
      );

    res.json({ watching: !!watcher, watcher: watcher || null });
  },
);

export default router;
