import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

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
