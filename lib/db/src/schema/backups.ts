import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  bigint,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const backupStatusEnum = pgEnum("backup_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const backupTypeEnum = pgEnum("backup_type", [
  "manual",
  "daily",
  "weekly",
  "monthly",
]);

export const backupConfigsTable = pgTable("backup_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  interval: text("interval").notNull().default("daily"),
  targetDriveId: text("target_drive_id"),
  targetSiteId: text("target_site_id"),
  targetSiteName: text("target_site_name"),
  targetDriveName: text("target_drive_name"),
  targetFolderId: text("target_folder_id"),
  targetFolderName: text("target_folder_name"),
  targetFolderPath: text("target_folder_path"),
  retainDaily: integer("retain_daily").notNull().default(7),
  retainWeekly: integer("retain_weekly").notNull().default(4),
  retainMonthly: integer("retain_monthly").notNull().default(12),
  includeTemplates: boolean("include_templates").notNull().default(true),
  includeConnectors: boolean("include_connectors").notNull().default(true),
  includeMediaIndex: boolean("include_media_index").notNull().default(true),
  includeAuditMeta: boolean("include_audit_meta").notNull().default(true),
  encryptionEnabled: boolean("encryption_enabled").notNull().default(false),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const backupRunsTable = pgTable(
  "backup_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    configId: uuid("config_id").references(() => backupConfigsTable.id),
    backupType: backupTypeEnum("backup_type").notNull().default("manual"),
    status: backupStatusEnum("status").notNull().default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    durationMs: integer("duration_ms"),
    fileName: text("file_name"),
    driveItemId: text("drive_item_id"),
    driveId: text("drive_id"),
    sidecarItemIds: jsonb("sidecar_item_ids").$type<string[]>(),
    manifest: jsonb("manifest"),
    errorMessage: text("error_message"),
    log: text("log"),
    triggeredBy: text("triggered_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_backup_runs_status").on(table.status),
    index("idx_backup_runs_type").on(table.backupType),
    index("idx_backup_runs_created").on(table.createdAt),
  ],
);

export const insertBackupConfigSchema = createInsertSchema(
  backupConfigsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBackupConfig = z.infer<typeof insertBackupConfigSchema>;
export type BackupConfig = typeof backupConfigsTable.$inferSelect;

export const insertBackupRunSchema = createInsertSchema(backupRunsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBackupRun = z.infer<typeof insertBackupRunSchema>;
export type BackupRun = typeof backupRunsTable.$inferSelect;
