import { pgTable, uuid, text, timestamp, unique, index } from "drizzle-orm/pg-core";
import { principalsTable } from "./principals";

export const confidentialityAccessConfigTable = pgTable(
  "confidentiality_access_config",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    level: text("level").notNull().unique(),
    allowedRoles: text("allowed_roles").array().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: text("updated_by"),
  },
);

export type ConfidentialityAccessConfig =
  typeof confidentialityAccessConfigTable.$inferSelect;

export const confidentialityPrincipalAccessTable = pgTable(
  "confidentiality_principal_access",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    level: text("level").notNull(),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => principalsTable.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    assignedBy: uuid("assigned_by"),
  },
  (table) => [
    unique("uq_conf_level_principal").on(table.level, table.principalId),
    index("idx_conf_principal_access").on(table.principalId),
  ],
);

export type ConfidentialityPrincipalAccess =
  typeof confidentialityPrincipalAccessTable.$inferSelect;
