import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { templateTypeEnum } from "./enums";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentTemplatesTable = pgTable("content_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateType: templateTypeEnum("template_type").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  fieldSchema: jsonb("field_schema").notNull().$type<TemplateFieldSchema>(),
  icon: text("icon"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export interface TemplateField {
  key: string;
  label: string;
  type:
    | "text"
    | "rich_text"
    | "enum"
    | "date"
    | "number"
    | "boolean"
    | "url"
    | "reference"
    | "table"
    | "file"
    | "json";
  required: boolean;
  description?: string;
  options?: string[];
  defaultValue?: unknown;
}

export interface TemplateFieldSchema {
  sections: Array<{
    key: string;
    label: string;
    fields: TemplateField[];
  }>;
}

export const insertContentTemplateSchema = createInsertSchema(
  contentTemplatesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const selectContentTemplateSchema = createSelectSchema(
  contentTemplatesTable,
);
export type InsertContentTemplate = z.infer<typeof insertContentTemplateSchema>;
export type ContentTemplate = typeof contentTemplatesTable.$inferSelect;
