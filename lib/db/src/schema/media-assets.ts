import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { contentNodesTable } from "./content-nodes";
import { storageProvidersTable } from "./source-systems";
import { mediaClassificationEnum, assetOriginEnum } from "./enums";
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
  storageProviderId: uuid("storage_provider_id").references(
    () => storageProvidersTable.id,
  ),
  altText: text("alt_text"),
  caption: text("caption"),
  classification: mediaClassificationEnum("classification").default("other"),
  originType: assetOriginEnum("origin_type").default("local_upload"),
  sourceUrl: text("source_url"),
  sourceLibrary: text("source_library"),
  sourcePath: text("source_path"),
  videoMetadata: jsonb("video_metadata"),
  transcriptRef: text("transcript_ref"),
  uploadedBy: text("uploaded_by"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const mediaAssetUsagesTable = pgTable("media_asset_usages", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => mediaAssetsTable.id),
  nodeId: uuid("node_id")
    .notNull()
    .references(() => contentNodesTable.id),
  revisionId: uuid("revision_id"),
  usageContext: text("usage_context"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMediaAssetSchema = createInsertSchema(mediaAssetsTable).omit(
  { id: true, createdAt: true },
);
export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;
export type MediaAsset = typeof mediaAssetsTable.$inferSelect;

export const insertMediaAssetUsageSchema = createInsertSchema(
  mediaAssetUsagesTable,
).omit({ id: true, createdAt: true });
export type InsertMediaAssetUsage = z.infer<typeof insertMediaAssetUsageSchema>;
export type MediaAssetUsage = typeof mediaAssetUsagesTable.$inferSelect;
