-- Migration: Add deputy delegations, SoD config tables, and submitted_by column
-- Task #34: Professionalize RBAC with SoD enforcement and deputy delegation

ALTER TABLE "content_working_copies" ADD COLUMN IF NOT EXISTS "submitted_by" text;

CREATE TABLE IF NOT EXISTS "deputy_delegations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "principal_id" uuid NOT NULL REFERENCES "principals"("id"),
  "deputy_id" uuid NOT NULL REFERENCES "principals"("id"),
  "scope" text DEFAULT 'global' NOT NULL,
  "reason" text,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" uuid REFERENCES "principals"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_deputy_delegations_principal" ON "deputy_delegations" ("principal_id");
CREATE INDEX IF NOT EXISTS "idx_deputy_delegations_deputy" ON "deputy_delegations" ("deputy_id");
CREATE INDEX IF NOT EXISTS "idx_deputy_delegations_active" ON "deputy_delegations" ("is_active", "starts_at", "ends_at");

CREATE TABLE IF NOT EXISTS "sod_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rule_key" text NOT NULL UNIQUE,
  "description" text,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "updated_by" uuid REFERENCES "principals"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO "sod_config" ("rule_key", "description", "is_enabled")
VALUES
  ('four_eyes_review', 'Vier-Augen-Prinzip: Author cannot approve their own working copy', true),
  ('four_eyes_publish', 'Vier-Augen-Prinzip: Author cannot publish their own working copy', true)
ON CONFLICT ("rule_key") DO NOTHING;
