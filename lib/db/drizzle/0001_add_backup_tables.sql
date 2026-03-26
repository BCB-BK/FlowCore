-- Migration: Add backup management tables
-- Task #16: Backup als produktive Admin-Funktion

DO $$ BEGIN
  CREATE TYPE "public"."backup_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."backup_type" AS ENUM('manual', 'daily', 'weekly', 'monthly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "backup_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "interval" text DEFAULT 'daily' NOT NULL,
  "target_drive_id" text,
  "target_site_id" text,
  "target_site_name" text,
  "target_drive_name" text,
  "target_folder_id" text,
  "target_folder_name" text,
  "target_folder_path" text,
  "retain_daily" integer DEFAULT 7 NOT NULL,
  "retain_weekly" integer DEFAULT 4 NOT NULL,
  "retain_monthly" integer DEFAULT 12 NOT NULL,
  "include_templates" boolean DEFAULT true NOT NULL,
  "include_connectors" boolean DEFAULT true NOT NULL,
  "encryption_enabled" boolean DEFAULT false NOT NULL,
  "last_run_at" timestamp with time zone,
  "next_run_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "backup_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "config_id" uuid,
  "backup_type" "backup_type" DEFAULT 'manual' NOT NULL,
  "status" "backup_status" DEFAULT 'pending' NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "size_bytes" bigint,
  "duration_ms" integer,
  "file_name" text,
  "drive_item_id" text,
  "drive_id" text,
  "sidecar_item_ids" jsonb,
  "manifest" jsonb,
  "error_message" text,
  "log" text,
  "triggered_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "backup_runs" ADD CONSTRAINT "backup_runs_config_id_backup_configs_id_fk"
    FOREIGN KEY ("config_id") REFERENCES "public"."backup_configs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_backup_runs_status" ON "backup_runs" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_backup_runs_type" ON "backup_runs" USING btree ("backup_type");
CREATE INDEX IF NOT EXISTS "idx_backup_runs_created" ON "backup_runs" USING btree ("created_at");
