-- Migration: Add media index and audit metadata columns to backup_configs
-- Task #36: Cluster 23 – Backup, Restore, Retention und Notfallfähigkeit

ALTER TABLE "backup_configs"
  ADD COLUMN IF NOT EXISTS "include_media_index" boolean DEFAULT true NOT NULL;

ALTER TABLE "backup_configs"
  ADD COLUMN IF NOT EXISTS "include_audit_meta" boolean DEFAULT true NOT NULL;
