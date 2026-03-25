import { db } from "@workspace/db";
import { auditEventsTable, type InsertAuditEvent } from "@workspace/db/schema";
import { logger } from "./logger";

export const auditService = {
  async log(event: InsertAuditEvent): Promise<void> {
    try {
      await db.insert(auditEventsTable).values(event);
    } catch (err) {
      logger.error({ err, event }, "Failed to persist audit event");
    }
  },
};
