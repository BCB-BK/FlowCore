import { db } from "@workspace/db";
import { auditEventsTable, type InsertAuditEvent } from "@workspace/db/schema";
import { eq, desc, and, gte, lte, sql, type SQL } from "drizzle-orm";
import { logger } from "./logger";

export interface AuditQueryOptions {
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
  action?: string;
  eventType?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

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

  async query(options: AuditQueryOptions) {
    const conditions: SQL[] = [];

    if (options.resourceType) {
      conditions.push(eq(auditEventsTable.resourceType, options.resourceType));
    }
    if (options.resourceId) {
      conditions.push(eq(auditEventsTable.resourceId, options.resourceId));
    }
    if (options.actorId) {
      conditions.push(eq(auditEventsTable.actorId, options.actorId));
    }
    if (options.action) {
      conditions.push(eq(auditEventsTable.action, options.action));
    }
    if (options.eventType) {
      conditions.push(eq(auditEventsTable.eventType, options.eventType));
    }
    if (options.from) {
      conditions.push(gte(auditEventsTable.createdAt, options.from));
    }
    if (options.to) {
      conditions.push(lte(auditEventsTable.createdAt, options.to));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult, events] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditEventsTable)
        .where(where),
      db
        .select()
        .from(auditEventsTable)
        .where(where)
        .orderBy(desc(auditEventsTable.createdAt))
        .limit(options.limit ?? 100)
        .offset(options.offset ?? 0),
    ]);

    return {
      events,
      total: countResult[0]?.count ?? 0,
    };
  },

  async getDistinctActions(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ action: auditEventsTable.action })
      .from(auditEventsTable)
      .orderBy(auditEventsTable.action);
    return rows.map((r) => r.action);
  },

  async getDistinctResourceTypes(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ resourceType: auditEventsTable.resourceType })
      .from(auditEventsTable)
      .orderBy(auditEventsTable.resourceType);
    return rows.map((r) => r.resourceType).filter(Boolean) as string[];
  },
};
