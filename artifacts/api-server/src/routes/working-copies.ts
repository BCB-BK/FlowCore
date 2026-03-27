import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import { validateBody } from "../middlewares/validate-body";
import { checkSeparationOfDuties, type WikiPermission } from "../services/rbac.service";
import type { WorkingCopy } from "@workspace/db/schema";
import { auditEventsTable, contentWorkingCopiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  createWorkingCopy,
  getActiveWorkingCopyForNode,
  getWorkingCopyById,
  updateWorkingCopy,
  submitWorkingCopy,
  returnWorkingCopyForChanges,
  approveWorkingCopy,
  publishWorkingCopy,
  cancelWorkingCopy,
  unlockWorkingCopy,
  getWorkingCopyDiff,
  getWorkingCopyEvents,
  addWorkingCopyComment,
} from "../services/working-copy.service";
import { generateChangeSummary } from "../services/ai.service";
import { logger } from "../lib/logger";
import { AppError } from "../lib/app-error";
import {
  notifyWorkingCopySubmitted,
  notifyWorkingCopyApproved,
  notifyWorkingCopyReturned,
  notifyWorkingCopyPublished,
} from "../services/notification.service";
import {
  UpdateWorkingCopyBody,
  SubmitForReviewBody,
  ApproveRevisionBody,
  RejectRevisionBody,
  PublishWorkingCopyBody,
  CancelWorkingCopyBody,
} from "@workspace/api-zod";

const CommentBody = z.object({
  comment: z.string().min(1),
});

const SummaryBody = z.object({
  summary: z.string(),
});

interface WorkingCopyRequest extends Request {
  workingCopy: WorkingCopy;
}

const router: IRouter = Router();

function mapServiceError(err: unknown): Error {
  if (err instanceof AppError) return err;
  const message = err instanceof Error ? err.message : "";
  const code = (err as { code?: string }).code;

  if (message.includes("not found") || message.includes("nicht gefunden")) {
    return new AppError(404, message);
  }
  if (
    code === "WORKING_COPY_ACTIVE" ||
    message.includes("bereits") ||
    message.includes("kann im Status") ||
    message.includes("ist bereits")
  ) {
    return new AppError(409, message, { code });
  }
  if (message.includes("nicht erfüllt")) {
    return new AppError(400, message);
  }
  return err instanceof Error ? err : new Error(message);
}

async function loadWorkingCopy(req: Request, res: Response, next: NextFunction) {
  const wc = await getWorkingCopyById(req.params.id as string);
  if (!wc) {
    res.status(404).json({ error: "Working copy not found" });
    return;
  }
  (req as WorkingCopyRequest).workingCopy = wc;
  next();
}

function requireWcPermission(permission: WikiPermission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const wc = (req as WorkingCopyRequest).workingCopy;
    if (!wc) {
      res.status(404).json({ error: "Working copy not found" });
      return;
    }
    const middleware = requirePermission(permission, () => wc.nodeId);
    await middleware(req, res, next);
  };
}

function requireWcOwnerOrPermission(permission: WikiPermission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const wc = (req as WorkingCopyRequest).workingCopy;
    if (!wc) {
      res.status(404).json({ error: "Working copy not found" });
      return;
    }
    if (wc.authorId === req.user!.principalId) {
      next();
      return;
    }
    const middleware = requirePermission(permission, () => wc.nodeId);
    await middleware(req, res, next);
  };
}

router.post(
  "/nodes/:nodeId/working-copies",
  requireAuth,
  requirePermission("create_working_copy", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const authorId = req.user!.principalId;
    try {
      const result = await createWorkingCopy({ nodeId, authorId });
      res.status(result.created ? 201 : 200).json(result.workingCopy);
    } catch (err) {
      logger.warn({ err, nodeId }, "Failed to create working copy");
      throw mapServiceError(err);
    }
  },
);

router.get(
  "/nodes/:nodeId/working-copy",
  requireAuth,
  requirePermission("read_page", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const wc = await getActiveWorkingCopyForNode(nodeId);
    if (!wc) {
      res.status(404).json({ error: "No active working copy" });
      return;
    }
    res.json(wc);
  },
);

router.get(
  "/working-copies/:id",
  requireAuth,
  loadWorkingCopy,
  requireWcPermission("read_page"),
  async (req, res) => {
    res.json((req as WorkingCopyRequest).workingCopy);
  },
);

