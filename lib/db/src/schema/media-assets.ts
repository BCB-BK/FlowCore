import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { contentNodesTable } from "./content-nodes";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mediaAssetsTable = pgTable("media_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  nodeId: uuid("node_id").references(() => contentNodesTable.id),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: text("storage_key").notNull(),
  altText: text("alt_text"),
  uploadedBy: text("uploaded_by"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMediaAssetSchema = createInsertSchema(mediaAssetsTable).omit(
  { id: true, createdAt: true },
);
export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;
export type MediaAsset = typeof mediaAssetsTable.$inferSelect;
