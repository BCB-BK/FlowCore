import { pgEnum } from "drizzle-orm/pg-core";

export const nodeStatusEnum = pgEnum("node_status", [
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
  "deleted",
]);

export const changeTypeEnum = pgEnum("change_type", [
  "editorial",
  "minor",
  "major",
  "regulatory",
  "structural",
]);

export const relationTypeEnum = pgEnum("relation_type", [
  "related_to",
  "uses_template",
  "depends_on",
  "implements_policy",
  "upstream_of",
  "downstream_of",
  "replaces",
  "references",
]);

export const templateTypeEnum = pgEnum("template_type", [
  "core_process_overview",
  "area_overview",
  "process_page_text",
  "process_page_graphic",
  "procedure_instruction",
  "use_case",
  "policy",
  "role_profile",
  "dashboard",
  "system_documentation",
]);

export const revisionEventTypeEnum = pgEnum("revision_event_type", [
  "created",
  "submitted_for_review",
  "review_approved",
  "review_rejected",
  "published",
  "archived",
  "restored",
  "superseded",
]);
