import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { contentNodesTable } from "./content-nodes";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const organizationUnitsTable = pgTable(
  "organization_units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => organizationUnitsTable.id,
    ),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("idx_org_units_slug").on(table.slug)],
);

export const brandsTable = pgTable(
  "brands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    logoUrl: text("logo_url"),
    primaryColor: text("primary_color"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("idx_brands_slug").on(table.slug)],
);

export const locationsTable = pgTable(
  "locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    address: text("address"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("idx_locations_slug").on(table.slug)],
);

export const businessFunctionsTable = pgTable(
  "business_functions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("idx_business_functions_slug").on(table.slug)],
);

export const contentNodeContextTable = pgTable("content_node_context", {
  id: uuid("id").defaultRandom().primaryKey(),
  nodeId: uuid("node_id")
    .notNull()
    .references(() => contentNodesTable.id),
  organizationUnitId: uuid("organization_unit_id").references(
    () => organizationUnitsTable.id,
  ),
  brandId: uuid("brand_id").references(() => brandsTable.id),
  locationId: uuid("location_id").references(() => locationsTable.id),
  businessFunctionId: uuid("business_function_id").references(
    () => businessFunctionsTable.id,
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertContentNodeContextSchema = createInsertSchema(
  contentNodeContextTable,
).omit({ id: true, createdAt: true });
export type InsertContentNodeContext = z.infer<
  typeof insertContentNodeContextSchema
>;
export type ContentNodeContext = typeof contentNodeContextTable.$inferSelect;

export const insertOrganizationUnitSchema = createInsertSchema(
  organizationUnitsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrganizationUnit = z.infer<
  typeof insertOrganizationUnitSchema
>;
export type OrganizationUnit = typeof organizationUnitsTable.$inferSelect;

export const insertBrandSchema = createInsertSchema(brandsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand = typeof brandsTable.$inferSelect;

export const insertLocationSchema = createInsertSchema(locationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locationsTable.$inferSelect;

export const insertBusinessFunctionSchema = createInsertSchema(
  businessFunctionsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBusinessFunction = z.infer<
  typeof insertBusinessFunctionSchema
>;
export type BusinessFunction = typeof businessFunctionsTable.$inferSelect;
