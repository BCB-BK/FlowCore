import { db } from "@workspace/db";
import { auditEventsTable, type InsertAuditEvent } from "@workspace/db/schema";
import { logger } from "./logger";

export const auditService = {
  async log(event: InsertAuditEvent): Promise<void> {
    try {
      await db.insert(auditEventsTable).values(event);
    } catch (err) {
      logger.error(
        {
          err,
          eventType: event.eventType,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          correlationId: event.correlationId,
        },
        "Failed to persist audit event",
      );
    }
  },
};
