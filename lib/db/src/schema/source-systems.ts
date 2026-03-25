import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { contentNodesTable } from "./content-nodes";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sourceSystemsTable = pgTable(
  "source_systems",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    systemType: text("system_type").notNull(),
    connectionConfig: jsonb("connection_config"),
    isActive: boolean("is_active").notNull().default(true),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("idx_source_systems_slug").on(table.slug)],
);

export const storageProvidersTable = pgTable(
  "storage_providers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    providerType: text("provider_type").notNull(),
    config: jsonb("config"),
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("idx_storage_providers_slug").on(table.slug)],
);

export const sourceReferencesTable = pgTable("source_references", {
  id: uuid("id").defaultRandom().primaryKey(),
  nodeId: uuid("node_id")
    .notNull()
    .references(() => contentNodesTable.id),
  sourceSystemId: uuid("source_system_id")
    .notNull()
    .references(() => sourceSystemsTable.id),
  externalId: text("external_id").notNull(),
  externalUrl: text("external_url"),
  syncStatus: text("sync_status").notNull().default("active"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertSourceSystemSchema = createInsertSchema(
  sourceSystemsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSourceSystem = z.infer<typeof insertSourceSystemSchema>;
export type SourceSystem = typeof sourceSystemsTable.$inferSelect;

export const insertStorageProviderSchema = createInsertSchema(
  storageProvidersTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStorageProvider = z.infer<typeof insertStorageProviderSchema>;
export type StorageProvider = typeof storageProvidersTable.$inferSelect;

export const insertSourceReferenceSchema = createInsertSchema(
  sourceReferencesTable,
).omit({ id: true, createdAt: true });
export type InsertSourceReference = z.infer<typeof insertSourceReferenceSchema>;
export type SourceReference = typeof sourceReferencesTable.$inferSelect;
