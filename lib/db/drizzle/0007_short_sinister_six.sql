CREATE TABLE "ai_field_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_type" text NOT NULL,
	"field_key" text NOT NULL,
	"label" text NOT NULL,
	"purpose" text,
	"prompt_instruction" text,
	"style" text,
	"guardrails" text,
	"allowed_operations" jsonb DEFAULT '["reformulate","professionalize","expand","shorten","grammar"]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ai_field_profiles_page_field_unique" ON "ai_field_profiles" USING btree ("page_type","field_key");--> statement-breakpoint
CREATE INDEX "idx_ai_field_profiles_page_type" ON "ai_field_profiles" USING btree ("page_type");--> statement-breakpoint
CREATE INDEX "idx_ai_field_profiles_field_key" ON "ai_field_profiles" USING btree ("field_key");