router.patch(
  "/working-copies/:id",
  requireAuth,
  loadWorkingCopy,
  async (req: Request, res: Response, next: NextFunction) => {
    const wc = (req as WorkingCopyRequest).workingCopy;
    if (!wc) {
      res.status(404).json({ error: "Working copy not found" });
      return;
    }
    const isReviewPhase = wc.status === "submitted" || wc.status === "in_review";
    if (isReviewPhase) {
      const guard = requireWcPermission("amend_working_copy_in_review");
      await guard(req, res, next);
    } else {
      const guard = requireWcOwnerOrPermission("edit_working_copy");
      await guard(req, res, next);
    }
  },
  validateBody(UpdateWorkingCopyBody),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const actorId = req.user!.principalId;
      const updated = await updateWorkingCopy(id, req.body, actorId);
      res.json(updated);
    } catch (err) {
      throw mapServiceError(err);
    }
  },
);

router.post(
  "/working-copies/:id/submit",
  requireAuth,
  loadWorkingCopy,
  requireWcOwnerOrPermission("submit_working_copy"),
  validateBody(SubmitForReviewBody),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const actorId = req.user!.principalId;
      const updated = await submitWorkingCopy(id, req.body, actorId);
      notifyWorkingCopySubmitted(
        updated.nodeId,
        updated.title,
        actorId,
        req.user!.displayName,
        id,
      ).catch((e) => logger.warn({ err: e }, "Notification failed after submit"));
      res.json(updated);
    } catch (err) {
      throw mapServiceError(err);
    }
  },
);

router.post(
  "/working-copies/:id/return-for-changes",
  requireAuth,
  loadWorkingCopy,
  requireWcPermission("review_working_copy"),
  validateBody(RejectRevisionBody),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const actorId = req.user!.principalId;
      const wc = (req as WorkingCopyRequest).workingCopy;
      const updated = await returnWorkingCopyForChanges(
        id,
        req.body.comment,
        actorId,
      );
      notifyWorkingCopyReturned(
        updated.nodeId,
        updated.title,
        actorId,
        req.user!.displayName,
        id,
        wc.authorId,
        req.body.comment,
      ).catch((e) => logger.warn({ err: e }, "Notification failed after return"));
      res.json(updated);
    } catch (err) {
      throw mapServiceError(err);
    }
  },
);

router.post(
  "/working-copies/:id/approve",
  requireAuth,
  loadWorkingCopy,
  requireWcPermission("review_working_copy"),
  validateBody(ApproveRevisionBody),
  async (req, res) => {
    const id = req.params.id as string;
    const actorId = req.user!.principalId;
    const wc = (req as WorkingCopyRequest).workingCopy;

    const submitter = wc.submittedBy ?? wc.authorId;
    const sodResult = await checkSeparationOfDuties(
      "four_eyes_review",
      actorId,
      submitter,
    );
    if (!sodResult.allowed) {
      await db.insert(auditEventsTable).values({
        eventType: "rbac",
        action: "sod_violation_blocked",
        actorId,
        resourceType: "working_copy",
        resourceId: id,
        details: {
          rule: sodResult.rule,
          reason: sodResult.reason,
          submittedBy: submitter,
          authorId: wc.authorId,
        },
      });
      throw new AppError(403, "Vier-Augen-Prinzip: Einreicher und Genehmiger müssen unterschiedliche Personen sein.", {
        details: { sodRule: sodResult.rule, reason: sodResult.reason },
      });
    }

    try {
      const updated = await approveWorkingCopy(id, req.body.comment, actorId);
      notifyWorkingCopyApproved(
        updated.nodeId,
        updated.title,
        actorId,
        req.user!.displayName,
        id,
      ).catch((e) => logger.warn({ err: e }, "Notification failed after approve"));
      res.json(updated);
    } catch (err) {
      throw mapServiceError(err);
    }
  },
);

