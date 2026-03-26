-- Migration: Add releases table for release lifecycle management
-- Task #31: Cluster 14 – Source of Truth, GitHub-Sync und Release-Disziplin

DO $$ BEGIN
  CREATE TYPE "public"."release_status" AS ENUM('in_progress', 'audit_pending', 'audit_passed', 'sync_pending', 'released', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "releases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "version" text NOT NULL,
  "status" "release_status" DEFAULT 'in_progress' NOT NULL,
  "cluster_ref" text,
  "changed_files" jsonb,
  "audit_notes" text,
  "audited_by" text,
  "audited_at" timestamp with time zone,
  "synced_at" timestamp with time zone,
  "sync_ref" text,
  "sync_notes" text,
  "released_by" text,
  "released_at" timestamp with time zone,
  "release_notes" text,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_releases_status" ON "releases" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_releases_version" ON "releases" USING btree ("version");
CREATE INDEX IF NOT EXISTS "idx_releases_created" ON "releases" USING btree ("created_at");
