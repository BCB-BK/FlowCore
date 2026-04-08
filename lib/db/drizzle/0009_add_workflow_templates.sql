CREATE TYPE "public"."notification_event_type" AS ENUM('working_copy_submitted', 'working_copy_approved', 'working_copy_returned', 'working_copy_published', 'review_overdue', 'review_overdue_escalation', 'task_overdue', 'open_review_overdue');--> statement-breakpoint
CREATE TYPE "public"."notification_recipient_type" AS ENUM('owner', 'deputy', 'reviewer', 'approver', 'process_manager', 'role_based', 'explicit');--> statement-breakpoint
CREATE TABLE "workflow_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"enforce_so_d" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"step_number" integer NOT NULL,
	"name" text NOT NULL,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_type_workflow_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_type" text NOT NULL,
	"workflow_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_type_workflow_assignments_page_type_unique" UNIQUE("page_type")
);
--> statement-breakpoint
CREATE TABLE "notification_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "notification_event_type" NOT NULL,
	"recipient_types" text[] DEFAULT '{}' NOT NULL,
	"channels" text[] DEFAULT '{in_app}' NOT NULL,
	"reminder_after_days" integer,
	"escalation_after_days" integer,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_workflow_templates_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_type_workflow_assignments" ADD CONSTRAINT "page_type_workflow_assignments_workflow_id_workflow_templates_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "workflow_templates" ("name", "description", "is_default", "enforce_so_d") VALUES
  ('Standard-Freigabe', 'Standard-Freigabeablauf: Editor → Reviewer → Approver', true, false);
--> statement-breakpoint
INSERT INTO "workflow_steps" ("workflow_id", "step_number", "name", "roles")
  SELECT id, 1, 'Review', ARRAY['reviewer'] FROM "workflow_templates" WHERE "is_default" = true LIMIT 1;
--> statement-breakpoint
INSERT INTO "workflow_steps" ("workflow_id", "step_number", "name", "roles")
  SELECT id, 2, 'Freigabe', ARRAY['approver'] FROM "workflow_templates" WHERE "is_default" = true LIMIT 1;
--> statement-breakpoint
INSERT INTO "notification_rules" ("event_type", "recipient_types", "channels") VALUES
  ('working_copy_submitted', ARRAY['reviewer', 'approver', 'process_manager'], ARRAY['in_app', 'teams']),
  ('working_copy_approved', ARRAY['owner', 'deputy'], ARRAY['in_app', 'teams']),
  ('working_copy_returned', ARRAY['owner'], ARRAY['in_app', 'teams']),
  ('working_copy_published', ARRAY['owner', 'deputy'], ARRAY['in_app']),
  ('review_overdue', ARRAY['owner', 'deputy', 'reviewer'], ARRAY['in_app', 'teams']),
  ('review_overdue_escalation', ARRAY['owner', 'deputy', 'reviewer', 'process_manager'], ARRAY['in_app', 'teams']);
