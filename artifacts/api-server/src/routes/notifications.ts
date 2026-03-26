import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth";
import {
  getNotificationsForUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../services/notification.service";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const principalId = req.user!.principalId;
    const rawLimit = parseInt(req.query.limit as string);
    const rawOffset = parseInt(req.query.offset as string);
    const limit = Math.max(1, Math.min(isNaN(rawLimit) ? 50 : rawLimit, 100));
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);
    const unreadOnly = req.query.unreadOnly === "true";

    const items = await getNotificationsForUser(principalId, {
      limit,
      offset,
      unreadOnly,
    });

    res.json({ items, limit, offset });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

notificationsRouter.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const principalId = req.user!.principalId;
    const count = await getUnreadCount(principalId);
    res.json({ count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

notificationsRouter.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const principalId = req.user!.principalId;
    const notificationId = req.params.id as string;
    const success = await markAsRead(notificationId, principalId);

    if (!success) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

notificationsRouter.patch("/read-all", requireAuth, async (req, res) => {
  try {
    const principalId = req.user!.principalId;
    const count = await markAllAsRead(principalId);
    res.json({ count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});
