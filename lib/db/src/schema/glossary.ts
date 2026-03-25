import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { contentNodesTable } from "./content-nodes";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const glossaryTermsTable = pgTable(
  "glossary_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    term: text("term").notNull(),
    slug: text("slug").notNull(),
    definition: text("definition").notNull(),
    synonyms: text("synonyms").array(),
    abbreviation: text("abbreviation"),
    nodeId: uuid("node_id").references(() => contentNodesTable.id, {
      onDelete: "set null",
    }),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("idx_glossary_terms_slug").on(table.slug)],
);

export const insertGlossaryTermSchema = createInsertSchema(
  glossaryTermsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGlossaryTerm = z.infer<typeof insertGlossaryTermSchema>;
export type GlossaryTerm = typeof glossaryTermsTable.$inferSelect;
