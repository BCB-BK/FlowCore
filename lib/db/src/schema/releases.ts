import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const releaseStatusEnum = pgEnum("release_status", [
  "in_progress",
  "audit_pending",
  "audit_passed",
  "sync_pending",
  "released",
  "revoked",
]);

export const releasesTable = pgTable(
  "releases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    version: text("version").notNull(),
    status: releaseStatusEnum("status").notNull().default("in_progress"),
    clusterRef: text("cluster_ref"),
    changedFiles: jsonb("changed_files").$type<string[]>(),
    auditNotes: text("audit_notes"),
    auditedBy: text("audited_by"),
    auditedAt: timestamp("audited_at", { withTimezone: true }),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    syncRef: text("sync_ref"),
    syncNotes: text("sync_notes"),
    releasedBy: text("released_by"),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    releaseNotes: text("release_notes"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_releases_status").on(table.status),
    index("idx_releases_version").on(table.version),
    index("idx_releases_created").on(table.createdAt),
  ],
);

export const insertReleaseSchema = createInsertSchema(releasesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type Release = typeof releasesTable.$inferSelect;
