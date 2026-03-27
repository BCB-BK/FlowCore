import { pgTable, serial, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditEventsTable = pgTable(
  "audit_events",
  {
    id: serial("id").primaryKey(),
    eventType: text("event_type").notNull(),
    action: text("action").notNull(),
    actorId: text("actor_id"),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    details: jsonb("details"),
    correlationId: text("correlation_id"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_audit_events_resource").on(table.resourceId),
    index("idx_audit_events_actor").on(table.actorId),
  ],
);

export const insertAuditEventSchema = createInsertSchema(auditEventsTable).omit(
  { id: true, createdAt: true },
);
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEvent = typeof auditEventsTable.$inferSelect;
