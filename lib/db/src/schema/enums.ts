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
  "glossary",
  "work_instruction",
  "checklist",
  "faq",
  "interface_description",
  "meeting_protocol",
  "training_resource",
  "audit_object",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "in_progress",
  "approved",
  "rejected",
  "cancelled",
]);

export const approvalDecisionEnum = pgEnum("approval_decision", [
  "approved",
  "rejected",
  "returned_for_changes",
]);

export const principalTypeEnum = pgEnum("principal_type", [
  "user",
  "group",
  "service_principal",
]);

export const principalStatusEnum = pgEnum("principal_status", [
  "active",
  "inactive",
  "blocked",
]);

export const wikiRoleEnum = pgEnum("wiki_role", [
  "system_admin",
  "process_manager",
  "editor",
  "reviewer",
  "approver",
  "viewer",
  "compliance_manager",
]);

export const wikiPermissionEnum = pgEnum("wiki_permission", [
  "read_page",
  "create_page",
  "edit_content",
  "edit_structure",
  "manage_relations",
  "submit_for_review",
  "review_page",
  "approve_page",
  "archive_page",
  "manage_permissions",
  "manage_templates",
  "manage_settings",
  "view_audit_log",
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

export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "email",
  "teams",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "unread",
  "read",
  "dismissed",
]);

export const mediaClassificationEnum = pgEnum("media_classification", [
  "document",
  "image",
  "video",
  "audio",
  "spreadsheet",
  "presentation",
  "template",
  "form",
  "archive",
  "other",
]);

export const commentStatusEnum = pgEnum("comment_status", [
  "active",
  "resolved",
  "deleted",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "active",
  "stale",
  "error",
  "not_found",
  "pending",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "expired",
  "overdue",
]);