router.post(
  "/working-copies/:id/publish",
  requireAuth,
  loadWorkingCopy,
  requireWcPermission("publish_working_copy"),
  validateBody(PublishWorkingCopyBody),
  async (req, res) => {
    const id = req.params.id as string;
    const actorId = req.user!.principalId;
    const wc = (req as WorkingCopyRequest).workingCopy;
    const { versionLabel } = req.body;
    if (!versionLabel || versionLabel.trim().length === 0) {
      throw new AppError(400, "Validierungsfehler", {
        details: [{ field: "versionLabel", message: "Versionsbezeichnung darf nicht leer sein" }],
      });
    }

    const submitter = wc.submittedBy ?? wc.authorId;
    const sodResult = await checkSeparationOfDuties(
      "four_eyes_publish",
      actorId,
      submitter,
    );
    if (!sodResult.allowed) {
      await db.insert(auditEventsTable).values({
        eventType: "rbac",
        action: "sod_violation_blocked",
        actorId,
        resourceType: "working_copy",
        resourceId: id,
        details: {
          rule: sodResult.rule,
          reason: sodResult.reason,
          submittedBy: submitter,
          authorId: wc.authorId,
        },
      });
      throw new AppError(403, "Vier-Augen-Prinzip: Einreicher und Genehmiger müssen unterschiedliche Personen sein.", {
        details: { sodRule: sodResult.rule, reason: sodResult.reason },
      });
    }

    try {
      const result = await publishWorkingCopy(id, versionLabel, actorId);
      notifyWorkingCopyPublished(
        wc.nodeId,
        wc.title,
        actorId,
        req.user!.displayName,
        versionLabel,
      ).catch((e) => logger.warn({ err: e }, "Notification failed after publish"));
      res.json(result);
    } catch (err) {
      throw mapServiceError(err);
    }
  },
);

router.post(
  "/working-copies/:id/cancel",
  requireAuth,
  loadWorkingCopy,
  requireWcOwnerOrPermission("cancel_working_copy"),
  validateBody(CancelWorkingCopyBody),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const actorId = req.user!.principalId;
      const updated = await cancelWorkingCopy(id, req.body.comment, actorId);
      res.json(updated);
    } catch (err) {
      throw mapServiceError(err);
    }
  },
);

router.post(
  "/working-copies/:id/unlock",
  requireAuth,
  loadWorkingCopy,
  requireWcPermission("force_unlock_working_copy"),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const actorId = req.user!.principalId;
      const updated = await unlockWorkingCopy(id, actorId);
      res.json(updated);
    } catch (err) {
      throw mapServiceError(err);
    }
  },
);

router.put(
  "/working-copies/:id/summary",
  requireAuth,
  loadWorkingCopy,
  requireWcPermission("review_working_copy"),
  validateBody(SummaryBody),
  async (req, res) => {
    const id = req.params.id as string;
    const wc = (req as WorkingCopyRequest).workingCopy;
    const reviewStatuses = ["submitted", "in_review", "approved_for_publish"];
    if (!reviewStatuses.includes(wc.status)) {
      throw new AppError(409, "Zusammenfassung kann nur während der Prüfphase bearbeitet werden.");
    }
    const { summary } = req.body;

    await db
      .update(contentWorkingCopiesTable)
      .set({ lastManualSummary: summary.trim(), updatedAt: new Date() })
      .where(eq(contentWorkingCopiesTable.id, id));

    res.json({ ok: true });
  },
);

router.post(
  "/working-copies/:id/generate-summary",
  requireAuth,
  loadWorkingCopy,
  requireWcOwnerOrPermission("edit_working_copy"),
  async (req, res) => {
    const id = req.params.id as string;
    try {
      const diff = await getWorkingCopyDiff(id);
      const summary = await generateChangeSummary(diff);

      await db
        .update(contentWorkingCopiesTable)
        .set({ lastAiSummary: summary, updatedAt: new Date() })
        .where(eq(contentWorkingCopiesTable.id, id));

      res.json({ summary });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const isDisabled = message.includes("deaktiviert");
      logger.warn({ err }, "Failed to generate AI summary");
      throw new AppError(isDisabled ? 400 : 500, isDisabled ? message : "KI-Zusammenfassung fehlgeschlagen", {
        code: isDisabled ? "AI_DISABLED" : "AI_ERROR",
      });
    }
  },
);

router.post(
  "/working-copies/:id/comment",
  requireAuth,
  loadWorkingCopy,
  requireWcOwnerOrPermission("review_working_copy"),
  validateBody(CommentBody),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const actorId = req.user!.principalId;
      const { comment } = req.body;
      await addWorkingCopyComment(id, comment, actorId);
      res.json({ ok: true });
    } catch (err) {
      throw mapServiceError(err);
    }
  },
);

router.get(
  "/working-copies/:id/diff",
  requireAuth,
  loadWorkingCopy,
  requireWcPermission("read_page"),
  async (req, res) => {
    const id = req.params.id as string;
    const diff = await getWorkingCopyDiff(id);
    res.json(diff);
  },
);

router.get(
  "/working-copies/:id/events",
  requireAuth,
  loadWorkingCopy,
  requireWcPermission("read_page"),
  async (req, res) => {
    const id = req.params.id as string;
    const events = await getWorkingCopyEvents(id);
    res.json(events);
  },
);

export { router as workingCopiesRouter };
