import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { principalsTable } from "./principals";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const apiTokensTable = pgTable(
  "api_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => principalsTable.id),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_api_tokens_principal").on(table.principalId),
    index("idx_api_tokens_hash").on(table.tokenHash),
  ],
);

export const insertApiTokenSchema = createInsertSchema(apiTokensTable).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});
export const selectApiTokenSchema = createSelectSchema(apiTokensTable);
export type InsertApiToken = z.infer<typeof insertApiTokenSchema>;
export type ApiToken = typeof apiTokensTable.$inferSelect;
