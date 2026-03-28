import { pgTable, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";

export const rateLimitHitsTable = pgTable(
  "rate_limit_hits",
  {
    key: varchar("key", { length: 255 }).notNull().primaryKey(),
    hits: integer("hits").notNull().default(1),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("rate_limit_hits_reset_at_idx").on(table.resetAt)],
);
