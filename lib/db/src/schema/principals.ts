import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  principalTypeEnum,
  principalStatusEnum,
  wikiRoleEnum,
  wikiPermissionEnum,
} from "./enums";
import { contentNodesTable } from "./content-nodes";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const principalsTable = pgTable(
  "principals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    principalType: principalTypeEnum("principal_type").notNull(),
    externalProvider: text("external_provider").notNull().default("entra_id"),
    externalId: text("external_id").notNull(),
    displayName: text("display_name").notNull(),
    email: text("email"),
    upn: text("upn"),
    status: principalStatusEnum("status").notNull().default("active"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_principals_external").on(
      table.externalProvider,
      table.externalId,
    ),
  ],
);

export const roleAssignmentsTable = pgTable("role_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  principalId: uuid("principal_id")
    .notNull()
    .references(() => principalsTable.id),
  role: wikiRoleEnum("role").notNull(),
  scope: text("scope").notNull().default("global"),
  grantedBy: uuid("granted_by").references(() => principalsTable.id),
  grantedAt: timestamp("granted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
});

export const pagePermissionsTable = pgTable("page_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  nodeId: uuid("node_id")
    .notNull()
    .references(() => contentNodesTable.id),
  principalId: uuid("principal_id")
    .notNull()
    .references(() => principalsTable.id),
  permission: wikiPermissionEnum("permission").notNull(),
  isInherited: boolean("is_inherited").notNull().default(false),
  grantedBy: uuid("granted_by").references(() => principalsTable.id),
  grantedAt: timestamp("granted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const nodeOwnershipTable = pgTable("node_ownership", {
  id: uuid("id").defaultRandom().primaryKey(),
  nodeId: uuid("node_id")
    .notNull()
    .references(() => contentNodesTable.id),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => principalsTable.id),
  deputyId: uuid("deputy_id").references(() => principalsTable.id),
  reviewerId: uuid("reviewer_id").references(() => principalsTable.id),
  approverId: uuid("approver_id").references(() => principalsTable.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPrincipalSchema = createInsertSchema(principalsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectPrincipalSchema = createSelectSchema(principalsTable);
export type InsertPrincipal = z.infer<typeof insertPrincipalSchema>;
export type Principal = typeof principalsTable.$inferSelect;

export const insertRoleAssignmentSchema = createInsertSchema(
  roleAssignmentsTable,
).omit({ id: true, grantedAt: true });
export type InsertRoleAssignment = z.infer<typeof insertRoleAssignmentSchema>;
export type RoleAssignment = typeof roleAssignmentsTable.$inferSelect;

export const insertPagePermissionSchema = createInsertSchema(
  pagePermissionsTable,
).omit({ id: true, grantedAt: true });
export type InsertPagePermission = z.infer<typeof insertPagePermissionSchema>;
export type PagePermission = typeof pagePermissionsTable.$inferSelect;

export const insertNodeOwnershipSchema = createInsertSchema(
  nodeOwnershipTable,
).omit({ id: true, updatedAt: true });
export type InsertNodeOwnership = z.infer<typeof insertNodeOwnershipSchema>;
export type NodeOwnership = typeof nodeOwnershipTable.$inferSelect;
